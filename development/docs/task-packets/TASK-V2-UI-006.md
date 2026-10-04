# TASK-V2-UI-006 — Separate SIS sign-in and public admissions discovery

- Release: v2.0 Task 7. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human visual/accessibility acceptance remains pending.
- Authority: user direction (2026-10-04), approved applicant Blueprint 1 public navigation and discovery, Section 12 shared navigation, Section 19 UI constitution, cross-blueprint Part 2A, ADR-003.
- Scope: make the unauthenticated home a role-neutral SIS entry with direct sign-in and separate programme discovery; give sign-in a focused credential form with optional fictional demo accounts below it; give discovery its own public navigation and task-first search header. Keep application/eligibility routes and authentication behavior.
- Out of scope: account creation, admissions policy, new catalogue fields, fee/deadline claims, institutional logo/language configuration, authenticated routing redesign, and production credential display.
- Acceptance: `/` reaches `/sign-in` in one action without first visiting admissions; `/discover` remains public; sign-in fields appear before optional demo guidance; fictional credentials appear only in `DEMO_MODE`; return-to and recovery remain functional; mobile/keyboard/no-overflow and existing sign-in/discovery journeys pass.
