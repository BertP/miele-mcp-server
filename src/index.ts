import express from 'express';
import { config } from './config';
import { oauthRoutes } from './auth/oauthRoutes';

const app = express();

app.use(express.json());

// Mount OAuth routes
app.use('/auth', oauthRoutes);

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp/server';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Middleware to verify MCP_API_TOKEN
function requireMcpToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${config.MCP_API_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing Bearer token' });
  }
  next();
}

const transports: Record<string, SSEServerTransport> = {};

app.get('/mcp/sse', requireMcpToken, async (req, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/mcp/message', requireMcpToken, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(404).send('Session not found');
  }
});

// Start the server
app.listen(config.PORT, () => {
  console.log(`🚀 Miele MCP Server starting in ${config.NODE_ENV} mode on port ${config.PORT}`);
  console.log(`🔗 Health check available at http://localhost:${config.PORT}/health`);
});
