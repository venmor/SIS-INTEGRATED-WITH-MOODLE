import { RateLimiter } from './rate-limit.js';
import { FINANCE_DEMO_V1, SECURITY_V1 } from '@sis/config';

describe('RateLimiter', () => {
  it('reads baselines from SECURITY-v1, never hardcoded', () => {
    expect(RateLimiter.signInLimit()).toEqual({
      maxAttempts: 5,
      windowMinutes: 15,
    });
    expect(RateLimiter.recoveryLimit()).toEqual({
      maxAttempts: 3,
      windowMinutes: 60,
    });
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

  it('bounds the bucket map against distinct-key spam', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10500; i++) limiter.check(`spam-${i}`, 5, 15);
    expect(limiter.size).toBeLessThanOrEqual(10000);
  });

  it('reads the authenticated-read budget from SECURITY-v1', () => {
    expect(RateLimiter.readLimit()).toEqual({
      maxAttempts: 120,
      windowMinutes: 1,
    });
  });

  it('reads the public catalogue-search budget from SECURITY-v1', () => {
    expect(RateLimiter.catalogueSearchLimit()).toEqual({
      maxAttempts: 60,
      windowMinutes: 1,
    });
  });

  it('recovers after the window elapses', async () => {
    const limiter = new RateLimiter();
    expect(limiter.check('k', 2, 0.001).allowed).toBe(true);
    expect(limiter.check('k', 2, 0.001).allowed).toBe(true);
    expect(limiter.check('k', 2, 0.001).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 150));
    expect(limiter.check('k', 2, 0.001).allowed).toBe(true);
  });

  it('reads the finance callback budget from versioned config, never hardcoded', () => {
    expect(FINANCE_DEMO_V1.rateLimit.callbackPerMinute).toBe(120);
    expect(FINANCE_DEMO_V1.rateLimit.windowMinutes).toBe(1);
  });
});
