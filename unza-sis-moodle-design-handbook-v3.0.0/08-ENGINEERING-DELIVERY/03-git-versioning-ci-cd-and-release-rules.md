# Section 19, Part 3 — Git, versioning, CI/CD and release rules

> Approved Section 19 engineering foundation.


## 19.26 Team Git workflow

Use one shared GitHub repository with a protected `main` branch.

```text
main
  ├── feat/APP-101-create-application-draft
  ├── feat/ADM-201-review-documents
  ├── fix/REG-301-prevent-duplicate-registration
  ├── docs/ADR-006-authentication-approach
  └── chore/CI-001-add-api-test-check
```

Rules:

1. `main` must always be usable and demonstrable.
2. Never code directly on `main`.
3. Every task has a GitHub Issue and approved task packet.
4. Each issue gets one short-lived branch.
5. One developer opens the pull request; the other reviews it.
6. Merge only after automated checks pass.
7. Delete the feature branch after merge.

Use branch names linked to your requirement/action IDs. This makes every feature traceable.

## 19.27 Commit rules

Use small, meaningful commits following this format:

```text
type(scope): short description
```

Examples:

```text
feat(admissions): save application draft
feat(web): add document upload form
fix(registration): reject duplicate submission
test(finance): cover reversed payment callback
docs(adr): record modular monolith decision
chore(ci): add Playwright test workflow
```

Allowed types:

| Type | Meaning |
|---|---|
| `feat` | New approved capability |
| `fix` | Defect correction |
| `test` | Test-only change |
| `docs` | Documentation change |
| `refactor` | Internal restructuring without changed behaviour |
| `chore` | Tooling, dependencies or maintenance |
| `security` | Security hardening or security fix |

A commit should represent one understandable change—not “updated files.”

## 19.28 Pull-request rule

Every pull request must contain:

```text
Task/issue:
Requirement/action IDs:
What changed:
What did not change:
Roles/scopes affected:
Database migration:
Security/privacy impact:
Tests run:
Screenshots or demo evidence:
Known limitations:
Rollback notes:
```

The reviewer checks:

- Does it match the approved workflow?
- Are permissions enforced by the backend, not only hidden in the UI?
- Are error and recovery states included?
- Is there an audit record for important action?
- Is sensitive data absent from logs, screenshots and fixtures?
- Does the change introduce undocumented screens or scope creep?
- Do tests prove both allowed and denied behaviour?

For high-impact features—results, admissions decisions, finance, support records, awards, regulatory submission, privileged access—both developers must explicitly approve before merging.

## 19.29 Versioning model

Use versioning at every important layer.

| Layer | Rule |
|---|---|
| Application release | Semantic version: `vMAJOR.MINOR.PATCH` |
| Feature branch | Requirement-linked branch name |
| Commit | Conventional commit format |
| Database | Prisma migration committed with code |
| API | Versioned OpenAPI contract; avoid breaking changes |
| Events | Event name plus schema version |
| Policies/configuration | Version, owner, approval and effective dates |
| Documentation | Requirement IDs, ADR IDs and task references |
| Deployment | Build number, Git commit SHA and release tag |

Semantic version meaning:

- `v1.0.0` — first complete demonstrable release.
- `v1.1.0` — new backward-compatible feature, such as applicant document review.
- `v1.1.1` — bug/security fix.
- `v2.0.0` — breaking change, such as a deliberately changed API contract.

For the project, create release tags at the end of each completed phase:

```text
v0.1.0-foundation
v0.2.0-applicant-slice
v0.3.0-admissions-slice
v0.4.0-registration-slice
v1.0.0-presentation-release
```

## 19.30 Environments

Use three environments with fictional data only:

| Environment | Purpose | Who uses it |
|---|---|---|
| Local | Development on each laptop | Charles and Chitindu |
| Staging/demo | Shared integration and presentation testing | Both developers, supervisor demo |
| Production | Optional final deployment | Only after final approval |

`main` deploys automatically to staging/demo only after CI passes. Production deployment is manual and requires both developers’ approval.

No real student, payment, NRC/passport, counselling, or production credentials may be used in any environment.

## 19.31 CI pipeline

Each pull request automatically runs:

```text
Install dependencies
→ formatting check
→ linting
→ TypeScript type check
→ unit tests
→ API/integration tests
→ build web and API
→ security/dependency scan
→ accessibility checks
→ critical Playwright E2E tests
→ report status to pull request
```

A merge is blocked if any required check fails.

Initially, keep the pipeline simple and reliable. Add more advanced deployment, coverage reporting, and container scanning later when the basic workflow is stable.

## 19.32 CD and release workflow

```text
Feature branch
→ Pull request and checks
→ Peer review
→ Merge to main
→ Automatic staging/demo deployment
→ Team smoke test
→ Create version tag and release notes
→ Optional manual production deployment
```

For each release, write short notes:

```text
Release: v0.2.0-applicant-slice
Included:
- Applicant account
- Draft application
- Document upload
- Submission receipt

Security:
- Authenticated access
- File validation
- Audit trail for submission

Known limits:
- Admissions staff review is not included yet.
```

These become excellent presentation evidence.

## 19.33 Database migration rules

Database structure changes must be controlled.

- Make schema changes through Prisma migrations.
- Commit the migration with the related feature.
- Never manually alter a shared/staging database.
- Test applying migrations to an empty database.
- Provide safe rollback notes in the pull request.
- Prefer additive changes first: add a field/table before deleting or renaming old structures.
- Seed only fictional data.

Example:

```text
prisma/migrations/
  20260826_add_application_documents/
```

## 19.34 Secrets and security rules

Never commit:

- `.env` files containing secrets
- Passwords
- API keys
- Private certificates
- Database URLs with credentials
- Real student records
- Payment-provider credentials
- Screenshots containing confidential data

Commit `.env.example` instead:

```text
DATABASE_URL=
JWT_SECRET=
FILE_STORAGE_ENDPOINT=
FILE_STORAGE_ACCESS_KEY=
FILE_STORAGE_SECRET_KEY=
```

Actual values live only in local environment settings or protected deployment secrets.

If a secret is accidentally committed:

1. Treat it as exposed.
2. Revoke/rotate it immediately.
3. Remove it from active use.
4. Record the incident.
5. Do not assume deleting the file makes it safe.

## 19.35 Rollback and recovery

A failed staging deployment must be recoverable by redeploying the last known-good release tag.

For database changes:

- Back up before high-impact migration.
- Prefer forward fixes over destructive rollback.
- Do not delete records merely to make a deployment pass.
- Verify post-deployment data consistency with a smoke test.

Minimum release smoke tests:

- User can sign in.
- Role/scope access works.
- Applicant can save a draft.
- An unauthorized role is denied.
- Audit events are recorded.
- API documentation opens.
- Database migration version is correct.

## 19.36 Two-developer working rhythm

For every weekly cycle:

| Day/activity | Charles | Chitindu |
|---|---|---|
| Planning | Co-define task packet | Co-define task packet |
| Feature work | Lead one vertical slice | Review requirements/test plan |
| Pull request | Opens PR | Reviews and tests |
| Next feature | Reviewer role | Lead role |
| Demo/review | Explains implementation | Explains design, tests and security |

Swap roles every slice. Both of you must be able to explain every released feature from requirement → UI → API → database → test → deployment.

## 19.37 Definition of merge-ready

A task is merge-ready only when:

- It links to approved requirements and action IDs.
- The code is understandable and documented.
- The UI follows the design constitution.
- Backend authorization is enforced.
- Tests cover the intended path and one failure/denial path.
- Database migration is included where needed.
- No secrets or real data appear.
- CI passes.
- The other developer reviews it.
- The change can be demonstrated in staging.
