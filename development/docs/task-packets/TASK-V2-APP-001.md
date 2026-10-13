# TASK-V2-APP-001 — Applicant document handoff and honest upload feedback

## Authority and scope

- Release: v2.0 applicant usability repair. Lead Charles Hangoma; reviewer Chitundu Milimbo; human review pending.
- Sources: [Phase 2 document packet](TASK-PH2-004.md), exact [Applicant Blueprint Part 6](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/007-role-blueprint-1-prospective-applicant-and-applicant.md) §§2–3, 9, 11 and [UI-FLOW-001/UI-UPLOAD-001/002](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/003-cross-blueprint-implementation-set-part-2b-saving-drafts-multi-step-forms-upload-and-forma.md). SUP-009/010/012 and applicant Ready row apply.
- Existing APP ownership, immutable document versions, quarantine, safety-check and review gates remain. No real student data, scanner bypass, new institutional rule, provider or Moodle connection.

## Observed failure and outcome

In the isolated local review database, the `bwalya.m` draft had a non-fixture qualification document in `SecurityScanPending` and a separate missing Science subject result. The exact-fixture demo scanner cannot clear that file, while the document step lacks a direct next-step action and the progress indicator appears only after an XHR upload event. The user cannot tell what to do from that step alone.

During upload, show transfer progress immediately, then distinguish server receipt/safety processing. Show demo-only sample-file guidance before upload, with a usable fictional sample. After a file is received, provide a direct safety-check action and a visible route to review outstanding requirements; do not imply a received or scanned file is verified. Preserve the selected file for recoverable failure and keep the existing lost-response warning.

## Acceptance

- Browser: progress and cancel are visible while a response is delayed; a successful upload shows safety-pending status and a direct review route. The sample fixture passes the existing safety check and review identifies any other blockers.
- API/document policy unchanged. A non-fixture file remains quarantined in demo mode; no existing applicant document is deleted or relabelled.
- Remove debug logging of applicant API payloads from the server-side loader; no applicant data belongs in ordinary process logs.
- Verify applicant regression journey, mobile behavior, build/typecheck and local server refresh. Manual accessibility/low-bandwidth review remains pending.
