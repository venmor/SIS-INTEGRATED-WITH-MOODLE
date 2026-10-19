import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { SessionService } from './session.service.js';
const { hash } = createRequire(import.meta.url)('argon2') as typeof import('argon2');
describe('sign-in category denial', () => {
  it('does not mint a session for correct credentials with no matching live appointment', async () => {
    const secretHash = await hash('fictional-test-password');
    const create = vi.fn();
    const audit = vi.fn(async ({ data }) => ({ correlationId: data.correlationId }));
    const prisma = {
      account: { findUnique: async () => ({ id: 'account', personId: 'person', status: 'ACTIVE', failedSignInCount: 0 }), update: vi.fn() },
      credential: { findFirst: async () => ({ secretHash }) },
      session: { create }, auditEvent: { create: audit },
    };
    const defaultWorkspace = vi.fn(async () => null);
    const sessions = new SessionService(prisma as never, { defaultWorkspace } as never);
    const result = await sessions.signIn('fictional', 'fictional-test-password', undefined, undefined, undefined, 'staff');
    expect(result.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(defaultWorkspace).toHaveBeenCalledWith('account', null, 'staff');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'DENY', reason: 'account-category-mismatch' }) }));
  });
});
