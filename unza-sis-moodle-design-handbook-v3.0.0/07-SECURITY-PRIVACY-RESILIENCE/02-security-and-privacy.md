# Security and Privacy Blueprint

## Layered security

```text
Browser/transport protection
→ authentication/session
→ server authorization
→ input and file validation
→ domain invariants/database constraints
→ audit and monitoring
→ rate limiting/abuse controls
→ backup and recovery
```

## Authentication and session requirements

- Use Argon2 or an approved contemporary password-hashing mechanism selected by ADR.
- Transmit authenticated traffic only over TLS outside local development.
- Use server-managed sessions and secure, HTTP-only, same-site cookies.
- Do not store authentication tokens in browser local storage.
- Rotate/invalidate sessions after sign-in, password reset, account recovery and risk events.
- Use generic authentication/recovery responses to avoid account-existence disclosure.
- Require re-authentication for credential change, privileged role assignment, results release, financial adjustment and regulatory submission.
- Require MFA for system administrators and strongly protect finance/examination/operations roles.
- Backend/database/service accounts never authenticate through the ordinary user interface.

## Input and browser/API protection

- Validate and normalize requests on the server using allow-listed DTO/contracts.
- Reject unknown fields for sensitive commands.
- Use parameterized/ORM database access; never concatenate user input into SQL.
- Protect cookie-authenticated state changes against CSRF.
- Encode output and prevent XSS; define an appropriate Content Security Policy.
- Use HSTS in production, content-type protection and frame/clickjacking controls.
- Bound input sizes, pagination and processing time.
- Return safe messages; store necessary technical detail only in protected logs.

## File handling

- Allow-list necessary formats and validate actual content signature, not extension alone.
- Limit file size, count and per-user quota.
- Generate server-side names and store outside public application assets.
- Quarantine/scan before authorized viewing where scanning is available.
- Serve through short-lived, authorized download/view operations.
- Never execute uploaded content.
- Audit upload, access, replacement and authorized disposal.
- Keep applicant-submitted evidence immutable after formal submission; later evidence is a linked version.

## Data classification

| Class | Examples | Baseline handling |
|---|---|---|
| Public | Programme pages, published dates | Public but integrity-controlled |
| Internal | Operational configuration, ordinary work queues | Authenticated and scoped |
| Confidential | Applications, marks, balances, identification | Least privilege, masked views, audited access |
| Restricted | Counselling, disability, safeguarding, discipline | Assigned relationship, strong logging, separate views |
| Highly restricted/secret | Credentials, keys, recovery material | Secrets storage, no ordinary application display/logging |

Official retention periods remain an institution/legal policy input.

## Logging prohibitions

Never log passwords, session tokens, MFA secrets, full identity documents, unrestricted file contents, full payment credentials, private support notes or unnecessary personal fields. Use correlation references and masked identifiers.

## Secrets

Secrets are absent from source code, ZIPs, screenshots and demo data. The future repository includes `.env.example` with names only; actual values use protected local/deployment settings. An accidentally committed secret is considered exposed and must be rotated.

## Audit

High-impact audit records include actor, active role, scope, command, target, prior/new state reference, policy version, reason, time, correlation and outcome. Audit append access is separated from authority to change domain decisions.
