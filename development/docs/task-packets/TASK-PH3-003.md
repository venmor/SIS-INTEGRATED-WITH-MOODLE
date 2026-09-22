# TASK-PH3-003: Clarification round-trip closure (answered states, queue counts)

## Authority and ownership

User authorization: Phase 3 slices 3–6 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Charles Hangoma; reviewer Chitindu Milimbo. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 3; `03-USER-EXPERIENCE-BLUEPRINTS/07-admissions-registry-examinations-and-graduation-operations.md` Journey A step 4; applicant Part 9 §§1–5, 9–11 with Part 1 lifecycle (`Submitted → ClarificationRequested → Submitted`); exact records `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/010-...` (Part 9), `009-...` (Part 8 uncertainty wording), cross-blueprint Part 4 error/recovery/notification catalogue (`008-...`); `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM, ACT-APP/ACT-ADM, permission §§15.4/15.9/15.10; `07-SECURITY-PRIVACY-RESILIENCE/` idempotency/recovery. SUP-001–SUP-013 apply. Command names follow source language. REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

The clarification round-trip closes cleanly: once an applicant answers, the officer queue stops flagging that item as needing action while keeping the full history visible. ANSWERED is terminal for the applicant task (response received, receipted, audited); staff assessment of the response continues through findings (slice 2) and recommendation (slice 4). No new staff command is introduced: the fix corrects queue/evidence counts to open-only semantics, matching the evidence view that already filters `OPEN`/`PENDING`. Owning module `admissions` (`review` area). No applicant-visible change except accurate timelines. Staff raise/respond paths from slices 2/6 are untouched.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` fictional configuration only. Deadline-approaching reminders need the delivery worker and stay out of scope (GAP-008/009 hold). Matching a correction request to an overlapping open clarification needs approved matching policy and stays a recorded gap (no fuzzy matching invented here). Expiry semantics unchanged: `RESPONSE_LATE` with “awaiting an Admissions decision under the applicable rule”, no auto-fabricated rejection.

## State authorization failure and recovery

No state-model change. Queue reads keep assignment + intake-scope gates with neutral 404s. Count correction is read-path only; all write paths (claim/release/finding/clarification/decide) keep expected version + idempotency key, CSRF, and conflict codes. Uncertain outcomes still resolve by owned command lookup with the same key.

## Proof and documentation

Required API tests: answered clarification no longer raises `actionNeeded` while remaining in history; open clarification still raises it; decided correction no longer counts while remaining listed; regression on existing queue filter/version/idempotency/neutrality suites. No new browser flow (queue already covered); record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Slices 4–6; reminder worker and SMTP/SMS; correction↔clarification scope matching (new gap); deadline extensions; real UNZA roles/policy values; recommendation scoring; sim-endpoint removal (slice 5). All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending.
