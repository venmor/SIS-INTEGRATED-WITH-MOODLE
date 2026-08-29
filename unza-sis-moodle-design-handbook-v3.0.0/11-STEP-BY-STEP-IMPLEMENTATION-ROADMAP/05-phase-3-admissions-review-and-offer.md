# Step 4 — Phase 3: Admissions Review and Offer

**Release target:** v0.4.0

## User/system outcome

Admissions staff can review submitted evidence, request scoped clarification, record a recommendation and issue an authorized decision/offer with separation of duties.

## Read before planning

- Composite Administrative Operations Blueprint
- Applicant Parts 9–10
- Design Section 6
- Permission matrices and evidence/decision components

## Learning goals

- Staff work queues
- State machines and immutable snapshots
- Evidence comparison/versioning
- Conflict of interest and segregation of duties

## Ordered delivery slices

1. Assigned admissions queue and filters
2. Evidence/declaration comparison
3. Clarification request and applicant response
4. Eligibility/recommendation package
5. Separate decision authority and offer
6. Offer acceptance/onboarding task handoff

## Security, integrity and recovery focus

- Minimum applicant data
- Evidence access logging
- Reviewer/decider conflict checks
- No bulk export by default
- Post-submission correction history

## Required proof

- Assigned vs unrelated applicant authorization
- Unsafe/stale/replaced evidence
- Clarification expiry and duplicate response
- Self-approval/conflict denial
- Decision delivery failure with valid decision retained

## Team rotation and documentation

Reviewer from the applicant phase leads admissions to learn the receiving side of the handoff. The other developer focuses on evidence/security tests and documentation.

## Demonstration checkpoint

Admissions requests one correction, compares revised evidence, records recommendation, and a separate role issues an offer the applicant accepts.

## Exit gate

- Recommendation and decision are distinct
- All applicant/internal content is separated
- Offer conditions/deadline/version explicit
- Conversion has not occurred prematurely
