# TASK-PH8-002: Cross-domain audit timeline

## Authority and ownership

User authorization: Phase 8 slice 2 implementation request, 2026-10-03.
Release v0.9.0 track. Lead unassigned (assign at kickoff); reviewer
Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 2 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); audit requirements §16.14
(material error/recovery record fields); §19 access-to-audit note in
code (`audit-timeline.service.ts:109-111`: reads are themselves
audited); §15.19 (admin rows); UI-TIMELINE-001 (staff-only timeline);
applicant journey `visibleTimeline` (applicantVisible filter);
SCR records as touched per slice. Exact evidence: compendium
§16.14, applicant `visibleTimeline` + staff `caseHistory` contracts
(active requirements). SUP-001–SUP-013 apply. Depends on TASK-PH8-001
(notification events join the timeline as a source). Owning module:
`identity-access` (extends the existing trail; no new module).

## User outcome and boundaries

One entity timeline per workflow object, joining every source the
caller is already allowed to read, newest first:
- `application`: AuditEvent rows (allow-listed fields, same select
  as the IAM trail) + ApplicationStatusEvent rows. Applicants see
  their own application's timeline with staff-only rows filtered
  exactly like `visibleTimeline`; admissions officers/approvers see
  the full staff view exactly like `caseHistory`.
- `result-package`: AuditEvent rows + BoardDecision rows +
  OfficialCourseResult versions. Staff readers only (assessment
  reader roles with live assignments); students and outsiders get
  neutral 404s — board reasoning never leaks through this endpoint.
New kinds are refused (unknown-kind 400); unknown/foreign ids are
neutral 404s. The IAM admin trail is untouched. Reads are audited
like the existing trail. No new PII surface: same allow-lists,
same filters, joined — not widened.

## Policy and explicit demonstration scope

No new policy values. Correlation joins on `targetRef` (exact,
indexed) — the `DOMAIN:${id}` scope strings stay human labels, not
join keys. Demo data only (SUP-009). No production RPO/RTO, no
legal-hold semantics.

## State authorization failure and recovery

Applicant owns via Application.accountId; staff via live
ADMISSIONS_OFFICER (`review-assigned`) / ADMISSIONS_APPROVER
(`decide-offer`) for applications, assessment reader roles with
live assignments for packages; SYSADMIN denied on entity reads
(governance uses the IAM trail); expired grants fail safe; denials
403 + audit; neutral 404s; reads are GET (no idempotency keys,
no CSRF); rate-limited reads via existing read budget.

## Proof and documentation

API (`audit-entity-timeline.e2e-spec.ts`, ~10 tests): applicant own
timeline (applicantVisible-only), foreign applicant 404, officer
full view, approver read-only view, tutor denial, package staff
view (decisions + versions + audit rows), student package 404,
unknown kind 400, unknown id 404, inverted-range-style invalid
query 400. Browser: applicant case timeline still applicant-only;
officer case history shows staff rows (390px, keyboard/focus, no
overflow, empty localStorage). Record in PHASE-8 review +
NOTE-PH8-002.

## Out of scope and open gates

Finance/registration/timeline kinds (follow-up entities, same
pattern); full-text search; export; production retention/legal
hold. Gates: open decisions (retention schedules, UAT authority).

## Completion

Pending; see VERIFICATION. Human review pending.
