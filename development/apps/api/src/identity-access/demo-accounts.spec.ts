import { describe, expect, it, vi } from 'vitest';
import { demoAccounts } from './demo-accounts.js';
import { createRequire } from 'node:module';
const { hash } = createRequire(import.meta.url)('argon2') as typeof import('argon2');
describe('anonymous fictional demo catalogue', () => {
  it('never queries accounts outside explicitly isolated demo targets', async () => {
    const findMany = vi.fn();
    for (const env of [{}, { DEMO_MODE: 'true', DATABASE_URL: 'postgresql://localhost/institution' }]) {
      expect(await demoAccounts({ account: { findMany } } as never, env)).toEqual({ accounts: [] });
    }
    expect(findMany).not.toHaveBeenCalled();
  });
  it('only emits whitelisted fixtures whose known password verifies and role matches', async () => {
    const good = await hash('Seed-2026-Bwalya');
    const findMany = vi.fn(async () => [
      { username: 'bwalya.m', roles: [{ role: 'APP' }], credentials: [{ secretHash: good }] },
      { username: 'temwani.r', roles: [{ role: 'ADM' }], credentials: [{ secretHash: good }] },
      { username: 'test-random', roles: [{ role: 'ADM' }], credentials: [{ secretHash: good }] },
    ]);
    const response = await demoAccounts({ account: { findMany } } as never, {
      DEMO_MODE: 'true', DATABASE_URL: 'postgresql://localhost/sis_review_login',
    });
    expect(response.accounts).toHaveLength(1);
    expect(response.accounts[0]).toMatchObject({ username: 'bwalya.m', audience: 'student' });
    expect(response.accounts[0].blurb).toContain('Applicant: start an application');
    expect(JSON.stringify(response)).not.toContain('secretHash');
    expect(findMany.mock.calls[0]).toBeDefined();
  });
});
