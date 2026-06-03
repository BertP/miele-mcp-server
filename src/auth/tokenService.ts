import { config } from '../config';
import { TokenRepository, TokenRecord } from '../storage/tokenRepository';
import { Logger } from '../utils/logger';

export class TokenService {
  static async refreshAccessToken(refreshToken: string): Promise<TokenRecord | null> {
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
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token || !data.refresh_token || !data.expires_in) {
        Logger.error('Invalid token response format from Miele API');
        return null;
      }

      await TokenRepository.saveTokens(data.access_token, data.refresh_token, data.expires_in);
      
      Logger.info('✅ Access token refreshed successfully.');
      return await TokenRepository.getTokens();
    } catch (error: any) {
      Logger.error('Error during token refresh', { error: error.message });
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
