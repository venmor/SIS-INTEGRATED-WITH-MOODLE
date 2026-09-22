# TASK-PH3-006: Offer acceptance and onboarding task handoff (no conversion)

## Authority and ownership

User authorization: Phase 3 slices 3–6 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Chitindu Milimbo; reviewer Charles Hangoma. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 6; applicant Part 10 full (offer, conditions, accept/decline, onboarding, conversion boundary) with Part 1 lifecycle (`Offered → OfferAccepted | OfferDeclined → Onboarding`); exact record `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/011-...` (Part 10); Design §6 §§9–10 (acceptance/matriculation rules, onboarding checklist); `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM-007/008, ACT-APP (offer response), permission §15.4 (applicant accept/decline own offer only); Journey B handoff boundary (conversion is Phase 4, explicitly not here); UI constitution + notification/error/recovery catalogues; security/idempotency/recovery. SUP-001–SUP-013 apply. Depends on TASK-PH3-005 (released OFFERED decisions with explicit conditions/deadlines/version). REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

On a released OFFERED decision, the applicant deliberately opens the offer, reviews versioned conditions (each with owner/deadline/status/action), and records exactly one immutable response — accept or decline — before expiry, then sees an onboarding task list distinguishing applicant-required, institution-pending, completed, and blocked items. `ExtendAdmissionOffer` (approver-only, new deadline + reason + audit) covers authorized late responses; silent extension is impossible. Conversion to student record is explicitly forbidden in this slice (no `ConvertApplicantToStudent`; a negative test proves no student record is created). Former application history stays read-only. Owning modules: `admissions` (`case` area for response/offer views; `review` area for extension). Commands: RecordOfferResponse (accept/decline), ExtendAdmissionOffer (approver), CreateOnboardingTask (system on accept, from demo list), CompleteOnboardingTask (applicant-owned tasks only).

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` fictional configuration only. Onboarding task list is demo (contact confirmation, evidence, declarations, sponsorship note, programme conditions) with owners and deadlines; institution-owned tasks render “Verification in progress — no action required”. Condition states: Not-yet-due / Action-required / Evidence-received / Awaiting-external-confirmation / Met / Not-met / Waived / Expired — never generic `Conditional`. No auto-revoke; adverse consequences only via authorized staff decision. No delivery provider: neutral notices only (“important update… Sign in”, no outcome in preview/subject); mandatory messages non-disableable.

## State authorization failure and recovery

Response requires authenticated owner, valid OFFERED release, unexpired deadline, unanswered offer, expected version, idempotency key bound to actor/action/payload; CSRF on writes. Expired/withdrawn/answered/foreign/unknown → blocked with exact reason (expired shows CAT expiry + late-response route, never silent extension). Double accept from two devices → one immutable record, second gets final status (idempotent). Decline is final (reconsideration policy-controlled only) with optional reason. Extension requires live approver + scope + reason; records authority + audit. No browser storage of sensitive fields; uncertain outcomes resolve by owned command/receipt lookup.

## Proof and documentation

Required API tests: own accept + decline paths; foreign/unknown neutral; expired/withdrawn/answered blocking; double-accept idempotence; mismatched-key conflict; stale version; condition states explicit per offer; extension authorized (approver) vs denied (applicant/officer) + no silent extension; onboarding tasks created on accept with correct owners; applicant task completion vs institution-task denial; conversion forbidden (no student record/number/portal entitlement created); neutral notices carry no outcome. Browser tests: offer view → accept journey with conditions, decline confirm, onboarding checklist, keyboard labels/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Phase 4 conversion/registration/billing/timetable/Moodle (Journey B handoff only); real verification; production storage/scanner; delivery worker and SMTP/SMS; real UNZA roles/policy/condition values; automated revocation; registration opening. All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending.
