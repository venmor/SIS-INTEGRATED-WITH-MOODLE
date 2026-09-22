# GAP-017 — Simulation endpoint removal and re-gating (Phase 3 exit)

Status: Implemented in code, pending human decision
Raised by: implementation review, Phase 3 slices 1–2
Date: 2026-09-21
Resolved in code: 2026-09-21 (TASK-PH3-005, uncommitted worktree)

## Missing or contradictory design

`POST /applications/:id/simulate-clarification`,
`POST /applications/:id/simulate-correction-decision` and
`POST /applications/:id/simulate-decision` (SYSADMIN-gated, demo-only) write
the same clarification/decision tables as the new officer endpoints
(`POST /review/:id/clarifications`, `POST /review/corrections/:id/decide`)
with divergent guards, duplicate rules, idempotency namespaces and audit
purposes. No packet yet authorizes deletion or re-gating, and e2e/browser
suites still seed demo state through the simulators.

## Why it blocks or risks implementation

Removing them now would orphan the slice-6 demo seeding path; keeping them
lets two staff-impersonation paths write identical rows with different
authority evidence.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

`case.controller.ts` simulate-*, `case.service.ts` sim methods,
`applications-case.e2e-spec.ts`, `applicant-case.spec.ts`,
`admissions-queue.spec.ts` (no sim use), TASK-PH2-006 exit gate.

## Bounded options and consequences

Re-gate clarification/correction sims to officer authority or delete them
once no suite needs them; decision sim stays SYSADMIN-gated until slice 5;
final removal before any production use.

## Resolution (code, 2026-09-21)

All three simulation endpoints (`simulate-clarification`,
`simulate-correction-decision`, `simulate-decision`) plus `staffGate`,
`simIdempotent`, `staffAudit` and the Sim DTOs are deleted. Suites seed
through the real officer/approver endpoints instead
(`applications-case.e2e-spec.ts` uses claim/raise/recommend/release/decide;
removed-endpoint calls assert 404). The approver release reuses the sims'
neutral event/notification wording. Full API e2e (20 files) and browser
(4 tests) pass without sims.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH2-006, TASK-PH3-002, Phase 3 exit review.
