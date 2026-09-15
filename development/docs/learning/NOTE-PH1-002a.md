# Learning Note — TASK-PH1-002a

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.2.0 Phase 1 slice 2 (sessions + recovery + sign-in UI; MFA stays a later slice per REQ-IAM-005/open production decision)

## What we built and why

Sign-in/out, own-record read, and single-use recovery plus accessible forms, so later slices authenticate against real sessions instead of imagination (handbook `11/.../03-phase-1`: slice 2 "Secure sign-in/session/sign-out and recovery").

## Why it belongs in this module

`identity-access` owns Person/Account linkage, sessions and recovery (`06/01`); no module writes another's tables. Controller delegates to services (`18.1`).

## Frontend explanation

`sign-in/`, `recovery/`, `recovery/reset/` pages + same-origin proxy. All wording renders from `@sis/config` (`AUTH-*`, `SECURITY-v1` demo values); inputs keep values across failures; double-submit blocked with announced progress; errors link to fields.

## Backend explanation

`auth.controller` → `session.service` / `recovery.service`; `SessionGuard` + `CsrfGuard`; `RateLimiter` in-memory (no Redis per locked stack). Unknown users get dummy-verify + delay so replies stay identical (`REQ-IAM-006`).

## Database explanation

Migration adds `RecoveryToken(hash UNIQUE, single-use, 60m demo expiry)` + `Account.failedSignInCount/lockedUntil`. Only hashes stored; raw token shown once via guarded demo path (`DEMO_MODE=true` local only).

## Security and authorization explanation

Server sessions (12h absolute / 30m idle demo TTLs), httpOnly `sid` + SameSite=Lax (+Secure in prod), 5/15min login + 3/hr recovery baselines (`07/04`), lockout with neutral replies (`§12.13`), confirm kills affected sessions, nothing secret logged.

## Tests and what they prove

`demo:reset` → 4/4/6/4 seed · API unit 5 files/11 pass · e2e 2 files/10 pass (happy cookie+me, identical 401s, 5×→429 neutral, CSRF 403, recovery generic→confirm→reuse 400→session-kill, recovery 3×→429, sign-out revoke, log-inspection). Web + API builds green. Run e2e via `node scripts/with-env.mjs npm run test:e2e --workspace=apps/api` (loads `.env`; bare run fails with SASL password error).

## Demo replay (reviewer copy-paste)

1. `npm run demo:reset` → expect `seed v0.2 complete: 4 persons, 4 accounts, 6 role assignments, 4 credentials`.
2. Sign in with a seed account → lands home showing display name.
3. Wrong password vs unknown user → identical `We could not sign you in…` 401.
4. 5 wrong tries → `429 We cannot complete…` neutral; correct password also 429 until window passes.
5. Recovery request → same generic reply either way → demo token → confirm → old cookie `401` (killed) → fresh sign-in works → sign out revokes.

## What failed or confused us

1. E2E `SASL password must be a string` → env not loaded in vitest → run via `with-env.mjs` wrapper (documented above), no code change.
2. Web fallbacks hardcoded divergent copy → now import `AUTH_MESSAGES`/`SECURITY_V1`; network-error text stays a connection message (§16.1), not policy wording.
3. Proxy forwarded single `set-cookie` + proxied any path → allowlist to slice-2 paths only + multi-cookie forward.
4. `PasswordField` describedby dangled with no help text; `ErrorSummary` focused only on mount; `ActionButton` rest-spread could clobber `disabled` → all fixed.

## Handbook-gap fixes (nothing from the handbook left behind)

Same 7 as the packet appendix: unknown-field reject; presented-session
rotation on sign-in; `reference` (correlationId) on all auth bodies + web
summaries, rate-limit denials audited; recovery rate-limit e2e; `Retry-After`
on recovery 429; `X-Frame-Options` + HSTS; REQ-IAM-005 hook named on
`validateSession`. Proof after fixes: unit 5/11, e2e 2/10, both builds green,
`diff --check` clean. Packet-local labels (`SECURITY-v1`, `AUTH-*`, kebab test
IDs, `CMD-IAM-*`, `/auth/*`, `demo-seed v0.2`, `DEMO_MODE`) are mapped to
their handbook sources in the packet appendix — cite those sources, not the
labels, in presentation.

## Seven-layer talk track (2 minutes)

Problem: strangers must not learn who holds an account. Policy: `REQ-IAM-006` + rate baselines + server sessions. Journey: sign in → need help → one single-use link → new password → other devices signed out. Architecture: `identity-access` only, controller→service. Data: hash-only token/credentials, failure counters. Code: controller, 2 services, 2 guards, cookie/rate/audit helpers, 4 specs. Evidence: e2e 9 proofs + log-inspection + builds.

## Terms/concepts learned

- Anti-enumeration (identical replies + dummy verify); absolute vs idle session expiry; single-use token burn; CSRF marker behind SameSite.

## Questions to revise before presentation

1. Why identical replies for unknown users? → `REQ-IAM-006`: disclosure lets attackers harvest accounts.
2. What dies on password reset and why? → Affected sessions revoked (`07/02` rotate/invalidate after recovery).
3. Cookie flags and why no localStorage? → HttpOnly+SameSite (+Secure in prod); tokens in JS storage leak via XSS.
4. What does `demo:reset` destroy? → Drops the `db` volume and rebuilds from migrations + fictional seed; safe — local demo only, never production.
