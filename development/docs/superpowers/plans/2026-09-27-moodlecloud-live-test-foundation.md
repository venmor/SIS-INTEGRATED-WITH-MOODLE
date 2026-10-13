# MoodleCloud Live-Test Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Moodle live path impossible to arm by accident, prove it targets the intended MoodleCloud test site, and add the `MoodleLiveTestRun` state machine that every later live-test plan depends on — with no live Moodle call possible until a reviewed fresh-authentication mechanism exists.

**Architecture:** Replace URL-plus-token auto-arming with an explicit `MOODLE_INTEGRATION_MODE` that resolves to exactly one of `simulator`, `live-test`, or `live-test-disabled`, each carrying either a validated non-secret descriptor or a list of stable refusal codes. Target identity is proven by one read-only `core_webservice_get_site_info` call compared against a canonical `(hostname, siteid, release)` triple. All state lives in four new Prisma models plus a hand-written SQL migration, governed by a transition table that encodes role, capability, fresh-authentication, and second-approver requirements as data. A new `ReauthenticationService` implements the `REQ-IAM-005` enforcement point that the handbook names but that has never existed; it ships **disabled by default**, so `PREPARED → RUNNING` is refused until a human decision enables it.

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL, Next.js App Router + CSS Modules, Vitest, `@sis/config` policy package.

**Spec:** `development/docs/superpowers/specs/2026-09-25-moodlecloud-test-live-integration-design.md` (approved 2026-09-27)

## Global Constraints

- `MOODLE-SIM-v1` remains the ordinary default. `simulator` mode makes no Moodle network request.
- `live-test` is the only mode that may reach Moodle, and only after every startup check passes.
- A failed `live-test` validation resolves to `live-test-disabled` with stable reason codes. It must never fall back to the simulator, and must never report a partial success.
- `MoodleLiveTestRun` states are exactly `PREPARED`, `RUNNING`, `PAUSED`, `COMPLETED`, `FAILED`, `CLOSED`. `COMPLETED`, `FAILED`, `CLOSED` are terminal. No generic state PATCH endpoint exists.
- Only `RUNNING` may authorize a live-test Moodle write. This plan implements no live write; the delivery worker's claim gate is Plan 3.
- Moodle REST requests are `POST application/x-www-form-urlencoded`. Moodle 4.5.6 reads external-function parameters from merged `$_GET`/`$_POST`; a JSON body is invalid.
- The token travels as the `wstoken` query parameter. It is never stored in a database row, log line, audit record, error message, test report, screenshot, or browser payload.
- Canonical target identity is `(normalized URL hostname, numeric siteid, exact release string)`. `siteid` is Moodle's site-course `SITEID`, not a tenant identifier. The numeric `version` field never replaces the `release` comparison.
- The service authorizes exactly the twelve functions in spec §7 and may not substitute another function on error.
- An unknown or unclassified Moodle failure is a manual-review outcome. `RETRY` is never returned for an unclassified error.
- Every command in §8 answers an unauthorized caller with 403 plus an audit record, and an out-of-scope run/mapping/manifest with a neutral 404.
- No production Moodle, no real student/staff data, no production credentials, and no institutional approval are claimed anywhere in this work.
- Repository verification for every task: `npm run typecheck` and `npm run lint` from `development/`, plus `npx vitest run <spec>` from `development/apps/api`.

## Review Focus

Five input classes the spec requires behaviour for but no task's happy-path test would catch. Each has a test pinned to the task that owns the code.

1. **A host that is genuinely a different site but looks like an allowlisted one** — `www.moodle.example.edu` against an allowlist entry of `moodle.example.edu`, or a suffix like `evil-moodle.example.edu`. A reasonable person expects an exact-host allowlist, so a substring or suffix match must be refused, never accepted loosely. Note the distinction from *normalization*: spec §6.1 defines identity over the **normalized** hostname, so mixed case and one trailing dot (`MOODLE.Example.EDU.`) are **accepted and normalized to the same host** — refusing those would itself be an allowlist bypass, because `moodle.example.edu.` is the same site. The refusal case is the different-label one. → Task 2 test `refuses a host that differs by a label, naming only the field`.
2. **A Moodle site answering `200 text/html`** — a maintenance page, a proxy login wall, or a login redirect body instead of JSON. A reasonable person expects "not a Moodle REST response", so it must be manual review, never `RETRY`, and must not surface raw HTML. → Task 8 test `classifies a non-JSON 200 body as UNKNOWN manual review`.
3. **Two live-test runs in one database**, or a run created against a different database. A reasonable person expects one active run and a fingerprint mismatch, so the second create must be refused with 409 and a mismatched fingerprint must block `RUNNING`. → Task 6 tests `refuses a second active run in the same database` and `blocks the start transition when the database fingerprint does not match`.
4. **A `MOODLE_EXPECTED_SITE_ID` that is not a site-course id** — a tenant identifier, a UUID, `0`, `-1`, or `2.5`. A reasonable person expects refusal, because accepting it would compare the wrong identity and silently pass a production-looking site. → Task 2 test `refuses a site id that is not a positive integer`.
5. **Authority that expires between approval and execution** — the approver's `RoleAssignment.endsAt` passes, or the session is revoked, between reading the decision page and submitting the command. A reasonable person expects the command to fail closed, because a stale four-eyes approval is not a fresh one. → Task 6 test `refuses a transition whose approver assignment expired before execution`, and Task 7 test `rejects a fresh-authentication reference from a revoked session`.

## File Structure

**New — policy and protocol (no database access):**
- `development/packages/config/src/moodle.ts` — add `MOODLE_LIVE_V1`; remove the `live` block from `MOODLE_DEMO_V1` so no policy object arms a live connection from a URL and token.
- `development/packages/config/src/index.ts` — export `MOODLE_LIVE_V1`.
- `development/apps/api/src/integration/moodle-target.ts` — canonical identity, host normalization, `core_webservice_get_site_info` response parsing, expected-vs-actual comparison. No I/O.
- `development/apps/api/src/integration/moodle-live-config.ts` — environment to `LiveTestDescriptor` or `live-test-disabled` reason codes. Owns every startup check.
- `development/apps/api/src/integration/moodle-scope.ts` — non-secret database identity and fingerprint, scope-manifest checksum.
- `development/apps/api/src/integration/moodle-rest.ts` — `MoodleApiError`, deterministic PHP bracket form encoding, response-envelope validation, failure classification. Imports nothing from the adapter.

**New — state:**
- `development/apps/api/src/integration/moodle-live-run.service.ts` — the run state machine and transition table.
- `development/apps/api/src/identity-access/reauthentication.service.ts` — the `REQ-IAM-005` fresh-authentication enforcement point, disabled by default.
- `development/prisma/migrations/20260927100000_ph6_live_test_safety/migration.sql` — the four tables, the state check constraint, the filtered unique index enforcing one active run, and the two append-only triggers Prisma cannot express.

**New — tests:**
- `development/apps/api/src/integration/moodle-target.spec.ts`
- `development/apps/api/src/integration/moodle-live-config.spec.ts`
- `development/apps/api/src/integration/moodle-scope.spec.ts`
- `development/apps/api/src/integration/moodle-live-run.service.spec.ts`
- `development/apps/api/src/identity-access/reauthentication.service.spec.ts`
- `development/apps/api/src/integration/moodle-rest.spec.ts`
- `development/scripts/check-source.spec.ts`

**Modified:**
- `development/apps/api/src/integration/moodle-adapter.ts` — `MoodleBackend` gains `live-test`; `selectBackend()` delegates to `moodle-live-config.ts`.
- `development/apps/api/src/integration/moodle-live.ts` — take a validated descriptor, send form-encoded bodies, validate response contracts, refuse unauthorized functions, read real enrolment status.
- `development/apps/api/src/integration/moodle-live.spec.ts` — transport seam instead of `MOODLE_API_URL` arming.
- `development/apps/api/src/integration/integration.service.ts` — `adapter()` refuses when disabled; health exposes run state and the non-secret descriptor.
- `development/apps/api/src/integration/integration.controller.ts` — live-test run endpoints.
- `development/apps/api/src/integration/dto.ts` — run command DTOs.
- `development/apps/api/src/identity-access/identity-access.module.ts` — provide/export `ReauthenticationService`.
- `development/apps/api/src/integration/integration.module.ts` — provide/export `MoodleLiveRunService`.
- `development/prisma/schema.prisma` — four models, `MoodleConnection` fields, `Session.authedAt`.
- `development/apps/web/app/admin/moodle/page.tsx` — live-test run state block.
- `development/.env.example` — the full live-test variable contract.
- `development/scripts/check-source.mjs` — refuse a committed Moodle token.
- `development/docs/operations/MOODLE-LIVE-SETUP.md` — the target-version capability contract, marked as not production approval.
- `development/docs/task-packets/TASK-PH6-007.md` — the live-test foundation packet this plan implements.
- `development/docs/gaps/GAP-023-fresh-reauthentication-mechanism.md` — the fail-closed gap record.

---

### Task 1: Explicit mode and the `MOODLE_LIVE_V1` policy

**Files:**
- Modify: `development/packages/config/src/moodle.ts`
- Modify: `development/packages/config/src/index.ts`
- Modify: `development/apps/api/src/integration/moodle-adapter.ts`
- Modify: `development/apps/web/app/admin/moodle/mappings/validate.tsx`
- Test: `development/apps/api/src/integration/moodle-live-config.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MOODLE_LIVE_V1` (config package), `MoodleBackend = 'simulator' | 'live-test'` (`moodle-adapter.ts`), and `selectBackend(env?)` re-exported from `moodle-live-config.ts` in Task 3. `moodle-live.ts` and `integration.service.ts` must stop importing `policy.live`; they read `timeoutMs`, `restPath`, `tokenParam`, and `formatParam` from `MOODLE_LIVE_V1`.

- [ ] **Step 1: Write the failing test**

In `moodle-live-config.spec.ts`:

```ts
import { MOODLE_DEMO_V1, MOODLE_LIVE_V1 } from '@sis/config';

it('keeps the simulator the default and never arms live from a URL and token', () => {
  expect(MOODLE_LIVE_V1.version).toBe('MOODLE-LIVE-TEST-v1');
  expect(MOODLE_LIVE_V1.provider).toBe('MOODLE-CLOUD-TEST');
  expect(MOODLE_DEMO_V1.provider).toBe('MOODLE-SIM-v1');
  expect('live' in MOODLE_DEMO_V1).toBe(false);
  expect(MOODLE_LIVE_V1.modes).toEqual(['simulator', 'live-test']);
  expect(MOODLE_LIVE_V1.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
  expect(MOODLE_LIVE_V1.restPath).toBe('/webservice/rest/server.php');
  expect(MOODLE_LIVE_V1.tokenParam).toBe('wstoken');
  expect(MOODLE_LIVE_V1.formatParam).toEqual({ moodlewsrestformat: 'json' });
  expect(MOODLE_LIVE_V1.timeoutMs).toBe(15000);
  expect(MOODLE_LIVE_V1.authorisedFunctions).toEqual([
    'core_webservice_get_site_info', 'core_course_get_courses_by_field',
    'core_course_create_courses', 'core_user_get_users',
    'core_enrol_get_enrolled_users', 'enrol_manual_enrol_users',
    'enrol_manual_unenrol_users', 'core_group_get_course_groups',
    'core_group_create_groups', 'core_group_add_group_members',
    'core_group_delete_group_members', 'core_group_get_group_members',
  ]);
  expect(MOODLE_LIVE_V1.runStates).toEqual([
    'PREPARED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CLOSED',
  ]);
  expect(MOODLE_LIVE_V1.terminalStates).toEqual(['COMPLETED', 'FAILED', 'CLOSED']);
  expect(MOODLE_LIVE_V1.requiredEnv).toContain('MOODLE_LIVE_TEST_COHORT_PREFIX');
  expect(MOODLE_LIVE_V1.requiredEnv).not.toContain('MOODLE_REAUTH_MODE');
  // The cohort prefix is a reserved namespace, not a tunable: it must never be
  // derived from a course name, a user, or anything else a test run supplies.
  expect(MOODLE_LIVE_V1.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
});
```

Assert `authorisedFunctions` with an exact `toEqual`, not `toHaveLength(12)` plus two `toContain`. It is the sole guard for the authorised function set until Task 8's `assertAuthorisedFunction` exists, and a length-plus-two-membership check passes an implementation holding ten wrong names or the right twelve in the wrong order.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-config.spec.ts`
Expected: FAIL — `MOODLE_LIVE_V1` is not exported.

- [ ] **Step 3: Add `MOODLE_LIVE_V1` and remove `MOODLE_DEMO_V1.live`**

In `packages/config/src/moodle.ts`, delete the whole `live: { ... }` block from `MOODLE_DEMO_V1` and export the new object with this shape. `authorisedFunctions` is the twelve functions from spec §7 in that order: `core_webservice_get_site_info`, `core_course_get_courses_by_field`, `core_course_create_courses`, `core_user_get_users`, `core_enrol_get_enrolled_users`, `enrol_manual_enrol_users`, `enrol_manual_unenrol_users`, `core_group_get_course_groups`, `core_group_create_groups`, `core_group_add_group_members`, `core_group_delete_group_members`, `core_group_get_group_members`.

```ts
export const MOODLE_LIVE_V1 = {
  version: "MOODLE-LIVE-TEST-v1",
  demo: false,
  provider: "MOODLE-CLOUD-TEST",
  modes: ["simulator", "live-test"],
  cohortPrefix: "SIS-MOODLE-LIVE-TEST-",
  restPath: "/webservice/rest/server.php",
  tokenParam: "wstoken",
  formatParam: { moodlewsrestformat: "json" },
  timeoutMs: 15000,
  authorisedFunctions: [ /* the twelve, verbatim from spec §7 */ ],
  runStates: ["PREPARED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CLOSED"],
  terminalStates: ["COMPLETED", "FAILED", "CLOSED"],
  requiredEnv: [
    "MOODLE_INTEGRATION_MODE", "MOODLE_API_URL", "MOODLE_API_TOKEN",
    "MOODLE_ALLOWED_HOST", "MOODLE_EXPECTED_SITE_ID", "MOODLE_EXPECTED_VERSION",
    "MOODLE_ROLE_IDS", "MOODLE_CATEGORY_ID", "MOODLE_COURSE_VISIBLE",
    "MOODLE_LIVE_TEST_RUN_ID", "MOODLE_LIVE_TEST_DB_FINGERPRINT",
    "MOODLE_LIVE_TEST_COHORT_PREFIX",
  ],
} as const;
```

`requiredEnv` names every variable an operator must supply, so it includes `MOODLE_LIVE_TEST_COHORT_PREFIX` — spec §6.1 lists it among the runtime configuration, and Task 3 reads it and refuses `COHORT_PREFIX_MISMATCH` when it differs from `cohortPrefix`, so an operator who omits it is refused. `MOODLE_REAUTH_MODE` is deliberately **absent**: it defaults to `session-age`, so omitting it is meaningful and is not an error.

`modes` lists only the two values `MOODLE_INTEGRATION_MODE` may take. `live-test-disabled` is a *resolution kind* produced by a failed `live-test`, not a selectable mode, so it does not belong in `modes` — it appears in Task 3's `BackendSelection`. Do not add it here.

Export it from `packages/config/src/index.ts` next to `MOODLE_DEMO_V1`.

- [ ] **Step 4: Change `MoodleBackend` and rename the `selectBackend` label**

In `moodle-adapter.ts` change `export type MoodleBackend = 'simulator' | 'live';` to `'simulator' | 'live-test'`, and change the string `selectBackend()` returns from `'live'` to `'live-test'`.

Leave the body of `selectBackend()` in `moodle-adapter.ts` in this task. The single-implementation re-export

```ts
export { selectBackend } from './moodle-live-config.js';
```

belongs to **Task 3, Step 4**, because Task 3's red test requires `./moodle-live-config.js` not to exist yet; writing the re-export here would make Task 3's mandated failure pass instead. Add a one-line JSDoc on the local `selectBackend` recording that it is the temporary home until Task 3.

- [ ] **Step 5: Repoint `moodle-live.ts` at the new policy**

Replace both `MOODLE_DEMO_V1 as policy` reads of `policy.live` in `moodle-live.ts` with `MOODLE_LIVE_V1` and delete the `as unknown as {...}` casts. `MOODLE_DEMO_V1 as policy` stays imported only if `moodle-live.ts` still uses it; if not, remove the import.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-config.spec.ts`
Expected: PASS.
Run: `cd development && npm run typecheck`
Expected: no errors. Any remaining `'live'` comparison in `integration.service.ts` or `delivery.worker.ts` surfaces here — change it to `'live-test'` without changing behaviour; Task 9 makes the disabled case fail closed.

**The search for residual `'live'` comparisons must cover `apps/web`, not just `apps/api`.** `apps/web/app/admin/moodle/mappings/validate.tsx` compares `out.backend === "live"` against a hand-written `backend?: string`, so `tsc` cannot catch it and no test clicks the button. A live-test connection would render as `Simulator: … Live enrolments affect real courses.` Fix it to branch on `'live-test'`, and prefer narrowing the response type to `MoodleBackend` so the next rename is caught at compile time rather than in a user's browser. Search the whole repository for the literal, not one workspace:

Run: `cd development && grep -rn "=== \"live\"\|=== 'live'\|'live'\s*:" apps/api/src apps/web/app packages`
Expected: no comparison against a bare `'live'` backend label remains.

- [ ] **Step 7: Commit**

```bash
git add development/packages/config/src/moodle.ts development/packages/config/src/index.ts development/apps/api/src/integration/moodle-adapter.ts development/apps/api/src/integration/moodle-live.ts development/apps/api/src/integration/moodle-live-config.spec.ts
git commit -m "feat(moodle): explicit integration mode and live-test policy object"
```

---

### Task 2: Canonical target identity

**Files:**
- Create: `development/apps/api/src/integration/moodle-target.ts`
- Test: `development/apps/api/src/integration/moodle-target.spec.ts`

**Interfaces:**
- Consumes: nothing. `moodle-target.ts` is deliberately import-free: it holds identity comparison, not policy, so importing `MOODLE_LIVE_V1` would couple identity to a config version and add a `packages/config/dist` dependency to a pure function for no behavioural gain. `MOODLE_LIVE_V1` is policy — rest path, token param, timeout, the twelve authorised functions — and none of it belongs here. This also makes the module the one place target identity is defined, so no later task re-derives it.
- Produces: `normalizeHost`, `TargetIdentity`, `ExpectedIdentity`, `ActualIdentity`, `IdentityField`, `parseSiteInfo`, `assertTargetIdentity`. Task 3 consumes `normalizeHost`; Task 9 consumes the rest. `ActualIdentity extends ExpectedIdentity` with `numericVersion?: string` — **not** `extends TargetIdentity`, because the plan's own test builds an `actual` of `{ host, siteId, release }` with no `numericVersion`, which a required field would turn into a `strict` type error; and since `numericVersion` is evidence that is never compared, optional is also the semantically correct shape. Any `{ ...parseSiteInfo(x), host }` value still satisfies it.

- [ ] **Step 1: Write the failing tests**

```ts
it('normalizes case, a trailing dot, and punycode to one host', () => {
  expect(normalizeHost('MOODLE.Example.EDU.')).toBe('moodle.example.edu');
  expect(normalizeHost('moodle.example.edu')).toBe('moodle.example.edu');
  expect(normalizeHost('moodle.example.edu.')).toBe('moodle.example.edu');
  // Verified pair: 'müoodle' is the IDN form of 'xn--moodle-3ya'. An all-ASCII
  // host is already its own punycode form, so a test that claims otherwise is
  // asserting something false.
  expect(normalizeHost('müoodle.example.edu')).toBe('xn--moodle-3ya.example.edu');
  expect(normalizeHost('xn--moodle-3ya.example.edu')).toBe('xn--moodle-3ya.example.edu');
  expect(normalizeHost('xn--moodle-3ya.example.edu')).toBe(normalizeHost('müoodle.example.edu'));
});

it('rejects an empty or whitespace host', () => {
  expect(() => normalizeHost('   ')).toThrow(/host/);
});

it('parses the canonical triple from a site-info response', () => {
  const identity = parseSiteInfo({ siteid: 2, release: '4.5.6 (Build: 20250413)', version: '2024100700' });
  expect(identity).toEqual({ siteId: 2, release: '4.5.6 (Build: 20250413)', numericVersion: '2024100700' });
});

it('fails closed when siteid is missing or not a positive integer', () => {
  expect(() => parseSiteInfo({ release: '4.5.6' })).toThrow(/siteid/);
  expect(() => parseSiteInfo({ siteid: 'tenant-2', release: '4.5.6' })).toThrow(/siteid/);
  expect(() => parseSiteInfo({ siteid: 0, release: '4.5.6' })).toThrow(/siteid/);
});

it('fails closed when the release string is missing', () => {
  expect(() => parseSiteInfo({ siteid: 2 })).toThrow(/release/);
});

it('accepts a matching triple', () => {
  const expected = { host: 'moodle.example.edu', siteId: 2, release: '4.5.6 (Build: 20250413)' };
  const actual = { ...parseSiteInfo({ siteid: 2, release: '4.5.6 (Build: 20250413)' }), host: 'moodle.example.edu' };
  expect(assertTargetIdentity(expected, actual)).toEqual({ ok: true });
});

it('reports every mismatched field rather than the first', () => {
  const expected = { host: 'moodle.example.edu', siteId: 2, release: '4.5.6 (Build: 20250413)' };
  const actual = { host: 'www.moodle.example.edu', siteId: 9, release: '4.4.0 (Build: 20240101)' };
  const result = assertTargetIdentity(expected, actual);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('unreachable');
  expect(result.mismatches).toEqual(['host', 'siteId', 'release']);
});

it('never lets the numeric version stand in for the release string', () => {
  const expected = { host: 'moodle.example.edu', siteId: 2, release: '4.5.6 (Build: 20250413)' };
  const actual = {
    host: 'moodle.example.edu',
    siteId: 2,
    release: '4.5.6 (Build: 20250413)',
    numericVersion: '9999999999',
  };
  expect(assertTargetIdentity(expected, actual).ok).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-target.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `moodle-target.ts`**

```ts
export interface TargetIdentity { siteId: number; release: string; numericVersion: string; }
export interface ExpectedIdentity { host: string; siteId: number; release: string; }
export interface ActualIdentity extends TargetIdentity { host: string; }

export function normalizeHost(raw: string): string;
export function parseSiteInfo(body: unknown): TargetIdentity;
export function assertTargetIdentity(
  expected: ExpectedIdentity,
  actual: ActualIdentity,
): { ok: true } | { ok: false; mismatches: ('host' | 'siteId' | 'release')[] };
```

- `normalizeHost` trims, lowercases, strips exactly one trailing dot, and resolves the result through `new URL('https://' + value).hostname` so punycode and IDN forms converge on one string. It throws when the value is empty or does not parse as a hostname.
- `parseSiteInfo` requires `siteid` to be a number that is a positive integer and `release` to be a non-empty string. Both are mandatory; a missing field throws rather than defaulting. `version` is read as the numeric build string and recorded as `numericVersion` for evidence only — it is never compared as the release.
- `assertTargetIdentity` compares `host`, `siteId`, and `release` and returns every mismatched field name, sorted in that order. It never returns the compared values, so a mismatch message cannot leak a target identifier into a log.
- No function here performs I/O. The `core_webservice_get_site_info` call itself lives in `moodle-live.ts` in Task 9.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-target.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/api/src/integration/moodle-target.ts development/apps/api/src/integration/moodle-target.spec.ts
git commit -m "feat(moodle): canonical target identity and site-info parsing"
```

---

### Task 3: Fail-closed configuration and the validated descriptor

**Files:**
- Create: `development/apps/api/src/integration/moodle-live-config.ts`
- Modify: `development/apps/api/src/integration/moodle-live-config.spec.ts`
- Modify: `development/.env.example`

**Interfaces:**
- Consumes: `MOODLE_LIVE_V1` from `@sis/config`; `normalizeHost` from `moodle-target.ts` (Task 2).
- Produces: `LiveTestDescriptor`, `BackendSelection`, `selectBackend(env?)`, `configFingerprint(d)`, and the reason-code union `LiveTestRefusalCode`. Task 9 consumes `BackendSelection`; Task 6 consumes `configFingerprint`.

- [ ] **Step 1: Write the failing tests**

Append to `moodle-live-config.spec.ts`. Build a valid environment with a helper `validEnv()` that sets every `MOODLE_LIVE_V1.requiredEnv` variable, then override one at a time. Every refusal case asserts the exact reason code appears in `reasons` **and** that `kind === 'live-test-disabled'`.

```ts
it('resolves to the simulator when the mode is unset, even with a url and token', () => {
  const env = { ...validEnv(), MOODLE_INTEGRATION_MODE: undefined };
  expect(selectBackend(env).kind).toBe('simulator');
});

it('resolves to live-test with a validated descriptor when every value is present', () => {
  const env = validEnv();
  const selection = selectBackend(env);
  expect(selection.kind).toBe('live-test');
  if (selection.kind !== 'live-test') throw new Error('unreachable');
  expect(selection.descriptor.host).toBe('moodle.example.edu');
  expect(selection.descriptor.siteId).toBe(2);
  expect(selection.descriptor.release).toBe('4.5.6');
  expect(selection.descriptor.roleIds).toEqual({ Student: 5, Tutor: 6, 'Non-editing tutor': 7 });
  expect(selection.descriptor.categoryId).toBe(1);
  expect(selection.descriptor.courseVisible).toBe(0);
  expect(selection.descriptor.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
  expect(selection.descriptor.configFingerprint).toMatch(/^[0-9a-f]{64}$/);
});

it('produces the same config fingerprint when only the token differs', () => {
  const a = selectBackend({ ...validEnv(), MOODLE_API_TOKEN: 'test-token-never-real-a' });
  const b = selectBackend({ ...validEnv(), MOODLE_API_TOKEN: 'test-token-never-real-b' });
  expect(a.kind).toBe('live-test');
  expect(b.kind).toBe('live-test');
  if (a.kind !== 'live-test' || b.kind !== 'live-test') throw new Error('unreachable');
  expect(a.descriptor.configFingerprint).toBe(b.descriptor.configFingerprint);
  expect(a.descriptor.configFingerprint).not.toContain('test-token');
});

it('produces a different config fingerprint when the expected release differs', () => {
  const a = selectBackend({ ...validEnv(), MOODLE_EXPECTED_VERSION: '4.5.6' });
  const b = selectBackend({ ...validEnv(), MOODLE_EXPECTED_VERSION: '4.5.7' });
  if (a.kind !== 'live-test' || b.kind !== 'live-test') throw new Error('unreachable');
  expect(a.descriptor.configFingerprint).not.toBe(b.descriptor.configFingerprint);
});
```

Then one test per refusal code, each asserting the code is present: `MODE_INVALID` for `MOODLE_INTEGRATION_MODE=live`, `URL_NOT_HTTPS` for `http://`, `URL_HAS_PATH` for `https://moodle.example.edu/moodle`, `URL_HAS_USERINFO` for `https://u:p@moodle.example.edu`, `URL_HAS_QUERY` for a trailing `?x=1`, `HOST_NOT_ALLOWED` when the URL host is not in `MOODLE_ALLOWED_HOST`, `TOKEN_MISSING`, `SITE_ID_INVALID`, `RELEASE_MISSING`, `ROLE_IDS_INVALID` for a non-integer or empty object, `CATEGORY_INVALID`, `VISIBILITY_INVALID` for anything but `0` or `1`, `RUN_ID_MISSING`, `DB_FINGERPRINT_MISSING` for anything not 64 lowercase hex characters, and `COHORT_PREFIX_MISMATCH` when `MOODLE_LIVE_TEST_COHORT_PREFIX` differs from `MOODLE_LIVE_V1.cohortPrefix`.

Plus the three Review Focus cases:

```ts
it('refuses a host that differs only by case or trailing dot', () => {
  const env = { ...validEnv(), MOODLE_ALLOWED_HOST: 'MOODLE.Example.EDU.' };
  const selection = selectBackend(env);
  expect(selection.kind).toBe('live-test-disabled');
  if (selection.kind !== 'live-test-disabled') throw new Error('unreachable');
  expect(selection.reasons).toContain('HOST_NOT_ALLOWED');
});

it('refuses a host whose subdomain differs from the allowed host', () => {
  const env = { ...validEnv(), MOODLE_ALLOWED_HOST: 'www.moodle.example.edu' };
  expect(selectBackend(env)).toMatchObject({ kind: 'live-test-disabled' });
});

it('refuses a site id that is not a positive integer', () => {
  for (const value of ['0', '-1', '2.5', 'tenant-42', 'abc', '']) {
    const selection = selectBackend({ ...validEnv(), MOODLE_EXPECTED_SITE_ID: value });
    expect(selection, `site id ${JSON.stringify(value)}`).toMatchObject({
      kind: 'live-test-disabled',
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-config.spec.ts`
Expected: FAIL — module `./moodle-live-config.js` does not exist.

- [ ] **Step 3: Implement `moodle-live-config.ts`**

```ts
import { createHash } from 'node:crypto';
import { MOODLE_LIVE_V1 } from '@sis/config';
import { normalizeHost } from './moodle-target.js';

export type LiveTestRefusalCode =
  | 'MODE_INVALID' | 'URL_NOT_HTTPS' | 'URL_HAS_PATH' | 'URL_HAS_USERINFO'
  | 'URL_HAS_QUERY' | 'HOST_NOT_ALLOWED' | 'TOKEN_MISSING' | 'SITE_ID_INVALID'
  | 'RELEASE_MISSING' | 'ROLE_IDS_INVALID' | 'CATEGORY_INVALID'
  | 'VISIBILITY_INVALID' | 'RUN_ID_MISSING' | 'DB_FINGERPRINT_MISSING'
  | 'COHORT_PREFIX_MISMATCH';

export interface LiveTestDescriptor {
  baseUrl: string;
  host: string;
  siteId: number;
  release: string;
  roleIds: Record<string, number>;
  categoryId: number;
  courseVisible: 0 | 1;
  runId: string;
  dbFingerprint: string;
  cohortPrefix: string;
  restPath: string;
  timeoutMs: number;
  configFingerprint: string;
  token: string;
}

export type BackendSelection =
  | { kind: 'simulator' }
  | { kind: 'live-test'; descriptor: LiveTestDescriptor }
  | { kind: 'live-test-disabled'; reasons: LiveTestRefusalCode[] };

export function configFingerprint(
  d: Omit<LiveTestDescriptor, 'token' | 'configFingerprint'>,
): string;

export function selectBackend(env: NodeJS.ProcessEnv = process.env): BackendSelection;
```

`selectBackend` collects **every** failing code rather than stopping at the first, so an operator sees the full list in one startup. Implementation rules:

- Mode is `process.env.MOODLE_INTEGRATION_MODE` trimmed. Absent or `simulator` returns `{ kind: 'simulator' }` immediately, before any other check. Anything other than `live-test` (including the legacy `live`) yields `MODE_INVALID` plus every other code found in a `live-test` shaped environment.
- `MOODLE_API_URL` parses with `new URL()`. It must be `https:`, have empty `username`/`password`, empty `search`, empty `hash`, and a `pathname` of `/` or `''`. `baseUrl` is `https://<host>` with no trailing slash.
- Host matching is exact after `normalizeHost` from `moodle-target.ts`: lowercase, one trailing dot stripped, punycode via `new URL('https://' + raw).hostname`. Compare against the comma-separated `MOODLE_ALLOWED_HOST` list the same way. Substrings and suffixes never match.
- `MOODLE_EXPECTED_SITE_ID` must parse as an integer `> 0` with no decimal point.
- `MOODLE_ROLE_IDS` parses as a non-empty object whose every value is a positive safe integer; otherwise `ROLE_IDS_INVALID`. Never default a role.
- `MOODLE_COURSE_VISIBLE` must be exactly `0` or `1`.
- `MOODLE_LIVE_TEST_DB_FINGERPRINT` must match `/^[0-9a-f]{64}$/`.
- `MOODLE_LIVE_TEST_COHORT_PREFIX` must equal `MOODLE_LIVE_V1.cohortPrefix` exactly, case-sensitively.
- `configFingerprint` is `createHash('sha256')` over the JSON of the descriptor with keys in sorted order, **excluding** `token` and `configFingerprint`. Two environments differing only in the token produce the same fingerprint; a test asserts this.
- No refusal message may contain the token, the full URL with userinfo, or any environment value. Codes only.

- [ ] **Step 4: Make `moodle-adapter.ts` delegate to this module**

In `moodle-adapter.ts`, delete the local `selectBackend` body that Task 1 left in place and replace it with the re-export, so exactly one implementation exists and the fail-closed checks cannot be bypassed by calling the adapter's copy:

```ts
export { selectBackend } from './moodle-live-config.js';
```

Remove the temporary JSDoc added in Task 1. `MoodleBackend` stays `'simulator' | 'live-test'`; `integration.service.ts` and `delivery.worker.ts` must not import `selectBackend` from `moodle-adapter.ts` any more if Task 9 repoints them — leave that to Task 9.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-config.spec.ts`
Expected: PASS.

- [ ] **Step 6: Document the full variable contract in `.env.example`**

Replace the three current `MOODLE_*` lines with the whole `MOODLE_LIVE_V1.requiredEnv` list plus `MOODLE_LIVE_TEST_COHORT_PREFIX` and `MOODLE_REAUTH_MODE`, each with a comment stating its refusal code and that the values are placeholders until the target is confirmed. Keep every value empty.

- [ ] **Step 7: Commit**

```bash
git add development/apps/api/src/integration/moodle-live-config.ts development/apps/api/src/integration/moodle-live-config.spec.ts development/apps/api/src/integration/moodle-adapter.ts development/.env.example
git commit -m "feat(moodle): fail-closed live-test configuration and validated descriptor"
```

---

### Task 4: Non-secret database identity, fingerprint, and scope manifest

**Files:**
- Create: `development/apps/api/src/integration/moodle-scope.ts`
- Test: `development/apps/api/src/integration/moodle-scope.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseNonSecretDatabaseIdentity(url)`, `databaseFingerprint(identity, schemaChecksum)`, `fingerprintMatches(expected, actual)`, `manifestChecksum(entries)`. Tasks 5 and 6 consume all four.

- [ ] **Step 1: Write the failing tests**

```ts
it('strips credentials and query parameters from the database url', () => {
  const identity = parseNonSecretDatabaseIdentity(
    'postgresql://sis:sup3rsecret@db.internal:5432/sis_live_test?schema=public',
  );
  expect(identity).toEqual({
    host: 'db.internal',
    port: 5432,
    database: 'sis_live_test',
  });
  expect(JSON.stringify(identity)).not.toContain('sup3rsecret');
});

it('produces the same fingerprint for two urls that differ only by password', () => {
  const a = databaseFingerprint(parseNonSecretDatabaseIdentity('postgresql://u:a@h:5432/d'), 'schema-sum');
  const b = databaseFingerprint(parseNonSecretDatabaseIdentity('postgresql://u:b@h:5432/d'), 'schema-sum');
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});

it('changes the fingerprint when the database name changes', () => {
  const a = databaseFingerprint(parseNonSecretDatabaseIdentity('postgresql://u:a@h:5432/d'), 's');
  const b = databaseFingerprint(parseNonSecretDatabaseIdentity('postgresql://u:a@h:5432/other'), 's');
  expect(a).not.toBe(b);
});

it('orders the manifest checksum independently of insertion order', () => {
  const a = manifestChecksum([
    { entity: 'Student', entityId: 'b' },
    { entity: 'Student', entityId: 'a' },
  ]);
  const b = manifestChecksum([
    { entity: 'Student', entityId: 'a' },
    { entity: 'Student', entityId: 'b' },
  ]);
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});

it('changes the manifest checksum when an entry is added', () => {
  const one = manifestChecksum([{ entity: 'Student', entityId: 'a' }]);
  const two = manifestChecksum([
    { entity: 'Student', entityId: 'a' },
    { entity: 'Student', entityId: 'b' },
  ]);
  expect(one).not.toBe(two);
});

it('reports a fingerprint mismatch without echoing either value', () => {
  const result = fingerprintMatches('a'.repeat(64), 'b'.repeat(64));
  expect(result).toEqual({ ok: false, reason: 'DB_FINGERPRINT_MISMATCH' });
  expect(JSON.stringify(result)).not.toContain('aaaa');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-scope.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `moodle-scope.ts`**

```ts
export interface NonSecretDatabaseIdentity { host: string; port: number; database: string; }
export interface ManifestEntryInput { entity: string; entityId: string; }

export function parseNonSecretDatabaseIdentity(url: string): NonSecretDatabaseIdentity;
export function databaseFingerprint(
  identity: NonSecretDatabaseIdentity,
  schemaChecksum: string,
): string;
export function fingerprintMatches(
  expected: string,
  actual: string,
): { ok: true } | { ok: false; reason: 'DB_FINGERPRINT_MISMATCH' };
export function manifestChecksum(entries: ManifestEntryInput[]): string;
```

- `parseNonSecretDatabaseIdentity` throws a `LiveTestConfigError` on a non-`postgresql:` scheme, a missing host, or a missing database name. It returns only host, port, and database — never username, password, or query parameters.
- `databaseFingerprint` hashes the string `` `${host}:${port}/${database}|${schemaChecksum}` `` with sha256 and returns lowercase hex.
- `manifestChecksum` sorts a copy by `entity` then `entityId`, joins as `entity:entityId` with `\n`, and sha256s it. Duplicates are rejected.
- `fingerprintMatches` uses a constant-time comparison and returns only a reason code.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-scope.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/api/src/integration/moodle-scope.ts development/apps/api/src/integration/moodle-scope.spec.ts
git commit -m "feat(moodle): non-secret database fingerprint and scope manifest checksum"
```

---

### Task 5: Run, transition, and manifest schema

**Files:**
- Modify: `development/prisma/schema.prisma`
- Create: `development/prisma/migrations/20260927100000_ph6_live_test_safety/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma models `MoodleLiveTestRun`, `MoodleLiveTestRunTransition`, `MoodleScopeManifest`, `MoodleScopeManifestEntry`; `MoodleConnection.environmentLabel`, `.siteId`, `.reportedVersion`, `.expectedVersionResult`, `.lastValidationResult`; `Session.authedAt`. Tasks 6, 7, and 9 read these.

- [ ] **Step 1: Add the four models and the column additions**

Append to `schema.prisma`, matching the file's existing comment-then-model style. `MoodleLiveTestRun` is keyed by the `runId` string that equals `MOODLE_LIVE_TEST_RUN_ID`:

```prisma
model MoodleLiveTestRun {
  id                        String    @id @default(uuid())
  runId                     String    @unique
  dbFingerprint             String
  scopeManifestChecksum     String
  configFingerprint         String
  expectedHost              String
  expectedSiteId            Int
  expectedRelease           String
  actualNumericVersion      String?
  cohortPrefix              String
  nonProductionConfirmed    Boolean   @default(false)
  state                     String    @default("PREPARED")
  creatorAccountId          String
  technicalApproverAccountId String?
  operationalApproverAccountId String?
  startedAt                 DateTime?
  endedAt                   DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt
  transitions MoodleLiveTestRunTransition[]
  manifest  MoodleScopeManifest?
  @@index([state])
}
```

`MoodleLiveTestRunTransition` append-only: `id`, `runId` (relation, `onDelete: Restrict`), `command`, `fromState`, `toState`, `actorAccountId`, `actorRole`, `actorCapability`, `actorScopeType`, `actorScopeRef`, `reason`, `freshAuthRef`, `policyVersion` (default `"MOODLE-LIVE-TEST-v1"`), `evidenceChecksum`, `createdAt`, indexed on `[runId, createdAt]`.

`MoodleScopeManifest`: `id`, `runId` (`@unique`, relation), `checksum`, `entryCount`, `sealedAt`, `entries` relation, `createdAt`.

`MoodleScopeManifestEntry`: `id`, `manifestId` (relation, `onDelete: Restrict`), `entity`, `entityId`, `cohortPrefix`, `addedByAccountId`, `addedAt`, with `@@unique([manifestId, entity, entityId])`.

Add to `MoodleConnection`: `environmentLabel String?`, `siteId Int?`, `reportedVersion String?`, `expectedVersionResult String?`, `lastValidationResult Json?`. Add to `Session`: `authedAt DateTime?`.

- [ ] **Step 2: Write the migration SQL**

`migration.sql` must contain, in order: the `ALTER TABLE` statements adding the `MoodleConnection` and `Session` columns; the four `CREATE TABLE` statements matching the Prisma names and types exactly; the indexes and the `@@unique` constraints Prisma declares; and the constraints Prisma cannot express:

```sql
-- At most one active run per database. A unique index on the constant
-- expression 1 applies only to active states, so terminal runs coexist.
CREATE UNIQUE INDEX "MoodleLiveTestRun_one_active"
  ON "MoodleLiveTestRun" ((1))
  WHERE "state" IN ('PREPARED', 'RUNNING', 'PAUSED');

ALTER TABLE "MoodleLiveTestRun"
  ADD CONSTRAINT "MoodleLiveTestRun_state_check"
  CHECK ("state" IN ('PREPARED','RUNNING','PAUSED','COMPLETED','FAILED','CLOSED'));

-- scope manifest entries are append-only
CREATE OR REPLACE FUNCTION "reject_manifest_entry_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'scope manifest entries are append-only';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "MoodleScopeManifestEntry_append_only"
  BEFORE UPDATE OR DELETE ON "MoodleScopeManifestEntry"
  FOR EACH ROW EXECUTE FUNCTION "reject_manifest_entry_mutation"();
```

The transition table gets the same append-only trigger under a second trigger function `reject_transition_mutation`; a transition row is never updated or deleted.

These four objects are intentionally absent from `schema.prisma`, because Prisma cannot express a partial unique index, a check constraint, or a trigger.

- [ ] **Step 3: Apply and confirm the database constraints actually hold**

Run: `cd development && npx prisma migrate deploy`
Expected: `20260927100000_ph6_live_test_safety` applied.

Run: `cd development && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma`
Expected: the only reported differences are the four SQL-only objects listed in Step 2 — `MoodleLiveTestRun_one_active`, `MoodleLiveTestRun_state_check`, and the two trigger functions. Any other reported difference means the hand-written SQL and `schema.prisma` disagree and the migration must be corrected before continuing.

Run this against the isolated test database to prove the one-active-run rule, then delete the rows it created:

```sql
INSERT INTO "MoodleLiveTestRun"
  (id, "runId", "dbFingerprint", "scopeManifestChecksum", "configFingerprint",
   "expectedHost", "expectedSiteId", "expectedRelease", "cohortPrefix", "state",
   "creatorAccountId", "createdAt", "updatedAt")
VALUES ('probe-1','probe-1','a','b','c','moodle.example.edu',2,'4.5.6',
        'SIS-MOODLE-LIVE-TEST-','PREPARED','probe','now()','now()');
-- this must raise unique_violation on "MoodleLiveTestRun_one_active"
INSERT INTO "MoodleLiveTestRun"
  (id, "runId", "dbFingerprint", "scopeManifestChecksum", "configFingerprint",
   "expectedHost", "expectedSiteId", "expectedRelease", "cohortPrefix", "state",
   "creatorAccountId", "createdAt", "updatedAt")
VALUES ('probe-2','probe-2','a','b','c','moodle.example.edu',2,'4.5.6',
        'SIS-MOODLE-LIVE-TEST-','RUNNING','probe','now()','now()');
-- this must succeed, proving terminal states do not collide
INSERT INTO "MoodleLiveTestRun"
  (id, "runId", "dbFingerprint", "scopeManifestChecksum", "configFingerprint",
   "expectedHost", "expectedSiteId", "expectedRelease", "cohortPrefix", "state",
   "creatorAccountId", "createdAt", "updatedAt")
VALUES ('probe-3','probe-3','a','b','c','moodle.example.edu',2,'4.5.6',
        'SIS-MOODLE-LIVE-TEST-','CLOSED','probe','now()','now()');
DELETE FROM "MoodleLiveTestRun" WHERE "runId" IN ('probe-1','probe-2','probe-3');
```

- [ ] **Step 4: Commit**

```bash
git add development/prisma/schema.prisma development/prisma/migrations/20260927100000_ph6_live_test_safety/migration.sql
git commit -m "feat(prisma): live-test run, transition, and scope manifest schema"
```

---

### Task 6: The run state machine

**Files:**
- Create: `development/apps/api/src/integration/moodle-live-run.service.ts`
- Test: `development/apps/api/src/integration/moodle-live-run.service.spec.ts`

**Interfaces:**
- Consumes: `ReauthenticationService` from `identity-access/reauthentication.service.ts` (Task 7 — build it in Task 7 and stub it in this task's tests with `vi.mock`), `configFingerprint` and `LiveTestDescriptor` from `moodle-live-config.ts`, `fingerprintMatches` from `moodle-scope.ts`.
- Produces: `MoodleLiveRunService.createPrepared`, `.current`, `.transition`, the `RunState`/`RunCommand`/`RunActor`/`RunView` types, and the exported `TRANSITIONS` table. Task 9 exposes these over HTTP and the web page.

- [ ] **Step 1: Write the failing tests**

Mock `PrismaService` with the model methods the service calls. Mock `ReauthenticationService` with `available: true` and `issue: async () => ({ ref: 'fresh-1', at: new Date() })`, except in the test that names otherwise. Build fixtures with helpers `adminActor()`, `supportActor()`, and `run(overrides)` so a test overrides one field. Write these tests:

```ts
it('creates a PREPARED run with an unsealed manifest and a recorded configuration fingerprint', async () => {
  const view = await service.createPrepared(adminActor(), { reason: 'plan 1 rehearsal', nonProductionConfirmed: true });
  expect(view.state).toBe('PREPARED');
  expect(view.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
  expect(view.configFingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(prisma.moodleScopeManifest.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ sealedAt: null }) }),
  );
});

it('denies a caller without manage-mapping and sync-moodle with 403 and an audit record', async () => {
  await expect(service.createPrepared(supportActor(), { reason: 'x', nonProductionConfirmed: true }))
    .rejects.toMatchObject({ status: 403 });
  expect(prisma.auditTimeline.create).toHaveBeenCalled();
  expect(prisma.moodleLiveTestRun.create).not.toHaveBeenCalled();
});

it('refuses a second active run in the same database', async () => {
  prisma.moodleLiveTestRun.findFirst.mockResolvedValueOnce(run({ state: 'PREPARED' }));
  await expect(service.createPrepared(adminActor(), { reason: 'x', nonProductionConfirmed: true }))
    .rejects.toMatchObject({ code: 'LIVE_RUN_ALREADY_ACTIVE', status: 409 });
});

it('refuses the start transition when both approvals come from one account', async () => {
  const one = adminActor();
  await expect(service.transition('run-1', 'start', one, { reason: 'go' }))
    .rejects.toMatchObject({ code: 'RUN_APPROVERS_NOT_DISTINCT', status: 409 });
  expect(prisma.moodleLiveTestRun.update).not.toHaveBeenCalled();
});

it('refuses the start transition while fresh authentication is unavailable', async () => {
  reauth.available = false;
  await expect(service.transition('run-1', 'start', supportActor(), { reason: 'go' }))
    .rejects.toMatchObject({ code: 'FRESH_AUTH_UNAVAILABLE', status: 409 });
  expect(prisma.moodleLiveTestRun.update).not.toHaveBeenCalled();
});

it('blocks the start transition when the database fingerprint does not match', async () => {
  descriptor.dbFingerprint = 'b'.repeat(64);
  await expect(service.transition('run-1', 'start', supportActor(), { reason: 'go' }))
    .rejects.toMatchObject({ code: 'DB_FINGERPRINT_MISMATCH', status: 409 });
  expect(prisma.moodleLiveTestRun.update).not.toHaveBeenCalled();
});

it('blocks the start transition without an explicit non-production confirmation', async () => {
  await expect(service.transition('run-1', 'start', supportActor(), { reason: 'go' }))
    .rejects.toMatchObject({ code: 'NON_PRODUCTION_NOT_CONFIRMED', status: 409 });
});

it('allows Integration Support to pause and denies a Moodle Administrator', async () => {
  expect((await service.transition('run-1', 'pause', supportActor(), { reason: 'hold' })).state)
    .toBe('PAUSED');
  prisma.moodleLiveTestRun.update.mockClear();
  await expect(service.transition('run-1', 'pause', adminActor(), { reason: 'hold' }))
    .rejects.toMatchObject({ status: 403 });
  expect(prisma.moodleLiveTestRun.update).not.toHaveBeenCalled();
});

it('requires a fresh Moodle Administrator technical approval to resume after a configuration change', async () => {
  await expect(service.transition('run-1', 'resume', supportActor(), { reason: 'go' }))
    .rejects.toMatchObject({ code: 'TECHNICAL_APPROVAL_REQUIRED', status: 409 });
});

it('sets endedAt on the complete transition', async () => {
  const view = await service.transition('run-1', 'complete', supportActor(), { reason: 'done' });
  expect(view.state).toBe('COMPLETED');
  expect(view.endedAt).not.toBeNull();
});

it('makes the fail transition irreversible', async () => {
  expect((await service.transition('run-1', 'fail', supportActor(), { reason: 'safety' })).state)
    .toBe('FAILED');
  await expect(service.transition('run-1', 'start', supportActor(), { reason: 'go' }))
    .rejects.toMatchObject({ code: 'RUN_TERMINAL', status: 409 });
});

it('refuses every command once a run is terminal', async () => {
  for (const state of ['COMPLETED', 'FAILED', 'CLOSED'] as const) {
    for (const command of ['start', 'pause', 'resume', 'complete', 'fail', 'close'] as const) {
      await expect(service.transition('run-1', command, supportActor(), { reason: 'x' }),
        `${state}/${command}`).rejects.toMatchObject({ code: 'RUN_TERMINAL', status: 409 });
    }
  }
});

it('requires two distinct accounts to close, one per role', async () => {
  await expect(service.transition('run-1', 'close', adminActor(), { reason: 'close' }))
    .rejects.toMatchObject({ code: 'SECOND_APPROVER_REQUIRED', status: 409 });
  const view = await service.transition('run-1', 'close', adminActor(), {
    reason: 'close', secondApproverAccountId: supportActor().accountId,
  });
  expect(view.state).toBe('CLOSED');
});

it('appends exactly one immutable transition row per successful command', async () => {
  await service.transition('run-1', 'pause', supportActor(), { reason: 'hold' });
  expect(prisma.moodleLiveTestRunTransition.create).toHaveBeenCalledTimes(1);
  expect(prisma.moodleLiveTestRunTransition.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        fromState: 'RUNNING', toState: 'PAUSED', command: 'pause',
        actorRole: 'INTEGRATION_SUPPORT', actorCapability: 'replay-event',
        freshAuthRef: 'fresh-1', policyVersion: 'MOODLE-LIVE-TEST-v1',
        evidenceChecksum: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    }),
  );
  expect(prisma.moodleLiveTestRunTransition.update).not.toHaveBeenCalled();
  expect(prisma.moodleLiveTestRunTransition.delete).not.toHaveBeenCalled();
});

it('refuses a transition whose approver assignment expired before execution', async () => {
  prisma.roleAssignment.findFirst.mockResolvedValueOnce(
    assignment({ endsAt: new Date(Date.now() - 60_000) }),
  );
  await expect(service.transition('run-1', 'pause', supportActor(), { reason: 'hold' }))
    .rejects.toMatchObject({ code: 'APPROVAL_EXPIRED', status: 403 });
  expect(prisma.moodleLiveTestRun.update).not.toHaveBeenCalled();
});

it('returns a neutral 404 for a run the caller may not see', async () => {
  prisma.moodleLiveTestRun.findUnique.mockResolvedValueOnce(null);
  await expect(service.transition('missing', 'pause', supportActor(), { reason: 'x' }))
    .rejects.toMatchObject({ message: 'Not found.', status: 404 });
});

it('never places the token or the base url in the returned view', async () => {
  const view = await service.current();
  expect(JSON.stringify(view)).not.toContain(descriptor.token);
  expect(JSON.stringify(view)).not.toContain('wstoken');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-run.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the transition table as data**

```ts
export type RunState = 'PREPARED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CLOSED';
export type RunCommand = 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'close';

export interface RunActor {
  accountId: string;
  assignmentId: string | null;
  activeRole: string | null;
  scopeType?: string | null;
  scopeRef?: string | null;
}

export interface RunView {
  runId: string; state: RunState; dbFingerprint: string;
  scopeManifestChecksum: string; configFingerprint: string;
  expectedHost: string; expectedSiteId: number; expectedRelease: string;
  actualNumericVersion: string | null; cohortPrefix: string;
  nonProductionConfirmed: boolean;
  creatorAccountId: string;
  technicalApproverAccountId: string | null;
  operationalApproverAccountId: string | null;
  startedAt: string | null; endedAt: string | null;
}

export const TRANSITIONS: Record<RunCommand, {
  from: RunState[]; to: RunState;
  role: 'MOODLE_ADMIN' | 'INTEGRATION_SUPPORT';
  capability: string;
  requiresFreshAuth: boolean;
  secondApprover: { role: 'MOODLE_ADMIN' | 'INTEGRATION_SUPPORT'; capability: string } | null;
}>;
```

`start` is the only command whose `secondApprover` differs in role from the primary: primary `INTEGRATION_SUPPORT`/`replay-event`, second `MOODLE_ADMIN`/`sync-moodle`, and the two `accountId`s must differ. `close` requires a `MOODLE_ADMIN` primary and a distinct `INTEGRATION_SUPPORT` second. Every other command has `secondApprover: null`.

- [ ] **Step 4: Implement the service**

```ts
@Injectable()
export class MoodleLiveRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reauth: ReauthenticationService,
  ) {}

  async createPrepared(
    auth: RunActor,
    input: { reason: string; nonProductionConfirmed: boolean },
  ): Promise<RunView>;

  async current(): Promise<RunView | null>;

  async transition(
    runId: string,
    command: RunCommand,
    auth: RunActor,
    input: { reason: string; nonProductionConfirmed?: boolean; secondApproverAccountId?: string },
  ): Promise<RunView>;
}
```

Rules the implementation must follow, each already pinned by a test above:

- Authority is re-checked inside the transaction by querying the actor's live `RoleAssignment` (`revokedAt: null`, `startsAt <= now`, `endsAt` null or `> now`, `capabilities` contains the required capability, `account.status: 'ACTIVE'`, `scopeType` not `BREAK_GLASS`). Never trust a value carried on the request.
- A run the caller may not see returns a neutral 404 with the message `Not found.`. An assignment whose `endsAt` has already passed is refused with 403 `APPROVAL_EXPIRED`.
- A command whose `TRANSITIONS` entry has a `secondApprover` requires `input.secondApproverAccountId`. When absent the service refuses with 409 `SECOND_APPROVER_REQUIRED`. When present the service resolves that account's own live `RoleAssignment` against the `secondApprover` role and capability — the caller names the account, it does not assert the account's authority. A second approver equal to `auth.accountId`, a revoked assignment, a `BREAK_GLASS` assignment, and an expired assignment all fail closed.
- `close` additionally refuses with 409 `TECHNICAL_APPROVAL_STILL_REQUIRED` while `technicalApproverAccountId` is null, so a run can never close without a recorded technical approver.
- `start` additionally re-verifies `selectBackend()` resolves to `live-test`, the descriptor's `runId` equals the run's `runId`, `fingerprintMatches` passes, `nonProductionConfirmed` is true, and the scope manifest is sealed with a matching `manifestChecksum`.
- `resume` compares the descriptor's `configFingerprint` to the value recorded at `start`. A difference refuses with 409 `TECHNICAL_APPROVAL_REQUIRED` unless a `MOODLE_ADMIN` holding `sync-moodle` approves the resume in the same command.
- State change and transition insert happen in one `prisma.$transaction`. A failed precondition throws before any write.
- `evidenceChecksum` is the sha256 of `policyVersion|runId|fromState|toState|command|actorAccountId|freshAuthRef`.
- `RunView` never contains the token, the full URL, or any environment value.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-run.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add development/apps/api/src/integration/moodle-live-run.service.ts development/apps/api/src/integration/moodle-live-run.service.spec.ts
git commit -m "feat(moodle): live-test run state machine with transition authority"
```

---

### Task 7: Fresh-authentication enforcement point

**Files:**
- Create: `development/apps/api/src/identity-access/reauthentication.service.ts`
- Modify: `development/apps/api/src/identity-access/identity-access.module.ts`
- Test: `development/apps/api/src/identity-access/reauthentication.service.spec.ts`
- Create: `development/docs/gaps/GAP-023-fresh-reauthentication-mechanism.md`

**Interfaces:**
- Consumes: `Session.authedAt` from Task 5, `PrismaService`.
- Produces: `ReauthenticationService.available`, `.issue(actor, purpose)`, `.verify(ref, accountId, maxAgeSeconds)`. Task 6 consumes all three. This is the `REQ-IAM-005` enforcement point named in `session.service.ts` and previously absent.

- [ ] **Step 1: Write the failing tests**

```ts
it('is unavailable by default so high-impact transitions fail closed', () => {
  expect(new ReauthenticationService(prismaDouble(), {}).available).toBe(false);
});

it('reports unavailable with a reason code and issues nothing', async () => {
  const prisma = prismaDouble();
  const service = new ReauthenticationService(prisma, {});
  expect(await service.issue(actor(), 'MOODLE_LIVE_TEST_RUN_START'))
    .toEqual({ unavailable: true, reason: 'FRESH_AUTH_UNAVAILABLE' });
  expect(prisma.session.update).not.toHaveBeenCalled();
});

it('stamps authedAt and issues a reference when a mechanism is configured', async () => {
  const prisma = prismaDouble();
  const service = new ReauthenticationService(prisma, { MOODLE_REAUTH_MODE: 'session-age' });
  const result = await service.issue(actor(), 'MOODLE_LIVE_TEST_RUN_START');
  expect(result).toMatchObject({ at: expect.any(Date) });
  expect((result as { ref: string }).ref).toMatch(/^[0-9a-f]{64}$/);
  expect(prisma.session.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ authedAt: expect.any(Date) }) }),
  );
});

it('rejects a reference belonging to another account', async () => {
  const service = new ReauthenticationService(prismaDouble({ session: sessionRow('a') }), {
    MOODLE_REAUTH_MODE: 'session-age',
  });
  expect(await service.verify('a'.repeat(64), 'b', 300)).toBe(false);
});

it('rejects a reference older than the required freshness window', async () => {
  const old = new Date(Date.now() - 3_600_000);
  const service = new ReauthenticationService(prismaDouble({ session: sessionRow('a', old) }), {
    MOODLE_REAUTH_MODE: 'session-age',
  });
  expect(await service.verify('a'.repeat(64), 'a', 300)).toBe(false);
});

it('rejects a fresh-authentication reference from a revoked session', async () => {
  const fresh = new Date();
  const service = new ReauthenticationService(
    prismaDouble({ session: sessionRow('a', fresh, true) }),
    { MOODLE_REAUTH_MODE: 'session-age' },
  );
  expect(await service.verify('a'.repeat(64), 'a', 300)).toBe(false);
});
```

`prismaDouble({ session })` returns a stub whose `session.findUnique` resolves `session` and whose `session.update` is a spy. `sessionRow(accountId, authedAt, revoked)` builds a row with `accountId`, `authedAt`, `revokedAt: revoked ? new Date() : null`, an `expiresAt` in the future, and `activeAssignmentId: 'asg-1'`. `actor()` returns `{ accountId: 'acct-1', assignmentId: 'asg-1' }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/identity-access/reauthentication.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```ts
export const ENV_TOKEN = Symbol('APP_ENV');

@Injectable()
export class ReauthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV_TOKEN) private readonly env: NodeJS.ProcessEnv,
  ) {}

  get available(): boolean;
  async issue(
    actor: { accountId: string; assignmentId: string | null },
    purpose: string,
  ): Promise<{ ref: string; at: Date } | { unavailable: true; reason: 'FRESH_AUTH_UNAVAILABLE' }>;
  async verify(ref: string, accountId: string, maxAgeSeconds: number): Promise<boolean>;
}
```

`issue` takes only `accountId` and `assignmentId`, not the wider `ActiveAuthority` or `RunActor` shapes, so this service can be reused by any command that needs step-up proof without depending on either type. `RunActor` from Task 6 is structurally assignable to it.

- `available` is `env.MOODLE_REAUTH_MODE?.trim() === 'session-age'`. Any other value, including unset, is unavailable.
- `issue` refuses when the session has no `activeAssignmentId` or the assignment is not live, returning `{ unavailable: true, reason: 'FRESH_AUTH_UNAVAILABLE' }` and writing nothing.
- `issue` stamps `Session.authedAt` and returns `ref = sha256(sessionId + '|' + purpose + '|' + authedAt.toISOString())`. The reference is a checksum, not a secret, and is safe to store in the transition record.
- `verify` requires the session to belong to `accountId`, be unrevoked, be unexpired, and have `authedAt` within `maxAgeSeconds`.
- `MOODLE_REAUTH_MODE=session-age` proves only that the session was re-established; it does **not** prove a second factor. The gap record must say so.

`identity-access.module.ts` has no environment-injection token today, so this task adds the `ENV_TOKEN` provider above, providing `{ provide: ENV_TOKEN, useValue: process.env }`, and exports `ReauthenticationService` from the same module.

- [ ] **Step 4: Register the service and write the gap record**

Add `ReauthenticationService` to `identity-access.module.ts` providers and exports.

Create `development/docs/gaps/GAP-023-fresh-reauthentication-mechanism.md` in the style of the existing `docs/gaps/` records, stating: the `REQ-IAM-005` enforcement point had no implementation; `session-age` mode is a session re-establishment and not a second factor; the institutional decision on the accepted mechanism is outstanding; until it is made, `PREPARED → RUNNING` is refused; and `GAP-020`/`GAP-021` identifiers are not reused.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/identity-access/reauthentication.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Run the state-machine tests against the real service**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-live-run.service.spec.ts`
Expected: PASS, with the `FRESH_AUTH_UNAVAILABLE` refusal test now exercising the real default.

- [ ] **Step 7: Commit**

```bash
git add development/apps/api/src/identity-access/reauthentication.service.ts development/apps/api/src/identity-access/reauthentication.service.spec.ts development/apps/api/src/identity-access/identity-access.module.ts development/docs/gaps/GAP-023-fresh-reauthentication-mechanism.md
git commit -m "feat(iam): fresh-authentication enforcement point, disabled by default"
```

---

### Task 8: Form encoding, response contracts, and failure classification

**Files:**
- Create: `development/apps/api/src/integration/moodle-rest.ts`
- Test: `development/apps/api/src/integration/moodle-rest.spec.ts`

**Interfaces:**
- Consumes: `MOODLE_LIVE_V1.authorisedFunctions` from `@sis/config`.
- Produces: `MoodleApiError`, `toFormBody`, `assertAuthorisedFunction`, `classifyFailure`, `requireWrappedArray`, `readJsonResponse`, `MoodleFailure`. Task 9 rewires `moodle-live.ts` onto these and imports `MoodleApiError` from here, so this module must not import from `moodle-live.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
it('encodes nested objects in deterministic PHP bracket form', () => {
  const body = toFormBody({
    enrolments: [{ roleid: 5, userid: 42, courseid: 7 }],
    options: [{ name: 'a', value: 'b' }],
  });
  expect(body.toString()).toBe(
    'enrolments%5B0%5D%5Bcourseid%5D=7&enrolments%5B0%5D%5Broleid%5D=5&enrolments%5B0%5D%5Buserid%5D=42&options%5B0%5D%5Bname%5D=a&options%5B0%5D%5Bvalue%5D=b',
  );
});

it('produces identical bodies for identical inputs in different key order', () => {
  const a = toFormBody({ b: 1, a: 2 });
  const b = toFormBody({ a: 2, b: 1 });
  expect(a.toString()).toBe(b.toString());
});

it('refuses a function outside the authorised set', () => {
  expect(() => assertAuthorisedFunction('core_enrol_get_enrolled_users_with_capability'))
    .toThrow(/not authorised/);
  expect(() => assertAuthorisedFunction('enrol_manual_enrol_users')).not.toThrow();
});

it('classifies a Moodle transient service error as retryable', () => {
  expect(classifyFailure(200, { exception: 'servicenotavailable', errorcode: 'servicenotavailable' }))
    .toMatchObject({ kind: 'TRANSIENT', errorCode: 'servicenotavailable' });
});

it('classifies a permission error as permanent', () => {
  expect(classifyFailure(403, { exception: 'accessexception', errorcode: 'accessexception' }))
    .toMatchObject({ kind: 'PERMANENT' });
});

it('classifies a non-JSON 200 body as UNKNOWN manual review', () => {
  const failure = classifyFailure(200, '<html lang="en">Site maintenance</html>');
  expect(failure.kind).toBe('UNKNOWN');
  expect(failure.retryable).toBe(false);
  expect(failure.message).not.toContain('<html');
});

it('classifies an unrecognised errorcode as UNKNOWN and never retryable', () => {
  const failure = classifyFailure(200, { exception: 'moodleexception', errorcode: 'somethingnew' });
  expect(failure.kind).toBe('UNKNOWN');
  expect(failure.retryable).toBe(false);
});

it('classifies 408, 429 and 5xx as transient and other 4xx as permanent', () => {
  for (const status of [408, 429, 500, 502, 503]) {
    expect(classifyFailure(status, {}).kind, String(status)).toBe('TRANSIENT');
  }
  for (const status of [400, 401, 403, 404]) {
    expect(classifyFailure(status, {}).kind, String(status)).toBe('PERMANENT');
  }
});

it('unwraps a Moodle object wrapper and rejects a top-level array', () => {
  expect(requireWrappedArray({ courses: [{ id: 1 }] }, 'courses')).toEqual([{ id: 1 }]);
  expect(() => requireWrappedArray([{ id: 1 }], 'courses')).toThrow(/wrapper/);
  expect(() => requireWrappedArray({}, 'courses')).toThrow(/wrapper/);
});

it('accepts a null-success mutation response', () => {
  expect(readJsonResponse(null)).toEqual({ kind: 'null-success' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-rest.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `moodle-rest.ts`**

```ts
export class MoodleApiError extends Error {
  constructor(
    readonly retryable: boolean,
    message: string,
    readonly errorCode: string | null = null,
  ) {
    super(message);
  }
}

export type MoodleFailure = {
  kind: 'TRANSIENT' | 'PERMANENT' | 'UNKNOWN';
  errorCode: string | null;
  message: string;
  retryable: boolean;
};

export function toFormBody(params: Record<string, unknown>): URLSearchParams;
export function assertAuthorisedFunction(wsfunction: string): void;
export function classifyFailure(status: number, body: unknown): MoodleFailure;
export function requireWrappedArray<T>(body: unknown, wrapper: string): T[];
export function readJsonResponse(body: unknown): { kind: 'null-success' } | { kind: 'value'; value: unknown };
```

- `toFormBody` walks objects and arrays into `key[0][subkey]` form, sorts keys at every level for determinism, uses `URLSearchParams` for percent-encoding, and returns an empty body for an empty object. It must not emit a `wstoken`, `wsfunction`, or `moodlewsrestformat` key — those belong in the query string.
- `assertAuthorisedFunction` throws `new MoodleApiError(false, \`Function not authorised: ${wsfunction}\`, 'FUNCTION_NOT_AUTHORISED')`. There is no fallback path from one function to another anywhere in this module.
- `classifyFailure`: `408`/`429`/`5xx` are `TRANSIENT`. `4xx` other than those is `PERMANENT`. A body with `exception` is classified by `errorcode` against an explicit transient list (`servicenotavailable`, `dmlwriteexception`, `cURLerror`, `tool_tasktimeout`) and a permanent list (`accessexception`, `invalidparameterexception`, `moodleexception` with a known code, `nopermissionsincontextexception`); anything else, and any non-object or non-JSON body on a 200, is `UNKNOWN` with `retryable: false`. `message` is always a fixed safe string built from the code, never from raw body content.
- `readJsonResponse(null)` reports `null-success`; an object without `exception` reports `value`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd development/apps/api && npx vitest run src/integration/moodle-rest.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/api/src/integration/moodle-rest.ts development/apps/api/src/integration/moodle-rest.spec.ts
git commit -m "feat(moodle): form encoding, response contracts, and failure classification"
```

---

### Task 9: Rewire the live adapter and expose the run state

**Files:**
- Modify: `development/apps/api/src/integration/moodle-live.ts`
- Modify: `development/apps/api/src/integration/moodle-live.spec.ts`
- Modify: `development/apps/api/src/integration/integration.service.ts`
- Modify: `development/apps/api/src/integration/integration.controller.ts`
- Modify: `development/apps/api/src/integration/dto.ts`
- Modify: `development/apps/api/src/integration/integration.module.ts`
- Modify: `development/apps/web/app/admin/moodle/page.tsx`
- Test: `development/apps/api/src/integration/moodle-live.spec.ts`

**Interfaces:**
- Consumes: `LiveTestDescriptor`/`BackendSelection`/`selectBackend` (Task 3), `MoodleApiError`/`toFormBody`/`classifyFailure`/`requireWrappedArray`/`assertAuthorisedFunction` (Task 8), `parseSiteInfo`/`assertTargetIdentity` (Task 2), `MoodleLiveRunService`/`RunView`/`RunCommand` (Task 6).
- Produces: `LiveMoodleAdapter(prisma, descriptor)` taking a validated descriptor; `IntegrationService.liveTestState()`; `POST /integration/live-test/runs`, `GET /integration/live-test/runs/current`, and `POST /integration/live-test/runs/:id/{start,pause,resume,complete,fail,close}`; the run-state block on the Moodle administration page.

- [ ] **Step 1: Change the adapter constructor to take a validated descriptor**

`constructor(private readonly prisma: PrismaService, private readonly descriptor: LiveTestDescriptor)`. The adapter performs no transport, host, or target-identity validation and never reads `process.env`. Update the five `moodle-live.spec.ts` cases to pass a descriptor literal instead of setting `MOODLE_API_URL`, and give the stub server a descriptor whose `baseUrl` is its `http://127.0.0.1:<port>`, so the contract tests keep exercising a loopback stub through a test-only transport seam that runtime configuration cannot reach.

- [ ] **Step 2: Replace the JSON body with form encoding and the authorized-set guard**

In `call()`, set `assertAuthorisedFunction(wsfunction)` first, keep `wstoken`, `wsfunction`, and `moodlewsrestformat` in the query string, and send `body: toFormBody(params).toString()` with `headers: { 'content-type': 'application/x-www-form-urlencoded' }`. Delete the `content-type: application/json` header. Route every non-OK response and every `exception` body through `classifyFailure`, and throw `MoodleApiError(failure.retryable, failure.message)` — never `retryable: true` for `UNKNOWN`.

- [ ] **Step 3: Remove the silent fallback and the invented `ACTIVE` status**

Delete the `.catch()` block in `listActualEnrolments` that swaps `core_enrol_get_enrolled_users_with_capability` for `core_enrol_get_enrolled_users`; call `core_enrol_get_enrolled_users` directly through `requireWrappedArray`. Map the actual per-user status from the response into `ActualEnrolment.status`; when the target response carries no readable status, throw `MoodleApiError(false, 'Moodle enrolment status is not readable on this target.')` rather than defaulting to `ACTIVE`. In `listActualGroupMembers`, resolve numeric Moodle user ids back to `idnumber` instead of emitting `moodle-user-<id>` keys.

- [ ] **Step 4: Stop hard-coding course category and visibility**

In `ensureShell`, send `categoryid: this.descriptor.categoryId` and `visible: this.descriptor.courseVisible`; add no fallback value. Parse the create response with `requireWrappedArray(body, 'courses')` and throw when the array is empty.

- [ ] **Step 5: Make `IntegrationService.adapter()` fail closed**

```ts
adapter(): MoodleAdapter {
  const selection = selectBackend();
  if (selection.kind === 'live-test') return new LiveMoodleAdapter(this.prisma, selection.descriptor);
  if (selection.kind === 'live-test-disabled') {
    this.fail('LIVE_TEST_DISABLED', 'Live test mode is configured but not valid.', 409, {
      reasons: selection.reasons,
    });
  }
  return new SimulatorAdapter(this.prisma);
}
```

A `live-test-disabled` environment must never construct a `LiveMoodleAdapter` and must never return a simulator for a caller that asked for live test.

- [ ] **Step 6: Add the target-identity preflight to connection health**

```ts
async liveTestState(auth: IntegrationAuthority): Promise<{
  selection: { kind: 'simulator' | 'live-test' | 'live-test-disabled'; reasons?: string[] };
  run: RunView | null;
  identity: { expectedHost: string; expectedSiteId: number; expectedRelease: string;
              actualHost: string | null; actualSiteId: number | null;
              actualRelease: string | null; ok: boolean } | null;
}>;
```

Compare against the canonical triple from Task 2's `assertTargetIdentity`, and persist `siteId`, `reportedVersion`, `expectedVersionResult`, and `lastValidationResult` on `MoodleConnection`. `expectedVersionResult` holds `MATCH` or a list of mismatched field names — never the compared values. Never persist the token, the raw request URL, or the authorization header. The response contains no secret and no full URL with userinfo.

- [ ] **Step 7: Expose the run commands over HTTP**

Add DTOs extending `KeyDto` in `dto.ts`: `CreateLiveTestRunDto` with `reason` (`@IsString`, `@IsNotEmpty`, `@MaxLength(500)`) and `nonProductionConfirmed` (`@IsBoolean`); `RunCommandDto` with the same `reason`, an optional `nonProductionConfirmed` (`@IsOptional() @IsBoolean()`), and `secondApproverAccountId` (`@IsOptional() @IsUUID()`). Add the eight endpoints — create, current, and one per command — each behind `SessionGuard`, `CsrfGuard`, and `ApplicationRateGuard` like their neighbours, and register `MoodleLiveRunService` in `integration.module.ts`. `GET live-test/runs/current` returns the `RunView` or `null`; every command returns the resulting `RunView`. No endpoint accepts a state name.

The controller passes the request's actor through to `RunActor` and forwards `secondApproverAccountId` unchanged; the service, not the controller, resolves that account's authority.

- [ ] **Step 8: Show the run state on the Moodle administration page**

Add a block to `apps/web/app/admin/moodle/page.tsx` that reads the health payload and renders, only when the selection is `live-test` or `live-test-disabled`: the literal text `LIVE TEST — SYNTHETIC ONLY`; expected and actual host, site id, and release; the validation result; the permitted synthetic namespace; write-enabled/paused state; the run id and state; and, for `live-test-disabled`, the list of reason codes. Never render a token, a full URL with userinfo, or a fingerprint beyond the run's own non-secret record. Add the block's Playwright coverage to the existing Moodle administration checkpoint spec rather than creating a new suite.

- [ ] **Step 9: Run the tests**

Run: `cd development/apps/api && npx vitest run src/integration`
Expected: PASS, including the five rewritten `moodle-live.spec.ts` cases. Add these two cases to `moodle-live.spec.ts`: one asserting the outbound request `content-type` is `application/x-www-form-urlencoded` and the body is bracket-encoded; one asserting `listActualEnrolments` throws rather than returning `ACTIVE` when the stub returns a user with no readable status field.
Run: `cd development && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add development/apps/api/src/integration development/apps/web/app/admin/moodle/page.tsx
git commit -m "feat(moodle): validated live adapter, target preflight, and run-state surface"
```

---

### Task 10: Secret scanning, operations guidance, task packet, and verification

**Files:**
- Modify: `development/scripts/check-source.mjs`
- Modify: `development/docs/operations/MOODLE-LIVE-SETUP.md`
- Create: `development/docs/task-packets/TASK-PH6-007.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the repository verification evidence for this plan.

- [ ] **Step 1: Write the failing scan test**

Create `development/scripts/check-source.spec.ts` if no scan test exists, following the same Vitest style as the API specs. Write these four tests:

```ts
it('fails on a non-empty MOODLE_API_TOKEN assignment in a source file', async () => {
  const result = await runScanOn({ 'src/live.ts': 'const t = "MOODLE_API_TOKEN=abc123";' });
  expect(result.ok).toBe(false);
  expect(result.findings.join('\n')).toContain('MOODLE_API_TOKEN');
});

it('allows an empty MOODLE_API_TOKEN assignment and an example file', async () => {
  const result = await runScanOn({
    'src/live.ts': 'process.env.MOODLE_API_TOKEN ?? "";',
    '.env.example': 'MOODLE_API_TOKEN=\n',
  });
  expect(result.ok).toBe(true);
});

it('fails on a literal wstoken value in a fixture', async () => {
  const result = await runScanOn({ 'src/live.spec.ts': "url.searchParams.set('wstoken', 'x');" });
  expect(result.ok).toBe(false);
  expect(result.findings.join('\n')).toContain('wstoken');
});

it('allows the word wstoken as a parameter name with no value', async () => {
  const result = await runScanOn({ 'src/live.ts': "params.set('wstoken', token);" });
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd development && npx vitest run scripts/check-source.spec.ts`
Expected: FAIL — no rule catches a Moodle token or a literal `wstoken`.

- [ ] **Step 3: Add the two rules to `check-source.mjs`**

Add to the existing rule list, using the same shape as the current private-key and `ghp_*` rules:

- A non-empty `MOODLE_API_TOKEN` assignment: a line matching `/MOODLE_API_TOKEN\s*=\s*['"]?[A-Za-z0-9._~-]{8,}/` in any file except `.env.example` and `.env.*.example`. An empty value or a bare `process.env.MOODLE_API_TOKEN` reference is not a finding.
- A literal `wstoken` value: a line matching `/wstoken['"]?\s*[:=]\s*['"][A-Za-z0-9]{8,}/` in source, spec, or documentation files. A `wstoken` used as a parameter name whose value is a variable is not a finding.

Keep the script's existing exit-code contract: a finding prints the file and line and exits non-zero, so `npm run scan` fails in CI.

- [ ] **Step 4: Run the test and the scan to verify they pass**

Run: `cd development && npx vitest run scripts/check-source.spec.ts && npm run scan`
Expected: both pass.

- [ ] **Step 5: Rewrite the operations checklist as a target-version contract**

In `MOODLE-LIVE-SETUP.md`, replace the hardcoded `{"Teacher":3,"Non-editing Teacher":5,"Student":5}` role map and every other assumed value with a table the operator fills from the target site: hostname, site-course `SITEID`, exact `release`, each required web-service function, the service account, each role shortname with its numeric id and its verified minimal capability set, the course category id, and course visibility. State at the top of the document that the checklist is configuration guidance, not production approval, and that no live write occurs until a run reaches `RUNNING`.

- [ ] **Step 6: Write the task packet**

Create `docs/task-packets/TASK-PH6-007.md` in the style of `TASK-PH6-001.md`..`TASK-PH6-006.md`, listing the requirements this plan implements, the exact approved records they answer (`036`, `037`, `009`), the allow and deny tests, the out-of-scope list, and the unresolved gaps carried forward.

- [ ] **Step 7: Run full repository verification**

Run from `development/`, in order, and record each result:

```
npm run typecheck
npm run lint
npm test
npm run test:browser
npm run build
npm run scan
npx prisma migrate deploy
npm run backup:test
```

Expected: all pass. The four SQL-only objects from Task 5 are intentionally absent from `schema.prisma`; do not add a `migrate diff` gate to this list, because it would report exactly those four objects as differences.

- [ ] **Step 8: Confirm no live call is possible**

Run: `cd development && MOODLE_INTEGRATION_MODE=live-test npx vitest run src/integration/moodle-live-config.spec.ts`
Expected: PASS, and `selectBackend` resolves to `live-test-disabled` for the empty `.env.example` values. No Moodle request is made by any test in this plan.

- [ ] **Step 9: Commit**

```bash
git add development/scripts/check-source.mjs development/scripts/check-source.spec.ts development/docs/operations/MOODLE-LIVE-SETUP.md development/docs/task-packets/TASK-PH6-007.md
git commit -m "docs(moodle): live-test task packet, target contract, and secret scan rules"
```

---

## Out of Scope for This Plan

Delivery-worker claim gating, lease discipline, and attempt immutability are Plan 3. Mapping lifecycle and academic attestation are Plan 2. Reconciliation, the `MOODLE-LIVE-TEST-RECON-v1` repair allowlist, and the Integration Support workspace screens are Plan 4. Target provisioning, the live checkpoint, and cleanup are Plan 5. This plan adds no live Moodle write of any kind, and nothing in it approves production Moodle or real student data.
