# TASK-PH3-005: Separate decision authority and offer (with sim-endpoint removal)

## Authority and ownership

User authorization: Phase 3 slices 3–6 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Charles Hangoma; reviewer Chitindu Milimbo. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 5; Journey A steps 6–8; Design §6 §§7–8 (decisions catalogue, conditions, AI prohibitions); `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM-006/007 (separation; conditions/expiry/versions), REQ-OPS-002 (delivery failure ≠ domain reversal), ACT-ADM-002, permission §§15.4/15.9–15.10/15.21 (SoD); applicant Part 9 §§6/9–11 (decision viewing, neutral notices); UI `UI-DECISION-001` (frozen package, options, rationale, declaration, conflict status, effective date, audit preview); security/idempotency/recovery. Exact records: `01-design-sections/006-...`, cross-blueprint `004/005/008-...`, role blueprints `010-...` (Part 9). SUP-001–SUP-013 apply. Depends on TASK-PH3-004 (a recorded recommendation should normally precede a decision; see precondition rule below). REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

An authorized approver (`ADMISSIONS_APPROVER`, `decide-offer`, intake scope) releases a versioned decision with explicit outcome, conditions, and deadlines on a frozen evidence package — as a separate act by a separate actor from the recommendation. Supported outcomes: ADMIT, ADMIT_WITH_CONDITIONS, WAITLIST, REJECT, REFER_TO_ALTERNATIVE_PROGRAMME, REQUEST_FURTHER_REVIEW. Preconditions: application Submitted; at least one recorded recommendation (fail-closed: no package → no decision, with a plain-language reason); decider is not the recommending officer on that application (self-approval denial, audit-logged). Offer version is explicit (`version: 1`; re-release after a linked superseding decision bumps it; decisions are never overwritten). The existing applicant decision page serves released decisions unchanged; neutral notification wording unchanged. Owning module `admissions` (`review` area for release; existing `case` area for viewing). Commands: ReleaseAdmissionDecision (approver). This packet also executes GAP-017: migrate e2e/browser suites off `simulate-*`, then delete the three simulation endpoints and their helpers.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` fictional configuration only. Condition catalogue is demo (certified documents, final results, funding confirmation, etc.); each condition records evidence, responsible reviewer, deadline, and matriculation-blocking flag. No delivery provider: notifications are pollable inbox projections; a failed delivery never reverses the released decision (proven by test). No real verification, no production storage/scanner, no real UNZA decision authority values. The SYSADMIN demo seeding path is replaced by officer/approver endpoint seeding in suites before deletion.

## State authorization failure and recovery

Release requires live approver assignment + intake scope, expected application version, idempotency key bound to actor/action/payload; CSRF on writes. Unknown/other-scope ids → neutral 404s. Officer/applicant/sysadmin attempts → 403 denial + audit. Already-released → `ALREADY_RELEASED` with the decision id (idempotent re-read, never a second decision). Stale version → `VERSION_CONFLICT`. Retry uses the same key; uncertain outcomes resolve by command lookup. Internal notes, scores, and conflict details never reach applicant views.

## Proof and documentation

Required API tests: approver-only release + neutral foreign/unknown; officer-cannot-release (403); self-approval denial (approver == recommender); missing-recommendation refusal; version conflict; idempotency replay + mismatched-key conflict; already-released idempotence; each outcome persists with conditions/deadlines/version; delivery-failure simulation retains the valid decision; applicant decision view + neutral notice unchanged; no-leak of internal fields. Suite migration: queue/evidence/case suites seed via officer clarification + approver release (no sims); then sim endpoints return 404 (deleted). Browser test: approver release journey (or documented seeded path) + applicant neutral notice → deliberate decision open; keyboard/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Slice 6 (acceptance/onboarding/conversion); offer extensions beyond demo policy (deferred to slice 6 `ExtendAdmissionOffer`); automated rules; verification adapters; production storage/scanner; delivery worker and SMTP/SMS; real UNZA roles/policy values; superseding-decision chains beyond version bump + audit history. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending. GAP-017 closes with this slice.
