# TASK-PH2-006: Status timeline safe resume clarification correction decision tickets withdrawal

## Authority and ownership

User authorization: Phase 2 slice 6 implementation request, 2026-09-21. Release v0.3.0. Proposed learning rotation: lead Chitindu Milimbo; reviewer Charles Hangoma. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `03-USER-EXPERIENCE-BLUEPRINTS/01-applicant-journey-book.md`, Part 9 with Part 1 lifecycle/status language; exact approved Blueprint 1 records in `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/`; `04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md`; `05-REQUIREMENTS-PERMISSIONS-DATA/` functional requirements/actions/permissions/configuration; `06-ARCHITECTURE-INTEGRATIONS/`; `07-SECURITY-PRIVACY-RESILIENCE/` privacy/idempotency/recovery/notifications; `12-TESTING-AND-ACCEPTANCE/`. SUP-001–SUP-012 and applicant Ready row apply. Requirement family REQ-ADM and REQ-NFR; command names below follow source language. REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

Submitted applications become read-only cases with status timeline, scoped clarification response, correction requests, decision viewing, support tickets, withdrawal with receipt, and notification inbox. Owning module `admissions` (new `case` area), using existing identity-access and catalogue. Commands: PublishApplicantStatusUpdate, RequestApplicationClarification, SubmitClarificationResponse, RequestApplicationCorrection, ApproveApplicationAmendment, DeclineApplicationAmendment, ReleaseAdmissionDecision, CreateApplicantSupportTicket, RequestApplicationWithdrawal. Only authenticated active APP workspace and applicant-owned records. Staff simulation endpoints are SYSADMIN-gated demo scaffolding for the Phase 3 handoff, tracked for removal. Account ownership, never caller-supplied IDs or staff holding APP elsewhere, authorizes access.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` is fictional configuration for this review, never institutional policy: submitted snapshot stays immutable; clarification responses lock with old/new values and receipt; corrections need approval, never direct overwrite; decision viewing needs deliberate authenticated open with no outcome in notices; withdrawal receipt is separate from any refund; tickets link to the owning application; mandatory notices cannot be disabled. Identity numbers, citizenship and sensitive programme questions remain absent because approved collection purpose is not configured. Qualifications stay declared-not-verified; no grade produces a decision. No delivery provider: notifications are pollable inbox projections of durable outbox rows (GAP-008/009 hold for the worker).

## State authorization failure and recovery

Submitted state and versions belong to server. Clarification responses and correction/withdrawal/ticket writes require expected version and persistent idempotency key; key bound to actor/action/payload. Unknown/other-owner IDs return identical neutral responses. All writes require CSRF checks. Deadlines use authoritative server time with no duplicate notices. A pending connection outcome is resolved by owned command/receipt lookup; retry uses the same key. Staff-only events, names, notes, rankings and fraud signals never reach applicant views. No browser storage of sensitive fields.

## Proof and documentation

Required API tests: own/foreign timeline+decision access, scoped response cannot touch unrelated fields, stale version, duplicate/replay/mismatched key, deadline expiry, correction approval preserves original, withdrawal receipt, refund separation, neutral unknown IDs, notification dedupe. Browser tests: clarification respond journey, decision view, ticket create/reply, withdraw confirm, keyboard labels/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Phase 3 staff queue/decisions/assessment; Phase 5 payment providers and refunds; real identity/qualification verification; production storage/scanner deployment; notification delivery worker and SMTP/SMS; authorized deadline extensions beyond demo policy. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates. Simulation endpoints must be removed or locked before any production use.

## Completion

Bounded demonstration implementation and automated checks: pending; see [verification](../learning/VERIFICATION.md) on completion. Human explanation/review: pending.
