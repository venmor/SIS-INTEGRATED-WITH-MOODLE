# Baseline Threat and Abuse Model

This is a design baseline, not a substitute for implementation-specific threat modelling.

| Threat/abuse | Example | Primary controls | Required evidence |
|---|---|---|---|
| Credential attack | Brute force or credential stuffing | Throttling, MFA, password controls, generic errors, monitoring | Auth security tests |
| Broken object authorization | Changing a student/application ID | Server relationship/scope checks, opaque IDs, deny tests | PERM negative tests |
| Privilege escalation | Sysadmin assigns self result authority | Separation of duties, approval, no self-escalation | Role-assignment denial test |
| Injection/XSS | Malicious form/file content | DTO validation, parameterization, encoding, CSP | Input/security tests |
| Duplicate financial/official action | Replayed callback or double-click | Idempotency, uniqueness, transaction | Duplicate/retry test |
| File attack | Executable or misleading upload | Signature/type/size checks, private storage, scanning | File negative tests |
| Confidentiality breach | Adviser/Dean sees counselling note | Restricted classification, relationship scope, separate views | Authorization tests/audit |
| Insider record alteration | Edit released result/payment | Immutable versions, domain authority, audit | Amendment/denial tests |
| Provider impersonation | Forged payment/Moodle callback | Provider authentication/signature, replay prevention | Contract tests |
| Denial of service | Expensive search/upload requests | Rate/size/time limits, pagination, queueing | Abuse/load tests |
| Supply-chain compromise | Unsafe package or CI action | Minimal dependencies, lockfile, review/scans, pinned CI actions | Dependency/CI evidence |
| Sensitive logging | Password/token/notes in logs | Structured allow-listed logging and review | Log inspection test |
| AI-generated security drift | Agent bypasses guard or invents role | AGENTS rules, task packet, auth tests, human PR review | Traceability and review |

Each high-impact vertical slice must refine this model with assets, trust boundaries, attackers, misuse cases and residual risks.
