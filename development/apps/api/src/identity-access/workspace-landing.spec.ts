import { WorkspaceService } from './workspace.service.js';
import { evaluatePolicy } from './policy.service.js';
import type { PrismaService } from './prisma.service.js';

const row = (id: string, extra = {}) => ({
  id, accountId: 'own-account', role: 'LEC', scopeType: 'OFFERING',
  scopeRef: 'SWE-2026S1', startsAt: new Date('2020-01-01'), endsAt: null,
  revokedAt: null, employmentType: null, ...extra,
});
const service = (rows: ReturnType<typeof row>[]) => new WorkspaceService({
  roleAssignment: { findMany: async () => rows },
} as unknown as PrismaService);

describe('ordinary workspace landing', () => {
  it('retains the selected own live assignment instead of selecting the first role', async () => {
    const workspaces = service([row('first'), row('selected', { role: 'SYSADMIN' })]);
    expect((await workspaces.defaultWorkspace('own-account', 'selected'))?.assignmentId).toBe('selected');
  });

  it('ignores expired, revoked and foreign preferences and does not default to emergency access', async () => {
    const workspaces = service([
      row('emergency', { scopeType: 'BREAK_GLASS' }),
      row('ordinary'), row('expired', { endsAt: new Date('2000-01-01') }),
      row('revoked', { revokedAt: new Date() }),
    ]);
    for (const preference of ['foreign', 'emergency', 'expired', 'revoked'])
      expect((await workspaces.defaultWorkspace('own-account', preference))?.assignmentId).toBe('ordinary');
    expect(await service([row('emergency', { scopeType: 'BREAK_GLASS' })]).defaultWorkspace('own-account')).toBeNull();
  });

  it('allows existing application roles to switch only their own live session context', () => {
    for (const role of ['STUDENT', 'APPLICANT', 'FINANCE_OFFICER', 'FINANCE_APPROVER', 'CASHIER', 'MOODLE_ADMIN', 'INTEGRATION_SUPPORT', 'RECORDS_OFFICER']) {
      expect(evaluatePolicy({ action: 'iam.workspace.switch', activeRole: role, assignmentLive: true }).allow).toBe(true);
      expect(evaluatePolicy({ action: 'iam.workspace.switch', activeRole: role, assignmentLive: false }).allow).toBe(false);
      expect(evaluatePolicy({ action: 'iam.grant.create', activeRole: role, assignmentLive: true }).allow).toBe(false);
    }
  });
});
