import express from 'express';
import { config } from './config';
import { oauthRoutes } from './auth/oauthRoutes';

const app = express();

app.use(express.json());

// Mount OAuth routes
app.use('/auth', oauthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
app.listen(config.PORT, () => {
  console.log(`🚀 Miele MCP Server starting in ${config.NODE_ENV} mode on port ${config.PORT}`);
  console.log(`🔗 Health check available at http://localhost:${config.PORT}/health`);
});
