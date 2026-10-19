import { describe, expect, it } from 'vitest';
import { WorkspaceService, matchesSignInAudience } from './workspace.service.js';

const row = (role: string, id: string, patch = {}) => ({
  id, accountId: 'account', role, scopeType: 'GLOBAL', scopeRef: '*',
  startsAt: new Date('2020-01-01'), endsAt: null, revokedAt: null, employmentType: null, ...patch,
});
function service(rows: ReturnType<typeof row>[]) {
  return new WorkspaceService({ roleAssignment: { findMany: async () => rows } } as never);
}
describe('sign-in category restricts existing appointments', () => {
  it('includes applicants and students in learner entry only', () => {
    for (const role of ['APP', 'STUDENT']) {
      expect(matchesSignInAudience(role, 'student')).toBe(true);
      expect(matchesSignInAudience(role, 'staff')).toBe(false);
    }
    expect(matchesSignInAudience('ADM', 'student')).toBe(false);
  });
  it('selects only an authorised matching appointment for multi-role accounts', async () => {
    const workspaces = service([row('APP', 'app'), row('ADM', 'staff')]);
    expect((await workspaces.defaultWorkspace('account', 'app', 'staff'))?.assignmentId).toBe('staff');
    expect((await workspaces.defaultWorkspace('account', 'staff', 'student'))?.assignmentId).toBe('app');
    expect((await workspaces.defaultWorkspace('account', 'staff'))?.assignmentId).toBe('staff');
  });
  it('denies wrong-category, expired, future, revoked and emergency appointments', async () => {
    const workspaces = service([
      row('STUDENT', 'student'), row('ADM', 'expired', { endsAt: new Date('2020-02-01') }),
      row('ADM', 'future', { startsAt: new Date('2100-01-01') }),
      row('ADM', 'revoked', { revokedAt: new Date() }),
      row('ADM', 'emergency', { scopeType: 'BREAK_GLASS' }),
    ]);
    expect(await workspaces.defaultWorkspace('account', null, 'staff')).toBeNull();
  });
});
