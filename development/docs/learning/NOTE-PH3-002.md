# Learning Note — TASK-PH3-002 (evidence and declaration comparison)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH3-002 line 5)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 2
- Branch: local `main`, commit `e44170a` (“Implemented phase 2 slice 6 and phase 3 slice 1 and 2”)

## What we built and why

For one assigned application, the officer sees declarations side by side with uploaded documents and each file’s safety/verification state, and records explicit immutable review findings (completeness, declaration mismatch, document quality, payment status note, internal note) without touching applicant data. Unsafe/stale/replaced files render state-only, quarantined/versioned. Officer can raise scoped clarification and decide correction requests from this screen. Owning module `admissions` (`review` area). Commands: RecordReviewFinding, RequestApplicationClarification (staff side), Approve/DeclineApplicationAmendment (re-gated from simulation to officer authority; snapshot logic unchanged).

Controlling: roadmap slice 2; Journey A steps 1–8; Design Section 6 §§4–7; REQ-ADM-005, ACT-ADM-001, permission §§15.1–15.4; applicant Part 9 §§3/10.4 separation; UI constitution; evidence-access logging/idempotency/recovery. Depends on TASK-PH3-001 (assignment gates every read/write). Finding kinds/severities are demo enumerations; qualification verification stays declared-not-verified.

## Frontend explanation

- `apps/web/app/admin/admissions/case/[id]/page.tsx`: SSR `GET /review/{id}/evidence` + `/findings`; unavailable → “needs active claim”; lede “never modified”.
- `case/[id]/case.tsx`: `submit()` sends `current.version + fresh key`; `decide()` → `POST /corrections/{id}/decide {approve,note,key}`; declarations vs documents section (`canPreview ? "" : "preview unavailable"`); findings list + form (kinds/severities); clarification form (`deadlineDays` 1–60 default 14); pending corrections approve/decline.
- Contracts `packages/contracts/src/applications.ts`: `ReviewQueueItem`, `ReviewCaseSummary`, `ReviewDocumentView` (`canPreview`), `ReviewEvidenceView`, `ReviewFindingView`.

## Backend/domain explanation

- `review.service.ts`: `recordFinding()` (allow-listed kinds/severities, blank rejection, `DUPLICATE_TASK` + findingId, version + key); `raiseClarification()` (non-nested tx, scoped items, server-time deadline default 14d, dupe → clarificationId, version bump); `decideCorrection()`/`applyCorrectionDecision()` (`REQUEST_CLOSED` if decided, `NOT_SUBMITTED` gate, no app-version on decide, request-row gated, approval flips status + event, snapshot byte-identical by construction); `evidence()`/`summary()` expose `hasDecision` presence only; unsafe docs state-only, bytes never embedded; staff-only `event(applicantVisible=false)` + neutral `notify()`; `bump()` version on staff writes.
- DTOs: `ReviewFindingDto` (kinds, subject 120, detail 2000, severity), `StaffClarificationDto` (question 1000, deadlineDays 1–60), `CorrectionDecideDto` (KeyDto only + approve bool + note 500).

## Database/migration explanation

- `ReviewFinding` immutable (no update/delete path) in `migrations/20260922130000_ph3_review_findings/migration.sql`, index `[applicationId,status]`; hot-path indexes in `20260922140000` migration.

## Security and authorization explanation

- Comparison reads require active assignment (claimed by reader) or live approver scope; otherwise neutral 404s. Finding/clarification/decide writes require version (except decide by design) + idempotency key; blank finding/question rejected; duplicate open subjects return `DUPLICATE_TASK`. Document bytes never served for unsafe states (state-only + existing preview gates, audit-logged on staff content view). CSRF on writes. Internal notes/fraud signals never reach applicant views (proven absent by test).

## Tests and what they prove

Present in repo; fresh pinned-stack rerun still pending:

- `apps/api/test/review-evidence.e2e-spec.ts` (12 tests): assigned-only + no bytes, findings create/list/duplicate, no-mutation (snapshot unchanged after finding + correction approve), doc-states `SecurityScanPending→canPreview:false`, staff clarification + inbox/timeline + dupe 409, correction decide re-gated (applicant 403 / officer REJECTED), blank 400, withdrawn-decide 404, no-leak (no ReviewClaimed in applicant timeline, 0 notifications), version-bump + VERSION_CONFLICT, idempotency replay + conflict.
- Browser `admissions-queue.spec.ts` covers finding + clarification journey on 390px.

## What failed or confused us

- Blank findings/questions accepted; fixed with DTO + service rejection.
- Approver denied all reads; fixed to read-only evidence access (writes still 403) ahead of slice 5.
- Staff deafness after writes; fixed with evidence refresh; full inbox deferred to GAP-016.
- Shared idempotency keys across forms; fixed with per-attempt keys.
- Applicant timeline leaking checks; proven absent by test.
- Clarification/correction sims superseded by officer endpoints here; decision sim stays SYSADMIN-gated until slice 5; removal tracked in GAP-017.

## Terms/concepts learned

- Evidence comparison without mutation; state-only unsafe rendering; scoped staff clarification following slice-6 semantics; correction decide re-gated to officer authority.

## Questions to revise before presentation

- Open one claimed case and explain declarations vs state-only documents, finding kinds, clarification deadline, correction approve/decline without snapshot rewrite.
- Why qualification verification stays declared-not-verified and no grade produces a recommendation here.
- What slices 3–6 (recommendation, real decision/offer, acceptance/onboarding) still add.
