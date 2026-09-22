# Learning Note — TASK-PH3-006 (offer acceptance and onboarding handoff)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH3-006)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 6
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

On a released ADMIT*/offer, the applicant deliberately opens the offer (conditions, deadline, no registration claims), records exactly one immutable accept/decline, and — on accept — receives an onboarding task list separating applicant-owned from institution-owned work. No conversion: state stays Submitted, no student record/number/portal is created (Phase 4 boundary, proven by test). Approvers can extend the deadline with a reason; silent extension is impossible.

## Frontend

- Applicant offer page (deliberate open, neutral absence state) + accept/decline form (separate unpreselected buttons, optional decline reason, receipt notice).
- Onboarding page with client-owned progress line (refetches after each completion) + per-task completion for applicant tasks; institution tasks show owner, never a control.
- Case nav gains offer + onboarding links (required narrowing one leak assertion to outcome wording).

## Backend/domain

- `case.service.ts`: `offer` (OFFERED-only deliberate open), `respondToOffer` (resource-idempotent: second attempt receives stored status; accept checks deadline; creates demo onboarding tasks; events + audit + neutral notice; version bump), `onboarding` (accept-only), `completeOnboardingTask` (applicant-owned only, idempotent).
- `review.service.ts` `extendOffer` (approver-only, future deadline, reason, unanswered offers only; visible event + neutral notice + audit).
- `acceptBy` threaded through release DTO/service/decision view; onboarding task list from `policy.onboarding` demo block.

## Database/migration

- `20260923140000_ph3_offer_acceptance`: `acceptBy` column, `ApplicationOfferResponse` (unique per app, write-once), `OnboardingTask` (unique app+key).

## Security + authz

- Owner-only responses; expired/withdrawn/answered/foreign/unknown blocked with exact reasons; double-accept returns final status; institution tasks 403 for applicants; extension approver-only; CSRF; neutral 404s; notices carry no outcome.

## Tests and what they prove

- `review-acceptance.e2e-spec.ts` (14 tests): accept + onboarding contents/progress/event, decline + closed onboarding, double-accept final status + single row, expired accept blocked/decline allowed, neutrality, extension + denials + answered-refusal, task completion/idempotence/denials, no-conversion (state/decision untouched), validation, version, idempotency, non-offer surfaces 404. Green first run.
- Browser `applicant-case.spec.ts` extended: seeded offer → accept → onboarding → complete task → progress `1 of 3`; leak assertion narrowed to outcome wording. Full browser set 4/4 green.

## What failed or confused us

- Ticket list never refreshed after create (server-rendered page): fixed with `router.refresh()` in the shared submit hook (also refreshes sent replies).
- Onboarding progress went stale after completion: moved the count into the client component with refetch.
- Release form initially omitted the offer deadline (400): added CAT-date input.
- Browser DBs must be migrated when new migrations land (P2022 otherwise); full e2e reruns need fresh DBs (break-glass audit assertion is order-fragile on dirty DBs — pre-existing, unrelated).

## Terms and concepts

- Offer made ≠ accepted ≠ onboarded ≠ student ≠ registered; resource-idempotent responses; bounded demo effects.

## Questions to revise

- Accept/decline/extend/expiry matrix with codes; why conversion is refused here and where it lives (Phase 4).
