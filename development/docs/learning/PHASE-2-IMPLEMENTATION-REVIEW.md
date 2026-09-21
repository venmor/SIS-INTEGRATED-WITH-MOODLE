# Phase 2 slices 2–6 — learning and implementation review

Review date: 2026-09-19 (slices 2–5); slice 6 row added 2026-09-21. Original branch: `review/phase-2-slices-2-5`. On 2026-09-20 the user authorized commits and integration into local `main`, with the push left to the user and no pull request. Slice 6 plus Phase 3 slices 1–2 were committed 2026-09-21 in `e44170a`. Human learning and acceptance checks below remain pending.

A fictional applicant can now go from programme discovery through an owned draft, application sections, safe fixture upload, review and formal submission to an immutable receipt, then a read-only post-submit case (status timeline, scoped clarification response, correction requests, decision viewing, support tickets, withdrawal with receipt, notification inbox). [Earlier-slice repairs](PRIOR-PHASE-REVIEW.md) and [remaining gates](../gaps/GAP-015-applicant-production-and-prior-phase-gates.md) are part of this result. This does not mark the whole Phase 2 complete: human acceptance is still pending; see [NOTE-PH2-006](NOTE-PH2-006.md) and [verification](VERIFICATION.md).

## What each new slice delivers

| Slice | What the applicant can do | Main code to open | Data and proof |
|---|---|---|---|
| 2 — home/draft | Deliberately start an open offering, see own applications, resume, change programme with impact confirmation, discard an unfinished draft | [Applicant pages](../../apps/web/app/applicant/), [start/change/discard service](../../apps/api/src/admissions/applications.service.ts) | Application + ApplicationCommand; owner, duplicate-start, live-contact/deadline and command-replay checks |
| 3 — sections | Enter personal/contact/structured qualification details; save valid fields; correct errors; compare stale changes; retain intentional manual saves for sensitive details | [workspace.tsx](../../apps/web/app/applicant/workspace.tsx), [validation.ts](../../apps/api/src/admissions/validation.ts) | Versioned ApplicationRevision; malformed date, forbidden contact overwrite, stale-version tests |
| 4 — documents | Upload with progress/cancel, see quarantine, request safety processing, preview permitted bytes, replace with reason while keeping history | [scanner.ts](../../apps/api/src/admissions/scanner.ts), [document controller](../../apps/api/src/admissions/applications.controller.ts) | ApplicationDocument; real multipart bytes, size/type denial, outage, denied preview and replacement tests |
| 5 — review/submit | See authoritative blockers, accept each current declaration, confirm once, recover an uncertain result, print/download/reopen receipt | [submit service](../../apps/api/src/admissions/applications.service.ts), [migration](../../prisma/migrations/20260919120000_ph2_applications/migration.sql) | Immutable ApplicationSubmission + separate declaration audit + one outbox event; concurrency, rollback and lost-response browser proof |
| 6 — post-submit case | See status timeline, respond to scoped clarification, request correction, view released decision, open tickets, withdraw with receipt, read notifications | [case service](../../apps/api/src/admissions/case.service.ts), [case controller](../../apps/api/src/admissions/case.controller.ts), [applicant case pages](../../apps/web/app/applicant/%5Bid%5D/status/page.tsx) | ApplicationStatusEvent (applicantVisible filter) + Clarification/Correction/Decision/Ticket/Withdrawal/Notification rows; version + idempotency + neutral 404s; 21-case e2e `applications-case.e2e-spec.ts`; browser `applicant-case.spec.ts` run pending |

Controlling requirements: REQ-ADM-002–004, ACT-APP-001/002, REQ-IAM-002/004, REQ-NFR and exact Applicant Blueprint Parts 4–9 (Part 9 + Part 1 lifecycle/status language for slice 6; see [NOTE-PH2-006](NOTE-PH2-006.md)). The [handbook review](HANDBOOK-REVIEW.md) and [design index](../../DESIGN-INDEX.md) link the controlling source families. Endpoint paths and test names below are implementation details, not invented handbook IDs.

## Follow one save from the screen to the database

```mermaid
sequenceDiagram
    actor Applicant
    participant Page as Next.js form
    participant Proxy as Same-origin proxy
    participant API as NestJS admissions
    participant DB as PostgreSQL
    Applicant->>Page: Save personal details
    Page->>Proxy: Fields + version + request key
    Proxy->>API: Validated origin + session cookie
    API->>DB: Check live account/workspace and owner
    API->>DB: Lock owner; compare draft version
    API->>DB: Save valid fields, revision, audit, command result
    DB-->>API: Transaction commits
    API-->>Page: Saved version or useful field errors
    Page-->>Applicant: Accurate saved/error state
```

1. A React component holds the values currently being typed. Those values are not automatically the database record. Sensitive fields are not placed in localStorage.
2. The Next.js proxy is the same website as the page. It rejects foreign-site mutations and forwards the HTTP-only session cookie to the API. The browser never decides its own account ID or role.
3. NestJS validates the allowed request shape. `SessionGuard` resolves the session; admissions checks the selected APP assignment, dates, capability, active account and record ownership again.
4. The service locks the account row for this short transaction. This serializes requests from two devices and also protects the application-count rule.
5. `version` is a counter. If another save already advanced it, this request cannot overwrite that newer work. The screen offers the saved version and entered values for a deliberate choice.
6. Validation may save valid fields while returning invalid fields with `saved: true`, a new version and errors. The page must not say everything failed or everything succeeded.
7. The command key identifies this exact request. Reusing it with another payload is denied. Reusing it after a lost response retrieves the original result.

The model uses a stored draft state plus a live readiness projection. “Ready” is recalculated from current rules, contacts, documents and deadline; visiting a section does not complete it. It is not an admissions decision.

## Why submitting is different from saving

Saving changes a draft. Submitting freezes the version the applicant reviewed and sends it into the later admissions process. The server rechecks the deadline, published rules and fee identity, contact verification, required evidence and separate declaration versions immediately before committing.

The transaction writes the snapshot, receipt, submitted status, declaration audit, submission audit and outbox handoff together. If any write fails, all roll back. The SQL trigger rejects later edits/deletes to the snapshot. Two simultaneous submissions return the same receipt and cannot create two submissions. An outbox row means the handoff is recorded; it does not mean an email was delivered or admissions approved the application.

**Lost response example:** the database commits, then the connection drops. The page says the outcome is uncertain. “Check saved result” looks up the owned command; retry uses the same key. The browser test deliberately drops that final response after the server has processed it, then verifies recovery and refresh.

## Document safety in plain language

A file begins in quarantine: uploaded does not mean safe, readable, authentic or accepted. Type/size screening rejects unsupported uploads early. The normal antivirus adapter leaves outages pending. A clean antivirus result alone cannot approve arbitrary PDFs; structural PDF validation is a named open adapter. That prevents encoded/embedded PDF content from bypassing a simple text check.

For this fictional demonstration, two explicit flags enable a byte-for-byte allowlist for [fictional-result.pdf](../../packages/test-fixtures/documents/fictional-result.pdf). Altering one byte prevents fixture approval. This is not a real malware scanner. Passing the configured stage means “received, awaiting quality check”; staff qualification verification is later work.

Preview is an owned, no-store API response with sandbox/nosniff headers, never a public storage URL. Replacing a file requires the current document and a reason. The previous version stays in history, loses preview eligibility, and the replacement returns to quarantine. A rejected replacement does not silently restore the old file as current.

## Files to learn in order

1. [Shared contracts](../../packages/contracts/src/applications.ts): TypeScript descriptions of requests/views. They help the frontend and API agree; they do not authorize access.
2. [Demo configuration](../../packages/config/src/applications.ts): named fictional values, upload limits, qualification choices and declarations.
3. [Prisma schema](../../prisma/schema.prisma): tables and relationships; the migration adds the database constraints.
4. [DTOs](../../apps/api/src/admissions/dto.ts) and [validation](../../apps/api/src/admissions/validation.ts): allowed request inputs and field rules.
5. [Controller](../../apps/api/src/admissions/applications.controller.ts): routes, guards, multipart limits and response headers.
6. [Service](../../apps/api/src/admissions/applications.service.ts): ownership, state changes, versions, commands and transactions.
7. [Client forms](../../apps/web/app/applicant/workspace.tsx) and [proxy](../../apps/web/app/api/applications/[[...path]]/route.ts): visible feedback and recovery.
8. [API tests](../../apps/api/test/applications.e2e-spec.ts) and [browser story](../../tests/browser/applicant.spec.ts): examples of the behavior the code must preserve.

## Useful vocabulary

| Term | Meaning here |
|---|---|
| Authentication | Proving which account signed in |
| Authorization | Checking whether that account's active role may perform this action on this record now |
| DTO | Allowed fields in an API request |
| Migration | Recorded database-structure change applied in order |
| Optimistic version | A number that prevents an old form overwriting a newer saved record |
| Idempotency key | A stable request reference so a retry cannot create a second result |
| Transaction | Related writes either all commit or all roll back |
| Snapshot | The exact submitted version kept unchanged |
| Outbox | A durable handoff waiting for later delivery/reconciliation |
| Fixture | Invented test/example data, never a real applicant record |

## Issues found through testing/review

The browser caught a legitimate-login Origin/Host mismatch and unsaved navigation loss. A delayed-save regression caught subject controls that were still editable during saving. API review caught a fee reference omitted from the saved requirement identity. Independent review also exposed encoded-PDF screening limits and password-bearing backup errors. Each was corrected with a specific regression. [VERIFICATION.md](VERIFICATION.md) records actual outcomes and remaining warnings.

## What you must not claim in a presentation

Do not claim real account/contact verification, MFA, live payments, admissions approval, registration, Moodle enrolment, notification delivery, production retention/scanning/storage or full accessibility certification. Do not claim the peer review happened because an AI reviewed the code. Use [the rehearsal](../demo/APPLICANT-WALKTHROUGH.md) to collect your own explanation/reproduction evidence.
