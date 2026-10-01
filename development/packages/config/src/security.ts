/**
 * SECURITY-v1 — versioned demo security configuration (05/05 config standard).
 * Fictional demo values, NOT institutional policy. Effective 2026-01-01,
 * owner: Lead Charles. Code reads these values; nothing security-related is
 * hardcoded in controllers or components (policy-literal scan enforces this).
 * 
 * @deprecated As of Task 1.3 (GAP-003, GAP-004, GAP-006, GAP-012):
 * - Capabilities, scopes, and SoD pairs now live in the database (Prisma models:
 *   Capability, Scope, CapabilityScope, ApproverAuthority, SoDPair).
 * - This config is retained as a fallback for development/demo purposes only.
 * - Use the migration helper in security-legacy.ts to sync config → DB.
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
    read: { maxAttempts: number; windowMinutes: number };
    // Slice PH2-001 (packet-local demo value): anonymous catalogue search/
    // guidance budget. The handbook threat model requires search abuse limits
    // but names no anonymous row — this fills it, labelled as demo.
    catalogueSearch: { maxAttempts: number; windowMinutes: number };
    // Task 1.2: Contact verification and MFA/Step-up
    contactVerification: { maxAttempts: number; windowMinutes: number };
    mfaEnrollment: { maxAttempts: number; windowMinutes: number };
    stepUp: { maxAttempts: number; windowMinutes: number };
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
  // Task 1.2: Contact verification
  contactVerificationCodeLength: number;
  contactVerificationExpiryMinutes: number;
  contactVerificationMaxAttempts: number;
  // Task 1.2: MFA
  mfaTotpIssuer: string;
  mfaBackupCodesCount: number;
  mfaBackupCodeLength: number;
  // Task 1.2: Step-up authentication
  stepUpExpiryMinutes: number;
  // High-risk actions requiring step-up (config-driven)
  stepUpActions: string[];
  // GAP-011: Suspicious recovery detection thresholds
  suspicion: {
    failedAttemptsThreshold: number;
    failedAttemptsWindowMinutes: number;
    geoAnomalyEnabled: boolean;
    geoAnomalyRiskScore: number;
    deviceChangeEnabled: boolean;
    deviceChangeRiskScore: number;
    rateLimitProximityThreshold: number; // Percentage of rate limit (0-100)
    rateLimitRiskScore: number;
    riskScoreThreshold: number; // Score >= this triggers review queue
    maxRiskScore: number; // Cap for risk score
  };
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
    // Authenticated read budget for receipt lookups (demo value).
    read: { maxAttempts: 120, windowMinutes: 1 },
    // Public catalogue search/evaluate budget per IP (demo value, packet-local).
    catalogueSearch: { maxAttempts: 60, windowMinutes: 1 },
    // Task 1.2: Contact verification and MFA/Step-up
    contactVerification: { maxAttempts: 5, windowMinutes: 15 },
    mfaEnrollment: { maxAttempts: 3, windowMinutes: 60 },
    stepUp: { maxAttempts: 3, windowMinutes: 15 },
  },
  lockout: { failuresBeforeLock: 5, lockMinutes: 15 },
  grantorRoles: ['SYSADMIN'],
  policyVerbs: {
    'iam.grant.create': ['SYSADMIN'],
    'iam.account.resolve': ['SYSADMIN'],
    'iam.workspace.switch': [
      'SYSADMIN',
      'LEC',
      'DEAN',
      'STU',
      'APP',
      'TUT',
      'ADMISSIONS_OFFICER',
      'ADMISSIONS_APPROVER',
      // Phase 7 slice 1 (TASK-PH7-001, GAP-022): assessment demo accounts
      // need deliberate workspace switching for sign-in UX. Fictional
      // demo values, NOT institutional policy.
      'COORDINATOR',
      'EXAMINATIONS_OFFICER',
      // Phase 7 slice 4 (TASK-PH7-004): moderation demo account, same
      // sign-in UX reason.
      'MODERATOR',
    ],
    'iam.me.read': [
      'SYSADMIN',
      'LEC',
      'DEAN',
      'STU',
      'APP',
      'TUT',
      'ADMISSIONS_OFFICER',
      'ADMISSIONS_APPROVER',
      // Phase 7 slice 1 (TASK-PH7-001, GAP-022): same sign-in UX reason.
      'COORDINATOR',
      'EXAMINATIONS_OFFICER',
      // Phase 7 slice 4 (TASK-PH7-004): same sign-in UX reason.
      'MODERATOR',
    ],
  },
  sodPairs: [],
  passwordPolicy: {
    minLength: 12,
    guidance:
      "Use at least 12 characters. A phrase with several words is easier to remember and stronger than a short complex word.",
  },
  recoveryTokenMinutes: 60,
  // Task 1.2: Contact verification
  contactVerificationCodeLength: 6,
  contactVerificationExpiryMinutes: 10,
  contactVerificationMaxAttempts: 3,
  // Task 1.2: MFA
  mfaTotpIssuer: "SIS",
  mfaBackupCodesCount: 10,
  mfaBackupCodeLength: 8,
  // Task 1.2: Step-up authentication
  stepUpExpiryMinutes: 5,
  // High-risk actions requiring step-up (config-driven)
  stepUpActions: [
    // Finance
    'finance.adjustment.approve',
    'finance.waiver.approve',
    'finance.refund.approve',
    'finance.arrangement.approve',
    // Admissions
    'admissions.decision.release',
    'admissions.offer.release',
    // Results
    'results.mark.approve',
    'results.progression.decide',
    // Counselling
    'counselling.restricted-notes.access',
    // Identity
    'identity.grant.revoke',
    'identity.break-glass',
  ],
  // GAP-011: Suspicious recovery detection thresholds (demo values)
  suspicion: {
    failedAttemptsThreshold: 3,
    failedAttemptsWindowMinutes: 60,
    geoAnomalyEnabled: true,
    geoAnomalyRiskScore: 30,
    deviceChangeEnabled: true,
    deviceChangeRiskScore: 25,
    rateLimitProximityThreshold: 80,
    rateLimitRiskScore: 20,
    riskScoreThreshold: 50,
    maxRiskScore: 100,
  },
};
