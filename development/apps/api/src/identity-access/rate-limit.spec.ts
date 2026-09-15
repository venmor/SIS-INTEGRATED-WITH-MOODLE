import { RateLimiter } from './rate-limit.js';
import { SECURITY_V1 } from '@sis/config';

describe('RateLimiter', () => {
  it('reads baselines from SECURITY-v1, never hardcoded', () => {
    expect(RateLimiter.signInLimit()).toEqual({ maxAttempts: 5, windowMinutes: 15 });
    expect(RateLimiter.recoveryLimit()).toEqual({ maxAttempts: 3, windowMinutes: 60 });
    expect(SECURITY_V1.version).toBe('SECURITY-v1');
  });

  it('allows up to max then blocks with retry-after', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('k', 5, 15).allowed).toBe(true);
    }
    const blocked = limiter.check('k', 5, 15);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) limiter.check('a', 5, 15);
    expect(limiter.check('a', 5, 15).allowed).toBe(false);
    expect(limiter.check('b', 5, 15).allowed).toBe(true);
  });

  it('caps progressive delay at 5s', () => {
    expect(RateLimiter.failureDelayMs(1)).toBe(1000);
    expect(RateLimiter.failureDelayMs(99)).toBe(5000);
  });
});
