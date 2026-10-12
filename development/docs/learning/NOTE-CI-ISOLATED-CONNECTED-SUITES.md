# Independent connected test baselines

The October 12 GitHub run exposed cross-suite fixture contamination: catalogue fixtures included another suite's offerings, historical immutable records accumulated, and university setup tests correctly refused the generic shared database. Weakening assertions or product safeguards would hide the problem.

CI now clones its freshly migrated, seeded and date-prepared loopback baseline for each connected test file. Each clone has a unique `sis_setup003_test_ci_` name, retains all real migrations and fixtures, and is removed only after its own suite exits. The baseline is never mutated by connected suites. Existing dedicated database guards remain intact. Failure stops the run after cleaning that suite's random clone.

The runner refuses cloud hosts, non-PostgreSQL protocols, shared database names and absent demonstration opt-in. This affects test orchestration only; runtime admission windows, registration checks, immutable history and authorization remain unchanged.
