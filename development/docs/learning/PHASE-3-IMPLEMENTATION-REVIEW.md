# Phase 3 slices 1–6 — learning and implementation review

Review date: 2026-09-21. Slices 1–2 committed in `e44170a` on local `main`; slices 3–6 implemented in the uncommitted worktree (packets TASK-PH3-003..006, notes NOTE-PH3-003..006). No pull request. Human learning and acceptance checks below remain pending.

A fictional admissions officer can now claim submitted applications from an
assigned queue, compare declarations against document states, record
immutable findings, raise scoped clarifications, record versioned
recommendations, and — through a separate approver workspace — release
versioned decisions with explicit outcomes, conditions, and deadlines. A
fictional applicant can answer clarifications, view the released decision
through a deliberate open, accept or decline an offer, complete applicant
onboarding tasks, and request an authorized deadline extension. No student
record is created anywhere in this phase. Simulation endpoints are deleted
(GAP-017 implemented in code). This completes the Phase 3 slice plan:
remaining work is human review, production gates, and Phase 4 conversion.

## What each slice delivers

| Slice | What the officer can do | Main code to open | Data and proof |
|---|---|---|---|
| 1 — queue | See my claimed cases and the claimable submitted pool, filter by state/action-needed, claim and release with version + idempotency | [review service](../../apps/api/src/admissions/review.service.ts), [review controller](../../apps/api/src/admissions/review.controller.ts), [queue page](../../apps/web/app/admin/admissions/queue/) | ReviewAssignment (single active claim via partial unique index); neutral 404s; VERSION_CONFLICT; IDEMPOTENCY_CONFLICT; ASSIGNMENT_CONFLICT |
| 2 — comparison | Open one claimed case, read declarations beside state-only documents, record findings, raise clarifications, approve/decline corrections | [case page](../../apps/web/app/admin/admissions/case/%5Bid%5D/) | ReviewFinding (immutable, no update/delete path); snapshot byte-identical after findings + approval; unsafe files state-only |
| 3 — clarification round-trip | Answered clarifications and decided corrections leave the open counts while history stays | [summary()](../../apps/api/src/admissions/review.service.ts) | Open-only counts in queue/summary/evidence; regression e2e |
| 4 — recommendation | Record eligibility outcome + recommendation versions with rationale, supersede explicitly | [recommendation service](../../apps/api/src/admissions/review.service.ts), [case page recommendation section](../../apps/web/app/admin/admissions/case/%5Bid%5D/case.tsx) | ReviewRecommendation (one ACTIVE via partial unique index); DUPLICATE_TASK/STALE_PACKAGE; applicant no-leak |
| 5 — decision and offer | Approver releases a versioned decision with outcome, conditions, deadline; sim endpoints deleted | [release](../../apps/api/src/admissions/review.service.ts), [decision view](../../apps/api/src/admissions/case.service.ts) | ApplicationDecision (explicit version); NO_RECOMMENDATION/SELF_APPROVAL/ALREADY_RELEASED; delivery-kept proof |
| 6 — acceptance and onboarding | Applicant accepts/declines once, completes applicant tasks, requests extensions via approver | [offer pages](../../apps/web/app/applicant/%5Bid%5D/offer/page.tsx), [onboarding](../../apps/web/app/applicant/%5Bid%5D/onboarding/page.tsx) | ApplicationOfferResponse (write-once); OnboardingTask (owner split); no conversion proof |

Controlling requirements: REQ-ADM-005/006/007/008, ACT-ADM-001/002, REQ-IAM-002/003/004,
REQ-OPS-001/002/004. Packets: [TASK-PH3-001](../task-packets/TASK-PH3-001.md),
[TASK-PH3-002](../task-packets/TASK-PH3-002.md),
[TASK-PH3-003](../task-packets/TASK-PH3-003.md),
[TASK-PH3-004](../task-packets/TASK-PH3-004.md),
[TASK-PH3-005](../task-packets/TASK-PH3-005.md),
[TASK-PH3-006](../task-packets/TASK-PH3-006.md). Open gates:
[GAP-016](../gaps/GAP-016-staff-signal-inbox.md) (staff signals),
[GAP-008](../gaps/GAP-008-notification-delivery.md) (delivery worker),
GAP-003/004/006/012 (registries — interim fictional roles and
intake-string matching used instead). GAP-017 (sim removal) is implemented
in code, pending human decision.

## Follow one claim from the screen to the database

```mermaid
sequenceDiagram
    actor Officer
    participant Page as Next.js queue
    participant Proxy as Same-origin proxy
    participant API as NestJS review
    participant DB as PostgreSQL
    Officer->>Page: Claim case
    Page->>Proxy: applicationId + version + request key
    Proxy->>API: Validated origin + session cookie
    API->>DB: Check live ADMISSIONS_OFFICER + review-assigned + intake scope
    API->>DB: Lock application row; compare version; check active claim
    API->>DB: Create CLAIMED assignment, staff-only event, audit, command row
    DB-->>API: Transaction commits
    API-->>Page: Claimed receipt
    Page-->>Officer: Case moves to My cases
```

1. The queue page sends the timeline version the officer reviewed plus a
   request key through the same-origin `/api/review` proxy.
2. The API re-checks live reviewer workspace, capability, dates and intake
   scope on the server; the browser never decides authority.
3. The application row lock serializes concurrent claims; the partial unique
   index admits exactly one active claim, mapped to `ASSIGNMENT_CONFLICT`.
4. A stale version conflicts with the current version instead of claiming
   old state; post-submit applicant writes (response, correction, withdrawal)
   and staff decisions advance the version.
5. Claim, findings, clarifications and decisions are idempotent commands;
   mismatched keys conflict; unknown and foreign ids return identical 404s.

## Why review never rewrites the application

Findings, clarifications and correction decisions are new rows linked to the
application, never updates to it. Approval flips a correction request to
`APPROVED`/`REJECTED` and records an event; the submitted snapshot stays
byte-identical (proven by test). Withdrawal auto-releases active claims so
dead cases leave officer queues. Unsafe documents render state-only with no
preview and no bytes in any projection. Staff-only rows
(`applicantVisible=false`) never reach applicant timelines; notifications
carry neutral titles with no outcomes.

## Files to learn in order

1. [Packets](../task-packets/TASK-PH3-001.md) and [slice 2](../task-packets/TASK-PH3-002.md): demo boundaries and out-of-scope lists.
2. [Migration](../../../prisma/migrations/20260922120000_ph3_review_queue/migration.sql) and [findings](../../../prisma/migrations/20260922130000_ph3_review_findings/migration.sql) plus [indexes](../../../prisma/migrations/20260922140000_ph3_review_indexes/migration.sql): assignment, findings, hot-path indexes.
3. [Seed](../../../prisma/seed/seed.ts) officers/approver: fictional `temwani.r`, `lubuto.s`, `kasonde.a`.
4. [DTOs](../../apps/api/src/admissions/dto.ts) (review section) and [validation rules](../../apps/api/src/admissions/review.service.ts): version + key on writes, allow-listed kinds/severities, blank rejection.
5. [Queue e2e](../../apps/api/test/review-queue.e2e-spec.ts) and [evidence e2e](../../apps/api/test/review-evidence.e2e-spec.ts): allow/deny, conflict, neutrality and no-mutation proofs.
6. [Staff browser story](../../tests/browser/admissions-queue.spec.ts): claim, finding, clarification on a 390px viewport.

## Issues found through testing/review

Adversarial review of the first implementation caught: intake scope
enforced only on listings (now enforced in `assigned()` and `claim()`,
fail-closed for non-INTAKE scopes); withdrawn claims lingering (withdrawal
now auto-releases claims and bumps the version); `actionNeeded=false`
parsing as true (explicit string transform); claim-race 503s (application
row lock + `P2002` mapped to `ASSIGNMENT_CONFLICT`); frozen post-submit
versions (applicant response/correction/withdrawal and staff clarification/
decision now bump the version); blank findings/questions accepted (DTO +
service rejection); approver denied all reads (read-only evidence access,
writes still 403); staff deafness (evidence refresh after writes; full
inbox deferred to GAP-016); shared idempotency keys across forms
(per-attempt keys); and applicant timeline leaking checks (proven absent by
test). Environment notes: Node 22 on this box vs pinned 24.21.0 (`nest`
CLI unusable — direct `tsc` used), ripgrep absent (scan + 1 script test
unrunnable), sign-in rate budget shared across repeated local runs.

## What you must not claim in a presentation

Do not claim real admissions authority, real verification, offer issuance,
enrolment, notification delivery, production storage/scanning, or full
accessibility certification. The officers, approver, findings and decisions
are fictional demonstration records. Use the rehearsal evidence below to
collect your own explanation/reproduction proof.
