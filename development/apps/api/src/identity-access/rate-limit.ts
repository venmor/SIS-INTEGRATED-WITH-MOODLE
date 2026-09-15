import { SECURITY_V1 } from '@sis/config';

// In-memory sliding-window limits (no Redis per locked stack). Values come
// from SECURITY-v1 (07/04 baselines) — nothing hardcoded.

interface Window {
  hits: number[];
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  check(key: string, maxAttempts: number, windowMinutes: number): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { hits: [] };
      this.windows.set(key, entry);
    }
    entry.hits = entry.hits.filter((t) => now - t < windowMs);
    if (entry.hits.length >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.hits[0] + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
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

  static workspaceSwitchLimit() {
    return SECURITY_V1.rateLimits.workspaceSwitch;
  }

  /** Progressive delay before auth failure responses (caps at 5s). */
  static failureDelayMs(failures: number): number {
    return Math.min(Math.max(failures, 1), 5) * 1000;
  }
}
