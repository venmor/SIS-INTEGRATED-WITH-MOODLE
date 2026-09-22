# Learning Note — TASK-PH3-003 (clarification round-trip closure)

- Lead developer: Charles Hangoma (proposed; TASK-PH3-003)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 3
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

The clarification round-trip now closes cleanly: ANSWERED clarifications and decided corrections stay in history but leave the officer case-summary open counts. No new command — the queue and approver summary already used open-only semantics; only the officer `summary()` counted every row. One focused fix in `review.service.ts` plus a regression test.

## Frontend

No applicant-visible change. Staff case page already refreshes evidence after writes.

## Backend/domain

- `review.service.ts` `summary()` officer path now filters `OPEN` clarifications / `PENDING` corrections, matching `queue()` (query-level filter) and the approver summary path.

## Database/migration

None (read-path fix; no schema change).

## Security + authz

Unchanged gates (assignment + intake scope, neutral 404s, version + idempotency on writes). Count correction is read-path only.

## Tests and what they prove

- `review-evidence.e2e-spec.ts` `summary-answered-counts`: raise → open count 1 → applicant answers → 0 with history kept; correction requested → 1 → officer decides → 0. Watched fail (`expected 1 to be 0`) before the fix, 13/13 after.
- Deadline-approaching reminders stay out of scope (GAP-008/009); correction↔clarification scope matching recorded as a gap (no fuzzy matching invented).

## What failed or confused us

- First assumed the queue counts were wrong; they were already filtered at query level — the bug was only in `summary()`. Read before fixing.

## Terms and concepts

- ANSWERED is terminal for the applicant task; staff assessment continues via findings/recommendation.

## Questions to revise

- Walk the raise → answer → summary-count flow and explain why no new command was needed.
