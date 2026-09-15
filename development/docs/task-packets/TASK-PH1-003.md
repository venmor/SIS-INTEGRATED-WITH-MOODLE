# TASK-PH1-003: Role assignment grants + active workspace switching + workspace UI

## Authority

- Phase/release: v0.2.0 Phase 1 (slice 3 of handbook 5; one slice, no split)
- Requirement IDs: REQ-IAM-002 (deliberate workspace select; authority from
  active role/scope), REQ-IAM-003 (assignment scope/dates/issuer/reason/
  revocation history), REQ-IAM-004 (server-side deny unless all permit —
  backend enforcement here, full matrix in slice 4), REQ-IAM-005 (re-auth +
  MFA-ready hooks for privileged grants; MFA enforcement stays 2b/production),
  REQ-OPS-004 (audit rows incl. active role/scope), REQ-NFR-001, REQ-NFR-003
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope
  identity-access grant + switch + workspace UI only
- Action/screen/component IDs: ACT-IAM-001 (assign privileged role),
  UI-CONTEXT-001 (workspace context bar: active role, scope, period),
  SCR-REC-LEC-001 (course-workspace header pattern)
- Policy/configuration version: demo-seed v0.2 roles/scopes (Mutinta
  LEC@OFFERING:SWE101-2026S1 + DEAN@SCHOOL:Computing live, TUT expired;
  Mweene SYSADMIN as demo IAM-Administrator stand-in) + SECURITY-v1
  (new: grant/switch rate limits, demo values)
- Acceptance-test IDs (packet-local; mapped in appendix): grant-allow,
  grant-self-deny, grant-unknown-generic, switch-ok, switch-foreign-deny,
  switch-expired-deny, me-workspaces, default-workspace, revoke-then-denied,
  audit-active-role, keyboard-SR-workspace
- Exact detailed blueprint file(s):
  - …/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/03-phase-1-identity-and-scoped-access.md (slice 3)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md (§12.8 separation, §12.9 grant form + validations, §12.10 admin visibility, §12.13 grant/revocation rows)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/03-lecturer-tutor-journey-book.md (explicit switch, workspace header, scope-denial rows)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/05-programme-coordinator-hod-journey-book.md (powers never appear silently; switch removes prior actions)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/06-school-dean-and-dean-of-students-journey-book.md (deliberate/effective-dated/audited switch; header example)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/01-functional-requirements.md (REQ-IAM-002/003/004/005), 02-action-contracts.md (ACT-IAM-001), 03-permission-and-visibility-core.md (§15.9 enforcement), 04-permission-and-visibility-restricted.md (IAM-admin row, SoD)
  - …/04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md (workspace always visible; deliberate switch; no irrelevant menu items), 02-screen-and-component-catalogue.md (UI-CONTEXT-001)
  - …/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md + 03-state-command-and-event-contracts.md (ownership, command standard) + 07-observability-audit-and-archive.md (material-action fields)
  - …/07-SECURITY-PRIVACY-RESILIENCE/01-security-resilience-and-codebase-health.md (backend final authority; re-auth + MFA rules) + 02-security-and-privacy.md (session rules)
  - …/12-TESTING-AND-ACCEPTANCE/03-authorization-and-security-test-guide.md (allow/deny matrix) + 02-acceptance-test-catalogue.md (TEST-AUTH-001–011, TEST-REC-006)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (identity/session/role workspace)
- Open design-gap IDs: none blocking (IdP/MFA provider + delivery stay open
  production decisions; demo-only grant/switch path covers MVP)

## User outcome

Mutinta signs in, sees two workspaces, works as Lecturer, deliberately
switches to the Dean workspace (header always states the active context),
and is denied anything outside the active scope. Mweene grants a role
through the admin form; the expired TUT never appears; a revoked assignment
denies immediately with an audited, plain-language message.

## Architecture boundary

- Owning module: identity-access (`apps/api/src/identity-access/`:
  `WorkspaceController` (switch) + `GrantsController` (grant),
  `session.service` (default pick, switch, workspace list) + grant logic,
  `dto/*`, `SessionGuard` (resolves active assignment); `AuthController`
  unchanged except enriched `GET /auth/me`; no cross-module writes)
- Permitted dependencies: none new (existing Prisma/argon2/class-validator only)
- API/command/event contracts: enriched `GET /auth/me` (`account` +
  `workspaces[]` + `activeWorkspace`), `POST /auth/workspace/switch`
  (`{assignmentId}`), `POST /auth/grants` (ACT-IAM-001 fields, username
  resolved server-side); commands CMD-IAM-SwitchWorkspace / CMD-IAM-GrantRole
  (id + correlation, packet-local names); events reuse RoleAssignment
  lifecycle vocabulary (Requested/Approved/Activated)
- Data entities/migration impact: ADDITIVE migration —
  `Session.activeAssignmentId` nullable FK → `RoleAssignment` (+ index);
  sign-in persists a deterministic default (earliest-started live
  assignment); switch updates in place (never mints); no seed change
  (Mutinta already holds 2 live + 1 expired assignments)
- External adapters: none (notification/access-review schedules stay future)

## Required controls

- Authorization: grant requires a live SYSADMIN-scope assignment (demo:
  Mweene only); high-risk self-assignment denied; no self-approval; switch
  requires ownership + liveness (not revoked, within effective dates);
  unknown usernames get neutral replies (enumeration resistance);
  server-side enforcement only, never client role state
- Privacy/classification: fictional only; grant lookup is exact-username
  (no wildcard browse); admin sees workflow records only, never
  academic/finance/support content
- Validation/state transitions: DTO allow-list (`forbidNonWhitelisted`);
  §12.9 required fields enforced (appointment evidence + authority source are
  mandatory); enforced now: self-assignment deny, date validity, duplicate/
  overlap deny, approver recorded. SoD-conflict matrix + scope-registry
  validity wait for curriculum tables / slice 4 (no conflict pairs invented).
- Audit: ALLOW/DENY rows with `activeRole`/`scope` filled (columns exist),
  `reference` surfaced, ERR-SEC on denials
- Idempotency/rate limiting: grant/switch limits in SECURITY-v1 (demo
  values, labelled); double-submit guard on forms (UI-SUBMIT-001 pattern)
- Failure/recovery: §16.1 five-part errors; expiry-during-session ends
  capability with safe message (§12.13); SoD conflict → review message;
  revoked-in-error → fresh grant with reason (never edit history)
- Accessibility/UI states: UI-CONTEXT-001 bar always visible for staff;
  deliberate switch is keyboard/SR-operable with visible focus; error
  summary + per-field patterns reused; menus show only active-role items

## Out of scope

Full permission-denial matrix (slice 4), audit review/expiry jobs
(slice 5), MFA enforcement (2b/production), break-glass, delivery/IdP,
applicant/student/finance/moodle modules, TOTP, access-review schedules.

## Definition of done

- [x] Entry gate all YES (this packet)
- [x] Migration applies (fresh `demo:reset` replays 4 migrations); default
      workspace deterministic; switch/grant behave per proofs (unit 6/16,
      e2e 3/16 green)
- [x] `GET /auth/me` enriched; switch + grant endpoints + proxy allowlist
- [x] Context bar + switcher + admin grant form; no hardcoded copy
      (WORKSPACE-001/002/003 + grant/switch limits in `packages/config`)
- [x] `diff --check` clean; secret + log-inspection scans clean; both builds green
- [ ] Reviewer replays Mutinta LEC→DEAN + unrelated-denial on WSL and
      explains the active-role decision path

## Source map (anti-hallucination — packet-local vs handbook)

Packet-local demo labels (valid choices, never cite as handbook IDs):
`SECURITY-v1` grant/switch limits (only login 5/15min + reset 3/hr are
handbook baselines), `AUTH-*`/`WORKSPACE-*` template IDs (handbook requires
template governance, lists none), `CMD-IAM-SwitchWorkspace`/`CMD-IAM-GrantRole`
(pattern-compliant; handbook lists no `CMD-IAM-*`), `/auth/me`,
`/auth/workspace/switch`, `/auth/grants` (handbook defines flows, not REST),
`demo-seed v0.2`, Mweene-as-IAM-Administrator (handbook names the role, not
the person), earliest-started default-workspace rule (demo-deterministic),
kebab test IDs below.

Test-ID map: grant-allow/switch-ok/me-workspaces/default-workspace →
ACT-IAM-001 + §12.9 + REQ-IAM-002/003; grant-self-deny → ACT-IAM-001
"high-risk self-assignment denied" + `02/.../02:95`; grant-unknown-generic →
enumeration tests + TEST-AUTH-002 pattern; switch-foreign-deny/
revoke-then-denied → `03-authz-guide:3` allow/deny matrix + TEST-AUTH-001–011;
switch-expired-deny → TEST-REC-006 + §12.13 expiry row; audit-active-role →
REQ-OPS-004 + 07-observability:11; keyboard-SR-workspace → §17.6 +
"keyboard/screen-reader authentication flow" proof.
