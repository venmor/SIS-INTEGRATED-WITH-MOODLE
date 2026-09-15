# Learning Note — TASK-PH1-003

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.2.0 Phase 1 slice 3 (grants + workspace switch; one slice)

## What we built and why

Grant roles (ACT-IAM-001) + deliberate workspace switching (REQ-IAM-002) +
sessions that carry the active assignment, so Mutinta works as Lecturer,
switches to Dean, and is denied outside the active scope (roadmap slice 3).

## Why it belongs in this module

`identity-access` owns linkage, roles, scope, sessions (`06/01`); new
`WorkspaceController` + `GrantsController` live inside it — `AuthController`
grew only an enriched `/me`. No cross-module writes.

## Frontend explanation

Home hub renders `ContextBar` (UI-CONTEXT-001: role · scope, always visible)
+ switcher buttons + conditional admin link; `/admin/grants` holds the §12.9
form. All wording from `@sis/config`; proxy allowlist extended by two paths.

## Backend explanation

`WorkspaceService` (live list, deterministic default = earliest-started,
in-place switch) + `GrantsService` (SYSADMIN-workspace authority,
self-grant/unknown/overlap/date denies, exact-username resolve);
`SessionGuard` resolves the live assignment per request; sign-in persists
the default.

## Database explanation

Additive migration: `Session.activeAssignmentId` nullable FK →
`RoleAssignment` (+ index, `SET NULL`). FK keeps authority live
(revocation/expiry bites next request); history stays in audit snapshots.
No seed change — Mutinta already holds 2 live + 1 expired assignments.

## Security and authorization explanation

Authority from the live active workspace, never client state (REQ-IAM-002);
missing evidence/overlap/self-grant denied with neutral copy; unknown
usernames undisclosed; grant/switch rate-limited with `Retry-After`;
`forbidNonWhitelisted` DTOs; `activeRole`/`scope` now fill audit rows.

## Tests and what they prove

`demo:reset` replays 4 migrations + 4/4/6/4 seed · unit 6 files/16 pass
(contract RED watched first) · e2e 3 files/16 pass (default LEC, switch→DEAN
+ audit, foreign/expired 400s, grant 201/self-403/ghost-400/rogue-403,
revoke→null-workspace, unknown-field 400). Both builds green.

## Demo replay (reviewer copy-paste)

1. `npm run demo:reset` → 4 migrations + `seed v0.2 complete`.
2. Sign in `mutinta.l / Seed-2026-Mutinta` → home shows LEC context + 2 switch buttons (TUT absent).
3. Switch to DEAN → bar reads Dean · SCHOOL:Computing; `/auth/me` agrees.
4. Sign in `mweene.t / Seed-2026-Mweene` → "Role assignments" link → grant TUT to `chanda.k` → 201; grant to self → 403.
5. Revoke that grant in DB → Chanda's session keeps working, workspace reads null.

## What failed or confused us

1. E2E 500s on every sign-in → stale Prisma client: `with-env prisma …`
   silently ran nothing (`prisma` not on spawned PATH). Fix: `with-env.mjs`
   now prepends `node_modules/.bin` to PATH — verify with
   `node scripts/with-env.mjs prisma --version` (must print 7.10.0).
2. First `workspace-contract.spec` RED came out as TypeErrors (missing
   imports) → restructured to `toBeDefined` assertions so RED fails
   correctly per TDD (then watched all 5 fail, then GREEN).
3. Wrote config/contract/DTO code before tests → caught by the TDD skill,
   deleted, redid test-first. UI has no test runner (web: eslint only) —
   honest gap: UI is covered by tsc build + e2e API proofs, not component tests.
4. Overbuilt `GET /auth/workspace` list + audit re-query for 403 mapping →
   removed/relayed to a service `forbidden` flag (YAGNI).

## Seven-layer talk track (2 minutes)

Problem: one person holds many roles; powers must never leak across them.
Policy: REQ-IAM-002/003 + ACT-IAM-001 (scoped, dated, approved, reasoned).
Journey: sign in → default workspace → deliberate switch → header always
states context. Architecture: identity-access owns it; controller→service.
Data: session FK → live assignment; audit snapshots history. Code: two new
controllers/services, guard resolves per request. Evidence: e2e 16 proofs.

## Terms/concepts learned

- Live authority (FK) vs recorded history (audit snapshot); deterministic
  default workspace; enumeration-safe admin replies; SoD-matrix deferred to
  slice 4 (only self/overlap/date rules enforced here).

## Questions to revise before presentation

1. Why FK, not a snapshot on the session? → Expiry/revocation bites
   immediately; snapshots would need a sync protocol nobody specified.
2. What happens when a role expires mid-session? → Next request resolves
   null workspace (session survives for safe reads); slice 4 completes denial.
3. Who may grant, and why Mweene? → Handbook names the IAM Administrator
   role; Mweene/SYSADMIN is the labelled demo stand-in (`grantorRoles`).
4. Why no MFA on the grant step? → REQ-IAM-005 needs MFA-ready hooks
   (present: `validateSession` point); enforcement waits on the open IdP/MFA
   provider decision.
