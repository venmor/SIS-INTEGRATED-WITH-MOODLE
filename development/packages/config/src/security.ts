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
  };
  lockout: { failuresBeforeLock: number; lockMinutes: number };
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
  },
  lockout: { failuresBeforeLock: 5, lockMinutes: 15 },
  passwordPolicy: {
    minLength: 12,
    guidance:
      "Use at least 12 characters. A phrase with several words is easier to remember and stronger than a short complex word.",
  },
  recoveryTokenMinutes: 60,
};
