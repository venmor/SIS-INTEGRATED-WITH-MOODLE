# Security Acceptance Gates

A feature cannot merge or release until applicable gates pass:

| Gate | Evidence |
|---|---|
| Authentication/session | Secure cookie/session behaviour, expiry/recovery and shared-device tests |
| Authorization | Positive and negative role/scope/relationship/state tests on server |
| Separation of duties | Conflicted/self-approval and excessive-authority tests |
| Input/API/file safety | Validation, size/type limits, quarantine/scan and safe error tests |
| Rate limiting/abuse | Per-route/risk limits, safe retry messaging and no denial of critical recovery |
| Idempotency | Double-click, connection-loss and duplicate callback tests |
| Privacy | Data minimization, restricted search/export/log tests |
| Secrets | No secret in source, logs, fixtures or client bundle |
| Audit | Material action and denied sensitive access evidence |
| Backup/recovery | Restore plus reconciliation for affected official records |
| Dependency health | Lockfile, review and known-vulnerability decision |
| Accessibility | Critical task keyboard/screen-reader/mobile/error completion |

Critical authorization, result, payment, restricted-data, backup/restore or duplicate-prevention failure blocks release.
