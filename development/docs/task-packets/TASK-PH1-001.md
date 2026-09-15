# TASK-PH1-001: Identity core models + fictional seed + demo reset

## Authority

- Phase/release: v0.2.0 Phase 1 (slice 1 of 6)
- Requirement IDs: REQ-IAM-001, REQ-IAM-003, REQ-OPS-004 (table only; enforcement in slices 2–6), REQ-NFR-004, REQ-NFR-007
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope `prisma/`, `scripts/`, root manifest seed wiring only
- Action/screen/component IDs: IAM-ROL-01 (12.9, data shape only — no grant API yet), ACT-IAM-001 (data shape only)
- Policy/configuration version: demo-seed v0.1 (fictional persons/roles/scopes; NOT institutional policy)
- Acceptance-test IDs: migration-apply, seed-idempotency, db-constraint-duplicate, no-secret-scan
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/03-phase-1-identity-and-scoped-access.md (slices 1–2)
  - unza-sis-moodle-design-handbook-v3.0.0/03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md (§12.8 person/account/role, §12.9 grant shape)
  - unza-sis-moodle-design-handbook-v3.0.0/05-REQUIREMENTS-PERMISSIONS-DATA/02-action-contracts.md (ACT-IAM-001)
  - unza-sis-moodle-design-handbook-v3.0.0/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md (identity-access ownership)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (identity/session/role workspace — demo auth choices recorded here: local credentials + server sessions)
- Open design-gap IDs: none blocking this slice (MFA provider + production IdP stay open production decisions)

## User outcome

A fresh database migrates to the identity schema and seeds 4 fictional persons
(Mutinta LEC+DEAN+expired TUT, Chanda STU, Bwalya APP, Mweene SYSADMIN) plus a
toy scope tree, reproducibly, via one command (`npm run demo:reset`).

## Architecture boundary

- Owning module: identity-access (tables only; no API yet)
- Permitted dependencies: `argon2@0.45.1` (roadmap-named hashing) + `@prisma/client@7.10.0` + `@prisma/adapter-pg@7.10.0` + `pg@8.23.0` at root for seed (Prisma 7 connects only via driver adapter — verified); Node 24 runs seed TS directly (type stripping, zero runner deps); root `postinstall: prisma generate` + `demo:reset` generates before seeding
- API/command/event contracts: none
- Data entities/migration impact: NEW tables Person/Account/RoleAssignment/Session/AuditEvent (+ migration committed); scope refs are plain strings until curriculum tables land
- External adapters: none

## Required controls

- Authorization/relationship: n/a (no routes; enforced slices 4–5)
- Privacy/classification: fictional fixtures only; demo passwords hashed with argon2id, never stored/printed plain
- Validation/state transitions: DB uniqueness (username, session token hash); EXPIRED derived from endsAt, REVOKED explicit
- Audit: AuditEvent table created append-only (writes start slice 5)
- Idempotency/rate limiting: seed upserts by stable natural keys — safe to re-run
- Failure/recovery: `migrate deploy` before seed; `demo:reset` recreates volume from scratch
- Accessibility/UI states: n/a

## Model summary (src: §12.8–12.9, REQ-IAM-001/003)

- Person: id (uuid, authoritative — never the username), displayName, timestamps.
- Account: id, personId FK, username UNIQUE (login handle only), passwordHash (argon2id), status (ACTIVE/LOCKED), timestamps.
- RoleAssignment: id, accountId FK, role (APP/STU/LEC/TUT/DEAN/SYSADMIN + future codes), scopeType/scopeRef strings, startsAt/endsAt (nullable), grantedByAccountId, grantedAt, reason, revokedAt/revokeReason (nullable). Username is never the person identifier.
- Session: id, tokenHash UNIQUE (sha256 of opaque token), accountId FK, expiresAt, revokedAt (nullable), createdIp, userAgent, lastSeenAt. (Consumed slice 2.)
- AuditEvent: id, occurredAt, actorAccountId (nullable for system), activeRole, scope, action, targetRef, outcome (ALLOW/DENY), reason, policyVersion, correlationId, metadata JSON. No UPDATE/DELETE path by convention + review. (Writes start slice 5.)

## Seed set (fictional, demo-seed v0.1)

Mutinta L. (LEC@OFFERING:CSE101-2026S1 + DEAN@SCHOOL:SNS active, TUT expired 2025), Chanda K. (STU own record), Bwalya M. (APP), Mweene T. (SYSADMIN identity-admin). Demo passwords: fictional, per-account `Seed-2026-<name>` pattern, argon2id-hashed at seed time, documented in NOTE for Chitindu's demo only.

## Out of scope

Session issue/validation, sign-in/out/recovery endpoints + UI (slice 2), workspace switch + grant API (slice 3), permission guard (slice 4), audit writes/expiry job (slice 5), break-glass (slice 6), RecoveryToken table (slice 2 migration), real users/data/credentials.

## Definition of done

- [x] Entry gate all YES (this packet)
- [x] Migration applies to empty DB; committed with code (19.33) — proven via `down -v` + reset
- [x] `npm run demo:reset` rebuilds DB + reseeds from scratch (4 persons, 4 accounts, 6 roles)
- [x] Seed re-run is idempotent (counts stable 4/4/6)
- [x] Duplicate username rejected by DB constraint (P2002 proof); argon2 verify true; expired TUT visible
- [x] No secret/real data in source, fixtures, logs
- [ ] Reviewer can explain Person-vs-Account-vs-Role and the seed table
