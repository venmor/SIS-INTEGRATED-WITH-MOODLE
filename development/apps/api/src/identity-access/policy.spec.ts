import { accountStatusPolicy, evaluatePolicy } from './policy.service.js';

// §15.21 decision arms (TDD RED first): each arm allows and denies.
// Demo verb map + SoD pairs are packet-local SECURITY-v1 values, injected
// here so tests never depend on global demo config.
const DEMO = {
  verbs: {
    'iam.grant.create': ['SYSADMIN'],
    'iam.account.resolve': ['SYSADMIN'],
    'iam.workspace.switch': ['SYSADMIN', 'LEC', 'DEAN', 'STU', 'APP', 'TUT'],
    'iam.me.read': ['SYSADMIN', 'LEC', 'DEAN', 'STU', 'APP', 'TUT'],
  } as Record<string, string[]>,
  sodPairs: [['DEAN', 'FINOFFICER']] as [string, string][],
};

const BASE = {
  activeRole: 'SYSADMIN',
  scope: 'SYSTEM:GLOBAL' as string | null,
  assignmentLive: true,
  actorRoles: ['SYSADMIN'],
  policy: DEMO,
};

describe('policy evaluation (§15.21)', () => {
  it('allows a live grantor role with the verb', () => {
    expect(evaluatePolicy({ ...BASE, action: 'iam.grant.create' }).allow).toBe(true);
  });

  it('denies when no active role is present', () => {
    const result = evaluatePolicy({ ...BASE, action: 'iam.grant.create', activeRole: null });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe('role-invalid');
  });

  it('denies verbs outside the role (default-deny unknown too)', () => {
    const lecturer = evaluatePolicy({ ...BASE, action: 'iam.grant.create', activeRole: 'LEC', actorRoles: ['LEC'] });
    expect(lecturer.allow).toBe(false);
    expect(lecturer.reason).toBe('verb-denied');
    const unknown = evaluatePolicy({ ...BASE, action: 'iam.unknown.verb' as never });
    expect(unknown.allow).toBe(false);
  });

  it('denies SoD-conflicting role holdings', () => {
    const result = evaluatePolicy({
      ...BASE,
      action: 'iam.grant.create',
      activeRole: 'DEAN',
      actorRoles: ['DEAN', 'FINOFFICER'],
      policy: {
        verbs: { 'iam.grant.create': ['DEAN'] },
        sodPairs: [['DEAN', 'FINOFFICER']],
      },
    });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe('sod-conflict');
  });

  it('denies self-approval and missing approver where required', () => {
    const self = evaluatePolicy({
      ...BASE,
      action: 'iam.grant.create',
      approverAccountId: 'a1',
      targetAccountId: 'a1',
    });
    expect(self.allow).toBe(false);
    expect(self.reason).toBe('self-approval');
    const missing = evaluatePolicy({ ...BASE, action: 'iam.grant.create', approverRequired: true });
    expect(missing.allow).toBe(false);
    expect(missing.reason).toBe('approver-required');
  });

  it('denies dead assignments even with a valid role name', () => {
    const result = evaluatePolicy({ ...BASE, action: 'iam.workspace.switch', assignmentLive: false });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe('assignment-inactive');
  });

  it('allows switch and self-read for any live role', () => {
    expect(
      evaluatePolicy({ ...BASE, action: 'iam.workspace.switch', activeRole: 'LEC', actorRoles: ['LEC'] }).allow,
    ).toBe(true);
    expect(
      evaluatePolicy({ ...BASE, action: 'iam.me.read', activeRole: 'STU', actorRoles: ['STU'] }).allow,
    ).toBe(true);
  });
});

describe('account status gate (§11.1)', () => {
  it('authorizes Active normally', () => {
    expect(accountStatusPolicy('Active')).toEqual({ allow: true, reason: null });
  });

  it('authorizes the legacy seed ACTIVE marker (regression: case handling)', () => {
    expect(accountStatusPolicy('ACTIVE')).toEqual({ allow: true, reason: null });
  });

  it('never signs in Closed accounts', () => {
    expect(accountStatusPolicy('Closed')).toEqual({ allow: false, reason: 'account-closed' });
  });

  it('denies every other state generically (step-up flows do not exist yet)', () => {
    for (const status of [
      'RegistrationStarted',
      'VerificationRequired',
      'ProtectionRequired',
      'RecoveryPending',
      'TemporarilyRestricted',
      'LOCKED',
    ]) {
      expect(accountStatusPolicy(status)).toEqual({ allow: false, reason: 'account-inactive' });
    }
  });
});
