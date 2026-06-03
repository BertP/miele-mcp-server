import { describe, it, expect, vi, beforeAll } from 'vitest';
import { TokenService } from '../auth/tokenService';
import { TokenRepository } from '../storage/tokenRepository';

describe('TokenService', () => {
  beforeAll(async () => {
    await TokenRepository.deleteTokens();
  });

  it('should refresh token and update database when getValidToken is called with expiring token', async () => {
    // Save a token expiring in the past
    await TokenRepository.saveTokens('old-access', 'my-refresh-token', -100);

    const mockResponse = {
      access_token: 'new-access-token-789',
      refresh_token: 'new-refresh-token-012',
      expires_in: 3600,
    };

    // Spy on global fetch
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => mockResponse,
      } as Response;
    });

    const token = await TokenService.getValidToken();

    expect(fetchSpy).toHaveBeenCalled();
    expect(token).toBe('new-access-token-789');

    const dbTokens = await TokenRepository.getTokens();
    expect(dbTokens?.access_token).toBe('new-access-token-789');
    expect(dbTokens?.refresh_token).toBe('new-refresh-token-012');

    fetchSpy.mockRestore();
  });
});
