import { demoSignInFreedomEnabled, RateLimiter } from './rate-limit.js';
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

// The demonstration escape hatch has to be provably unreachable from anything
// that is not a pinned demo database, or it becomes a production backdoor.
describe('demoSignInFreedomEnabled', () => {
  const reviewDb: Record<string, string> = {
    DEMO_MODE: 'true',
    DATABASE_URL:
      'postgresql://sis:local_only@localhost:5432/sis_review_demo?sslmode=require',
  };
  const cloudDemoDb: Record<string, string> = {
    DEMO_MODE: 'true',
    SIS_ENABLE_CLOUD_DEMONSTRATION: 'true',
    SIS_DEMO_DATABASE_HOST: 'ep-demo-1234.neon.tech',
    SIS_DEMO_DATABASE_NAME: 'sis_demo',
    DATABASE_URL:
      'postgresql://sis:pw@ep-demo-1234.neon.tech:5432/sis_demo?sslmode=require',
  };

  it('stays off with no opt-in, even on a demo database', () => {
    expect(demoSignInFreedomEnabled(reviewDb)).toBe(false);
    expect(demoSignInFreedomEnabled({})).toBe(false);
  });

  it('turns on only when the opt-in meets a pinned demo database', () => {
    expect(
      demoSignInFreedomEnabled({
        ...reviewDb,
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
      }),
    ).toBe(true);
    expect(
      demoSignInFreedomEnabled({
        ...cloudDemoDb,
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
      }),
    ).toBe(true);
  });

  it('refuses a real-looking database no matter what the flag says', () => {
    expect(
      demoSignInFreedomEnabled({
        DEMO_MODE: 'true',
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
        DATABASE_URL:
          'postgresql://sis:pw@db.unza.ac.zm:5432/sis_production?sslmode=require',
      }),
    ).toBe(false);
    expect(
      demoSignInFreedomEnabled({
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
        DATABASE_URL:
          'postgresql://sis:pw@ep-x.neon.tech:5432/sis_demo?sslmode=require',
      }),
    ).toBe(false);
  });

  it('refuses an unpinned cloud host, so a stray URL is never a demo target', () => {
    expect(
      demoSignInFreedomEnabled({
        ...cloudDemoDb,
        SIS_DEMO_DATABASE_HOST: undefined as unknown as string,
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
      }),
    ).toBe(false);
    expect(
      demoSignInFreedomEnabled({
        ...cloudDemoDb,
        DATABASE_URL:
          'postgresql://sis:pw@ep-other-9999.neon.tech:5432/sis_demo?sslmode=require',
        SIS_ENABLE_DEMO_UNLIMITED_SIGNIN: 'true',
      }),
    ).toBe(false);
  });
});
