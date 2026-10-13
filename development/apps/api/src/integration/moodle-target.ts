/**
 * Canonical Moodle target identity.
 *
 * The identity of a Moodle instance is the triple
 * `(normalized URL hostname, numeric siteid, exact release string)`, and
 * this module is the only place that triple is defined: no later slice
 * re-derives it. `siteid` is Moodle's site-course `SITEID`, not a tenant
 * identifier, and it is not by itself proof of a unique tenant — the
 * hostname proves the tenant target, `siteid` checks the site-course
 * identity, and the exact `release` string is the version gate.
 *
 * The module is pure. It performs no network call, reads no environment
 * value, and touches no filesystem or database; the
 * `core_webservice_get_site_info` request itself lives in
 * `moodle-live.ts`. Every failure is fail-closed: `host`, `siteId` and
 * `release` are mandatory, and a missing, mistyped or unparseable one
 * throws rather than being defaulted. Moodle's numeric `version` is the
 * one field that is not — it is evidence, is never compared, and is
 * recorded as `''` when the response omits it or reports a non-string.
 */

/** Canonical identity as reported by `core_webservice_get_site_info`. */
export interface TargetIdentity {
  /** Moodle site-course `SITEID`; a positive integer. */
  siteId: number;
  /** Exact human-readable release string, compared verbatim. */
  release: string;
  /** Moodle's numeric build string. Evidence only — never compared as
   * the release. Empty when the response did not report one. */
  numericVersion: string;
}

/** The triple the deployment was configured with, before any call. */
export interface ExpectedIdentity {
  /** Already normalized by `normalizeHost`. */
  host: string;
  siteId: number;
  release: string;
}

/** The triple the target actually reported. `numericVersion` is evidence
 * and is never part of the verdict, so it is optional here: a caller
 * that never read a numeric build still compares the canonical triple. */
export interface ActualIdentity extends ExpectedIdentity {
  numericVersion?: string;
}

/** The only field names a mismatch may carry. */
export type IdentityField = 'host' | 'siteId' | 'release';

/**
 * A resolved ASCII reg-name: dot-separated labels of letters, digits and
 * hyphens, with no empty, leading-hyphen or trailing-hyphen label.
 * Internal repeated hyphens are permitted because the punycode `xn--`
 * prefix depends on them. Deliberately strict — an unrecognisable host
 * is refused rather than guessed at.
 */
const ASCII_HOSTNAME =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

/** Characters that cannot appear in a hostname. Checked on the raw
 * value so that a scheme, userinfo, path, query or fragment is refused
 * instead of being silently truncated by URL resolution. `\` belongs here
 * for the same reason: WHATWG resolves it as a path separator for a
 * special scheme, so a value carrying one resolves to its leading
 * segment and the rest is discarded without error. There is no
 * hostname fallback rule here or anywhere else. */
const NOT_IN_HOSTNAME = /[\s\\/:?#@]/;

/**
 * Canonical host spelling for identity comparison: trims surrounding
 * whitespace, lowercases, drops exactly one trailing dot, then resolves
 * through `URL` so that an IDN spelling and its punycode spelling
 * converge on one string. Throws when the value is empty or does not
 * parse as a hostname.
 *
 * The error message names the problem but never repeats the value: a
 * configured target hostname must not reach an error detail, and
 * therefore a log.
 */
export function normalizeHost(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('Cannot normalize the host: expected a string value.');
  }
  const trimmed = raw.trim().toLowerCase();
  const value = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  if (value === '') {
    throw new Error('Cannot normalize the host: the value is empty.');
  }
  if (NOT_IN_HOSTNAME.test(value)) {
    throw new Error(
      'Cannot normalize the host: the value is not a bare hostname.',
    );
  }
  let hostname: string;
  try {
    hostname = new URL(`https://${value}`).hostname;
  } catch {
    throw new Error(
      'Cannot normalize the host: the value is not a valid hostname.',
    );
  }
  if (!ASCII_HOSTNAME.test(hostname)) {
    throw new Error(
      'Cannot normalize the host: the value is not a valid hostname.',
    );
  }
  return hostname;
}

/**
 * Reads the canonical triple out of a `core_webservice_get_site_info`
 * body. The body arrives as `unknown` from a network response, so it is
 * narrowed explicitly and `null`, non-objects and arrays are refused by
 * name rather than escaping as an incidental `TypeError`.
 *
 * `siteid` must be a number that is a positive integer and `release` a
 * non-empty string; both are mandatory and a missing or wrong-typed
 * field throws. Moodle's numeric `version` is recorded as
 * `numericVersion` for evidence only and never substitutes for the
 * `release` comparison.
 */
export function parseSiteInfo(body: unknown): TargetIdentity {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error(
      'core_webservice_get_site_info returned a body that is not an object with a numeric siteid and a release string.',
    );
  }
  const record = body as Record<string, unknown>;
  const { siteid, release, version } = record;
  if (
    typeof siteid !== 'number' ||
    !Number.isInteger(siteid) ||
    siteid <= 0
  ) {
    throw new Error(
      'core_webservice_get_site_info siteid must be a positive integer; a missing or non-integer siteid fails closed.',
    );
  }
  if (typeof release !== 'string' || release.trim() === '') {
    throw new Error(
      'core_webservice_get_site_info release must be a non-empty string; a missing or empty release fails closed.',
    );
  }
  return {
    siteId: siteid,
    release,
    numericVersion: typeof version === 'string' ? version : '',
  };
}

/**
 * Compares the configured triple against the triple the target reported.
 * Reports every mismatched field — not just the first — in the order
 * `host`, `siteId`, `release`, so an operator sees the whole
 * disagreement in one refusal.
 *
 * The verdict carries field names only. It never returns a compared
 * value, so a mismatch record cannot leak a target hostname, site id or
 * release into a log line or an audit row. `numericVersion` is not
 * compared at all: a differing build string never changes the verdict,
 * because the exact `release` string is the version gate.
 */
export function assertTargetIdentity(
  expected: ExpectedIdentity,
  actual: ActualIdentity,
): { ok: true } | { ok: false; mismatches: IdentityField[] } {
  const mismatches: IdentityField[] = [];
  if (expected.host !== actual.host) mismatches.push('host');
  if (expected.siteId !== actual.siteId) mismatches.push('siteId');
  if (expected.release !== actual.release) mismatches.push('release');
  return mismatches.length === 0 ? { ok: true } : { ok: false, mismatches };
}
