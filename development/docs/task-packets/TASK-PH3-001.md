# TASK-PH3-001: Assigned admissions queue and filters

## Authority and ownership

User authorization: Phase 3 slices 1–2 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Charles Hangoma; reviewer Chitindu Milimbo (reviewer from the applicant phase leads admissions to learn the receiving side). These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 1; `03-USER-EXPERIENCE-BLUEPRINTS/07-admissions-registry-examinations-and-graduation-operations.md` Journey A; `02-INSTITUTIONAL-AND-SYSTEM-DESIGN/06-design-section-6-admissions-onboarding-and-student-finance.md` §§4–7; `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM-005/006, REQ-IAM-002/003/004, ACT-ADM-001/002, permission §15.4 (ROLE-ADM-OFF assigned/intake-scoped, cannot alter evidence); `02-.../02-design-section-2-stakeholders-roles-and-access-control.md` segregation of duties; `04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md`; `07-SECURITY-PRIVACY-RESILIENCE/` privacy/idempotency/recovery. SUP-001–SUP-012 apply. Command names follow source language. REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

Admissions staff see an assigned work queue: only applications assigned to them (plus a claimable pool), each row showing reference, current state, age, what is needed next, and conflict flags — never another officer's cases, never applicant PII beyond the minimum needed to work the case. Staff can claim a case from the pool and release it back. Applicant records are never modified from the queue. Owning module `admissions` (new `review` area), using existing identity-access and case tables. Commands: ClaimReviewCase, ReleaseReviewCase. Only authenticated live `ADMISSIONS_OFFICER` workspace; assignment + intake scope authorize access, never caller-supplied IDs.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` remains fictional configuration, never institutional policy. Demo roles `ADMISSIONS_OFFICER` (capability `review-assigned`, scopeType `INTAKE`) and `ADMISSIONS_APPROVER` (capability `decide-offer`, seeded now so separation-of-duties denial is testable, used in slice 5) are demonstration assignments. Scope strings are interim intake codes until GAP-004 lands; queue scoping is intake-string-matched and documented as such. Simulation endpoints (`simulate-*`) stay SYSADMIN-gated during this slice and are tracked for re-gating/removal. No delivery provider: staff actions write timeline events and pollable inbox notifications only (GAP-008/009 hold for the worker).

## State authorization failure and recovery

Assignment state belongs to the server. Claim/release writes require the application's expected version and a persistent idempotency key bound to actor/action/payload digest. Unknown/other-officer IDs return identical neutral 404s. Double-claim returns `ASSIGNMENT_CONFLICT` with the current assignee role (never the officer's identity beyond role). All writes require CSRF checks. Deadlines/counts use authoritative server time. A pending connection outcome resolves by owned command lookup; retry uses the same key. Staff-only rows never reach applicant views (existing `visibleTimeline`). No browser storage of sensitive fields.

## Proof and documentation

Required API tests: assigned-only visibility, foreign/unknown neutral 404s, claim/release round-trip, double-claim conflict, filters (state/intake/action-needed), stale version conflict, duplicate/replay/mismatched key, applicant-role denial (403), approver-cannot-claim-officer-work vs SoD denial probe. Browser test: queue list, claim/release journey, filters, keyboard labels/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Slices 2–6 (evidence comparison, staff clarification creation, recommendation, decision/offer, acceptance/onboarding); real capability/scope/approver registries (GAP-003/004/006/012); verification adapters; production storage/scanner; delivery worker and SMTP/SMS; deadline extensions; real UNZA role/policy values. Simulation-endpoint removal stays an exit-gate item. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending.
