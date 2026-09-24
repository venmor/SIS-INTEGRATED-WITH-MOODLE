# Learning Note — UI-POLISH Wave 2 (homes and portal structure)

- Lead developer: Chitindu Milimbo (proposed; TASK-UI-POLISH)
- Reviewer: Charles Hangoma (proposed)
- Date: 2026-09-24, presentation track

## What was restyled and why

Student home replaced its link-soup paragraph with onboarding
progress plus five task cards (owner descriptions, one named action
each), contact/correction workflows in Cards, and correction history
with status chips. Staff sidebar nav collapses behind a native
disclosure on narrow screens (no JS, keyboard-accessible) instead of
a wrapping link strip. Hardcoded shell weights moved to tokens.
Student home owns its CSS module now instead of borrowing the
applicant one.

## Verification

- Typecheck/lint/builds clean. Portal spec untouched areas pass (only
  the h1/number/programme assertions exist; structure changes are
  additive).
