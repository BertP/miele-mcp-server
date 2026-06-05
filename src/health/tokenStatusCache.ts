import { TokenRepository } from '../storage/tokenRepository';
import { TokenService } from '../auth/tokenService';

export type TokenStatus = 'valid' | 'refresh_failed' | 'none';

export interface TokenStatusResult {
  status: TokenStatus;
  expiresInSeconds: number;
}

interface CacheEntry extends TokenStatusResult {
  cachedAt: number;
}

// Cache TTL: 60 seconds – prevents monitoring systems polling /health every
// 10 seconds from hammering the Miele OAuth endpoint unnecessarily.
export const TOKEN_STATUS_CACHE_TTL_MS = 60 * 1000;

let _cache: CacheEntry | null = null;

/** Reset the cache (used in tests). */
export function resetTokenStatusCache(): void {
  _cache = null;
}

/**
 * Returns the current Miele token status.
 *
 * Results are cached for TOKEN_STATUS_CACHE_TTL_MS to avoid triggering a
 * Miele OAuth refresh on every /health poll. The expiresInSeconds value is
 * adjusted to reflect time elapsed since the result was cached.
 */
export async function getMieleTokenStatus(): Promise<TokenStatusResult> {
  const now = Date.now();

  // Return cached result if still fresh
  if (_cache && now - _cache.cachedAt < TOKEN_STATUS_CACHE_TTL_MS) {
    const elapsedSeconds = Math.floor((now - _cache.cachedAt) / 1000);
    const adjustedExpiry = Math.max(0, _cache.expiresInSeconds - elapsedSeconds);
    return { status: _cache.status, expiresInSeconds: adjustedExpiry };
  }

  const tokens = await TokenRepository.getTokens();
  if (!tokens) {
    _cache = { status: 'none', expiresInSeconds: 0, cachedAt: now };
    return { status: 'none', expiresInSeconds: 0 };
  }

  const nowSecs = Math.floor(now / 1000);
  const expiresInSeconds = Math.max(0, tokens.expires_at - nowSecs);

  // Refresh if the token is expired or expiring within the next 5 minutes
  if (expiresInSeconds < 300) {
    const refreshed = await TokenService.refreshAccessToken(tokens.refresh_token);
    if (!refreshed) {
      _cache = { status: 'refresh_failed', expiresInSeconds: 0, cachedAt: now };
      return { status: 'refresh_failed', expiresInSeconds: 0 };
    }
    const newExpiry = Math.max(0, refreshed.expires_at - nowSecs);
    _cache = { status: 'valid', expiresInSeconds: newExpiry, cachedAt: now };
    return { status: 'valid', expiresInSeconds: newExpiry };
  }

  _cache = { status: 'valid', expiresInSeconds, cachedAt: now };
  return { status: 'valid', expiresInSeconds };
}
