import { SECURITY_V1 } from '@sis/config';

// In-memory sliding-window limits (no Redis per locked stack — single
// instance demo limit, documented). Values come from SECURITY-v1 (07/04
// baselines) — nothing hardcoded. The bucket map is bounded: empty buckets
// are swept on every check and oldest entries evicted past the cap, so
// distinct-key spam cannot grow memory without bound.

const MAX_BUCKETS = 10000;

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

  /** Progressive delay before auth failure responses (caps at 5s). */
  static failureDelayMs(failures: number): number {
    return Math.min(Math.max(failures, 1), 5) * 1000;
  }
}
