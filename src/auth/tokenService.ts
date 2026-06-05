import { config } from '../config';
import { TokenRepository, TokenRecord } from '../storage/tokenRepository';
import { Logger } from '../utils/logger';

const MAX_REFRESH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class TokenService {
  static async refreshAccessToken(refreshToken: string, attempt = 1): Promise<TokenRecord | null> {
    try {
      const response = await fetch(config.MIELE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.MIELE_CLIENT_ID,
          client_secret: config.MIELE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('Failed to refresh token', { status: response.status, errorText });

        // For 4xx errors (e.g. invalid_grant), retrying won't help – fail immediately
        if (response.status >= 400 && response.status < 500) {
          return null;
        }

        // For 5xx / network-level errors, retry with exponential backoff
        if (attempt < MAX_REFRESH_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          Logger.warn(`Token refresh attempt ${attempt} failed. Retrying in ${delay}ms...`);
          await sleep(delay);
          return TokenService.refreshAccessToken(refreshToken, attempt + 1);
        }

        Logger.error(`Token refresh failed after ${MAX_REFRESH_RETRIES} attempts.`);
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token || !data.refresh_token || !data.expires_in) {
        Logger.error('Invalid token response format from Miele API');
        return null;
      }

      await TokenRepository.saveTokens(data.access_token, data.refresh_token, data.expires_in);
      
      const saved = await TokenRepository.getTokens();
      const expiresAt = saved ? new Date(saved.expires_at * 1000).toISOString() : 'unknown';
      Logger.info(`✅ Access token refreshed successfully. Expires at: ${expiresAt}`);
      return saved;
    } catch (error: any) {
      // Network-level error – retry with backoff
      Logger.error('Error during token refresh', { error: error.message, attempt });
      if (attempt < MAX_REFRESH_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        Logger.warn(`Token refresh attempt ${attempt} failed (network). Retrying in ${delay}ms...`);
        await sleep(delay);
        return TokenService.refreshAccessToken(refreshToken, attempt + 1);
      }
      Logger.error(`Token refresh failed after ${MAX_REFRESH_RETRIES} attempts (network errors).`);
      return null;
    }
  }

  static async getValidToken(): Promise<string | null> {
    const tokens = await TokenRepository.getTokens();
    if (!tokens) return null;

    const now = Math.floor(Date.now() / 1000);
    // Refresh if expiring within the next 5 minutes
    if (tokens.expires_at < now + 300) {
      Logger.info('Token is expired or expiring soon, refreshing...');
      const refreshed = await TokenService.refreshAccessToken(tokens.refresh_token);
      return refreshed ? refreshed.access_token : null;
    }

    return tokens.access_token;
  }
}
