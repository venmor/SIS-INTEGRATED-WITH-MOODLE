# Learning Note — TASK-PH8-002 (cross-domain audit timeline)

- Lead developer: unassigned (assign at kickoff)
- Reviewer: Charles Hangoma
- Date/release: 2026-10-03 / v0.9.0 track Phase 8 slice 2
- Branch: worktree (human review pending)

## What was built and why

One entity timeline per workflow object in the identity-access
module (no new module): `GET
/auth/audit/timeline/entity/:kind/:id` joins every source the caller
may already read — same allow-lists and filters as the direct
endpoints, merged newest-first. `application` serves AuditEvent rows
plus ApplicationStatusEvent rows (applicants see own timeline with
staff-only rows filtered exactly like `visibleTimeline`;
officers/approvers see the staff view exactly like `caseHistory`).
`result-package` serves AuditEvent rows plus BoardDecision rows plus
OfficialCourseResult versions to assessment staff readers only;
students and outsiders get neutral 404s. Unknown kinds refuse 400;
unknown/foreign ids stay neutral 404s. Reads are audited like the
existing trail. No new PII surface, no new tables.

## Frontend

- Board-package detail page gains a History section (decisions +
  versions + audit rows, newest first, neutral empty state).
- Contracts gain `EntityTimelineItem` + `EntityTimelineResponse`
  (barrel export included).

## Backend/domain

- `audit-timeline.service.ts`: `getEntityTimeline()` kind dispatch
  with gate-first checks, local `liveRoleAssignment` helper (same
  startsAt/revokedAt/endsAt/account-ACTIVE shape as review gates),
  `denyEntityRead` audit on refusals, `neutralNotFound` 404s.
- `auth.controller.ts`: route with SessionGuard + existing read rate
  limit; `EntityTimelineQueryDto` (take 1–100, whitelist).
- Joins on exact `targetRef` (indexed); `DOMAIN:${id}` scopes stay
  human labels, not join keys.

## Database/migration

- None (reads existing tables only).

## Security + authz

- Applicant ownership via Application.accountId; staff via live
  ADMISSIONS_OFFICER/ADMISSIONS_APPROVER (applications) or
  assessment reader roles (packages); SYSADMIN denied on entity
  reads (governance uses the IAM trail); expired grants fail safe;
  denials 403 + audit; neutral 404s; no idempotency keys on GET.

## Tests and what they prove

- `audit-entity-timeline.e2e-spec.ts` (10 tests): applicant own
  (applicantVisible-only, both sources present), foreign applicant
  404, officer full view, approver view, tutor 404, package staff
  view (all three sources), student package 404, unknown kind 400,
  unknown ids 404, invalid query 400. 10/10 on fresh
  `sis_ph8_e2_test` (white-box seeds; writes proven by Phase 2/7
  suites).
- Slice regressions unaffected (read-only addition; typecheck exit
  0). Unit 73/73; lint warnings-only.
- Browser `entity-timeline` (lecturer sees joined package history)
  1/1 on fresh migrated + seeded browser DB with rebuilt apps
  (390px, keyboard/focus, no overflow, empty localStorage).

## What failed or confused us

- Fresh-DB-per-run discipline again: the RED run's white-box seed
  collided with the GREEN run's (unique package key) — recreate
  before full runs.
- Contracts barrel export forgotten (`EntityTimelineResponse`
  missing from `index.ts`): `next build` caught it after an
  ambiguous `tsc` pass — rebuild web after contract changes and
  trust the build.
- `npx` shims fail on Windows; direct `node <pkg>/cli.js`
  invocation for vitest/prisma/playwright; API dist via direct
  `tsc` (Node 22 ora ESM cycle).

## Questions to revise

- Finance/registration timeline kinds (same pattern, follow-up);
  full-text search/export (out of scope); retention/legal hold
  (open decisions).
