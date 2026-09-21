# Learning Note — TASK-PH2-006 (post-submit case: timeline, clarification, correction, decision, tickets, withdrawal, inbox)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH2-006 line 5)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-21 / v0.3.0 Phase 2 slice 6
- Branch: local `main`, commit `e44170a` (“Implemented phase 2 slice 6 and phase 3 slice 1 and 2”)

## What we built and why

Submitted applications become read-only cases. Owning module `admissions` (new `case` area) using existing identity-access and catalogue. Commands from the packet: PublishApplicantStatusUpdate, RequestApplicationClarification, SubmitClarificationResponse, RequestApplicationCorrection, ApproveApplicationAmendment, DeclineApplicationAmendment, ReleaseAdmissionDecision, CreateApplicantSupportTicket, RequestApplicationWithdrawal. Only authenticated active APP workspace and applicant-owned records; staff simulation endpoints are SYSADMIN-gated demo scaffolding tracked for removal (GAP-017).

Controlling: applicant journey Part 9 with Part 1 lifecycle/status language, exact Blueprint 1 records `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/` (009 Part 8, 010 Part 9, 011 Part 10 boundary), UI constitution, REQ-ADM/REQ-NFR, architecture, security/privacy/idempotency/recovery/notifications, testing. `APPLICATION-DEMO-v1` fictional only.

## Frontend explanation

- `apps/web/app/applicant/[id]/status/page.tsx`: `GET /:id/timeline`, CAT rendering via `formatLusaka`, timeline `<ol>`, `ApplicationCaseNav`.
- `apps/web/app/applicant/[id]/decision/page.tsx`: deliberate authenticated open; missing decision is neutral “No decision yet”, never a verdict; OFFERED/WAITLISTED/other branches; notices never carry the outcome.
- `clarifications/page.tsx + respond-form.tsx`: scoped list + per-attempt `crypto.randomUUID` key, receipt notice, persistent `ErrorSummary`.
- `corrections/page.tsx + correction-form.tsx`: “stays unchanged until approval / one open per item”.
- `tickets/page.tsx + ticket-forms.tsx`: create/reply; RESOLVED shows static text.
- `withdraw/page.tsx + withdraw-form.tsx`: timeline-gated, checkbox `confirm=yes`, success receipt + refund-separation copy.
- `notifications/page.tsx + notifications-list.tsx`: pollable inbox, `POST /notifications/:id/read`, no preference UI (mandatory notices cannot be disabled).
- `chrome.tsx` `ApplicationCaseNav`; `[id]/page.tsx` renders nav when Submitted/Withdrawn; `[id]/[section]/page.tsx` allowlists six case sections; proxy `app/api/applications/[[...path]]/route.ts` allows reads/writes for case paths; sim routes intentionally absent from proxy.

## Backend/domain explanation

- `apps/api/src/admissions/case.service.ts` (`ApplicationCaseService`): `staffGate()` SYSADMIN-only sim; `event()`/`notify()` writers; `checkVersion()`; `simIdempotent()` key bound actor/action/payload digest; `timeline()` via `apps.own()` + `visibleTimeline()` + Submitted pseudo-event; `notifications()`/`markNotificationRead()`; `clarificationRespond()` Submitted-only, OPEN-only, `RESPONSE_LATE` on server-time deadline, empty/version checks, receipt UUID, `ClarificationReceived` event, version++, audit with old/new values; `correctionRequest()` section allowlist, `DUPLICATE_TASK`, version; `withdraw()` Submitted-only, `CONFIRM_REQUIRED`, state→`Withdrawn`, releases CLAIMED `ReviewAssignment`s, `ApplicationWithdrawal` row, refund-separation copy; `createTicket()`/`replyTicket()` (`TICKET_CLOSED` if RESOLVED); `decision()` 404 `DECISION_PENDING` unless `releasedAt`, no staff fields; `simulateClarification/simulateDecision/simulateCorrectionDecision()` SYSADMIN-gated, same tables Phase 3 writes, approval preserves snapshot by construction.
- `case.controller.ts`: `@Controller('applications')`, `SessionGuard + ApplicationRateGuard`, `CsrfGuard` on POSTs; routes for notifications/timeline/decision/clarifications/corrections/tickets/withdraw + three sim routes. Registered before `ApplicationsController`; wired in `admissions.module.ts`.
- `case.ts`: `visibleTimeline()` drops `applicantVisible=false`, sorts asc.
- `dto.ts` slice-6 block: `ClarificationRespondDto`, `CorrectionRequestDto`, `WithdrawDto`, `TicketDto`, `TicketReplyDto`, `SimCorrectionDecisionDto`, sim DTOs; all writes extend `VersionDto`.
- Reused `applications.service.ts`: `own()` neutral `NOT_FOUND`, `editable()` locks Submitted/Discarded/Withdrawn, `audit()`, `command()` account lock + idempotency replay/conflict.

## Database/migration explanation

- `prisma/schema.prisma` slice-6 models (all FK `Restrict`): `ApplicationStatusEvent` (`applicantVisible` default true), `ApplicationClarification`, `ApplicationCorrectionRequest`, `ApplicationDecision` (`applicationId @unique`, `releasedAt`), `SupportTicket` + `SupportTicketMessage`, `ApplicationWithdrawal` (`applicationId @unique`), `ApplicantNotification`. `Application` back-relations.
- `migrations/20260920193753_ph2_slice6_case/migration.sql`: 8 tables + indexes + uniques + FKs.
- `migrations/20260920235900_ph2_slice6_withdrawn_state/migration.sql`: `Application_state_check` includes `Withdrawn`; Withdrawn still counts as active (no free re-application slot, fail-closed).

## Security and authorization explanation

- Account ownership, never caller-supplied IDs; `apps.own()` neutral unknown≡foreign 404; active APP workspace only; staff holding APP elsewhere denied.
- Version + persistent idempotency key on clarification/correction/withdrawal/ticket writes; key bound actor/action/payload; mismatched → `IDEMPOTENCY_CONFLICT`.
- CSRF on all writes; server-time deadlines; no duplicate notices (dedupe test); uncertain outcomes resolved by owned command/receipt lookup, retry same key.
- Staff-only rows never reach applicant views (`visibleTimeline`); decision deliberately opened, no outcome in notices; withdrawal receipt separate from refund; tickets linked to owning application; no browser storage of sensitive fields.
- `packages/contracts/src/applications.ts` slice-6 views; `packages/config/src/applications.ts` `case`: `statusPollMs`, `clarificationResponseDays:14`, `correctionReviewNote`, `withdrawalConfirmation`, `supportChannels`, `notificationRetentionDays:90`.

## Tests and what they prove

Present in repo; fresh pinned-stack rerun still pending (see VERIFICATION.md):

- `apps/api/test/applications-case.e2e-spec.ts` (21 tests): timeline + staff-row leak check, foreign-denied, clarify flow/replay/closed, late `RESPONSE_LATE`, correction + `DUPLICATE_TASK`, decision pending→released + no-outcome-in-notice, tickets, withdraw confirm/receipt/refund/replay, notifications list/read/foreign-404, idempotency replay, sim-forbidden 403, stale `VERSION_CONFLICT`, mismatched-key conflict, neutral unknown IDs, scoped-response isolation, withdraw wording, notify-dedupe, resolved-ticket block, correction approve-preserves-snapshot byte-compare + decline.
- `apps/api/src/admissions/case.spec.ts`: `visibleTimeline` drops staff-only rows + sort; never leaks lone staff row.
- `tests/browser/applicant-case.spec.ts`: 390px journey — status, decision pending (zero offer text), DB-seeded clarification respond, correction, tickets+reply, DB-seeded decision view, inbox, withdraw gate→receipt→`Withdrawn`, empty localStorage. Run cancelled per user instruction on 2026-09-21; still pending.

## What failed or confused us

- Slice-6 `applicant-case` browser spec cancelled per user instruction — file exists, no fresh run claimed.
- `test:scripts`/`scan`/`backup:test` blocked on 2026-09-21 box (ripgrep/psql/Node 24); on current box `rg`/`psql`/`fnm` 24.21 are present, so reruns are unblocked but not executed in this docs pass.
- Sim endpoints duplicate Phase 3 officer paths with divergent guards — kept SYSADMIN-gated for demo seeding; removal tracked in GAP-017, not silently resolved.
- Staff inbox missing — applicant writes produce applicant-visible events + counts only; officer must poll (GAP-016).

## Terms/concepts learned

- Post-submit case: submitted snapshot authoritative; later changes are scoped auditable responses, not draft reopens.
- `applicantVisible` split; neutral 404s; version + idempotency; server-time deadlines; refund separation; mandatory notices.

## Questions to revise before presentation

- Walk the timeline → clarify → correct → decide → ticket → withdraw → inbox path on a fresh demo DB and explain each server check.
- Why sim endpoints must be removed before production, and what seeds through them today.
- What GAP-008/009 (delivery worker), GAP-016 (staff signal), GAP-017 (sim removal) still block.
