# Git, CI/CD and Versioning

## Branch workflow

- Protect `main`; keep it usable and demonstrable.
- Never implement directly on `main`.
- Use one issue/task packet per short-lived branch.
- Name branches `feat/APP-101-application-draft`, `fix/FIN-042-duplicate-callback` or `docs/ADR-008-event-versioning`.
- One developer opens the PR; the other reviews.
- Delete branches after merge.

## Commits

Use `type(scope): description`, for example:

```text
feat(admissions): save application draft
fix(registration): reject duplicate confirmation
test(finance): cover reversed callback
docs(adr): record modular monolith decision
security(auth): rotate session after recovery
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `security`.

## Pull request evidence

Every PR states task/requirement/action IDs, change and exclusions, roles/scopes, database migration, security/privacy impact, tests, visual/demo evidence, limitations and rollback notes. High-impact domains require explicit peer review and passing checks.

## CI quality gate

```text
install
→ format/lint
→ TypeScript check
→ unit tests
→ API/integration tests
→ build
→ dependency/secret/security checks
→ accessibility checks
→ critical Playwright journeys
```

Required checks block merging.

## Environments

| Environment | Purpose |
|---|---|
| Local | Individual development using fictional data |
| Staging/demo | Shared integration and presentation testing |
| Production | Optional later deployment after formal approval |

`main` may deploy automatically to staging after CI. Production deployment is manual. No real data or credentials are used in local/demo environments.

## Versioning

- Application releases use Semantic Versioning.
- Database changes use committed, append-only Prisma migrations.
- API/event contracts carry versions and prefer additive change.
- Policy/configuration records carry version and effective dates.
- Architecture decisions use ADRs.
- Documentation changes preserve superseded decisions.

Illustrative release tags:

```text
v0.1.0-foundation
v0.3.0-applicant-slice
v0.7.0-moodle-recovery
v1.0.0-presentation
```

## Rollback

A failed deployment returns to the last known-good tag. High-impact migrations require backup, restore/forward-fix plan and post-deployment reconciliation. Never delete official data to force a deployment to pass.
