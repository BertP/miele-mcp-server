// All imports at the top (D4: import order cleanup)
import express from 'express';
import { randomUUID } from 'crypto';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { config } from './config';
import { oauthRoutes } from './auth/oauthRoutes';
import { TokenRepository } from './storage/tokenRepository';
import { getMieleTokenStatus } from './health/tokenStatusCache';
import { createMcpServer } from './mcp/server';
import { Logger } from './utils/logger';

const app = express();
app.use(express.json());

// Mount OAuth routes
app.use('/auth', oauthRoutes);

// E3: Transport maps with timestamps for TTL-based session purging
interface TimestampedStreamTransport {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}
interface TimestampedSSETransport {
  transport: SSEServerTransport;
  lastActivity: number;
}

const streamableTransports: Record<string, TimestampedStreamTransport> = {};
const sseTransports: Record<string, TimestampedSSETransport> = {};

// F3: Capture interval references for graceful shutdown
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionPurgeInterval = setInterval(() => {
  const now = Date.now();
  for (const [sid, entry] of Object.entries(streamableTransports)) {
    if (now - entry.lastActivity > SESSION_TTL_MS) {
      Logger.info(`[Session] Purging idle Streamable HTTP session: ${sid}`);
      delete streamableTransports[sid];
    }
  }
  for (const [sid, entry] of Object.entries(sseTransports)) {
    if (now - entry.lastActivity > SESSION_TTL_MS) {
      Logger.info(`[Session] Purging idle SSE session: ${sid}`);
      delete sseTransports[sid];
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// D3: CORS Middleware – no wildcard when credentials are sent, no header if no Origin present
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id, mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  Logger.info(`[HTTP] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST') {
    Logger.debug('Body:', req.body);
  }
  // Prevent Nginx from buffering SSE streams
  res.setHeader('X-Accel-Buffering', 'no');
  next();
});

// Health check endpoint (D2: granular token status, E2: active session counts)
// Token status is cached for 60s – see src/health/tokenStatusCache.ts
app.get('/health', async (req, res) => {
  try {
    const { status: tokenStatus, expiresInSeconds } = await getMieleTokenStatus();

    res.json({
      status: 'ok',
      database: 'connected',
      auth: {
        authenticated: tokenStatus !== 'none',
        expiresInSeconds,
        tokenStatus,
      },
      // E2: Active session counts
      sessions: {
        streamable: Object.keys(streamableTransports).length,
        sse: Object.keys(sseTransports).length,
      }
    });
  } catch (err: any) {
    Logger.error('Health check failed', { error: err.message });
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// MCP API Token Authentication Middleware
// Checks Bearer token in Authorization header or 'token' query parameter
app.use('/mcp', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token || token !== config.MCP_API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized. Valid MCP API token required.' });
    return;
  }

  next();
});

// LEGACY SSE Endpoints (for MCP Inspector & development tools only – not recommended for production)
app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  sseTransports[transport.sessionId] = { transport, lastActivity: Date.now() };
  res.on('close', () => {
    delete sseTransports[transport.sessionId];
  });
  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/mcp/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const entry = sseTransports[sessionId];
  if (entry) {
    entry.lastActivity = Date.now(); // E3: Update activity timestamp
    await entry.transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(404).send('Session not found');
  }
});

// STREAMABLE HTTP Endpoints – recommended for all production clients
app.all('/mcp/stream', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && streamableTransports[sessionId]) {
    const entry = streamableTransports[sessionId];
    entry.lastActivity = Date.now(); // E3: Update activity timestamp
    transport = entry.transport;
  } else if (!sessionId && req.method === 'POST') {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        streamableTransports[sid] = { transport, lastActivity: Date.now() };
      }
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && streamableTransports[sid]) delete streamableTransports[sid];
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    return res.status(400).json({ error: 'Invalid session ID or request' });
  }

  await transport.handleRequest(req, res, req.body);
});

// E4: Send webhook notification if Miele token refresh fails
async function notifyWebhookOnRefreshFailure(reason: string): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'miele_token_refresh_failed',
        timestamp: new Date().toISOString(),
        message: `Miele OAuth token could not be refreshed. Manual re-login required at ${config.MIELE_REDIRECT_URI.replace('/auth/callback', '/auth/login')}`,
        reason,
      }),
    });
    Logger.info('Webhook notification sent for token refresh failure.');
  } catch (err: any) {
    Logger.error('Failed to send webhook notification', { error: err.message });
  }
}

// Start the server
const httpServer = app.listen(config.PORT, async () => {
  Logger.info(`🚀 Miele MCP Server starting in ${config.NODE_ENV} mode on port ${config.PORT}`);
  Logger.info(`🔗 Health check available at http://localhost:${config.PORT}/health`);

  // Cleanup expired OAuth states on startup and every 10 minutes
  const cleaned = await TokenRepository.cleanupExpiredStates();
  if (cleaned > 0) Logger.info(`🧹 Cleaned up ${cleaned} expired OAuth state(s).`);
  const oauthCleanupInterval = setInterval(async () => {
    const n = await TokenRepository.cleanupExpiredStates();
    if (n > 0) Logger.info(`🧹 Cleaned up ${n} expired OAuth state(s).`);
  }, 10 * 60 * 1000);

  // Active Miele Token Health: check and refresh token immediately on start
  try {
    const { status, expiresInSeconds } = await getMieleTokenStatus();
    if (status === 'valid') {
      Logger.info(`🔑 Miele OAuth token is active and valid. Expires in ${expiresInSeconds}s.`);
    } else if (status === 'refresh_failed') {
      Logger.warn('⚠️ Miele OAuth token refresh failed. Manual re-login required via /auth/login.');
      await notifyWebhookOnRefreshFailure('Startup token check failed');
    } else {
      Logger.warn('⚠️ No active Miele session found. Please authenticate via /auth/login.');
    }
  } catch (err: any) {
    Logger.error('Failed to run initial Miele token health check', { error: err.message });
  }

  // Periodic Miele token refresh check (every 15 minutes)
  const tokenRefreshInterval = setInterval(async () => {
    try {
      Logger.debug('Running background Miele token refresh check...');
      const { status } = await getMieleTokenStatus();
      if (status === 'refresh_failed') {
        Logger.error('⚠️ Background token refresh failed. Manual re-login required via /auth/login.');
        await notifyWebhookOnRefreshFailure('Background refresh check failed');
      }
    } catch (err: any) {
      Logger.error('Background Miele token refresh failed', { error: err.message });
    }
  }, 15 * 60 * 1000);

  // F3: Graceful shutdown – clear all intervals and close HTTP server cleanly
  const shutdown = (signal: string) => {
    Logger.info(`[Shutdown] Received ${signal}. Shutting down gracefully...`);
    clearInterval(sessionPurgeInterval);
    clearInterval(oauthCleanupInterval);
    clearInterval(tokenRefreshInterval);
    httpServer.close(() => {
      Logger.info('[Shutdown] HTTP server closed. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
