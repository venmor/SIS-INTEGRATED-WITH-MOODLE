# TASK-PH4-002: Student / programme attempt / curriculum conversion

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed learning rotation: lead Charles Hangoma (conversion/data integrity); reviewer Chitindu Milimbo. Names assign rehearsal/review duties, not completed approval. Human review pending.

Controlling sources: roadmap `06-phase-4-…` slice 2; Design Sec 3 §§1–4 + global rules (separate lifecycle records, transitions with actor/time/reason/correlation, no silent overwrite, unique never-reused IDs); Design Sec 4 hierarchy/lifecycles (curriculum published-only intake, no in-place edit, course codes never reused); Design Sec 6 §§3 (identity: email ≠ person ID, duplicates → human queue, never auto-merge, merge needs authority/evidence/before-after/reversible IDs), §9 (matriculation chain, idempotent repeat); Journey B (one controlled transaction: uniqueness → student number + attempt + curriculum; correction preserves old values); REQ-ADM-008, REQ-REG-001/004/007; permission §15.5 (Records Officer controlled correction, transcript export, never policy change) + ops roles (no marks/finance/Moodle changes; Registrar ≠ DB access); applicant Part 10 conversion preconditions/boundary. Exact records: `01-design-sections/003,004,006`, `02-role-blueprints/011` (Part 10), cross-blueprint `001,006,007,008,009`. SUP-001–SUP-013 apply. New owning module `records` (Student Records). REST paths/test names are implementation-local.

## User outcome and boundaries

An accepted applicant with met/waived conditions and complete onboarding converts, once, into a unique student: new student number, one programme attempt on the published curriculum, linked person — in a single transaction that a retry cannot duplicate. Possible duplicates route to a registry review queue instead of merging. Owning module `records`. Commands: ConvertAcceptedOffer (idempotent), FlagPossibleDuplicate, ResolveIdentityMatch (approve/link or reject with reason). Only live Records Officer workspace (`RECORDS_OFFICER`, capability `convert-student`, intake/programme scope); applicant cannot self-convert.

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional configuration only (periods, published curriculum v1, number scheme, duplicate-match fields). Conversion preconditions: offer accepted + unwithdrawn/unexpired, required conditions met/waived, onboarding complete, identity/contact approved, programme/intake valid, no blocking hold, conversion authority permits — checked server-side, each refusal names the unmet condition. No student number/portal/registration before ALL preconditions. No Moodle, billing, timetable, or accommodation effects.

## State authorization failure and recovery

Version + idempotency key on Convert/Resolve; neutral 404s for unknown/foreign; role denials 403 + audit; already-converted → existing student returned (no second record); mid-action expiry blocks commit; uncertain outcomes resolve by command lookup with the same key. Every transition records actor/time/reason/correlation; reversals are compensating records, never edits.

## Proof and documentation

Required API tests: happy-path conversion (number + attempt + curriculum linked, receipt/audit); duplicate person routes to queue, never merges; duplicate command replays same student; missing-precondition refusals each name the cause; foreign/unknown neutral; applicant/officer/approver/sysadmin denied; version conflict; idempotency replay/conflict. Browser: registry queue review journey + conversion receipt (390px, keyboard/focus, reflow, error persistence). Record results in `docs/learning/PHASE-4-IMPLEMENTATION-REVIEW.md`.

## Out of scope and open gates

Slices 1, 3–6 UI/readiness/selection/formal/changes; verification adapters; production IdP/storage; delivery worker; real policy/number schemes; AI matching (suggest-only, none built); Phase 5 finance; Phase 6 Moodle. Open decisions DEC-PROG-001/002, DEC-FIN-001 stay fail-closed. All production/demo approvals and AT/peer checks remain explicit gates.

## Completion

Bounded implementation + automated checks: pending; see VERIFICATION on completion. Human explanation/review: pending.
