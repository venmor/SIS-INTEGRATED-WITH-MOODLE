import { createHash } from 'node:crypto';
import { MOODLE_LIVE_V1 } from '@sis/config';
import { normalizeHost } from './moodle-target.js';

/**
 * Fail-closed live-test configuration.
 *
 * This module is the only place that turns an operator's environment into
 * either a validated `LiveTestDescriptor` or a list of stable refusal
 * codes. There is no third outcome and no partial success: a failed
 * `live-test` resolves to `live-test-disabled` and never falls back to the
 * simulator, because a silent fallback is how a refused rehearsal would
 * report itself as a successful simulator run.
 *
 * Three properties are load-bearing and are pinned by the spec file:
 *
 * 1. Every failing check is collected, so an operator sees the whole list
 *    in one startup instead of fixing one variable per restart.
 * 2. The refusal surface carries reason codes only. No configured value,
 *    no token, no URL and no `normalizeHost` message reaches a returned
 *    `reasons` array, so a refusal can be logged, audited or returned over
 *    HTTP without leaking a target.
 * 3. `token` is a non-enumerable own property of the descriptor, so
 *    `JSON.stringify`, spread and `Object.assign` omit it while
 *    `descriptor.token` still reads normally. The spec forbids the token in
 *    any log line, audit record, error message, test report or browser
 *    payload, and a descriptor is exactly the kind of value that reaches
 *    all six by accident.
 *
 * The module is pure: a function of its `env` argument alone. It performs
 * no network call, opens no socket, reads no filesystem or database, and
 * defaults to `process.env` only so the API can call it with no argument.
 * It is also total — it never throws, whatever the environment holds, so a
 * misconfigured deployment gets a refusal rather than a stack trace that
 * could carry the value that broke it.
 *
 * This module, not `normalizeHost`, owns the judgement that a configured
 * origin is the intended target. `normalizeHost` only answers "what is the
 * canonical spelling of this hostname"; it imposes no length or
 * multi-label bound, accepts `localhost`, and cannot know anything about
 * which tenant an operator meant. The tenant check is the allowlist
 * comparison below, and a subdomain, a suffix or a different label never
 * matches it.
 */

/**
 * Every way a `live-test` configuration can be refused. Stable strings,
 * safe to log, audit and return over HTTP: they name a field and a
 * problem, never a value.
 */
export type LiveTestRefusalCode =
  | 'MODE_INVALID'
  | 'URL_NOT_HTTPS'
  | 'URL_HAS_PATH'
  | 'URL_HAS_USERINFO'
  | 'URL_HAS_QUERY'
  | 'HOST_NOT_ALLOWED'
  | 'TOKEN_MISSING'
  | 'SITE_ID_INVALID'
  | 'RELEASE_MISSING'
  | 'ROLE_IDS_INVALID'
  | 'CATEGORY_INVALID'
  | 'VISIBILITY_INVALID'
  | 'RUN_ID_MISSING'
  | 'DB_FINGERPRINT_MISSING'
  | 'COHORT_PREFIX_MISMATCH';

/**
 * A validated, non-secret live-test target. Everything here has already
 * been checked, so a consumer may use these values without re-deriving a
 * rule.
 */
export interface LiveTestDescriptor {
  /** `https://<host>`, never with a trailing slash. */
  baseUrl: string;
  /** Canonical hostname, already normalized for identity comparison. */
  host: string;
  /** Moodle's site-course `SITEID`; a positive integer. */
  siteId: number;
  /** Exact release string, compared verbatim against the target's. */
  release: string;
  /** Moodle role shortname to numeric role id. Never defaulted. */
  roleIds: Record<string, number>;
  /** Course category id; a positive integer. */
  categoryId: number;
  /** Whether a created test course is visible to enrolled users. */
  courseVisible: 0 | 1;
  /** Identifier of the live-test run this descriptor belongs to. */
  runId: string;
  /** Non-secret database identity, 64 lowercase hex characters. */
  dbFingerprint: string;
  /** Reserved cohort namespace; equal to the policy constant. */
  cohortPrefix: string;
  restPath: string;
  timeoutMs: number;
  /** sha256 over every other field. Never the token. */
  configFingerprint: string;
  /**
   * The Moodle web-service token. Read it as `descriptor.token`; never
   * spread, serialise or log the descriptor itself — the property is
   * non-enumerable precisely so that those operations cannot reach it.
   */
  token: string;
}

/** The descriptor without the two values a fingerprint must never see. */
export type LiveTestDescriptorCore = Omit<
  LiveTestDescriptor,
  'token' | 'configFingerprint'
>;

/** The three outcomes. `live-test-disabled` is a resolution, not a mode. */
export type BackendSelection =
  | { kind: 'simulator' }
  | { kind: 'live-test'; descriptor: LiveTestDescriptor }
  | { kind: 'live-test-disabled'; reasons: LiveTestRefusalCode[] };

/**
 * A positive integer in the only spelling this module accepts: digits
 * only, no sign, no decimal point, no exponent, no surrounding
 * whitespace, no leading zero. `Number()` alone would accept `' 2 '`,
 * `'2.0'`, `'+2'`, `'0x2'` and `'1e3'`, so a configured id is matched
 * against this pattern before it is parsed — a value is never quietly
 * rewritten into a different one.
 */
const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

/** The non-secret database identity, exactly 64 lowercase hex characters. */
const DB_FINGERPRINT = /^[0-9a-f]{64}$/;

/** `LiveTestDescriptorCore` while it is still being assembled: every
 *  value that a refusal code guards is nullable until its own check has
 *  run. */
interface LiveTestDraft extends LiveTestDraftNullable {
  restPath: string;
  timeoutMs: number;
}

interface LiveTestDraftNullable {
  baseUrl: string;
  host: string | null;
  siteId: number | null;
  release: string;
  roleIds: Record<string, number> | null;
  categoryId: number | null;
  courseVisible: 0 | 1 | null;
  runId: string;
  dbFingerprint: string;
  cohortPrefix: string;
}

/** Type predicate that states the narrowing the checks already imply. */
function isComplete(draft: LiveTestDraft): draft is LiveTestDescriptorCore {
  return (
    draft.host !== null &&
    draft.siteId !== null &&
    draft.roleIds !== null &&
    draft.categoryId !== null &&
    draft.courseVisible !== null
  );
}

/**
 * Reads one environment value as a string. A non-string, `undefined` or
 * absent value reads as empty, so a caller that passes something other
 * than an environment object is refused rather than throwing.
 */
function read(env: NodeJS.ProcessEnv, name: string): string {
  if (typeof env !== 'object' || env === null) return '';
  const raw = (env as Record<string, unknown>)[name];
  return typeof raw === 'string' ? raw : '';
}

/**
 * Presence, judged on the trimmed value. A whitespace-only value is
 * absent for any purpose that needs content, while the value itself is
 * still carried verbatim — presence is a question, not a licence to
 * rewrite what the operator configured.
 */
function isPresent(raw: string): boolean {
  return raw.trim() !== '';
}

/** `normalizeHost` throws on anything that is not a bare hostname. The
 *  throw is turned into `null` here so the caller can answer with a
 *  refusal code, and so no `normalizeHost` message — which names no input
 *  today, and must stay that way — can reach an output. */
function normalizeHostOrNull(raw: string): string | null {
  try {
    return normalizeHost(raw);
  } catch {
    return null;
  }
}

/** A positive integer, or `null` for every other spelling. */
function parsePositiveInteger(raw: string): number | null {
  if (!POSITIVE_INTEGER.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Every allowlist entry, normalized. Returns `null` — the whole list is
 * refused — when the list is absent, empty, or holds one entry
 * `normalizeHost` rejects. A malformed entry is never dropped: silently
 * dropping it narrows the allowlist to something the operator did not
 * write, and startup would then depend on a typo.
 */
function parseAllowedHosts(raw: string): string[] | null {
  if (!isPresent(raw)) return null;
  const hosts: string[] = [];
  for (const entry of raw.split(',')) {
    const host = normalizeHostOrNull(entry);
    if (host === null) return null;
    hosts.push(host);
  }
  return hosts.length === 0 ? null : hosts;
}

/**
 * `MOODLE_ROLE_IDS` as a shortname-to-id map, or `null` when it is
 * unusable. A role is never defaulted and an unknown shortname is never
 * invented: a missing role id has to be an explicit refusal, because a
 * defaulted id would apply a Moodle role nobody chose.
 */
function parseRoleIds(raw: string): Record<string, number> | null {
  if (!isPresent(raw)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) return null;
  const roleIds: Record<string, number> = {};
  for (const [shortname, id] of entries) {
    if (
      shortname.trim() === '' ||
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      return null;
    }
    roleIds[shortname] = id;
  }
  return roleIds;
}

/**
 * Canonical JSON: object keys sorted at every depth. Sorting only the
 * top level would leave the fingerprint sensitive to the key order
 * `MOODLE_ROLE_IDS` happens to be written in, which is not a difference in
 * the target's configuration.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * The configuration fingerprint: sha256 over the descriptor's canonical
 * JSON with the keys sorted, excluding `token` and `configFingerprint`
 * itself.
 *
 * Excluding `token` is what lets two deployments that differ only in their
 * credential share a fingerprint, so rotating a token never invalidates a
 * prepared run. Excluding `configFingerprint` is what stops the digest
 * from being computed over itself. The exclusion is applied here as well
 * as at construction, so a caller that hands over a whole descriptor still
 * gets the same digest.
 */
export function configFingerprint(
  d: Omit<LiveTestDescriptor, 'token' | 'configFingerprint'>,
): string {
  const { token, configFingerprint: _fingerprint, ...core } = d as
    LiveTestDescriptor;
  void token;
  void _fingerprint;
  return createHash('sha256').update(canonicalJson(core)).digest('hex');
}

/**
 * Resolves the environment into exactly one of three outcomes.
 *
 * An absent or `simulator` mode returns the simulator before any other
 * check runs. Any other mode value — including the legacy `live` that
 * earlier revisions inferred from a URL and a token — is `MODE_INVALID`
 * *and* every other code found in a `live-test`-shaped environment, so
 * an operator migrating from the old contract is told both that the mode
 * label is wrong and what else is still missing.
 */
export function selectBackend(
  env: NodeJS.ProcessEnv = process.env,
): BackendSelection {
  const mode = read(env, 'MOODLE_INTEGRATION_MODE').trim();
  if (mode === '' || mode === 'simulator') return { kind: 'simulator' };

  const reasons: LiveTestRefusalCode[] = [];
  if (mode !== 'live-test') reasons.push('MODE_INVALID');

  // Allowlist first: it is read whether or not the URL parses, so a
  // missing or malformed list is always reported.
  const allowedHosts = parseAllowedHosts(read(env, 'MOODLE_ALLOWED_HOST'));

  // A URL that is absent, unparseable or not https is `URL_NOT_HTTPS`: it
  // is not an https origin. The shape codes below only apply to a URL that
  // parsed, because there is nothing to inspect otherwise — and a value
  // that cannot be parsed is refused either way.
  const rawUrl = read(env, 'MOODLE_API_URL');
  let host: string | null = null;
  let baseUrl = '';
  // True only when there is no URL to judge at all. A URL that parsed but
  // is not an https origin is still judged, so its host is checked too.
  let urlRefused = false;
  if (!isPresent(rawUrl)) {
    urlRefused = true;
    reasons.push('URL_NOT_HTTPS');
  } else {
    let url: URL | null = null;
    try {
      url = new URL(rawUrl);
    } catch {
      url = null;
    }
    if (url === null) {
      urlRefused = true;
      reasons.push('URL_NOT_HTTPS');
    } else {
      if (url.protocol !== 'https:') reasons.push('URL_NOT_HTTPS');
      if (url.pathname !== '/' && url.pathname !== '') {
        reasons.push('URL_HAS_PATH');
      }
      if (url.username !== '' || url.password !== '') {
        reasons.push('URL_HAS_USERINFO');
      }
      if (url.search !== '') reasons.push('URL_HAS_QUERY');
      // No code in the union names a fragment, so a fragment is refused
      // under the sibling it is closest to. Recorded as a gap: a
      // `URL_HAS_FRAGMENT` code would name it honestly.
      if (url.hash !== '') reasons.push('URL_HAS_QUERY');
      host = normalizeHostOrNull(url.hostname);
      // A port is part of the origin, so it is carried into `baseUrl`
      // rather than dropped: silently connecting to a different port than
      // the operator configured would be a change of target they never
      // asked for. It is not a separate refusal because the hostname — the
      // tenant proof — is still allowlisted exactly.
      baseUrl = `https://${url.port === '' || host === null ? host : `${host}:${url.port}`}`;
    }
  }
  // One decision and one push, so the reason list can never carry the same
  // code twice. When the URL is judged, the host must normalize to a bare
  // hostname and appear on the allowlist; exact comparison of normalized
  // values, so a subdomain, a suffix or a substring never matches. When the
  // URL itself is already refused and the allowlist is usable, there is no
  // host problem to report.
  if (!urlRefused) {
    if (host === null || allowedHosts === null || !allowedHosts.includes(host)) {
      reasons.push('HOST_NOT_ALLOWED');
    }
  } else if (allowedHosts === null) {
    reasons.push('HOST_NOT_ALLOWED');
  }

  const token = read(env, 'MOODLE_API_TOKEN');
  if (!isPresent(token)) reasons.push('TOKEN_MISSING');

  const siteId = parsePositiveInteger(read(env, 'MOODLE_EXPECTED_SITE_ID'));
  if (siteId === null) reasons.push('SITE_ID_INVALID');

  const release = read(env, 'MOODLE_EXPECTED_VERSION');
  if (!isPresent(release)) reasons.push('RELEASE_MISSING');

  const roleIds = parseRoleIds(read(env, 'MOODLE_ROLE_IDS'));
  if (roleIds === null) reasons.push('ROLE_IDS_INVALID');

  const categoryId = parsePositiveInteger(read(env, 'MOODLE_CATEGORY_ID'));
  if (categoryId === null) reasons.push('CATEGORY_INVALID');

  const rawVisible = read(env, 'MOODLE_COURSE_VISIBLE');
  const courseVisible: 0 | 1 | null =
    rawVisible === '0' ? 0 : rawVisible === '1' ? 1 : null;
  if (courseVisible === null) reasons.push('VISIBILITY_INVALID');

  const runId = read(env, 'MOODLE_LIVE_TEST_RUN_ID');
  if (!isPresent(runId)) reasons.push('RUN_ID_MISSING');

  const dbFingerprint = read(env, 'MOODLE_LIVE_TEST_DB_FINGERPRINT');
  if (!DB_FINGERPRINT.test(dbFingerprint)) {
    reasons.push('DB_FINGERPRINT_MISSING');
  }

  const cohortPrefix = read(env, 'MOODLE_LIVE_TEST_COHORT_PREFIX');
  if (cohortPrefix !== MOODLE_LIVE_V1.cohortPrefix) {
    reasons.push('COHORT_PREFIX_MISMATCH');
  }

  const draft: LiveTestDraft = {
    baseUrl,
    host,
    siteId,
    release,
    roleIds,
    categoryId,
    courseVisible,
    runId,
    dbFingerprint,
    cohortPrefix,
    restPath: MOODLE_LIVE_V1.restPath,
    timeoutMs: MOODLE_LIVE_V1.timeoutMs,
  };

  // A null field and its refusal code are the same event, so an incomplete
  // draft always has at least one code to report. The order is inverted
  // deliberately: the code list is checked first, and the type predicate
  // then narrows the draft for the descriptor below.
  if (!isComplete(draft)) {
    return { kind: 'live-test-disabled', reasons };
  }
  if (reasons.length > 0) {
    return { kind: 'live-test-disabled', reasons };
  }

  const descriptor: LiveTestDescriptor = {
    ...draft,
    configFingerprint: configFingerprint(draft),
    token,
  };
  // The token is a readable own property and an invisible enumerable one,
  // so every consumer of `descriptor.token` is unaffected while
  // `JSON.stringify`, spread and `Object.assign` cannot reach it.
  Object.defineProperty(descriptor, 'token', {
    value: token,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return { kind: 'live-test', descriptor };
}
