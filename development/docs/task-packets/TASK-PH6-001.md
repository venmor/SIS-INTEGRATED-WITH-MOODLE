# TASK-PH6-001: Mapping configuration and lifecycle

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Charles Hangoma; reviewer Chitindu
Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 1; Design Sec 9 §§9–10 (connection,
mapping records, both-identifier rule); REQ-LRN-001; INT-MDL-001;
Blueprint 12 mapping workflow (draft→synthetic→dual approval→schedule→
apply→monitor→reconcile→rollback); MOD-SHL-01 idempotency
(CourseOfferingId + AcademicPeriod); UI-DECISION-001 (mapping activation
sign-off, frozen package); permission (Moodle Admin configures mapping,
academic owner approves academic mapping). Exact records as prior
packets. SUP-001–SUP-013 apply. Depends on TASK-PH6-000 (TG/assignment
sources). Owning module `integration` (new).

## User outcome and boundaries

Versioned mapping registry (course shell, user, role, TG, section)
keyed by both SIS and Moodle identifiers, never names/codes alone.
Moodle Admin drafts mappings, runs synthetic validation, and activates
under four-eyes (activator ≠ creator) with frozen version + audit;
changes supersede, never edit. Connection health is visible without
secret values (simulator: Healthy/Degraded during forced outage).
Shell authorization derives from approved offerings (provision-on-first-
registration + explicit CreateMoodleCourseShell command).

## Policy and explicit demonstration scope

`MOODLE-DEMO-v1` fictional only: demo connection `MOODLE-SIM-v1`,
approved templates, category map. Secrets via env, never stored or
logged. Real Moodle instance/version/auth is an open production
decision: simulator only.

## State authorization failure and recovery

MOODLE_ADMIN + capability; academic mapping needs coordinator
attestation where academic data affected; neutral 404s; denials 403 +
audit; version-checked activation; idempotency; synthetic test never
writes mappings.

## Proof and documentation

API tests: mapping CRUD + versioning, four-eyes refusal (self-activate
403), synthetic validation pass/fail, both-identifier enforcement,
shell idempotency (offering+period single shell), health states,
denials, neutrals. Browser: draft → test → activate journey. Record in
PHASE-6 review + NOTE-PH6-001.

## Out of scope and open gates

Delivery (slice 3); grade/activity mappings for staging (shape reused
in Phase 7); real Moodle connectivity (open decision). Gates as
TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
