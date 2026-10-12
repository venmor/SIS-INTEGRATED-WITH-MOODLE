# Independent connected test baselines

The October 12 GitHub run exposed cross-suite fixture contamination: catalogue fixtures included another suite's offerings, historical immutable records accumulated, and university setup tests correctly refused the generic shared database. Weakening assertions or product safeguards would hide the problem.

CI now clones its freshly migrated, seeded and date-prepared loopback baseline for each connected test file. Each clone has a unique `sis_setup003_test_ci_` name, retains all real migrations and fixtures, and is removed only after its own suite exits. The baseline is never mutated by connected suites. Existing dedicated database guards remain intact. Failure stops the run after cleaning that suite's random clone.

The runner refuses cloud hosts, non-PostgreSQL protocols, shared database names and absent demonstration opt-in. This affects test orchestration only; runtime admission windows, registration checks, immutable history and authorization remain unchanged.

Follow-up verification found two additional hidden fixture assumptions: CI did not enable the synthetic teaching seed, and master preview tests depended on a prior rule-draft test. CI now explicitly enables that fixture branch; the master suite creates its own rule through the governed API (3/3 tests pass against a fresh clone).

Backup rehearsal now discovers all migrated public tables (140 in the verified baseline), rather than retaining an obsolete static list. Restore reconciliation succeeded for all 140 tables and zero unknown drift. Official-result orphan checks follow the governed release/version/amendment model. CI rehearses populated finance and result-publication clones before removing them, then independently rehearses the seeded baseline. PostgreSQL 18 client tools are installed before those connected rehearsals.
