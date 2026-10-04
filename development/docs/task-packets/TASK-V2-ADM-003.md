# TASK-V2-ADM-003 — Deterministic admissions queue ordering

## Authority

- Release: v2.0 Task 3 read-only admissions workbench increment. Lead Charles Hangoma; reviewer Chitundu Milimbo; human review pending.
- Basis: `REQ-ADM-005`, `REQ-ADM-006`, `REQ-NFR-005`, `ACT-ADM-001`, approved admissions role/permission and UI/recovery evidence mapped in [TASK-V2-ADM-001](TASK-V2-ADM-001.md), and the handbook supersession/readiness registers.
- Existing role boundary only: active scoped admissions officer or read-only approver; this task grants no assignment, decision or publication authority. GAP-004 still blocks an institutional school/programme scope claim.

## User outcome and contract

A reviewer can order their current queue oldest first or newest first without loading all rows. **Claimable pool** orders by case creation time, then unique application ID; **My cases** orders by claim time, then unique application ID. Both directions apply in PostgreSQL after the existing authorization, claim and filter predicates and before the bounded page limit. The opaque signed cursor binds direction as well as actor, assignment and other filters; a saved cursor from another direction is refused with a restart route.

The order control has a visible label, preserves its choice in the URL, and resets pagination when changed. Default remains oldest first, which keeps current behavior. It does not imply approved urgency, priority, deadline or staffing policy. No new applicant fields are projected.

## Acceptance

- API: equal timestamps traverse without duplicate/omission in both directions; changing direction rejects a prior cursor; foreign scope and live assignment denial remain effective.
- Browser: order control, URL/reload persistence, page reset, 390px no overflow and existing claim/release story.
- No schema migration, bulk action, automatic priority, notification, provider or policy value.
