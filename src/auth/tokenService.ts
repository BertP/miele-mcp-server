import { config } from '../config';
import { TokenRepository, TokenRecord } from '../storage/tokenRepository';

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
        console.error('Failed to refresh token:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token || !data.refresh_token || !data.expires_in) {
        console.error('Invalid token response format from Miele API');
        return null;
      }

      await TokenRepository.saveTokens(data.access_token, data.refresh_token, data.expires_in);
      
      console.log('✅ Access token refreshed successfully.');
      return await TokenRepository.getTokens();
    } catch (error) {
      console.error('Error during token refresh:', error);
      return null;
    }
  }

  static async getValidToken(): Promise<string | null> {
    const tokens = await TokenRepository.getTokens();
    if (!tokens) return null;

    const now = Math.floor(Date.now() / 1000);
    // Refresh if expiring within the next 5 minutes
    if (tokens.expires_at < now + 300) {
      console.log('Token is expired or expiring soon, refreshing...');
      const refreshed = await TokenService.refreshAccessToken(tokens.refresh_token);
      return refreshed ? refreshed.access_token : null;
    }

    return tokens.access_token;
  }
}
