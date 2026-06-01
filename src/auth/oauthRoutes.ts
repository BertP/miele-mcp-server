import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { TokenRepository } from '../storage/tokenRepository';
import { extractPermittedDevices } from './jwtClaims';

const router = Router();

router.get('/login', async (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  await TokenRepository.saveState(state);

  const authUrl = new URL(config.MIELE_AUTH_URL);
  authUrl.searchParams.append('client_id', config.MIELE_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', config.MIELE_REDIRECT_URI);
  authUrl.searchParams.append('scope', config.MIELE_SCOPES);
  authUrl.searchParams.append('state', state);

  res.redirect(authUrl.toString());
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.status(400).send(`Authentication failed: ${error}`);
  }

  if (!code || !state || typeof state !== 'string') {
    return res.status(400).send('Invalid callback parameters');
  }

  const isValidState = await TokenRepository.consumeState(state);
  if (!isValidState) {
    return res.status(400).send('Invalid or expired state parameter');
  }

  try {
    const response = await fetch(config.MIELE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.MIELE_CLIENT_ID,
        client_secret: config.MIELE_CLIENT_SECRET,
        code: code as string,
        redirect_uri: config.MIELE_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', response.status, await response.text());
      return res.status(500).send('Token exchange failed');
    }

    const data = await response.json();

    if (!data.access_token || !data.refresh_token || !data.expires_in) {
      return res.status(500).send('Invalid token response');
    }

    await TokenRepository.saveTokens(data.access_token, data.refresh_token, data.expires_in);

    // Optional: Extract permitted devices and save to device_permissions table
    const permittedDevices = extractPermittedDevices(data.access_token);
    console.log(`Permitted devices found in token: ${permittedDevices.length}`);
    // MVP: We assume the consent screen handled the filtering for now.

    res.send(`
      <html>
        <body>
          <h2>Authentication Successful</h2>
          <p>You can now close this window and return to the application.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Callback handling error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/status', async (req, res) => {
  const tokens = await TokenRepository.getTokens();
  if (tokens) {
    res.json({
      authenticated: true,
      expiresAt: tokens.expires_at,
    });
  } else {
    res.json({
      authenticated: false,
    });
  }
});

export { router as oauthRoutes };
