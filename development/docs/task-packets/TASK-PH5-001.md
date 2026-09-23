# TASK-PH5-001: Versioned fee assessment

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Charles Hangoma (data/ledger logic); reviewer Chitindu Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 1; Design Sec 6 §§11–14 (SIS finance boundary; fee dimensions; calculation methods; assessment workflow; immutable subledger); REQ-FIN-001 (charges derive from approved fee policy, enrolment context, effective period); Finance Blueprint Journey A steps 1–2 (approved fee configuration assesses charges for programme/period/load/category; student receives amount, reason, due date, payment reference); student journey Part 2 §3 (invoice contents, charge categories, period separation); Part 3 §7 (course-based charges from plan/registration; UI never calculates fees); DEC-FIN-001 (billing strategy is versioned configuration, not a conditional); permission Part 3A §15.8 (student sees own charges; finance configures); UI catalogue review/invoice patterns; UI constitution (money always with currency). Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH4-005 (registration roster feeds course-based charges). Owning module `finance` (new).

## User outcome and boundaries

For a registered student + period, the server resolves the versioned demo fee policy, simulates assessment, and posts immutable charge lines grouped under an invoice with an official reference: every line records fee rule + version, inputs, amount + currency (ZMW, minor-unit integers, never float), period, programme/course, sponsorship responsibility, posting/due dates. Re-assessment after roster changes adds new lines (never edits posted ones). Student invoice view shows description, amount/currency, period, due date, rule, reference — periods never merged into one unexplained total. Commands: AssessStudentCharges (idempotent per registration version).

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` fictional only (SUP-009): flat per-period registration fee + per-course fee for enrolled courses (course-based strategy selected in config; schema also accepts per-period strategy per DEC-FIN-001). Amounts are placeholders (e.g. ZMW minor units), effective 2026S1, owned by "Student Finance (demonstration)". No real fees, providers, or GL export. Applicant application-fee flow (Part 7) stays out of scope: demo `applications.fee.status` remains NOT_REQUIRED.

## State authorization failure and recovery

Finance-officer assessment or system-triggered on registration events; students read own invoice only; neutral 404s; denials 403 + audit; idempotency key + unique (account, period, source, sourceVersion) constraint; concurrent assessments serialized per account+period; stale policy version refuses with current version.

## Proof and documentation

API tests: happy path (charges + invoice + reference from registration); re-assessment append-only; unknown registration/period 404; idempotent replay returns stored invoice; concurrent pair yields one invoice; denials (student cannot assess; lecturer cannot view amounts); money-integrity (integer arithmetic, currency on every line). Browser: student invoice shows lines + reference + due date (mobile/keyboard/SR/reflow). Record in PHASE-5 review + NOTE-PH5-001.

## Out of scope and open gates

Payment initiation/callbacks (slices 3–4); allocation/clearance (slice 5); adjustments/sponsorship/refunds (slice 6); Moodle (Phase 6); real fee values/thresholds/providers (DEC-FIN-001, open decisions). Gates as TASK-PH4-002 plus finance readiness gate (simulator only; demo fees/thresholds).

## Completion

Pending; see VERIFICATION. Human review pending.
