# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-23-admissions-staff-ui-modernization.md

Execution branch: `ui-modernization`

Baseline: public/applicant slice closed at `d02d0e8`; CI run 35836155766 passed and both Vercel projects were green.

User constraint: routine staff UI copy stays short and direct. Structure, status, labels and placement carry meaning before prose.

Ruling: CI remains the executable RED→GREEN environment because the sandbox cannot clone the repository. Batch the admissions semantic contracts into a serial Playwright suite that creates one submitted application, then verifies queue, reviewer, approver and history contracts in separate named tests. Cost if wrong: shared database state could make a later test depend on an earlier action; the suite is explicitly serial and each role signs in independently.
