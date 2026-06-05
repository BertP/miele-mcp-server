import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMieleTokenStatus, resetTokenStatusCache, TOKEN_STATUS_CACHE_TTL_MS } from '../health/tokenStatusCache';
import { TokenRepository } from '../storage/tokenRepository';

describe('getMieleTokenStatus (debounce cache)', () => {
  beforeEach(() => {
    resetTokenStatusCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetTokenStatusCache();
    vi.restoreAllMocks();
  });

  it('should return "none" when no tokens exist in the database', async () => {
    vi.spyOn(TokenRepository, 'getTokens').mockResolvedValue(null);

    const result = await getMieleTokenStatus();

    expect(result.status).toBe('none');
    expect(result.expiresInSeconds).toBe(0);
  });

  it('should return "valid" when a non-expiring token exists', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
    vi.spyOn(TokenRepository, 'getTokens').mockResolvedValue({
      id: 1,
      access_token: 'tok',
      refresh_token: 'ref',
      expires_at: futureExpiry,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    const result = await getMieleTokenStatus();

    expect(result.status).toBe('valid');
    expect(result.expiresInSeconds).toBeGreaterThan(0);
  });

  it('should return cached result on second call without hitting the database again', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 7200;
    const getTokensSpy = vi.spyOn(TokenRepository, 'getTokens').mockResolvedValue({
      id: 1,
      access_token: 'tok',
      refresh_token: 'ref',
      expires_at: futureExpiry,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    // First call – populates cache
    await getMieleTokenStatus();
    expect(getTokensSpy).toHaveBeenCalledTimes(1);

    // Second call – should be served from cache
    const result = await getMieleTokenStatus();
    expect(getTokensSpy).toHaveBeenCalledTimes(1); // no additional DB call
    expect(result.status).toBe('valid');
  });

  it('should adjust expiresInSeconds for elapsed time when serving from cache', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    vi.spyOn(TokenRepository, 'getTokens').mockResolvedValue({
      id: 1,
      access_token: 'tok',
      refresh_token: 'ref',
      expires_at: futureExpiry,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    const first = await getMieleTokenStatus();

    // Advance time by 30 seconds using fake timers
    vi.useFakeTimers();
    vi.advanceTimersByTime(30_000);

    const second = await getMieleTokenStatus();
    vi.useRealTimers();

    // Second result should report ~30s less remaining than the first
    expect(second.expiresInSeconds).toBeLessThan(first.expiresInSeconds);
    expect(first.expiresInSeconds - second.expiresInSeconds).toBeGreaterThanOrEqual(29);
  });

  it('should hit the database again after the cache TTL expires', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 7200;
    const getTokensSpy = vi.spyOn(TokenRepository, 'getTokens').mockResolvedValue({
      id: 1,
      access_token: 'tok',
      refresh_token: 'ref',
      expires_at: futureExpiry,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    // First call – populates cache
    await getMieleTokenStatus();
    expect(getTokensSpy).toHaveBeenCalledTimes(1);

    // Advance time past the TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(TOKEN_STATUS_CACHE_TTL_MS + 1000);

    // Call after TTL – should re-query the database
    await getMieleTokenStatus();
    vi.useRealTimers();

    expect(getTokensSpy).toHaveBeenCalledTimes(2);
  });
});
