import { isDemonstrationDatabaseTarget, SECURITY_V1 } from '@sis/config';

// In-memory sliding-window limits (no Redis per locked stack — single
// instance demo limit, documented). Values come from SECURITY-v1 (07/04
// baselines) — nothing hardcoded. The bucket map is bounded: empty buckets
// are swept on every check and oldest entries evicted past the cap, so
// distinct-key spam cannot grow memory without bound.

const MAX_BUCKETS = 10000;

/**
 * Demonstration escape hatch, opt-in and doubly gated.
 *
 * A reviewer cycling through the packet's synthetic accounts trips the sign-in
 * budget (5/15min, keyed on username + shared reviewer IP) and the account
 * lockout (5 failures = 15 minutes) within minutes, which reads as the site
 * being broken rather than as a control working. This flag turns the throttling
 * off for that run only.
 *
 * It requires BOTH the explicit opt-in AND `isDemonstrationDatabaseTarget`,
 * which itself refuses anything but a pinned demo database (loopback test/review
 * /ci name, or the pinned cloud host plus name). A production deployment cannot
 * enable it by setting the flag alone, so SECURITY-v1 stays the live policy and
 * the handbook's control remains implemented, not deleted.
 */
export function demoSignInFreedomEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    env.SIS_ENABLE_DEMO_UNLIMITED_SIGNIN === 'true' &&
    isDemonstrationDatabaseTarget(env)
  );
}

interface Window {
  hits: number[];
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  /** Current bucket count (demo observability for the ops backlog). */
  get size(): number {
    return this.windows.size;
  }

  check(
    key: string,
    maxAttempts: number,
    windowMinutes: number,
  ): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { hits: [] };
      this.windows.set(key, entry);
      if (this.windows.size > MAX_BUCKETS) {
        const oldest = this.windows.keys().next();
        if (!oldest.done) this.windows.delete(oldest.value);
      }
    }
    entry.hits = entry.hits.filter((t) => now - t < windowMs);
    if (entry.hits.length >= maxAttempts) {
      const retryAfterSeconds = Math.ceil(
        (entry.hits[0] + windowMs - now) / 1000,
      );
      return {
        allowed: false,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      };
    }
    entry.hits.push(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  static signInLimit() {
    return SECURITY_V1.rateLimits.signIn;
  }

  static recoveryLimit() {
    return SECURITY_V1.rateLimits.recovery;
  }

  static grantLimit() {
    return SECURITY_V1.rateLimits.grant;
  }

  static grantResolveLimit() {
    return SECURITY_V1.rateLimits.grantResolve;
  }

  static readLimit() {
    return SECURITY_V1.rateLimits.read;
  }

  static catalogueSearchLimit() {
    return SECURITY_V1.rateLimits.catalogueSearch;
  }

  static workspaceSwitchLimit() {
    return SECURITY_V1.rateLimits.workspaceSwitch;
  }

  // Task 1.2: Contact verification, MFA, Step-up
  static contactVerificationLimit() {
    return SECURITY_V1.rateLimits.contactVerification;
  }

  static mfaEnrollmentLimit() {
    return SECURITY_V1.rateLimits.mfaEnrollment;
  }

  static stepUpLimit() {
    return SECURITY_V1.rateLimits.stepUp;
  }

  /** Progressive delay before auth failure responses (caps at 5s). */
  static failureDelayMs(failures: number): number {
    return Math.min(Math.max(failures, 1), 5) * 1000;
  }
}
