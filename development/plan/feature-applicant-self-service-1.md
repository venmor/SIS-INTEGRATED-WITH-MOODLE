---
goal: Review foundations and implement Phase 2 slices 2 through 5
version: 1
date_created: 2026-09-19
last_updated: 2026-09-19
owner: Charles Hangoma and Chitindu Milimbo
status: Implemented for review
tags: [feature, review, admissions, learning]
---
# Introduction

Status: Implemented for review; human learning/acceptance gates remain pending.

The user authorized reviewing prior slices, fixing demonstrated defects, clarifying handbook authority, and implementing the applicant journey through formal submission. Work was prepared in `review/phase-2-slices-2-5`. On 2026-09-20 the user additionally authorized commits and integration into local `main`, with no pull request and the push left to the user.

## 1. Requirements & Constraints

- **REQ-001**: Map Phases 0, 1 and Phase 2 slice 1 to code and evidence; correct defects and false completion claims.
- **REQ-002**: Implement applicant draft, personal/contact/qualification sections, quarantine/replacement, and immutable submission receipt from Blueprint 1 Parts 4–8.
- **SEC-001**: Enforce active own-applicant scope, server-time deadlines, optimistic concurrency, persistent idempotency, safe uploads, and atomic submission/audit/outbox.
- **CON-001**: Keep existing architecture and database migrations; use isolated fictional test data. Do not merge or claim human review.
- **CON-002**: Evidence is controlling project material; authorized rename is `15-APPROVED-DESIGN-EVIDENCE`. Preserve historical payloads.
- **GUD-001**: Explain each slice with UI → API → database → audit examples and a presentation rehearsal.
- **PAT-001**: Configuration is explicitly fictional/versioned; unknown policy fails closed. No invented institutional authority.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Establish source authority and correct prior implementation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Read governance/roadmaps/linked blueprints; document review in docs/learning/HANDBOOK-REVIEW.md; rename evidence directory and validate all links/manifests. | Yes — review evidence recorded | 2026-09-19 |
| TASK-002 | Review existing slices; repair CI discovery, scan exit behavior, live account/workspace checks and other proven defects; add regression tests and PRIOR-PHASE-REVIEW.md. | Yes — review evidence recorded | 2026-09-19 |

### Implementation Phase 2

- **GOAL-002**: Deliver the connected applicant journey after TASK-001 establishes authority.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Add applications contracts/config, additive Prisma models/migration, AdmissionsModule, owned draft/section commands, upload scanner adapter and transaction-safe submit/read receipt. | Yes — review evidence recorded | 2026-09-19 |
| TASK-004 | Add /applicant pages and same-origin proxy; integrate discovery/sign-in; accessible forms, save/conflict recovery, upload and declaration/receipt. Depends on TASK-003 contracts. | Yes — review evidence recorded | 2026-09-19 |
| TASK-005 | Run unit/API/browser/production-build and migration/backup/link checks; write reproducible evidence, learning notes and presentation script. Depends on TASK-002 through TASK-004. | Yes — review evidence recorded | 2026-09-19 |

## 3. Alternatives

- **ALT-001**: A new app or parallel loan/admissions engine is rejected; extend the existing modular monolith.
- **ALT-002**: Accepting any upload after signature checks is rejected; real ClamAV must pass or file remains quarantined. Demo allows only bundled exact fixture bytes, clearly labelled.

## 4. Dependencies

- **DEP-001**: Locked npm dependencies, PostgreSQL 18, existing identity/catalogue modules, and a browser runner.
- **DEP-002**: ClamAV engine plus signatures for arbitrary uploads; unavailable scanner is a tested fail-closed state.

## 5. Files

- **FILE-001**: apps/api/src/admissions/, prisma/schema.prisma and new migration, packages/contracts/src/applications.ts, packages/config/src/applications.ts.
- **FILE-002**: apps/web/app/applicant/, apps/web/app/api/applications/, API and browser tests.
- **FILE-003**: Handbook navigation/governance and development learning/task/demo records; root .github/workflows/.

## 6. Testing

- **TEST-001**: Prior regressions, active-account/role/date checks, cross-applicant denial, CSRF, malformed bodies.
- **TEST-002**: Save/resume/partial validation/version conflicts, duplicate start and same-key mismatch/replay.
- **TEST-003**: Unsupported/oversized/encrypted/malicious upload, scanner outage, denied preview and preserved replacement history.
- **TEST-004**: Live readiness, stale declarations/deadline, concurrent submits, rollback, exactly one snapshot/receipt/outbox, post-submit edit denial.
- **TEST-005**: Connected browser journey, keyboard/mobile, lost-response recovery; builds and documented manual screen-reader limitations.

## 7. Risks & Assumptions

- **RISK-001**: Production institution policy/providers and human signoffs are not supplied; record them as pending, never infer approval.
- **ASSUMPTION-001**: User implementation authorization permits bounded fictional demo fixtures consistent with existing demo practice; these confer no UNZA policy or real contact verification.

## 8. Related Specifications / Further Reading

[Source index](../DESIGN-INDEX.md), [Phase 2 roadmap](../../unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/04-phase-2-applicant-self-service.md), task packets TASK-PH2-002 through TASK-PH2-005.

## Completion boundary

All five implementation tasks are complete for this bounded fictional review; [VERIFICATION.md](../docs/learning/VERIFICATION.md) records current evidence and [GAP-015](../docs/gaps/GAP-015-applicant-production-and-prior-phase-gates.md) records remaining full-phase/production gates. Local Git integration is authorized; human walkthrough and full-phase acceptance remain pending. Existing draft readiness is recalculated; notification delivery, production storage/PDF structural validation and real identity/MFA remain separate. The Superpowers reviewer findings were reproduced and addressed; final verification followed.
