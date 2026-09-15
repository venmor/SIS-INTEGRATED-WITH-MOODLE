# TASK-PH0-005: CI checks + templates + branch-protection guidance

## Authority

- Phase/release: v0.1.0 Phase 0 (slice 5, final)
- Requirement IDs: REQ-NFR-006, REQ-NFR-008
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope `.github/` + `docs/operations/` only
- Action/screen/component IDs: none — delivery machinery, no product behaviour
- Policy/configuration version: none
- Acceptance-test IDs: local CI replay (every workflow step run in order, green)
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/03-git-versioning-ci-cd-and-release-rules.md (19.26–19.29, 19.31, 19.34, 19.37)
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/08-definition-of-ready-and-done.md
  - unza-sis-moodle-design-handbook-v3.0.0/14-TEMPLATES/PULL-REQUEST.md
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (Repository/Git/learning/CI foundation)
- Open design-gap IDs: none blocking Phase 0

## User outcome

Every future PR is checked the same way locally and on GitHub (once the
workflow is activated at the repo root), and reviewers follow one template.

## Architecture boundary

- Owning module: none (delivery)
- Permitted dependencies: none new (actions/checkout@v4, actions/setup-node@v4, `rg` scans)
- API/command/event contracts: none
- Data entities/migration impact: none
- External adapters: GitHub Actions (activation pending — workflow lives at `development/.github/` per repo layout; GitHub requires repo-root `.github`, so activation = copy to root on connection)

## Required controls

- Authorization/relationship: n/a
- Privacy/classification: secret scan in pipeline (19.34); `.env` never committed
- Validation/state transitions: n/a
- Audit: local replay log below
- Idempotency/rate limiting: n/a
- Failure/recovery: n/a
- Accessibility/UI states: a11y/E2E jobs explicitly deferred to first journey slice per 19.31 ("keep simple initially")

## Corrections recorded (Lead-approved, not hidden)

- C1 commits: history uses `Phase 0:` style vs 19.27 `type(scope):`. Kept; all commits from this slice forward use conventional format.
- C2 direct-to-main: 5 direct commits vs 19.26. Kept until `v0.1.0-foundation` tag; PR flow + protection start Phase 1. First Phase-1 task uses a `feat|chore/…` branch + this PR template.

## Out of scope

Playwright E2E, staging deploy, seed/reset (deferred to Phase 1), production, clicking protection on in GitHub (owner applies via checklist), enforcement before v0.1.0.

## Definition of done

- [x] `ci.yml` follows 19.31 order, Node from `.nvmrc`, `npm ci` (lockfile committed)
- [x] PR template carries all 19.28 fields + reviewer checks; issue template enforces entry gate
- [x] Branch-protection checklist written for owner to apply at v0.1.0
- [x] Local CI replay fully green (log in completion report)
- [ ] Workflow activated at repo root on GitHub connection (pending)
- [ ] Protection applied + trial PR merged (pending, Phase 1)
- [ ] Reviewer can explain the change (pending walkthrough)
