# TASK-PH1-002a: Sessions + sign-in/out + recovery + sign-in UI

## Authority

- Phase/release: v0.2.0 Phase 1 (slice 2a of 2b; MFA is 2b)
- Requirement IDs: REQ-IAM-006, REQ-NFR-001, REQ-NFR-003, REQ-OPS-004 (auth rows), REQ-IAM-005 (re-auth hooks only)
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope identity-access session/recovery + sign-in UI only
- Action/screen/component IDs: IAM-REC-02 (§12.10 states), UI-FIELD-003 (password/sign-in field, exact copy), UI-FIELD-001 (username field), UI-ACTION-001 (buttons), UI-ERROR-001 (error summary)
- Policy/configuration version: demo-seed v0.2 (accounts) + SECURITY-v1 (new: TTLs, limits, lockout, password policy text, message templates AUTH-*)
- Acceptance-test IDs: auth-success, auth-generic-fail, auth-enumeration, auth-rate-limit, auth-lockout-neutral, recovery-generic, recovery-single-use, recovery-session-kill, cookie-flags, log-inspection, keyboard-SR-signin, slow-connection-double-submit
- Exact detailed blueprint file(s):
  - …/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/03-phase-1-identity-and-scoped-access.md (slice 2)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md (§12.10 states/methods, §12.13 rows)
  - …/04-UI-UX-DESIGN-SYSTEM/03-foundations-and-input-components.md (§14.7 UI-FIELD-003 incl. approved copy)
  - …/04-UI-UX-DESIGN-SYSTEM/07-content-accessibility-and-responsive-rules.md (auth a11y states)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/05-data-policy-and-configuration.md (config record standard, demo config, UTC/Lusaka)
  - …/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md + 03-state-command-and-event-contracts.md (flow, commands)
  - …/06-ARCHITECTURE-INTEGRATIONS/02-base-repository-and-ai-development-contract.md §18.1 (controller→service; services/ layout superseded by locked modular monolith 08/01)
  - …/07-SECURITY-PRIVACY-RESILIENCE/02-security-and-privacy.md (session rules) + 04-rate-limiting… (baselines) + 06-error-recovery… (§16.1/16.3/16.9/16.14)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/03-permission-and-visibility-core.md (§15.3) + 04-permission-and-visibility-restricted.md (IAM-admin workflow-only)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (identity/session/role workspace)
- Open design-gap IDs: none blocking (production IdP/MFA provider + email/SMS delivery stay open production decisions; demo-only token path covers MVP)

## User outcome

A fictional user signs in (username + password, managers/paste welcome),
signs out, and recovers access via time-boxed single-use tokens — with
identical responses whether the account exists or not, full keyboard /
screen-reader support, and plain-language errors quoting approved copy.

## Architecture boundary

- Owning module: identity-access (`apps/api/src/identity-access/`: auth.controller → session.service / recovery.service, dto/*, rate-limit guard; no cross-module writes)
- Permitted dependencies: none new (argon2, adapter already in; TOTP libs are 2b)
- API/command/event contracts: POST /auth/sign-in, POST /auth/sign-out, GET /auth/me (own record only), POST /auth/recovery/request, POST /auth/recovery/confirm; commands CMD-IAM-SignIn/RequestRecovery/ConfirmRecovery (id + correlation); demo-only token completion (`DEMO_MODE` + seed accounts only, labelled)
- Data entities/migration impact: NEW RecoveryToken table (tokenHash UNIQUE, single-use, 1h expiry) + Account failedSignInCount/lockedUntil (additive migration); sessions server-side in Postgres (revocable, no Redis per lock)
- External adapters: none (delivery provider = simulator in a later phase)

## Required controls

- Authorization/relationship: /me returns own record only (15.3); recovery admin sees workflow metadata only (05/04 IAM-admin row)
- Privacy/classification: fictional only; tokens/passwords never logged (log-inspection test); recovery responses identical for unknown users
- Validation/state transitions: DTO allow-list (global pipe); recovery follows §12.10 states with guarded transitions; sign-in mints fresh session; confirm kills all sessions (REQ-IAM-006)
- Audit: auth/recovery outcomes as AuditEvent rows (full §16.14 11-field shape + 07/02 actor/role/scope/command/target/prior-new/policy/reason/time/correlation/outcome, minimized content; correlationId doubles as the §16.1 user support reference)
- Idempotency/rate limiting: login 5/15min + progressive delay, reset 3/hr (07/04 baselines in SECURITY-v1); double-submit guard on forms (04/07 slow-connection)
- Failure/recovery: §16.1 five-part errors; §16.3 summary linking fields; §16.9 neutral security message; reset-link-expired → fresh request; username preserved after failure (UI-FIELD-003)
- Accessibility/UI states: 04/07 auth checklist (keyboard-only, SR labelling, focus order/visible, zoom/reflow, error identification, mobile, slow-connection, accessible sign-in AND recovery); UI copy from AUTH-* templates, failure sentence verbatim per §14.7

## Out of scope

Workspace switch UI + grant API (slice 3), permission guard matrix (slice 4), MFA enrol/challenge (2b), break-glass (slice 6), IAM-admin recovery queue UI, email/SMS delivery, production IdP, Lusaka-time UI helper if untouched (render UTC-labelled otherwise — no, helper included: small Intl formatter, config time zone).

## Definition of done

- [x] Entry gate all YES (this packet)
- [x] Endpoints + guarded demo path behave per proofs (unit 5/11, e2e 2/9 green via with-env; demo:reset 4/4/6/4)
- [x] UI-FIELD-003/Button/UI-ERROR-001 contracts added to `packages/ui/README.md`
- [x] SECURITY-v1 + AUTH-* templates in `packages/config` (web renders from config; connection-error text is §16.1 wording, not policy)
- [x] CSP + content-type + frame headers in web config (07/02; nonces recorded debt)
- [x] Log-inspection test proves no password/token in logs
- [x] No secret/real data; `diff --check` clean
- [ ] Reviewer replays sign-in + recovery on WSL and explains the session lifecycle

## Source map (anti-hallucination — packet-local vs handbook)

Packet-local demo labels (valid choices, never cite as handbook IDs): `SECURITY-v1`
(versioned demo config; handbook demo config is `DEMO-ACADEMIC-2026-v1`), `AUTH-*`
(handbook requires template IDs/versions/owners but lists none), `demo-seed v0.2`,
`DEMO_MODE`, `CMD-IAM-SignIn/RequestRecovery/ConfirmRecovery` (pattern-compliant
with the command standard; handbook lists no `CMD-IAM-*`), `/auth/*` paths
(handbook defines flows, not REST), `RecoveryToken/tokenHash/failedSignInCount/
lockedUntil/60m` (behaviour from REQ-IAM-006 + §12.13; schema is app-local),
kebab test IDs below (intent maps to handbook proofs).

Test-ID map: auth-success/auth-generic-fail → Required proof "successful and
failed authentication" + §14.7/§16.9 sentences; auth-enumeration →
"account enumeration tests" + TEST-AUTH-002 pattern; auth-rate-limit →
5/15min + 3/hr baselines; auth-lockout-neutral → §12.13 locked row;
recovery-generic/single-use/session-kill → REQ-IAM-006 + rotate/invalidate
(07/02); cookie-flags → 07/02 secure cookie rules; log-inspection → 07/02
logging ban + §14.7 non-goals; keyboard-SR-signin → §17.6 + proof
"keyboard/screen-reader authentication flow"; slow-connection-double-submit →
§17.5 double-click/connection-loss + UI-SUBMIT-001.

## Handbook-gap fixes (branch `feat/ph1-002a-handbook-gaps`)

1. Unknown fields rejected (`forbidNonWhitelisted`, 07/02) — `main.ts` + e2e pipe.
2. Presented session rotated on sign-in (07/02) — controller revokes the
   presented cookie when minting fresh; other devices unaffected.
3. `correlationId` surfaced as `reference` on every failure/success body and
   appended in web error summaries (§16.1 support ref); rate-limit denials now
   audited (they weren't).
4. Recovery rate-limit e2e proof added (3×200 then 429 + Retry-After).
5. `Retry-After` on recovery 429 (was sign-in only).
6. `X-Frame-Options: DENY` + HSTS headers added (CSP/`nosniff` existed).
7. REQ-IAM-005 enforcement point named: `SessionService.validateSession`
   docblock; recovery confirm is the credential-change step-up (token-gated +
   session kill). Full MFA enforcement stays a later slice.
