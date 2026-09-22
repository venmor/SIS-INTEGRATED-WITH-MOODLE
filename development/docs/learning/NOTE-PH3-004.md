# Learning Note — TASK-PH3-004 (eligibility and recommendation package)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH3-004)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 4
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Officers record an immutable recommendation package per assigned application: eligibility outcome (ELIGIBLE/NOT_ELIGIBLE/UNDETERMINED), recommendation (FAVOURABLE/UNFAVOURABLE/NEEDS_INFORMATION), demo criteria refs, rationale. One ACTIVE package per application (partial unique index); supersede creates a new version, never an overwrite. Recommendations never reach applicant views and never decide anything (eligible ≠ admitted).

## Frontend

- Staff case page (`case.tsx`): active package display + record/supersede form (outcome/recommendation selects, demo criteria checkboxes, rationale). Refreshes via existing `refreshCase()`.
- Proxy allowlists `recommendations` read/write.

## Backend/domain

- `review.service.ts`: `recordRecommendation` (assigned-officer gate, Submitted check, blank/criteria validation against `DEMO-CRITERIA-v1`, DUPLICATE_TASK/STALE_PACKAGE, version + idempotency, staff-only event, bump, audit) and `listRecommendations` (officer + approver read). Server stamps `criteriaVersion`; `createdByAccountId` supports slice-5 SoD.
- `evidence()` exposes the active package to officer and approver reads only.

## Database/migration

- `ReviewRecommendation` model + `20260923120000_ph3_recommendation` migration (table + partial unique `WHERE ACTIVE` + index + FK). `criteriaVersion`/`criteria` from new `policy.review` demo block (`DEMO-CRITERIA-v1`).

## Security + authz

- Assigned-officer writes only; applicant/approver/sysadmin 403; foreign/unknown neutral 404s; version + idempotency; CSRF. No-leak proven by test.

## Tests and what they prove

- `review-recommendation.e2e-spec.ts` (8 tests): crud + duplicate suppression, supersede history, denials + neutrality, no-mutation (snapshot byte-identical), eligible-not-admitted (no decision row, applicant decision 404), no-leak, validation, version, idempotency. Written failing first (8×404), green after.
- Browser `admissions-queue.spec.ts` extended: record-recommendation journey on 390px.
- Full API e2e (20 files) green; no regressions.

## What failed or confused us

- New spec's submit helper returned 422 until the document upload/scan steps were mirrored from the evidence spec (submission readiness needs minimum evidence stage).
- Browser queue flake traced to pool-first claiming on a shared DB; the spec now claims/opens its own submitted case by reference (deterministic on dirty DBs).

## Terms and concepts

- Eligibility (minimum met?) vs selection (place?) vs recommendation (non-final input) vs decision (authorized outcome).

## Questions to revise

- Explain the ACTIVE/supersede version chain and why the approver path needs `createdByAccountId`.
