/**
 * SECURITY-v1 — versioned demo security configuration (05/05 config standard).
 * Fictional demo values, NOT institutional policy. Effective 2026-01-01,
 * owner: Lead Charles. Code reads these values; nothing security-related is
 * hardcoded in controllers or components (policy-literal scan enforces this).
 */
export interface SecurityConfig {
  version: "SECURITY-v1";
  owner: string;
  effectiveFrom: string;
  session: {
    absoluteSeconds: number;
    idleSeconds: number;
    cookieName: string;
  };
  rateLimits: {
    signIn: { maxAttempts: number; windowMinutes: number };
    recovery: { maxAttempts: number; windowMinutes: number };
    grant: { maxAttempts: number; windowMinutes: number };
    workspaceSwitch: { maxAttempts: number; windowMinutes: number };
    grantResolve: { maxAttempts: number; windowMinutes: number };
  };
  lockout: { failuresBeforeLock: number; lockMinutes: number };
  // Demo mapping of the handbook's IAM Administrator grantor (the handbook
  // names the role, never a person). Packet-local, NOT handbook values.
  grantorRoles: string[];
  // Slice-4 policy data (packet-local demo values):
  // verbs: action → roles holding it (REQ-IAM-004 deny-unless-permits;
  // unknown actions/roles deny by default). sodPairs: mutually exclusive
  // role holdings denied together (GAP-012 notes no handbook pair table;
  // demo default empty, mechanism + tests are real).
  policyVerbs: Record<string, string[]>;
  sodPairs: [string, string][];
  passwordPolicy: { minLength: number; guidance: string };
  recoveryTokenMinutes: number;
}

export const SECURITY_V1: SecurityConfig = {
  version: "SECURITY-v1",
  owner: "Lead Charles (demo)",
  effectiveFrom: "2026-01-01",
  session: {
    absoluteSeconds: 12 * 60 * 60,
    idleSeconds: 30 * 60,
    cookieName: "sid",
  },
  rateLimits: {
    signIn: { maxAttempts: 5, windowMinutes: 15 },
    recovery: { maxAttempts: 3, windowMinutes: 60 },
    // Demo values for slice 3 (packet-local, NOT handbook baselines):
    // grants are rare admin acts, switches are frequent user acts.
    grant: { maxAttempts: 20, windowMinutes: 60 },
    workspaceSwitch: { maxAttempts: 30, windowMinutes: 15 },
    // Slice-4 resolve budget: isolated so lookup probing never burns the
    // grant budget and vice versa (demo value, packet-local).
    grantResolve: { maxAttempts: 30, windowMinutes: 15 },
  },
  lockout: { failuresBeforeLock: 5, lockMinutes: 15 },
  grantorRoles: ['SYSADMIN'],
  policyVerbs: {
    'iam.grant.create': ['SYSADMIN'],
    'iam.account.resolve': ['SYSADMIN'],
    'iam.workspace.switch': ['SYSADMIN', 'LEC', 'DEAN', 'STU', 'APP', 'TUT'],
    'iam.me.read': ['SYSADMIN', 'LEC', 'DEAN', 'STU', 'APP', 'TUT'],
  },
  sodPairs: [],
  passwordPolicy: {
    minLength: 12,
    guidance:
      "Use at least 12 characters. A phrase with several words is easier to remember and stronger than a short complex word.",
  },
  recoveryTokenMinutes: 60,
};
