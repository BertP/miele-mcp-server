import { describe, it, expect } from 'vitest';
import { config } from '../config';

describe('Config', () => {
  it('should parse environment variables correctly', () => {
    expect(config).toBeDefined();
    expect(config.PORT).toBe(8089);
    expect(config.NODE_ENV).toBe('test');
    expect(config.MIELE_CLIENT_ID).toBeDefined();
    expect(config.MIELE_CLIENT_SECRET).toBeDefined();
    expect(config.MIELE_REDIRECT_URI).toBe('https://mielemcp.never2sunny.eu/auth/callback');
    expect(config.MIELE_SCOPES).toBe('openid mcs_thirdparty_read mcs_thirdparty_media mcs_thirdparty_write');
  });
});
