import express from 'express';
import { config } from './config';
import { oauthRoutes } from './auth/oauthRoutes';
import { TokenRepository } from './storage/tokenRepository';
import { TokenService } from './auth/tokenService';

const app = express();

app.use(express.json());

// Mount OAuth routes
app.use('/auth', oauthRoutes);

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp/server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';

import { Logger } from './utils/logger';

// CORS Middleware & SSE Buffering prevention
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Attempt to get a valid token (triggers refresh if expired)
    await TokenService.getValidToken();
    
    const tokens = await TokenRepository.getTokens();
    const now = Math.floor(Date.now() / 1000);
    const msleeps = tokens ? tokens.expires_at - now : 0;
    
    res.json({
      status: 'ok',
      database: 'connected',
      auth: {
        authenticated: !!tokens,
        expiresInSeconds: msleeps > 0 ? msleeps : 0,
        tokenStatus: tokens ? (msleeps > 0 ? 'valid' : 'expired') : 'none'
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

const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};
const sseTransports: Record<string, SSEServerTransport> = {};

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

// LEGACY SSE Endpoints (for Claude Desktop)
app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  sseTransports[transport.sessionId] = transport;
  res.on('close', () => {
    delete sseTransports[transport.sessionId];
  });
  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/mcp/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(404).send('Session not found');
  }
});

// STREAMABLE HTTP Endpoints (for Claude Web / newer clients)
app.all('/mcp/stream', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && streamableTransports[sessionId]) {
    transport = streamableTransports[sessionId];
  } else if (!sessionId && req.method === 'POST') {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        streamableTransports[sid] = transport;
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

// Start the server
app.listen(config.PORT, async () => {
  Logger.info(`🚀 Miele MCP Server starting in ${config.NODE_ENV} mode on port ${config.PORT}`);
  Logger.info(`🔗 Health check available at http://localhost:${config.PORT}/health`);

  // Cleanup expired OAuth states on startup and every 10 minutes
  const cleaned = await TokenRepository.cleanupExpiredStates();
  if (cleaned > 0) Logger.info(`🧹 Cleaned up ${cleaned} expired OAuth state(s).`);
  setInterval(async () => {
    const n = await TokenRepository.cleanupExpiredStates();
    if (n > 0) Logger.info(`🧹 Cleaned up ${n} expired OAuth state(s).`);
  }, 10 * 60 * 1000);

  // Active Miele Token Health: check and refresh token immediately on start
  try {
    const token = await TokenService.getValidToken();
    if (token) {
      Logger.info('🔑 Miele OAuth token is active and valid.');
    } else {
      Logger.warn('⚠️ No active Miele session found. Please authenticate via /auth/login.');
    }
  } catch (err: any) {
    Logger.error('Failed to run initial Miele token health check', { error: err.message });
  }

  // Periodic Miele token refresh check (runs every 15 minutes to prevent session expiration)
  setInterval(async () => {
    try {
      Logger.debug('Running background Miele token refresh check...');
      await TokenService.getValidToken();
    } catch (err: any) {
      Logger.error('Background Miele token refresh failed', { error: err.message });
    }
  }, 15 * 60 * 1000);
});
