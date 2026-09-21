# TASK-PH3-002: Evidence and declaration comparison

## Authority and ownership

User authorization: Phase 3 slices 1–2 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Chitindu Milimbo; reviewer Charles Hangoma. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 2; `03-USER-EXPERIENCE-BLUEPRINTS/07-admissions-registry-examinations-and-graduation-operations.md` Journey A steps 1–8; `02-INSTITUTIONAL-AND-SYSTEM-DESIGN/06-design-section-6-admissions-onboarding-and-student-finance.md` §§4–7; `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM-005 (review assigned evidence without modifying applicant evidence), ACT-ADM-001, permission §§15.1–15.4; applicant Part 9 §§3/10.4 (applicant-visible vs internal separation); `04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md`; `07-SECURITY-PRIVACY-RESILIENCE/` evidence-access logging, idempotency, recovery. SUP-001–SUP-012 apply. Depends on TASK-PH3-001 (assignment gates every comparison read/write). REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

For one assigned application, the admissions officer sees declarations side by side with uploaded documents and each file's safety/verification state, and records explicit immutable review findings (completeness, declaration mismatch, document quality, payment status note, internal note) without touching applicant data. Unsafe, stale, or replaced files render state-only and stay quarantined/versioned. The officer can raise a scoped clarification and decide correction requests from this screen. Owning module `admissions` (`review` area). Commands: RecordReviewFinding, RequestApplicationClarification (staff side), ApproveApplicationAmendment / DeclineApplicationAmendment (re-gated from simulation to officer authority; snapshot-preserving logic unchanged).

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` fictional configuration only. Finding kinds/severities are demo enumerations, not institutional assessment criteria. Correction approval preserves the immutable submitted snapshot by construction (no data rewrite in this slice; real amendment application is later work). Qualification verification stays declared-not-verified; no grade produces a recommendation. Staff clarification follows slice-6 semantics (scoped items, server-time deadline default 14 days, receipt, expiry under applicable rule, duplicates directed to the open task). No delivery provider: notifications are pollable inbox projections (GAP-008/009 hold).

## State authorization failure and recovery

Comparison reads require an active assignment (claimed by the reader) or live approver scope; otherwise identical neutral 404s. Finding writes require expected application version + idempotency key; duplicate open subjects return `DUPLICATE_TASK` with the finding id. Unknown/other-officer IDs are neutral. Document bytes are never served to staff for unsafe states (state-only rendering; existing preview gates unchanged and audit-logged on every staff content view). All writes require CSRF checks. Retry uses the same key; uncertain outcomes resolve by command lookup. Internal notes/fraud signals never reach applicant views.

## Proof and documentation

Required API tests: assigned-only evidence access + neutral foreign/unknown, findings create/list/duplicate, no-mutation proof (snapshot byte-identical after findings + approval), unsafe/stale/replaced rendering gates, staff clarification create + expiry + duplicate suppression, correction approve/decline behind officer gate with snapshot preservation, applicant-role denial, approver read-only until slice 5 (deny decide paths not yet existing). Browser test: case comparison view, finding create journey, clarification create journey, keyboard labels/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Slices 3–6 remainder (eligibility/recommendation package, real decision/offer release, acceptance/onboarding, conversion); verification adapters (ECZ/ZAQA); production storage/scanner deployment; delivery worker and SMTP/SMS; deadline extensions; real UNZA roles/policy values; recommendation scoring or ranking. Simulation endpoints for decision release stay SYSADMIN-gated until slice 5; clarification/correction sims are superseded by officer endpoints here and tracked for removal. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending.
