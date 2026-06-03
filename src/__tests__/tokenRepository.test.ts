import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TokenRepository } from '../storage/tokenRepository';
import { db } from '../storage/db';

describe('TokenRepository', () => {
  beforeAll(async () => {
    // Delete any existing test tokens/states
    await TokenRepository.deleteTokens();
    await TokenRepository.cleanupExpiredStates();
  });

  it('should save and retrieve OAuth states', async () => {
    const state = 'test-oauth-state-123';
    await TokenRepository.saveState(state);

    // Should consume successfully
    const consumed = await TokenRepository.consumeState(state);
    expect(consumed).toBe(true);

    // Double consumption should fail
    const consumedAgain = await TokenRepository.consumeState(state);
    expect(consumedAgain).toBe(false);
  });

  it('should save and get tokens', async () => {
    await TokenRepository.saveTokens('access-123', 'refresh-456', 3600);
    const tokens = await TokenRepository.getTokens();

    expect(tokens).not.toBeNull();
    expect(tokens?.access_token).toBe('access-123');
    expect(tokens?.refresh_token).toBe('refresh-456');
    expect(tokens?.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
