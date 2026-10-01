# Institutional Scope Hierarchy & Approver Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move capability/scope registry from config to database, enforce approver authority over target scope, implement SoD pair registry.

**Architecture:** Add new Prisma entities for Capability, Scope (hierarchical), CapabilityScope junction, ApproverAuthority, and SoDPair. Update grants service to validate approver holds ApproverAuthority for target scope + capability, check SoD pairs before granting, and enforce effective dates on scopes. Seed initial data from current config.

**Tech Stack:** NestJS, Prisma, PostgreSQL, TypeScript, Vitest

**Spec:** GAP-006, GAP-012, GAP-015 (Row 2), GAP-003, GAP-004. See `development/docs/gaps/GAP-006-approver-authority.md`, `development/docs/gaps/GAP-012-sod-pairs-review.md`, `development/docs/gaps/GAP-015-applicant-production-and-prior-phase-gates.md`

## Global Constraints

- Follow existing patterns in codebase (NestJS, Prisma, transactional services)
- Do not add Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data, or real production credentials
- Enforce authorization server-side using role, scope, relationship, state, purpose, and time-bound authority
- Preserve auditable/immutable history for high-impact decisions
- Use idempotency, retry/reconciliation, and outbox patterns where external effects require them
- Keep module boundaries explicit; minimize dependencies and cross-module coupling
- Follow handbook authority order: later approved decisions, security/privacy/official-record rules, exact evidence, curated handbooks, then templates/examples

## Review Focus

1. **Approver authority validation** - Test that approver must hold ApproverAuthority for the exact target scope and capability; grant denied when authority missing or scope mismatch
2. **SoD enforcement at grant time** - Test that grant denied when creates SoD conflict with target's existing roles
3. **Scope hierarchy traversal** - Test that approver authority over parent scope extends to child scopes
4. **Effective date enforcement** - Test that scopes outside effectiveFrom/effectiveTo are not valid for grants
5. **Migration data integrity** - Test that seeded capabilities, scopes, and SoD pairs match config values and are queryable

---

### Task 1: Add Database Schema Entities

**Files:**
- Modify: `prisma/schema.prisma` (add new models after RoleAssignment)
- Create: `prisma/migrations/20260927000000_institutional_scope_hierarchy/migration.sql` (Prisma will generate)

**Interfaces:**
- Consumes: Existing RoleAssignment model (lines 80-109)
- Produces: Capability, Scope, CapabilityScope, ApproverAuthority, SoDPair models

- [ ] **Step 1: Add Capability model to schema.prisma**
  - Fields: id (uuid), name (unique), description?, category, isActive (default true), createdAt, updatedAt
  - Index on name

- [ ] **Step 2: Add Scope model with hierarchy**
  - Fields: id (uuid), name (unique), description?, parentScopeId (self-ref, nullable), capabilityId (FK to Capability), effectiveFrom, effectiveTo (nullable), createdAt, updatedAt
  - Index on parentScopeId, capabilityId, effective dates

- [ ] **Step 3: Add CapabilityScope junction model**
  - Fields: capabilityId, scopeId (composite PK), createdAt
  - Relations to Capability and Scope

- [ ] **Step 4: Add ApproverAuthority model**
  - Fields: id (uuid), approverRoleId (string, role name), targetScopeId (FK to Scope), capabilityId (FK to Capability), isActive (default true), createdAt, updatedAt
  - Unique on (approverRoleId, targetScopeId, capabilityId)
  - Index on approverRoleId, targetScopeId

- [ ] **Step 5: Add SoDPair model**
  - Fields: id (uuid), roleAId, roleBId (both role names), reason, isActive (default true), createdAt, updatedAt
  - Unique on (roleAId, roleBId) with roleAId < roleBId ordering
  - Index on roleAId, roleBId

- [ ] **Step 6: Update RoleAssignment to link to Scope**
  - Add optional scopeId field (FK to Scope)
  - Keep existing scopeType/scopeRef for backward compatibility
  - Add relation to Scope

- [ ] **Step 7: Generate and run migration**
  - Run `npx prisma migrate dev --name institutional_scope_hierarchy`
  - Verify migration applies cleanly

- [ ] **Step 8: Commit**
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Capability, Scope, ApproverAuthority, SoDPair entities"
```

---

### Task 2: Create Seed Data Migration

**Files:**
- Create: `prisma/seed/capabilities-scopes-sod.ts` (new seed module)
- Modify: `prisma/seed/seed.ts` (import and call new seed function)

**Interfaces:**
- Consumes: SECURITY_V1 config from `@sis/config`
- Produces: Seeded Capability, Scope, ApproverAuthority, SoDPair rows

- [ ] **Step 1: Create seed module for capabilities, scopes, approver authority, SoD pairs**
  - Extract capabilities from config (currently implicit in role assignments)
  - Create standard scopes: SYSTEM:GLOBAL, SCHOOL:*, DEPARTMENT:*, PROGRAMME:*, OFFERING:*
  - Map approver roles to scopes (e.g., DEAN → SCHOOL:*, HOD → DEPARTMENT:*)
  - Seed SoD pairs from config (currently empty array - add known institutional pairs)
  - Use upsert to be idempotent

- [ ] **Step 2: Update main seed.ts to call new seed function**
  - Import and invoke seedCapabilitiesScopesSod()

- [ ] **Step 3: Run seed and verify**
  - Run `npx prisma db seed`
  - Query database to verify data

- [ ] **Step 4: Commit**
```bash
git add prisma/seed/capabilities-scopes-sod.ts prisma/seed/seed.ts
git commit -m "feat: seed capabilities, scopes, approver authority, SoD pairs"
```

---

### Task 3: Update Grants Service - Approver Authority Validation

**Files:**
- Modify: `apps/api/src/identity-access/grants.service.ts`
- Modify: `apps/api/src/identity-access/policy.service.ts` (add new evaluation arm)

**Interfaces:**
- Consumes: ApproverAuthority model, Scope hierarchy, PolicyInput/PolicyDecision
- Produces: Enhanced grant() with authority validation

- [ ] **Step 1: Add helper method to check approver authority**
  - In GrantsService, add private `validateApproverAuthority(approverId, targetScopeType, targetScopeRef, capability?)`
  - Query ApproverAuthority where approverRoleId matches approver's active role
  - Check targetScope matches (direct or via hierarchy - parent scope authority extends to children)
  - Check capability matches (if provided)
  - Check effective dates (effectiveFrom <= now <= effectiveTo)
  - Return validation result

- [ ] **Step 2: Add scope hierarchy traversal helper**
  - In GrantsService, add private `getScopeHierarchy(scopeId)` - returns array of scope IDs from self to root
  - Use recursive CTE or iterative query

- [ ] **Step 3: Integrate authority check into grant() method**
  - After approver lookup (line 236-258), call validateApproverAuthority
  - Deny with 'approver-lacks-scope-authority' if validation fails
  - Pass target scope from DTO (scopeType + scopeRef mapped to Scope entity)

- [ ] **Step 4: Update policy service for SoD check enhancement**
  - Modify evaluatePolicy to accept targetAccountId's existing roles for SoD check
  - Check if granting new role would create SoD conflict with target's current roles
  - Use SoDPair model data (injected or fetched)

- [ ] **Step 5: Add SoD conflict check in grant()**
  - Before creating assignment, fetch target's current active roles
  - Check against SoDPair table for conflicts with requested role
  - Deny with 'sod-conflict-with-existing' if conflict found

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/identity-access/grants.service.ts apps/api/src/identity-access/policy.service.ts
git commit -m "feat: enforce approver scope authority and SoD pairs in grants"
```

---

### Task 4: Mark Config as Legacy, Add Migration Helper

**Files:**
- Modify: `packages/config/src/security.ts`
- Create: `packages/config/src/security-legacy.ts` (or add to existing)

**Interfaces:**
- Consumes: SECURITY_V1 config
- Produces: Legacy marker, migration helper functions

- [ ] **Step 1: Add deprecation notice to SECURITY_V1**
  - Add comment marking as legacy/demo only
  - Note that capabilities, scopes, SoD pairs now live in DB

- [ ] **Step 2: Create migration helper to sync config → DB**
  - Export `migrateSecurityConfigToDb(prisma)` function
  - Reads SECURITY_V1.policyVerbs, sodPairs
  - Creates/updates Capability, ApproverAuthority, SoDPair
  - Use for one-time migration or dev reset

- [ ] **Step 3: Commit**
```bash
git add packages/config/src/security.ts packages/config/src/security-legacy.ts
git commit -m "feat: mark security config as legacy, add migration helper"
```

---

### Task 5: Unit Tests - Scope Hierarchy & Authority Validation

**Files:**
- Create: `apps/api/src/identity-access/grants-authority.spec.ts`
- Create: `apps/api/src/identity-access/scope-hierarchy.spec.ts`

**Interfaces:**
- Consumes: GrantsService, PrismaService (mocked), test fixtures
- Produces: Test coverage for authority validation

- [ ] **Step 1: Write test for approver authority validation - success case**
  - Setup: approver has ApproverAuthority for target scope + capability
  - Grant should succeed

- [ ] **Step 2: Write test for approver authority validation - missing authority**
  - Setup: approver lacks ApproverAuthority for target scope
  - Grant should be denied with 'approver-lacks-scope-authority'

- [ ] **Step 3: Write test for scope hierarchy - parent authority extends to child**
  - Setup: approver has authority over SCHOOL:ENGINEERING, target scope is DEPARTMENT:CS (child)
  - Grant should succeed

- [ ] **Step 4: Write test for scope hierarchy - sibling scope denied**
  - Setup: approver has authority over SCHOOL:ENGINEERING, target scope is SCHOOL:MEDICINE
  - Grant should be denied

- [ ] **Step 5: Write test for effective dates - expired scope denied**
  - Setup: scope effectiveTo in past
  - Grant should be denied

- [ ] **Step 6: Write test for effective dates - future scope denied**
  - Setup: scope effectiveFrom in future
  - Grant should be denied

- [ ] **Step 7: Run tests and verify pass**

- [ ] **Step 8: Commit**
```bash
git add apps/api/src/identity-access/grants-authority.spec.ts apps/api/src/identity-access/scope-hierarchy.spec.ts
git commit -m "test: add approver authority and scope hierarchy tests"
```

---

### Task 6: Unit Tests - SoD Pair Enforcement

**Files:**
- Create: `apps/api/src/identity-access/grants-sod.spec.ts`

**Interfaces:**
- Consumes: GrantsService, SoDPair model, test fixtures
- Produces: Test coverage for SoD enforcement

- [ ] **Step 1: Write test for SoD conflict - direct pair**
  - Setup: SoDPair exists for (DEAN, FINOFFICER), target already has FINOFFICER role
  - Grant DEAN role should be denied with 'sod-conflict-with-existing'

- [ ] **Step 2: Write test for SoD conflict - reverse pair**
  - Setup: SoDPair exists for (DEAN, FINOFFICER), target already has DEAN role
  - Grant FINOFFICER role should be denied

- [ ] **Step 3: Write test for SoD no conflict - unrelated roles**
  - Setup: SoDPair exists for (DEAN, FINOFFICER), target has LEC role
  - Grant DEAN role should succeed

- [ ] **Step 4: Write test for SoD inactive pair - ignored**
  - Setup: SoDPair exists but isActive=false, target has conflicting role
  - Grant should succeed

- [ ] **Step 5: Write test for periodic SoD review query**
  - Setup: Multiple assignments with SoD conflicts
  - Query should return all accounts with conflicting role pairs

- [ ] **Step 6: Run tests and verify pass**

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/identity-access/grants-sod.spec.ts
git commit -m "test: add SoD pair enforcement tests"
```

---

### Task 7: Integration Tests - Full Grant Flow

**Files:**
- Create: `apps/api/src/identity-access/grants.integration.spec.ts`

**Interfaces:**
- Consumes: Full grants module, test database
- Produces: End-to-end grant flow tests

- [ ] **Step 1: Write integration test - complete grant flow with authority**
  - Setup: Full DB with seeded data
  - Grant role with valid approver authority
  - Verify assignment created, audit logged, outbox events created

- [ ] **Step 2: Write integration test - grant denied for missing authority**
  - Setup: Approver lacks authority for target scope
  - Verify denial, audit logged

- [ ] **Step 3: Write integration test - grant denied for SoD conflict**
  - Setup: Target has conflicting role
  - Verify denial, audit logged

- [ ] **Step 4: Run tests and verify pass**

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/identity-access/grants.integration.spec.ts
git commit -m "test: add grants integration tests"
```

---

### Task 8: Update Grants Controller (if needed)

**Files:**
- Modify: `apps/api/src/identity-access/grants.controller.ts` (if new endpoints needed)
- Modify: `apps/api/src/identity-access/dto.ts` (if new DTOs needed)

**Interfaces:**
- Consumes: Updated GrantsService
- Produces: Controller endpoints (likely no changes needed)

- [ ] **Step 1: Review if new endpoints needed for scope/authority management**
  - Likely not needed for this task (admin UI later)
  - Verify existing POST /auth/grants works with new validation

- [ ] **Step 2: Run full test suite**
  - `npm test` in apps/api
  - Verify all tests pass

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/identity-access/grants.controller.ts apps/api/src/identity-access/dto.ts
git commit -m "feat: verify grants controller works with new validation"
```

---

### Task 9: Final Verification

**Files:** All modified files

- [ ] **Step 1: Run full test suite**
  - `npm test` in apps/api
  - All tests pass

- [ ] **Step 2: Run linting**
  - `npm run lint` in apps/api and packages/config
  - No errors

- [ ] **Step 3: Run type checking**
  - `npm run typecheck` or `tsc --noEmit`
  - No errors

- [ ] **Step 4: Verify migration applies cleanly on fresh DB**
  - Drop test DB, run migrations, run seed
  - Verify all entities queryable

- [ ] **Step 5: Commit final changes**
```bash
git add -A
git commit -m "feat: complete institutional scope hierarchy & approver authority (GAP-006, GAP-012, GAP-015)"
```