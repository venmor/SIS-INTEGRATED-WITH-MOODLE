# TASK-PH2-004: Quarantined document upload preview and replacement

## Authority and ownership

User authorization: repository review and Phase 2 slices 2–5 implementation request, 2026-09-19. Release v0.3.0. Proposed learning rotation: lead Charles Hangoma; reviewer Chitindu Milimbo. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `03-USER-EXPERIENCE-BLUEPRINTS/01-applicant-journey-book.md`, Part 6; exact approved Blueprint 1 records in `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/`; `04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md`; `05-REQUIREMENTS-PERMISSIONS-DATA/` functional requirements/actions/permissions/configuration; `06-ARCHITECTURE-INTEGRATIONS/`; `07-SECURITY-PRIVACY-RESILIENCE/` upload/privacy/idempotency/recovery; `12-TESTING-AND-ACCEPTANCE/`. SUP-001–SUP-012 and applicant Ready row apply. Requirement family REQ-ADM and REQ-NFR; command names below follow source language. REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

Quarantined document upload preview and replacement. Owning module `admissions`, using existing identity-access and catalogue. Commands: UploadSupportingDocument, ScanApplicationDocument, ReplaceApplicationDocument, ViewApplicationDocument. Only authenticated active APP workspace and applicant-owned records. Account ownership, never caller-supplied IDs or staff holding APP elsewhere, authorizes access.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` is fictional configuration for this review, never institutional policy: one choice per application, up to three active applications per intake, verified email or phone fixture, no application fee required, ECZ and international declaration routes, only configured fields/documents, separate versioned declarations. Identity numbers, citizenship and sensitive programme questions are absent because approved collection purpose is not configured. Qualification declarations are never labelled verified; grades do not produce an admission decision. Programme rules unavailable/changed cause a blocker.

Scanner modes: normal ClamAV with actual definitions required for images; arbitrary PDFs additionally remain quarantined pending structural validation; explicitly enabled demo accepts only exact bundled fictional fixture bytes. Missing scanner/signatures keep other files quarantined and deny preview/submission. Scan pass does not prove readability or authenticity. Minimum submission stage is scanned/awaiting quality check in the demo policy. Local restricted database byte storage is an internal storage adapter for the bounded demonstration; production object storage approval is pending.

## State authorization failure and recovery

Draft state and version belong to server. Save/replace/change/submit require expected version and persistent idempotency key; key bound to actor/action/payload. Unknown/other-owner IDs return identical neutral responses. All writes require CSRF checks. Deadline and live contact/offering checks are server-side. Valid fields may be saved while invalid fields are returned, with accurate saved/current-version status. Submission atomically locks draft, writes immutable snapshot, receipt, separate declaration acceptances, audit and outbox handoff. A pending connection outcome is resolved by owned command/receipt lookup; retry uses the same key. No browser storage of sensitive fields or submission authorization.

## Proof and documentation

Required API tests: own/foreign access, stale version, partial invalid save, duplicate/replay/mismatched key, live deadline, safe scanner/replacement, current declaration, concurrent exactly-once submission and rollback; no direct post-submit edits. Browser tests: connected form/upload/review journey, keyboard labels/focus, mobile reflow, error persistence and receipt recovery. Record actual commands/results in `docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Phase 2 slice 6 status/clarification workflow; Phase 3 staff decisions; Phase 5 payment providers; real identity/qualification verification; production storage/scanner deployment; authorized deadline extensions; notification delivery worker. Account registration/MFA/contact verification remains a prior-phase gap, not silently claimed complete; seeded verified fictional applicant supports this bounded task. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: completed for review; see [verification](../learning/VERIFICATION.md). Human explanation/review: pending. See shared implementation plan for dependencies and final evidence.
