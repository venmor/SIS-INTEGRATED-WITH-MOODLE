# TASK-V2-SUPPORT-005 — Controlled academic-support closure

- Release: v2.0 Task 6 student-support increment. Implementation lead Charles Hangoma; reviewer Chitindu Milimbo. Institutional service authority remains open under GAP-V2-002.
- Authority: exact Adviser Blueprint 4 Part 2 §8; Student Blueprint 2 Part 6; Design Sections 8/12B; cross-blueprint action, permission, recovery and audit records; TASK-V2-SUPPORT-001–004.
- Scope: one auditable final closure of a synthetic academic-support case by its selected appointed adviser, with an explicit supported reason, no unfinished student action, and a respectful student-visible outcome.
- Exclusions: formal referral handover, observation dismissal/merge, assignment transfer, no-contact closure, institutional escalation, reopening, counselling/welfare/discipline cases, live support activation. These need separate authority and workflows.

## Required behavior

1. The adviser must retain an effective selected appointment, programme scope, current student relationship and demo-only service. A stale route or role cannot close. A student or unrelated staff member cannot close.
2. Closure reason is one of academic guidance given, course-plan issue resolved, or agreed action completed. Guidance/resolution requires an adviser reply; action completion requires a confirmed action. Other handbook reasons remain unavailable until their evidence/workflows exist.
3. Any proposed, accepted or student-claimed action blocks closure. A closed case cannot receive further replies or new actions. A student can still read their own case/history and start a new request where routing is available.
4. Persist one immutable closure record, event and audit in the same transaction as the closed status. A replay with the same idempotency key returns the original receipt; mismatched key/details and stale state fail clearly.
5. Both workspaces show the closure reason and time. The student sees respectful completion language. Closed cases are distinguishable in the bounded queues and no longer appear in the active follow-up worklist.

## Verification

Use the isolated synthetic review DB. Observe the focused API test failing first. Cover valid closure, active-action/insufficient-evidence denial, replay/conflict, role/ownership/demode-off denial, closed-write denial and event/audit persistence. Exercise adviser closure and student view at 390px. Run Prisma validation/migration, focused support API regression, API/web builds, lint and diff checks.
