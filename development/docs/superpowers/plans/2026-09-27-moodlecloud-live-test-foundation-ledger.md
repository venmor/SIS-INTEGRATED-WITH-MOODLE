# Execution Ledger — MoodleCloud Live-Test Foundation (Plan 1)

Plan: `development/docs/superpowers/plans/2026-09-27-moodlecloud-live-test-foundation.md`
Spec: `development/docs/superpowers/specs/2026-09-25-moodlecloud-test-live-integration-design.md` (approved 2026-09-27)
Execution method: `superpowers:subagent-driven-development` — one fresh implementer subagent per task, one fresh review subagent per task, broad whole-branch review at the end.

## Standing rules for every subagent in this plan

- **No git writes.** No `git add`, `commit`, `push`, `merge`, or `reset`. Read-only `git status`/`diff`/`log` is fine. The plan's commit steps are skipped; changes stay in the worktree until the user authorises a commit.
- **No Prisma schema, migration, or database work** unless the task's own "Files" list names it.
- **No real Moodle target values.** No hostname, site id, release, role id, category id, or token may be invented anywhere. The live target is deliberately unconfirmed and must stay fail-closed. Policy constants and environment variable *names* only.
- **No live network call** of any kind, and no test that opens a socket.
- **No new npm dependency** without an approved ADR.

## Rulings

Rulings are decisions made during execution, not stalls. Each records what was decided, why, and what it costs if wrong.

### R1 — `selectBackend` re-export deferred from Task 1 to Task 3

- **What:** Plan Task 1 Step 4 originally said to replace the body of `selectBackend()` in `moodle-adapter.ts` with `export { selectBackend } from './moodle-live-config.js';`. That module is Task 3's file, and Task 3 Step 2 mandates a red test that fails *because* `./moodle-live-config.js` does not exist. Writing the re-export in Task 1 makes Task 3's mandated failure pass instead of fail. The plan's own Task 1 "Produces" line already said the re-export happens "in Task 3" — Step 4 contradicted it.
- **Why:** A mandated red test that cannot go red is a broken gate, and the plan contradicted itself on the same page. The implementer subagent caught it, implemented it, captured the `TS2307` error, then reverted — correct behaviour, and the plan was the defect.
- **Cost if wrong:** None behaviourally. The re-export lands in Task 3 either way and Task 1 keeps the inline resolver. If the re-export had been written in Task 1 and left, Task 3's red test would have passed for the wrong reason and the fail-closed checks could have been shipped untested.
- **Plan amended:** Task 1 Step 4 rewritten to rename only the returned label and record the deferral in a JSDoc; new Task 3 Step 4 owns the re-export, Steps 5–7 renumbered, and Task 3's `git add` now includes `moodle-adapter.ts`. Step numbering re-verified sequential across all 10 tasks.

### R2 — a parallel session is editing the same worktree

- **What:** A second session is concurrently modifying `packages/config/src/applications.ts`, `packages/config/src/applications.production.ts`, `packages/config/package.json`, `packages/config/tsconfig.json`, five files under `apps/api/src/admissions/`, and has added `apps/api/src/admissions/policy.provider.ts` plus a Prisma migration `20260927051423_application_production_config`. None of that is this plan's work.
- **Why:** It matters for three reasons. (1) `npm run typecheck` currently exits non-zero with ~13 errors, all in `apps/api/src/admissions/` — none of them ours, and we must not "fix" them. (2) `@sis/config` resolves through `packages/config/dist` (`main: ./dist/index.js`, no tsconfig `paths`), and its build script is `clean && tsc` — so rebuilding it to pick up `MOODLE_LIVE_V1` **destroys** the previous `dist` first and can fail. (3) A subagent that reads a typecheck failure as its own would chase a phantom.
- **Cost if wrong:** If that session commits or reverts its files while we hold uncommitted work in the same tree, our diff could be entangled with theirs. Mitigation: our work stays uncommitted, we never touch their files, and every task report separates our errors from theirs.
- **Interim state (2026-09-27):** the parallel session has since repaired `packages/config/src/applications.ts` — `npx tsc --noEmit -p packages/config/tsconfig.json` exits 0, `dist/applications.js` parses, and `dist/moodle.js` now contains `MOODLE_LIVE_V1`. The plain plan command `npx vitest run src/integration` passes 6/6. The `admissions` typecheck errors remain theirs.

### R3 — Task 1's temporary `selectBackend` JSDoc kept, not reworded

- **What:** The implementer added a six-line JSDoc to `moodle-adapter.ts` recording the deferral. The amended plan asked for "a one-line JSDoc".
- **Why:** The existing comment carries the same information plus the operative safety fact — that no policy object arms a live connection in the meantime. Shortening it would lose that.
- **Cost if wrong:** A slightly longer comment than the plan literally specified. Task 3 Step 4 removes it.

### R4 — the Moodle connection wizard takes Option A: the token never touches SIS

- **What:** The user chose Option A on 2026-09-27. The guided wizard collects every non-secret decision (host, `SITEID`, release, category, visibility, role IDs, run ID, database fingerprint), shows the exact `.env` block to copy, links to the Moodle token-minting steps, and proves the connection with a token the API already holds from the process environment — reporting non-secret results only. The token is pasted by the administrator into the deployment's secret store and nowhere else.
- **Why:** The approved spec states in four places that the token lives only in the process environment and is never written to a database row, log line, audit record, error message, test report, screenshot, or browser payload. A SIS form field is a request body that traverses the API validation pipeline, may be captured by a reverse proxy or an error reporter, and is one debugging session from a screenshot. Option B was declined, so no external secret manager and no new dependency enter this repository.
- **Cost if wrong:** An operator who expected to paste the token into SIS finds they must paste it into the deployment environment instead. The wizard's copy-to-clipboard `.env` block plus a link to the Moodle token steps is the mitigation.
- **Consequences accepted alongside it, from the same decision:** (a) the wizard is **site-wide configuration owned by named administrators under four-eyes**, never a per-user workspace setting, because a token is a site-wide credential and per-admin tokens would create competing credentials for one site; (b) every enable/disable/rotate action is audited; (c) the wizard performs no gate of its own — it calls the same server-side checks as the API, so it collects inputs and the server decides; (d) an identity read-back that does not match must hard-stop with the API's own refusal codes, not a dismissable warning.
- **Sequencing:** the wizard is **not in Plan 1**. It becomes a new plan after Plan 1, once the fail-closed configuration, the target identity proof, and the run state machine are real and tested. Building it now would mean building it twice.

### R5 — the plan's punycode test asserted something false

- **What:** Task 2 Step 1's first test asserted `normalizeHost('xn--moodle-8za.example.edu') === normalizeHost('moodle.example.edu')`. `moodle.example.edu` is pure ASCII, so its punycode form *is* `moodle.example.edu`, not `xn--moodle-8za.example.edu`. Verified by running the resolution: `'moodle.example.edu'` → `moodle.example.edu`, and `'xn--moodle-8za.example.edu'` → `xn--moodle-8za.example.edu`. The assertion is false, so a correct implementation would have failed the plan's own test.
- **Why:** The intent of the case is real and worth keeping — punycode and IDN spellings of the same host must converge, or host allow-listing can be bypassed by spelling the same site two ways. Only the fixture was wrong. The verified pair is `müoodle.example.edu` ↔ `xn--moodle-3ya.example.edu`; `xn--moodle-8za` is the encoding of a different string.
- **Cost if wrong:** None, once fixed. Had it shipped as written, the implementer would have been pushed to "fix" a correct `normalizeHost` into returning the wrong host, which would have made host comparison fail closed for legitimate IDN Moodle sites.
- **Also recorded from the same verification:** `new URL('https://' + value).hostname` **preserves** a trailing dot, so the strip-one-trailing-dot step must run *before* the URL resolution, as the plan already specifies. The test now pins that case too.

### R6 — Review Focus item 1 contradicted the spec; the refusal case is a different label, not a cosmetic one

- **What:** Plan Review Focus item 1 said a host differing "only cosmetically" (`MOODLE.Example.EDU.`) "must be refused, not matched loosely", and pointed at a Task 2 test `refuses a host that differs only by case or trailing dot`. Spec §6.1 says the opposite: identity is the tuple `(normalized URL hostname, siteid, release)`, and the plan's own Task 2 test asserts `MOODLE.Example.EDU.` → `moodle.example.edu` — accepted and normalized. The implementer followed the spec and Global Constraint line 22, which agree with each other, and added the test the Review Focus item was actually reaching for: `www.moodle.example.edu` against an allowlist of `moodle.example.edu`.
- **Why:** Refusing a cosmetic difference would itself be the vulnerability. `moodle.example.edu.` and `moodle.example.edu` are the same site, so an allowlist rejecting the trailing-dot form pushes an operator to disable the check, or gets "fixed" by loosening it to a suffix match — which then accepts `evil-moodle.example.edu`. Normalization is the control; loose matching is the bug.
- **Cost if wrong:** None. The spec is explicit and the added test pins the real risk to `{ ok: false, mismatches: ['host'] }`.
- **Plan amended:** Review Focus item 1 rewritten to distinguish normalization (accept) from substring/suffix matching (refuse), repointed at the existing test name. No test was invented to satisfy a wrong requirement.

### R7 — `moodle-target.ts` is import-free; the plan's "Consumes: `MOODLE_LIVE_V1`" was wrong

- **What:** The plan's Task 2 Interfaces line said the task consumes `MOODLE_LIVE_V1` from `@sis/config`. The plan's own Step 3 code, its Step 4 tests, and spec §6.1/§6.2 never reference it. The module was implemented with **zero imports**.
- **Why:** `MOODLE_LIVE_V1` is policy — rest path, token param, timeout, the twelve authorised functions. `moodle-target.ts` is identity comparison. Importing policy into a pure function couples target identity to a config version for no behavioural gain, and drags in the `packages/config/dist` resolution fragility in R2. Import-free also preserves the plan's stated goal that this is *the* one place identity is defined, so no later task re-derives it.
- **Cost if wrong:** None. Task 3 imports `normalizeHost` from here and `MOODLE_LIVE_V1` from `@sis/config` independently.
- **Plan amended:** Task 2's "Consumes" line now reads "Consumes: nothing" with the reasoning; the "Produces" line records the `ActualIdentity extends ExpectedIdentity` correction — the plan's sketch said `extends TargetIdentity`, but its own test builds an `actual` of `{ host, siteId, release }` with no `numericVersion`, which a required field turns into a `strict` type error, and since `numericVersion` is never compared, optional is also semantically right.

### R8 — `normalizeHost` rejects URL-shaped input, because `new URL` does not throw on it

- **What:** Verified with `node -e`: `new URL('https://' + 'http://a/b').hostname` returns `'http'`. It does **not** throw — it silently discards everything from the first `/`. The implementer added guards rejecting whitespace, `/`, `:`, `?`, `#`, `@`, and validates the resolved hostname against a strict reg-name per label.
- **Why:** A host allowlist built on bare `new URL` resolution would compare a *prefix* and could accept a truncated match. The plan already says `normalizeHost` throws when the value "does not parse as a hostname", so this is inside that contract rather than an invented design, and it makes `'.'` and `'moodle.example.edu/webservice/rest/server.php'` throw. Defence in depth only — spec §6.2 checks 2–3 put the full URL-shape check on `MOODLE_API_URL` in Task 3, which is where a refusal *code* comes from.
- **Cost if wrong:** `normalizeHost` is marginally stricter than a bare `new URL`. No legitimate hostname contains those characters, so nothing real is rejected.
- **Also widened:** `normalizeHost`'s thrown message never echoes its input, so a configured target hostname cannot reach an error detail and thence a log. The plan stated the no-leak rule only for `assertTargetIdentity`.

### R9 — spec: `siteid` commonly equals `1` and is not tenant evidence

- **What:** Spec §6.1 states `core_webservice_get_site_info.siteid` is the site-course `SITEID`, **commonly has the value `1`**, and "is not proof of a unique MoodleCloud tenant". The plan's fixtures use `2`.
- **Why:** Recorded because it changes what the operator should expect when reading the value off their own site, and because it bounds what the identity triple proves. The **hostname** is the tenant proof; `siteid` checks Moodle's site-course identity; `release` is the version gate.
- **Cost if wrong:** None — but if a later step treats a matching `siteid` of `1` as evidence the target is the correct tenant, that is a real defect. Carried into the operator guidance already given to the user.

### R10 — Task 1 review returned CHANGES REQUIRED: four blocking defects, all confirmed

Dispatched a fresh read-only reviewer. Verdict: `MOODLE_LIVE_V1` itself is field-for-field correct against spec §7 and §8.2, the seven `integration.service.ts` renames are genuinely behaviour-preserving (each checked for the "string literal compared against something that is not `MoodleBackend`" failure mode — all seven are typed comparisons, no branch changes), and the token is safe on every path touched. Four blocking defects, all four independently confirmed before acting:

- **D1 `apps/web/app/admin/moodle/mappings/validate.tsx:48` — orphaned functional regression.** `out.backend === "live"` is now permanently false, so a live-test Moodle renders as `Simulator: Connected to <sitename>. Live enrolments affect real courses. (version 4.5.6)`. Invisible to verification: the response type is a hand-written `backend?: string`, so `tsc` cannot catch it (web typecheck exits 0), and no test clicks the button. **No plan task owned this file** — the plan's only `apps/web` file is `admin/moodle/page.tsx` in Task 9, which would not have fixed it either. This is a live rehearsal reporting itself as a simulator run: the reporting analogue of Global Constraint 17.
- **D2 `packages/config/src/moodle.ts:61-62` — false enforcement claim.** The comment "The adapter refuses any other function rather than substituting one" is untrue: `moodle-live.ts:378` still calls `core_enrol_get_enrolled_users_with_capability` (a thirteenth function) and `381-386` still `.catch(async () => …)` substitutes `core_enrol_get_enrolled_users`. Known from first exploration; recorded as a fail-closed blocker, not fixed, because Task 8 owns the transport. A Task 8 reviewer reading this comment would believe the deviation was already handled.
- **D3 `packages/config/src/moodle.ts:47-49` — false state claim.** Says the `requiredEnv` variables are "all empty in `.env.example`" (3 of 12 present, 8 absent until Task 3 Step 6) and that startup "resolves to `live-test-disabled`" (that literal exists nowhere in the codebase).
- **D4 `apps/api/src/integration/moodle-adapter.ts` — two contradictory safety claims in one module.** New line 6-7 says "never from a URL and a token"; untouched `moodle-live.ts:55-56` says the opposite and is the one describing today's behaviour. The JSDoc's "no live connection is armed … in the meantime" clause is the mirror image of D3.
- **Ruling:** comments that assert fail-closed enforcement which no code implements are treated as blocking defects, not stylistic notes. A policy object is the file a later task will enforce against; a false claim in it is how a gate ships believing the risk was retired. All four fixed by rewording to the current truth, plus the one real comparison fix. No runtime behaviour changed except the `validate.tsx` label.
- **Plan amended:** `validate.tsx` added to Task 1's Files list; Step 6 gained a repository-wide grep for residual bare-`'live'` comparisons and an explicit note that the search must cover `apps/web`, with the reason (`tsc` cannot catch a hand-written `string`).

### R11 — `requiredEnv` was missing a variable the spec requires; `modes` is correct and was not changed

- **What:** The reviewer flagged that `modes: ["simulator", "live-test"]` omits `live-test-disabled`, which spec §8.1 and Global Constraint 17 name as a resolution, and that the new test pins the two-element list so Task 3 would have to change it. Separately it flagged that `requiredEnv` omits `MOODLE_LIVE_TEST_COHORT_PREFIX`, which spec §6.1 lists among the runtime configuration.
- **Ruling on `modes` — no change.** `modes` lists the values `MOODLE_INTEGRATION_MODE` may take. `live-test-disabled` is a *resolution kind* produced by a failed `live-test`, not a selectable mode; it appears in Task 3's `BackendSelection`, and Task 3 refuses any other mode value with `MODE_INVALID`. Adding it to `modes` would make the object claim a mode an operator cannot select. The reviewer's concern is recorded as resolved-by-analysis, not as a defect.
- **Ruling on `requiredEnv` — changed.** Spec §6.1 lists `MOODLE_LIVE_TEST_COHORT_PREFIX` in the runtime configuration, and Task 3 refuses `COHORT_PREFIX_MISMATCH` when it differs from `cohortPrefix`, so an operator who omits it is refused. A list documented as "every variable an operator must supply" that omits a variable the code refuses when absent is untrue. Added.
- **`MOODLE_REAUTH_MODE` deliberately stays out:** it defaults to `session-age`, so omitting it is meaningful and is not an error. The plan now says so and the test pins the absence.
- **Cost if wrong:** if `modes` did need the third value, Task 3's `BackendSelection` still carries it and nothing else reads `modes`; if `requiredEnv` were meant to exclude the cross-check variable, the addition is one string and Task 3's `.env.example` already documents it.

### R12 — the sole guard for the authorised function set was too weak

- **What:** The plan's Step 1 test asserted `authorisedFunctions` with `toHaveLength(12)` plus two `toContain` calls. An implementation holding ten wrong names, or the right twelve in the wrong order, passes.
- **Ruling:** strengthened to an exact `toEqual` over all twelve in spec §7 order, plus `runStates`, `terminalStates`, and `requiredEnv` assertions. This is the only guard for the authorised function set until Task 8's `assertAuthorisedFunction` exists, and Global Constraint 23 makes the set a security invariant. The weakness was the plan's test, not the implementer's transcription of it.
- **Cost if wrong:** none; the set is already correct field-for-field, so a strict assertion pins existing correct behaviour.

### R13 — carried forward to Task 9: health reports the wrong provider string

- **What:** `integration.service.ts:194` persists `MOODLE_DEMO_V1.provider` (`"MOODLE-SIM-v1"`) into the `MoodleConnection` row even in live-test mode, so health would report `MOODLE-SIM-v1` for a live-test site. Pre-existing, surfaced by `MOODLE_LIVE_V1.provider` now existing as the correct alternative.
- **Ruling:** not fixed in Task 1 — it is a health-payload decision belonging to Task 9's rewire. Recorded here so it is not lost.
- **Also carried forward:** `.env.example:20-22` still says "Set BOTH to arm the live External Services adapter", the URL+token auto-arming contract this plan removes. Task 3 Step 6 owns it; the Task 1 rename widened the contradiction.
- **Also carried forward:** `liveConfig()`'s new `MOODLE_LIVE_V1.timeoutMs`/`restPath` reads are untested, because `moodle-live.spec.ts:62-67` always injects an explicit `LiveConfig`, so the policy-driven branch runs only in production. Values are byte-identical to the deleted block so the refactor is a no-op, but the repointing is unverified. No test asserts `moodlewsrestformat` either, so a wrong `formatParam` key would ship green.

## Task status

| # | Task | Implement | Review | State |
|---|------|-----------|--------|-------|
| 1 | Explicit mode and the `MOODLE_LIVE_V1` policy | done | reviewed, fixed, re-verified | 4 blocking defects closed, 2 strengthening changes applied |
| 2 | Canonical target identity | done | **CHANGES REQUIRED** | 1 blocking defect confirmed, 4 test-gap findings, fix in flight |
| 3 | Fail-closed live-test configuration | — | — | not started |
| 4 | Non-secret database identity, fingerprint, scope manifest | — | — | not started |
| 5 | Hand-written SQL migration and the transition table | — | — | not started |
| 6 | Run service | — | — | not started |
| 7 | `ReauthenticationService` | — | — | not started |
| 8 | REST protocol and transport | — | — | not started |
| 9 | Adapter rewire and run-state surface | — | — | not started |
| 10 | Scan rule, gap record, docs, verification | — | — | not started |

## Task 1 result

Implemented in the worktree, uncommitted.

Files changed: `packages/config/src/moodle.ts` (deleted `MOODLE_DEMO_V1.live`, added `MOODLE_LIVE_V1`), `packages/config/src/index.ts` (export `MOODLE_LIVE_V1`), `apps/api/src/integration/moodle-live-config.spec.ts` (new), `apps/api/src/integration/moodle-adapter.ts` (`MoodleBackend` gains `live-test`; label renamed; resolver body kept per R1), `apps/api/src/integration/moodle-live.ts` (reads `MOODLE_LIVE_V1` instead of `policy.live`; casts deleted), `apps/api/src/integration/integration.service.ts` (7 `'live'` → `'live-test'`), `apps/api/src/integration/moodle-live.spec.ts` (2 expected-value renames). `delivery.worker.ts` needed no change.

Evidence: red test failed for the right reason (`MOODLE_LIVE_V1` undefined); green test 1/1; `src/integration` suite 6/6; `npx tsc --noEmit -p apps/api/tsconfig.json` shows zero errors in `src/integration` and `packages/config`; `npm run lint` 24 warnings, 0 errors, none on touched lines.

No git command was run. No database or migration was touched. No real target value was invented. No network call was added.

## R14 — the 4.5.6 implementation baseline is void; prove the protocol against the live target

The operator has now confirmed a real MoodleCloud test target exists and reported its release. That release is **not** the 4.5.6 the plan was written against.

Spec §27 anticipated exactly this: Moodle 4.5.6 source is the implementation baseline *"until the target version is confirmed"*, and spec §389 permits 4.5.6 contract fixtures **only if** the target is confirmed as 4.5.6. The target is not, so the baseline is spent.

**Ruling:** the REST protocol assumption (`POST application/x-www-form-urlencoded`, external-function parameters read from merged `$_GET`/`$_POST`, `wstoken`/`wsfunction`/`moodlewsrestformat` in the query string, PHP bracket parameter form) is **no longer inherited from 4.5.6 source**. It must be demonstrated against the live target using the one read-only function already in the authorized set, `core_webservice_get_site_info`, before any live write is ever attempted. Reasoning from 4.5.6 source is not acceptable evidence.

**Why:** this is a security boundary. The whole design rests on sending a credential the way the target expects. A protocol assumption inherited from the wrong major version is an untested assumption at exactly the point where it must not be one.

**Cost if wrong:** a late discovery in Plan 5 that the form encoding differs, discovered after the rehearsal is scheduled. The mitigation is cheap — one read-only call — so the cost of ruling this way is a single extra gate, while the cost of not ruling this way is a failed rehearsal with a token already in hand.

**Consequences:**
1. The plan's remaining `4.5.6` **test fixtures stay exactly as they are.** They are example-zone literals in a reserved domain, not target claims. Changing them would make the repository assert a target version it must not record. Every real identity value arrives from the environment at run time.
2. The target's own reported `release`, `siteid` and `version` come from the read-only call, **not** from transcribing a web page. The design compares the exact `release` string, so a hand-transcribed or JS-rendered value is not evidence.
3. The authorized-function set must be re-checked against the confirmed release before the rehearsal, because a removed or renamed external function is discovered at call time as an access exception.
4. The exact hostname, release, site id, role ids, category id and token are **deliberately absent from this repository** — not from the plan, the ledger, source, fixtures, comments, or audit metadata — per spec §6.1. They live in the operator's deployment environment and in the target itself.

## R15 — a Moodle site name is not a hostname

The operator reported a Moodle admin page. That page's site name reads like a short label and the URL path confirms it, but the site *name* is administrator-editable free text and is **not** evidence of the tenant. Only the URL authority is.

**Ruling:** the canonical hostname is taken from the URL authority the operator reported, normalized by `normalizeHost` (Task 2), and nothing else. A site name, a page title, or a dashboard label may never be used as a host input; if the two disagree, the URL authority wins and the discrepancy is reported rather than resolved silently.

**Why:** the allowlist comparison in Task 3 is the tenant boundary (R9 — the hostname is the tenant proof, `siteid` commonly equals `1` and proves nothing). An operator-supplied label that looks host-shaped is exactly the kind of value a well-meaning admin pastes instead of the URL.

**Cost if wrong:** an operator pastes a site name into `MOODLE_ALLOWED_HOST` and live mode refuses at startup with a clear `HOST_MISMATCH` instead of connecting. That is the fail-closed outcome we want; the ruling costs one explanatory error message.

## Task 1 review and fix

Review verdict **CHANGES REQUIRED** with 4 blocking defects (D1–D4) and 2 strengthening changes (S1–S2). All six fixed and re-verified.

**D1 — the defect that mattered most.** `apps/web/app/admin/moodle/mappings/validate.tsx` compared `out.backend === "live"`, which the `MoodleBackend` rename made permanently false, so a live-test Moodle rendered as `Simulator: Connected to <sitename>`. Invisible to verification: a hand-written `backend?: string` defeats `tsc` and no test clicks the button. No plan task owned the file. The plan was amended to give Task 1 ownership of it and a repo-wide grep for residual bare-`'live'` comparisons.

The fix did **not** import the API's `MoodleBackend`, which was the obvious move and the wrong one: it lives in `apps/api/src/integration/moodle-adapter.ts`, which imports `@prisma/client` at line 1, so importing it would drag a server module across the web→api module boundary into a `"use client"` component. Instead the union is derived from the single authoritative mode list:

```ts
import type { MOODLE_LIVE_V1 } from "@sis/config";
type ConnectionBackend = (typeof MOODLE_LIVE_V1.modes)[number];
```

`@sis/config` is a declared web dependency (`apps/web/package.json:12`), is in `transpilePackages` (`apps/web/next.config.ts:5`), and is already imported by 5 other web files, so it is a sanctioned shared boundary. `import type` is erased at compile time, so there is no bundle or runtime cost.

**Ruling:** the web app derives backend labels from `@sis/config`, never from the API's server module. — `@sis/config` is the existing sanctioned shared boundary and holds pure data with no env reads or secrets; the API module is server-only and would be a module-boundary violation. — Cost if wrong: a duplicated mode list in two packages, which a future rename would surface as a `TS2367` in the web build rather than as a wrong label in a browser.

This is stronger than a hand-written local union. A local `"simulator" | "live-test"` would satisfy the letter of the fix but leave the original regression reachable: renaming the mode in the API would still compile here. Deriving from `modes` makes the next rename a compile error. Proven, not assumed — a transient bogus label produced exactly that error:

```
apps/web/app/admin/moodle/mappings/validate.tsx(57,12): error TS2367: This comparison appears
to be unintentional because the types '"simulator" | "live-test" | undefined' and '"live-tst"' have no overlap.
```

**D2/D3/D4 — comments asserting enforcement that no code implements.** The policy comment claimed the adapter "refuses any other function rather than substituting one" while `moodle-live.ts:378` still calls a thirteenth function and `:381-386` substitutes another behind a `.catch()`; the config doc claimed all 12 env vars were empty in `.env.example` when 3 are present, and that startup resolved to `live-test-disabled`, a literal that exists nowhere; the adapter doc claimed the backend is "never" selected from a URL and a token, which is the opposite of what the untouched, accurate `moodle-live.ts:55` said.

**Ruling:** a comment asserting fail-closed enforcement that no code implements is a blocking defect, not a stylistic one. — Each of these four would have led a reviewer to believe a security gate existed. In a system whose entire value is fail-closed behaviour, a false claim of fail-closed is worse than no claim. — Cost if wrong: comments get more attention than they deserve.

All three were rewritten to state today's actual behaviour and name the task that removes the deviation. The `.env.example` claim and the `live-test-disabled` claim were both verified false before rewriting (3 of 12 vars present at `.env.example:23,24,28`; `live-test-disabled` appears nowhere in the codebase).

**S1** added `MOODLE_LIVE_TEST_COHORT_PREFIX` as the twelfth `requiredEnv` entry. `MOODLE_REAUTH_MODE` stays out deliberately — it defaults to `session-age`, so omitting it is meaningful, and listing it would misrepresent the contract.

**S2** replaced `toHaveLength(12)` + two `toContain` with exact `toEqual` over all twelve in spec §7 order, plus `runStates` and two `requiredEnv` assertions. Proven by mutation — appending a 13th function to the policy now fails the suite, where the old assertions would have passed:

```
AssertionError: expected [ …(13) ] to deeply equal [ …(12) ]
+ Received
+  "core_course_get_courses",
```

**Fix evidence:** config package builds clean; `src/integration` 17/17; web `tsc` exit 0 (run explicitly, because `npm run typecheck` short-circuits on the api half); `npm run lint` exit 0, 24 pre-existing warnings, none on touched lines; repo-wide grep for bare `'live'` comparisons returns only the one required negative assertion. No git write command ran. No real target value introduced. No network primitive added. No file outside the four was modified.

## Task 2 review and fix

Review verdict **CHANGES REQUIRED** with 1 blocking defect and 4 test-gap findings. Fix dispatched.

**Blocking, confirmed by direct execution:** `moodle-target.ts:61` `const NOT_IN_HOSTNAME = /[\s/:?#@]/;` omits backslash. WHATWG treats `\` as a path separator for special schemes, so:

```
"moodle.example.edu\evil.example.edu"  -> resolved: "moodle.example.edu"
```

The rest of the value is silently discarded. This defeats the module's own documented invariant — that a path is *refused* rather than *silently truncated by URL resolution* — and the test added for exactly that case only pinned the `/` variant. Every other URL-significant character is already refused; `\` was the only gap. Violates spec §6.2, which permits no hostname fallback rule. The realistic trigger is a malformed `MOODLE_ALLOWED_HOST` (a Windows-style path pasted into an env file) silently reduced to its first segment instead of stopping live mode. In the module that is the trust boundary for host identity, silently rewriting an invalid configured hostname is the fail-open the design forbids.

The reviewer proved this by sweeping every URL-significant character — `%`, `[`, `]`, `|`, `^`, `<`, `>`, `"`, backtick, `&`, `=`, `+`, `;`, `!`, `$`, `*`, `{`, `}`, U+0001, U+007F, U+2028 are all refused by guard, parse failure, or the reg-name regex.

The same review proved two more load-bearing properties were unpinned, by mutation:
- Stripping *exactly one* trailing dot is correct in code, but a mutant using `/\.+$/` passes all 11 tests while silently accepting `moodle.example.edu..`. Nothing pinned it.
- The per-label reg-name validation is **entirely untested** — deleting `ASCII_HOSTNAME` passes all 11 tests. The double-dot refusal above therefore rested on an unverified line, and the whole fail-closed hostname guarantee rested on untested code.

Also fixed: a test asserting `/siteid/` would also pass against a leaked `TypeError` (the message contains that token), so it does not pin what it claims; `toEqual` tolerates extra `undefined`-valued keys on the verdict, so the no-leak property was unpinned; the header doc claimed nothing is "never defaulted" while `version` is silently defaulted to `''`, which was narrowed and then pinned.

**Carry-forwards recorded, not fixed here:**
- `assertTargetIdentity` does not normalise its inputs. Fail-closed, so not a hole, but Task 9 must route the parsed hostname through `normalizeHost` (idempotent) because `new URL('https://moodle.example.edu./').hostname` keeps the trailing dot.
- `normalizeHost` imposes no length or multi-label bound; `localhost` and a 300-character label are accepted. Harmless for the allowlist comparison. **Task 3 owns the "HTTPS origin to a real tenant" judgement — this module must not be assumed to make it.**

## Verification still owed before Plan 1 can be called done

Per the plan's own closing task and the repository AGENTS.md: `npm run typecheck`, `npm run lint`, the full `apps/api` test suite, the browser test suite, and a security review of the new fail-closed surface. None may be reported as passing on the strength of a single task's evidence.

## R16 — a concurrent session commits to `main` directly; our work must be re-verified after every external commit

**Ruling: treat every commit that this session did not make as an event that may have swept up or moved our files, and re-verify our file inventory after each one. Never commit our own work without the user's explicit authorisation.**

**What happened.** A second session ("venmor") working in this same worktree committed `eb28602` — *"feat: add Capability, Scope, ApproverAuthority, SoDPair entities and seed data (GAP-003, GAP-004, GAP-006, GAP-012)"* — directly to `main`, without asking. `AGENTS.md` forbids us from committing without authorisation; nothing stops another session from doing so.

**Verified immediately after that commit.** All of our work was still present and uncommitted: 7 modified (`integration.service.ts`, `moodle-adapter.ts`, `moodle-live.spec.ts`, `moodle-live.ts`, `apps/web/app/admin/moodle/mappings/validate.tsx`, `packages/config/src/index.ts`, `packages/config/src/moodle.ts`) and 6 untracked (`moodle-live-config.spec.ts`, `moodle-target.ts`, `moodle-target.spec.ts`, the plan, the ledger, the spec). Their commit touched only new capability/scope/approver-authority entities. Nothing of ours was absorbed.

**Why this is a ruling and not a note.** Our entire deliverable is currently held only in an uncommitted worktree, and a commit we did not author is the one mechanism that could silently absorb, reorder, or conflict with it. The failure mode is not "we notice"; it is that a later task's verification passes against a file the reviewer never actually read. Re-verifying the inventory after each external commit turns that into something we check rather than something we hope.

**Cost if wrong.** We spend one `git status --short` per external commit — trivial. The cost of *not* ruling this way is discovering during Plan 5 that a task was reviewed against code a concurrent session had already replaced.

**Consequences.**
- Re-run `git status --short` scoped to our paths after any commit whose author is not us.
- If one of our paths ever appears *inside* an external commit, stop and report it; do not attempt to undo another session's commit.
- We still do not commit, and the Step-7 commit steps in every task remain skipped. When the user authorises a commit, ours must be made on our files only, after re-checking the diff.

## R17 — five corrections to Task 3, made after reading the task text line by line

Task 3 is the fail-closed configuration gate: the first place an operator's environment is turned into either a usable `LiveTestDescriptor` or a refusal. The plan's text is sound in intent but wrong or underspecified in five places. All five are ruled here and folded into the Task 3 dispatch.

**R17a — the plan's host rule and its own Review Focus test contradict each other, and the test is the wrong one.** L455 says host matching is "exact after `normalizeHost`... Compare against the comma-separated `MOODLE_ALLOWED_HOST` list the same way." L380 then asserts that `MOODLE_ALLOWED_HOST: 'MOODLE.Example.EDU.'` yields `HOST_NOT_ALLOWED`. Under L455's own rule both sides normalise to `moodle.example.edu`, they converge, and the value is **valid**. L380 is therefore wrong as written.
*Ruling:* the rule is explicit, not "the same way" — **both** the URL's host and **each** allowlist entry go through `normalizeHost` before comparison; a case-only or trailing-dot-only difference converges and **must be accepted**. The comparison is then `===` on the normalised values. Substrings and suffixes never match. The L380 test is replaced by a differing-label case, and a new test pins the convergence positively.
*Why:* an ambiguous instruction here reintroduces exactly the error R6 already caught once, and getting it wrong in the refusing direction is itself a fail-open — refusing a valid spelling of the right tenant teaches an operator to disable the check. *Cost if wrong:* one test rewritten; the shipped comparison rule is unchanged.

**R17b — an absent or malformed allowlist is a refusal, not a skip.** The plan never says what happens when `MOODLE_ALLOWED_HOST` is missing, empty, or contains an entry `normalizeHost` throws on. Skipping such an entry would mean a typo silently narrows the allowlist, and skipping the variable entirely would mean no allowlist.
*Ruling:* missing or empty `MOODLE_ALLOWED_HOST` is `HOST_NOT_ALLOWED`. An individual entry that `normalizeHost` rejects (including a thrown message never echoed) is **also** `HOST_NOT_ALLOWED` for the whole list — one malformed entry refuses live mode rather than being dropped from it.
*Why:* a narrower-than-intended allowlist is still fail-closed, but it is unpredictable, and an operator cannot tell a typo from a policy. Refusing is the only outcome that is safe and explicable. *Cost if wrong:* a typo in one entry blocks startup, with the refusal code naming the field.

**R17c — the descriptor's `token` must be non-enumerable, and this is pinned now.** `LiveTestDescriptor` carries `token` as a plain field. Tasks 6 and 9 both consume the descriptor (Task 6 into a scope manifest, Task 9 into HTTP endpoints), and any of `JSON.stringify`, `Object.assign`, spread, a logger that serialises its argument, or an exception carrying the descriptor as context will put the token into a log line, a response body, or an audit record. The spec forbids exactly that, in four places.
*Ruling:* `token` is defined as a **non-enumerable own property** at construction. `descriptor.token` still reads normally, so no consumer breaks; spreading or serialising silently omits it. Pinned by a test asserting `JSON.stringify(descriptor)` does not contain the token **and** `Object.keys(descriptor)` does not include `"token"`, proven by mutation.
*Why:* this is the one place the whole system could leak the credential, and the fix is one `Object.defineProperty` call. Deferring it to Task 9 means the leak surface exists in Tasks 6 and 7 first. *Cost if wrong:* a future consumer that spreads a descriptor loses the token — which is the correct outcome, since spreading a credential is the bug.

**R17d — "collects every failing code" is the plan's most important behaviour and no test pins it.** L453 and L451 demand that all failures are collected so an operator sees the full list in one startup, yet the plan's tests each break one variable and assert only `toContain`. An implementation that returned only the first code would pass every test in the plan.
*Ruling:* (i) every single-variable refusal test asserts `reasons` **exactly equals** the one expected code — a sort-agnostic array comparison, not `toContain`; (ii) at least one test breaks two variables at once and asserts exactly those two codes; (iii) a test with a wholly absent environment asserts the full expected set rather than a sample. (ii) and (iii) require mutation proof: make `selectBackend` return on the first failure and show they fail.
*Why:* the plan's own stated purpose for the module is the complete list, and today the complete list is untested. *Cost if wrong:* two extra tests.

**R17e — Task 3's Step 2 red state is a collection error, not a test failure, and must not be faked.** `moodle-live-config.spec.ts` already exists (Task 1) and `moodle-live-config.ts` genuinely does not, so vitest fails at import resolution for the whole file. The report must state that this is what was observed, and the subagent must not create a stub module, a placeholder export, or a `// TODO` file to make the failure look tidier.
*Why:* a manufactured red is a false verification claim, and this ledger already carries one ruling about never asserting enforcement that does not exist. *Cost if wrong:* none — it is a reporting requirement.

**Also carried into this task:** `normalizeHost` imposes no length or multi-label bound, so `localhost` and a 300-character label are accepted (Task 2 finding). Harmless for an allowlist comparison, but **Task 3 owns the "is this an HTTPS origin to a real tenant" judgement.** Task 3 must therefore not delegate that judgement to `normalizeHost`, and must not document `normalizeHost` as making it. Additionally, the plan's `4.5.6` fixtures and example-zone values are **example-zone** and stay byte-identical — the confirmed target is a different release (R14), and correcting the fixtures to match the target is forbidden.
