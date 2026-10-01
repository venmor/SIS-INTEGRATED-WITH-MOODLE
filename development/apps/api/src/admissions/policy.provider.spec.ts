import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Application Policy Provider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return demo policy when DEMO_MODE=true', async () => {
    process.env.DEMO_MODE = 'true';
    const { policy, getPolicySync } = await import(
      '../admissions/policy.provider.js'
    );
    const p = getPolicySync();
    expect(p.demo).toBe(true);
    expect(p.version).toBe('APPLICATION-DEMO-v1');
  });

  it('refuses unapproved production policy when DEMO_MODE=false', async () => {
    process.env.DEMO_MODE = 'false';
    const { getPolicySync } = await import(
      '../admissions/policy.provider.js'
    );
    expect(() => getPolicySync()).toThrow('awaiting institutional approval');
  });

  it('refuses unapproved production policy when DEMO_MODE is unset', async () => {
    delete process.env.DEMO_MODE;
    const { getPolicySync } = await import(
      '../admissions/policy.provider.js'
    );
    expect(() => getPolicySync()).toThrow('awaiting institutional approval');
  });

  it('should cache the policy after first call', async () => {
    process.env.DEMO_MODE = 'true';
    const { getPolicySync, resetPolicyCache } = await import(
      '../admissions/policy.provider.js'
    );
    resetPolicyCache();
    const p1 = getPolicySync();
    const p2 = getPolicySync();
    expect(p1).toBe(p2);
  });

  it('should allow cache reset', async () => {
    process.env.DEMO_MODE = 'true';
    const { getPolicySync, resetPolicyCache } = await import(
      '../admissions/policy.provider.js'
    );
    const p1 = getPolicySync();
    resetPolicyCache();
    const p2 = getPolicySync();
    // Should be equal but not necessarily same reference
    expect(p1.version).toBe(p2.version);
  });
});
