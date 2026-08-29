<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 9d44b86d-1e22-59df-9373-5ed7e83b0033; chronological message: 272. -->

Yes. We had reliability ideas, but not a concrete rule set for rate limiting, redundancy, dependency sprawl, and codebase bloat. They are now part of the engineering foundation.

# Section 19, Part 4 — Security, resilience and codebase health

## 19.38 Security model

Security is enforced in layers:

```text
Browser protection
→ authentication
→ server-side role and scope authorization
→ input/file validation
→ database constraints and audit trail
→ rate limiting and abuse protection
→ monitoring, backups and recovery
```

The frontend may hide unavailable actions for clarity, but the NestJS backend is the final authority. A user must never gain access merely by changing a URL or API request.

## 19.39 Authentication and sessions

- Passwords are stored only as **Argon2 hashes**, never plaintext.
- All authenticated traffic uses HTTPS.
- Use secure, HTTP-only, same-site cookies—not tokens stored in browser local storage.
- Session expiry and logout invalidate the session server-side.
- Use generic login/reset messages so attackers cannot discover whether an account exists.
- Require re-authentication for high-impact actions: result release, financial adjustment, role assignment, password/email change, account recovery and regulatory submission.
- MFA is required for staff administrators and strongly recommended for finance, examinations and system operations.

OWASP specifically recommends TLS for login and authenticated pages, secure password handling, login throttling, and re-authentication for sensitive actions. [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## 19.40 Authorization

Every protected backend command checks:

```text
Identity
+ active role
+ institutional scope
+ record relationship
+ action permission
+ policy version
+ state of the record
```

Example: a lecturer may see students enrolled in their assigned course, but not all university students. A Dean may view an academic decision package, but not counselling notes. A system administrator can manage infrastructure but cannot edit official results.

Use deny-by-default: if a permission is not explicitly granted, access is denied and audited.

## 19.41 Rate limiting and anti-abuse controls

Yes—rate limiting is required. It protects availability and reduces password guessing, spam, duplicate requests and accidental double-clicks.

Initial limits should be configuration, not hard-coded:

| Endpoint/action | Initial control |
|---|---|
| Login | 5 attempts per account/IP per 15 minutes |
| Password reset request | 3 per account/IP per hour |
| Public application submission | 5 per IP per hour, plus duplicate detection |
| Document upload | File-size/type limits and per-user daily quota |
| Search | 60 requests per minute per authenticated user |
| Normal API use | 120 requests per minute per authenticated user |
| High-impact commands | Lower limit plus idempotency key |
| Payment/Moodle callbacks | Signed callback validation, idempotency and queueing |

Important: rate limiting is not a substitute for authorization. It is a separate protection layer.

A valid user who submits the same official form twice must not create two records. For that, use an **idempotency key** and database uniqueness constraint.

## 19.42 Input, API and file security

All inputs are validated on the backend.

- Use typed request DTOs and allow-lists.
- Use Prisma parameterized access; never build raw SQL with user values.
- Validate IDs, dates, money, status transitions and role scopes.
- Reject unknown fields on sensitive commands.
- Return safe error messages; log technical detail internally.
- Add CSRF protection where cookie-authenticated state-changing requests require it.
- Set security headers: CSP, HSTS in production, `X-Content-Type-Options`, and clickjacking protection.

For documents:

- Allow only approved file types.
- Validate actual file signature, not just the filename extension.
- Limit file size and upload count.
- Rename files server-side; never execute or serve uploads as application code.
- Store documents outside the public web directory.
- Scan files before making them available.
- Use time-limited, authorized download access.
- Audit upload, view, download and deletion actions.

These controls align with [OWASP File Upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## 19.43 Resilience and redundancy

We will build for recoverability first, then add infrastructure redundancy where deployment allows it.

| Area | Minimum project control | Production-ready extension |
|---|---|---|
| Web/API | Stateless application; restart-safe | Two or more instances behind a load balancer |
| Database | Automated backup and restore test | Managed PostgreSQL with standby/failover |
| Documents | Durable object storage and backup | Replicated/versioned object storage |
| Background jobs | Persistent outbox + retry/dead-letter state | Separate worker replicas |
| External integrations | Timeout, retry, idempotency, reconciliation | Provider failover where available |
| Deployment | Roll back to last release tag | Blue/green or rolling deployment |
| Monitoring | Health endpoint and error logs | Alerts, uptime checks and dashboard |

For your final-year system, do **not** create multiple databases or duplicate servers locally just to claim redundancy. Instead, implement the correct design: stateless services, safe retries, durable records, backups, restore tests, and documented failover readiness.

## 19.44 Failure handling

Every external call—Moodle, payment simulation, email/SMS, document verification—must have:

- Timeout
- Retry classification
- Exponential backoff
- Maximum retry count
- Idempotency reference
- Dead-letter record after repeated failure
- Manual approved replay
- Reconciliation screen
- Audit timeline

A failed email must not undo an approved admission. A Moodle outage must not erase confirmed registration. A duplicate payment callback must not credit money twice.

## 19.45 Backup and restore rules

- Back up PostgreSQL on a defined schedule.
- Back up document storage separately.
- Keep backups encrypted and access-controlled.
- Test restoration at least once per completed phase and before presentation release.
- Record restore date, source backup, executor and reconciliation result.
- Recovery is not “we have a backup”; recovery is “we restored it and verified the data.”

## 19.46 Dependency and codebase-bloat controls

This directly answers the “issues that bloat the codebase” concern.

Do not add a package because an AI suggests it or because it looks popular. Every new dependency must answer:

1. What approved requirement does it solve?
2. Can Next.js, NestJS, TypeScript, CSS Modules, PostgreSQL, Prisma, or a small internal function already solve it?
3. Is it actively maintained and security-reviewed?
4. Who owns updating it?
5. Can it be removed later without rewriting the whole system?

Rules:

- Prefer platform/framework capability before third-party packages.
- No component-library pile-up.
- No duplicated validation, permission, date, money or status logic across modules.
- No “utils” dumping ground; shared code must have a named owner and reason.
- No generic `common`, `helpers`, or `misc` folders for unrelated code.
- No copy-pasted API types; shared contracts live in `packages/contracts`.
- No business logic inside Next.js page components.
- No direct database access from frontend code.
- No cross-module database writes.
- No feature is added without a requirement ID, tests and documentation.
- Unused code and dependencies are removed during each phase retrospective.
- AI-generated code must be reviewed for duplication, hidden complexity and unused abstractions.

The principle is:

> Start simple, but do not start messy.

## 19.47 Module-boundary rules

A module may contain only its own:

```text
controller → application service → domain rules → repository/data access
```

For example, the Admissions module can request a notification through a contract, but it cannot edit notification delivery tables directly. Finance can publish “financial clearance granted,” but Registration decides what that means for registration.

This avoids tightly coupled code that becomes hard to understand, test, and change.

## 19.48 Performance rules

Before optimizing, measure.

- Paginate all queues and large tables.
- Filter at the database/API level, never by loading the full student population into the browser.
- Select only required fields.
- Use database indexes for commonly searched IDs and foreign keys.
- Set upload and request size limits.
- Queue slow integration work instead of making users wait.
- Add caching only after a measured need; do not add Redis at the start.
- Define response-time and error-rate monitoring for critical journeys.

## 19.49 Security and resilience checks in CI

Each pull request must include, where relevant:

- Lint/type/build checks
- Dependency vulnerability scan
- Authorization allow/deny tests
- Input-validation tests
- Duplicate-submission/idempotency tests
- File-upload negative tests
- Migration test
- Critical E2E test
- No-secret scan
- Dependency/license review when adding a package

## 19.50 Incident handling

Create a simple incident record for serious failures:

```text
Incident ID:
What happened:
Affected workflow/data:
Severity:
Immediate containment:
Root cause:
Fix:
Recovery/reconciliation evidence:
Prevention action:
Release/PR reference:
```

This is both professional engineering practice and powerful presentation evidence.

## 19.51 Security definition of done

A high-impact feature is not complete until it has:

- Authentication and server-side authorization
- Scope/relationship checks
- Input validation
- Audit evidence
- Rate-limit/idempotency consideration
- Secure error handling
- Recovery behaviour
- Tests for allowed, denied and failed paths
- No real data or secrets
- Peer review

Please approve **Section 19, Part 4**. Next is Part 5: **team task packets, learning documentation, AI-agent boundaries, and the presentation/demo evidence pack**.

---

## Following user responses before the next design record

### User message 0273

Great now we need to take in account that ai losses context,meaning it tends to forget as codebase increases in size it stops following the patterns we've laid out for .how do we make sure it stays consistent through out the who project , two I use arch  Linux for development and my partner chitindu uses windows is there a difference or what
