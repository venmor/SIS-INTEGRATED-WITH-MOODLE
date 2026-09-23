# TASK-PH4-001: Onboarding checklist and identity uniqueness (portal home + readiness)

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed lead Chitindu Milimbo (registration policy/UI); reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 1; Student Journey Part 1 §§2–3,5–6,11 (portal home, readiness 9 conditions, conversion handoff matrix, commands); Design Sec 6 §§3,9,10 (identity, matriculation, onboarding task states); REQ-ADM-008, REQ-REG-001; permission §§15.3–15.4 (student own contact only; records controlled correction); UI families SCR-HOME/FRM/QUE + UI-CONTEXT/STATUS/TASK/STALE/DENIED/EMPTY; error catalogue; 12-TESTING. Exact records as TASK-PH3 set plus `02-role-blueprints/012–015` (Student Parts 1–4). SUP-001–SUP-013 apply. Depends on TASK-PH4-002 (students exist first). New UI in `records` + student home areas.

## User outcome and boundaries

A converted student sees `Welcome to the student portal` (number, programme/intake/campus/mode, period, opening/deadline, remaining tasks, `Go to my student home`), a period-aware home, and a readiness page explaining each of the 9 conditions with owner and next step — including Phase-3 applicant onboarding completion as one input. Possible duplicates appear in a registry queue for human decision, never auto-merged. No blank portal after conversion; reconciling conversions show “preparation in progress” with no registration action. Commands: OpenStudentPortalSession (read), GenerateRegistrationReadinessAssessment (computed, audited), CreateStudentRegistrationTask, PublishStudentHold (read-scope demo), UpdateStudentContactDetails / RequestOfficialStudentRecordCorrection (records workflow).

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional only. Readiness “decision required” for DEC-PROG-001/002 and DEC-FIN-001 boundaries (never infer). Holds are read-scope demo rows. Contact change preserves applicant history with effective dates. Session expiry revalidates permission/period/task.

## State authorization failure and recovery

Student reads own record only (student-number scope); records reads need Records scope; neutral 404s; 403 + audit on denial; version + idempotency on writes; CSRF; uncertain outcomes by command lookup. No approvals invented.

## Proof and documentation

API tests: portal home content per state; readiness 9-condition matrix incl. decision-required rows; duplicate queue flag/resolve/reject; contact change preserves history; foreign/unknown neutral; role denials; version/idempotency. Browser: portal home + readiness journeys (mobile/keyboard/SR/reflow, error persistence, session recovery). Record in PHASE-4 review.

## Out of scope and open gates

Slices 2–6 mechanics beyond reads; verification adapters; finance ledger (clearance status+expiry consumed only); Moodle; real policy/periods/holds; AI matching. Gates as TASK-PH4-002.

## Completion

Pending; see VERIFICATION. Human review pending.
