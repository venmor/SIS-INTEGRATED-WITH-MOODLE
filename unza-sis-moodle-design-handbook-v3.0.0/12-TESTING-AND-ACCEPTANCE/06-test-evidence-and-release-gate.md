# Test Evidence and Release Gate

Each run stores:

- Test and requirement/action IDs
- Environment/build and configuration/policy versions
- Synthetic dataset/seed version
- Executor and time
- Result and failure evidence
- Defect reference and retest
- Approval/sign-off where required

## Release blockers

Any critical failure in authorization, official-result integrity, payment integrity, restricted information, regulatory submission, backup/restore, data-loss/duplicate prevention or critical-journey accessibility blocks release.

Noncritical known issues require documented severity, workaround, owner, target release and explicit acceptance. Tests are never removed or weakened solely to obtain a passing pipeline.
