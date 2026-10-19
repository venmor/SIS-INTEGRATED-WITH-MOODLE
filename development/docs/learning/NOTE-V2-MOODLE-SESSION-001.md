# Live Moodle command session continuity — 18 October 2026

We repaired a session-continuity gap discovered during final integration review. The HTTP guard checked the session when a request arrived, but a slow Moodle response allowed that session to be revoked or its active workspace to change before the import transaction committed. In the original behaviour, both scenarios still created a grade batch.

We now carry the actual issuing session token from the authenticated controller context into live grade imports and binding commands. The shared `requireActiveTransactionSession` helper hashes it, locks the account, assignment and session in a consistent order, and verifies account activity, exact active assignment, role and scope, revocation, absolute expiry and idle expiry. We perform this check again inside the final mutation transaction, after remote calls complete. Current capability and source checks run under those locks. We also perform them before returning an idempotency receipt or an already-staged source revision. We never store or audit the raw token.

Our binding tests now create their own programme and real sessions. We use a fresh generated remote learner ID for each fixture run to avoid cross-run identity collisions. The test database is `sis_moodle_delivery_review_session_20261018`; no shared database was reset.

## Verification

- We first reproduced two failures in real PostgreSQL/HTTP tests: revoking the issuing session and switching its workspace during a held provider response each returned HTTP 201 instead of refusing the write.
- After the repair, all nine HTTP/SQL grade-import tests passed. They include both held-response cases and refusal to disclose a command receipt through an obsolete session context.
- Ten PostgreSQL binding tests and three grade-import authority unit tests passed. These cover independent approval, replay, identity collisions, mid-response session changes, absolute expiry, idle expiry and assignment revocation.
- TypeScript verification is recorded in the enclosing release evidence.

The held-response tests use controlled provider responses with actual application HTTP, authorization and PostgreSQL transactions. They prove race handling; they do not replace the separate real MoodleCloud rehearsal. This change does not grant new roles, remove result approval stages, or assert production institutional approval.

Our controlling sources remain the exact approved security Section 10 (authentication, authorization and audit), Part 3A permission matrix, Moodle Administrator and Integration Support blueprints, and the current Moodle task packet. Chitundu Milimbo and Charles Hangoma can present this as continuity of current authority through commit, rather than trusting the workspace selected when a network request began.
