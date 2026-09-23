# TASK-PH4-004: Course selection and validation

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed lead Chitindu Milimbo; reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 4; Student Part 3 §§1–2,6–7 (course types, plan UI, charges); Design Sec 4 rule engine + Sec 3 §5 (course registration states, validation dimensions); REQ-REG-002/003; ACT-REG-001 contract format; permission §15.5 (student select/submit own only; adviser recommend; coordinator configured approval); UI `Plan your courses` + SCR-FRM-REG-001; error catalogue ERR-VAL/RULE/CONFLICT/STALE. Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH4-002. Owning module `registration`.

## User outcome and boundaries

A student builds a draft course plan for an open period: required repeats auto-proposed, required new, electives, in-progress extended shown separately; unavailable courses name their reason. Validation returns per-item PASS/WARNING/BLOCK/APPROVAL_REQUIRED with stable codes and plain explanations across active attempt, eligibility state, curriculum applicability, prereq/coreq, repeats, load, capacity, holds, and exemptions. Saving is draft-only; nothing official happens here. Commands: CreateOrUpdateStudentCoursePlan (draft, versioned, idempotent), ValidateCoursePlan (computed + audited). No charges posted (provisional display only; Finance owns allocation).

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional only: demo curriculum v1 (required/elective, credits, semesters, prereq chains, capacities), load bands, capacity counts. No optimistic UI for official actions; server revalidates everything at submit (slice 5).

## State authorization failure and recovery

Own attempt/period only; neutral 404s; denials 403 + audit; draft version + idempotency; CSRF; uncertain outcomes by command lookup. Failed validation preserves the draft (ERR-VAL keeps valid entries).

## Proof and documentation

API tests: draft create/update/version; each validation dimension allow + deny (prereq, capacity, hold, load, closed period, repeat rules, exemption); approval-required routing; version conflict; idempotency; foreign/neutral; denials. Browser: plan journey with pre-save summary (load, provisional charges, conflicts, blocks). Record in PHASE-4 review.

## Out of scope and open gates

Formal submit/snapshot (slice 5); amendments (slice 6); finance postings (Phase 5); timetable engine (derived display only); verification adapters; real curricula/rules/capacities. Gates as TASK-PH4-002.

## Completion

Pending; see VERIFICATION. Human review pending.
