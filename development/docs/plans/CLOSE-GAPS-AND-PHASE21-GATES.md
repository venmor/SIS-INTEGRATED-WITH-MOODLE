# Implementation Plan: Close Gaps & Phase 2.1 Repair Gates

**Created**: 2026-09-27
**Based on**: Handbook-to-Implementation Alignment Findings, GAP-015, PRIOR-PHASE-REVIEW.md, VERIFICATION.md
**Goal**: Unblock production applicant workflow by closing GAP-015 and completing Gates S, T, U, V

---

## Priority 1: CRITICAL — Production Blockers (GAP-015 + Gates S-V)

### Task 1.1: Define Applicant Production Configuration (Gate S / GAP-015 Row 3)
**Status**: 🔴 Not Started
**Owner**: Backend Lead
**Dependencies**: Business/data owner approval of versioned rules

**Scope**:
- Replace `APPLICATION_DEMO_V1` in `@sis/config/applications.ts` with production config
- Define: `maxActivePerIntake`, `feeRequired`, `declarations`, `routes`, `qualifications`, `reviewCriteria`, `onboardingTasks`, `offerAcceptanceDeclarations`
- Configure retention/deletion/legal-hold procedures for applications
- Add migration for production config version

**Acceptance Criteria**:
- [ ] Production config file created with real business rules
- [ ] Demo config explicitly marked and separated
- [ ] Fee integration points wired (even if payment gateway is simulator)
- [ ] Declaration versions match legal requirements
- [ ] Migration applied and seeded in test DB

---

### Task 1.2: Implement Real Contact Verification & MFA/Step-up (GAP-015 Row 1)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Dependencies**: Provider decisions (email/SMS), approval

**Scope**:
- Self-registration flow with verified contact delivery
- MFA enrollment for staff (TOTP + backup codes)
- Step-up authentication for high-risk actions
- Accessible recovery alternatives (not just email)
- `RecoveryToken` enhancements for multi-factor recovery

**Acceptance Criteria**:
- [ ] Applicant self-registration sends verification code
- [ ] Contact verified before application submission allowed
- [ ] Staff MFA enrollment flow works
- [ ] Step-up challenge required for sensitive actions
- [ ] Recovery works without single point of failure
- [ ] Tests cover all flows

---

### Task 1.3: Institutional Scope Hierarchy & Approver Proof (GAP-015 Row 2 + GAP-006)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Dependencies**: HR/organizational data, approval

**Scope**:
- Capability registry with scope hierarchy (`@sis/config/security.ts` → DB)
- Approver authority over target scope (not just existence + non-self)
- Training/appointment proof for role assignments
- Independent approver verification
- SoD pair registry (GAP-012)

**Acceptance Criteria**:
- [ ] Capability-scope registry in DB (not just config)
- [ ] Grant screen validates approver holds authority over target scope
- [ ] Role assignment requires training/appointment evidence
- [ ] SoD pairs defined and enforced at grant time
- [ ] Tests for all validation rules

---

### Task 1.4: Document Safety — Antivirus + Structural PDF Validation (GAP-015 Row 4)
**Status**: 🔴 Not Started
**Owner**: Backend Lead
**Dependencies**: ClamAV deployment, PDF sanitization library decision

**Scope**:
- Deploy updated ClamAV in Docker Compose
- Implement approved PDF structural/sanitization adapter (pdf-lib or similar)
- Adversarial test fixtures (embedded JS, hidden content, polyglots)
- Operational monitoring for scan failures

**Acceptance Criteria**:
- [ ] ClamAV running in test/prod Compose
- [ ] PDF structural validation rejects malicious PDFs
- [ ] Quarantine → scan → validate → release pipeline works
- [ ] Adversarial fixtures all caught
- [ ] Scan failures alerted and monitored

---

### Task 1.5: Production File Storage (GAP-015 Row 5)
**Status**: 🔴 Not Started
**Owner**: Infrastructure Lead
**Dependencies**: Object storage decision (S3/MinIO/Azure Blob)

**Scope**:
- Encrypted object storage (MinIO for local, S3 for prod)
- Retention policies per document class
- Upload abuse/capacity limits
- Content lifecycle management
- Load tests for concurrent uploads

**Acceptance Criteria**:
- [ ] Documents stored in object storage (not PostgreSQL bytes)
- [ ] Authorized streaming responses (no public URLs)
- [ ] Retention enforced by lifecycle rules
- [ ] Upload limits prevent abuse
- [ ] Load test passes 100 concurrent uploads

---

### Task 1.6: Delivery & Later Workflows (GAP-015 Row 6 + GAP-008/009)
**Status**: 🟡 Partially Done (Outbox exists)
**Owner**: Integration Lead
**Dependencies**: Notification provider decisions

**Scope**:
- Outbox delivery/reconciliation worker (cron job)
- ApplicationSubmitted event delivery (email/SMS)
- Status/clarification notifications
- Staff assessment workflow notifications
- Student conversion notifications
- Operations queue for failed deliveries

**Acceptance Criteria**:
- [ ] Delivery worker processes outbox events
- [ ] At-least-once delivery with idempotency
- [ ] Failed deliveries go to operations queue (GAP-009)
- [ ] Reconciliation detects undelivered events
- [ ] Notification templates for all applicant events

---

### Task 1.7: Human/Cross-Platform/Accessibility Proof (GAP-015 Row 7)
**Status**: 🟡 Partially Done (Automated tests exist)
**Owner**: Frontend Lead + QA
**Dependencies**: Charles/Chitindu availability

**Scope**:
- Screen-reader testing (NVDA/JAWS/VoiceOver)
- Low-bandwidth simulation (3G throttle)
- Arch/WSL reproduction
- Keyboard-only navigation
- Mobile responsive (390px viewport)
- Branch protection + CI review

**Acceptance Criteria**:
- [ ] Charles/Chitindu replay on Arch/WSL
- [ ] Screen-reader test report
- [ ] Low-bandwidth test report
- [ ] Branch protection enabled on main
- [ ] CI runs on GitHub Actions (not just local)

---

### Task 1.8: Complete Phase 2.1 Integration Test Suite (Gate T)
**Status**: 🟡 Partially Done (139 API e2e pass)
**Owner**: QA Lead
**Dependencies**: Fresh DB isolation strategy

**Scope**:
- Run full test suite on fresh DBs
- Fix any flaky tests
- Ensure parallel test isolation
- Document test execution procedure

**Acceptance Criteria**:
- [ ] `npm test` passes (all suites)
- [ ] `npm run test:browser` passes (all specs)
- [ ] `npm run backup:test` passes
- [ ] No order-dependent test failures
- [ ] Test execution documented in VERIFICATION.md

---

### Task 1.9: OWASP ASVS Level 3 for Sensitive Domains (Gate U)
**Status**: 🟡 Partially Done (Level 2 baseline)
**Owner**: Security Lead
**Dependencies**: Security review

**Scope**:
- Auth: MFA, session management, password policy, account lockout
- Results: Mark calculation integrity, approval audit trail
- Finance: Payment integrity, step-up auth (GAP-020), encryption
- Counselling: Confidentiality separation, access logging
- Credentials: Rotation, storage, breach detection

**Acceptance Criteria**:
- [ ] ASVS Level 3 checklist completed for 4 domains
- [ ] Penetration test scope defined
- [ ] Security headers verified (CSP, HSTS, etc.)
- [ ] Dependency scan clean
- [ ] Secret scanning in CI

---

### Task 1.10: Breach Notification Automation (Gate V)
**Status**: 🟡 Partially Done (Config exists)
**Owner**: Security Lead
**Dependencies**: Incident response process approval

**Scope**:
- 24-hour DPA breach notification workflow
- Immediate Cyber Security Act notification
- Automated detection → alert → escalation
- Notification templates
- Integration with security monitoring

**Acceptance Criteria**:
- [ ] Breach detection rules configured
- [ ] 24hr/immediate notification workflows automated
- [ ] Templates approved by legal
- [ ] Integration with `SecurityEvent` correlation
- [ ] Test breach scenario runs end-to-end

---

## Priority 2: HIGH — Compliance & Security (GAP-006, 011, 012, 020)

### Task 2.1: Approver Authority Over Target Scope (GAP-006)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Part of**: Task 1.3

**Scope**:
- Extend grant validation to check approver's capability over target scope
- Add `scopeAuthority` check in `GrantsService`
- Unit tests for allowed/denied scenarios

**Acceptance Criteria**:
- [ ] Approver must hold capability for target scope
- [ ] Non-self check already exists
- [ ] Tests cover hierarchy scenarios

---

### Task 2.2: Suspicious Recovery Pause + Security Review (GAP-011)
**Status**: 🔴 Not Started
**Owner**: Security Lead
**Dependencies**: Telemetry/provider decisions

**Scope**:
- Define suspicion signals (failed attempts, geo anomaly, device change)
- Implement pause mechanics in recovery flow
- Security review queue for Security Administrator
- Integration with `SecurityEvent` model

**Acceptance Criteria**:
- [ ] Suspicion signals detected during recovery
- [ ] Recovery paused and routed to security review
- [ ] Security Administrator can approve/deny
- [ ] Audit trail for all decisions

---

### Task 2.3: SoD Pair Registry + Review Workflow (GAP-012)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Part of**: Task 1.3

**Scope**:
- Define mutually-exclusive role pairs in DB (`SoDPair` entity)
- Enforce at grant time (already partially in `GrantsService`)
- Review workflow/queue for IAM Administrator
- Periodic SoD review automation

**Acceptance Criteria**:
- [ ] SoD pairs stored in DB (not hardcoded)
- [ ] Grant denied if creates SoD conflict
- [ ] Review queue shows all active SoD situations
- [ ] Periodic review scheduled

---

### Task 2.4: Finance Step-Up Authentication (GAP-020)
**Status**: 🔴 Not Started
**Owner**: Identity + Finance Leads
**Part of**: Task 1.2 + Gate U

**Scope**:
- Implement step-up flow in `IdentityAccessModule`
- Wire into finance decide endpoints (adjustment, waiver, refund, arrangement)
- MFA ceremony for finance roles
- Tests for step-up enforcement

**Acceptance Criteria**:
- [ ] Step-up challenge triggered for high-impact finance actions
- [ ] MFA verified before approval commit
- [ ] Maker/checker + step-up both enforced
- [ ] Demo approvals still work (marked fictional)

---

## Priority 3: MEDIUM — Operational Completeness (GAP-001, 002, 004, 005, 008, 009, 010, 013, 014, 018)

### Task 3.1: Delegation Workflow (GAP-001)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Deferred to**: Expansion (enforce recorded fields only for now)

**Scope**:
- Delegation window store with delegator, delegate, reason, scope, expiry
- Sub-delegation permission rule
- Reporting-back date and flow
- Automatic expiry blocking post-expiry decisions

**Acceptance Criteria**:
- [ ] Delegation windows stored and enforced
- [ ] Sub-delegation controlled by policy
- [ ] Reporting-back workflow implemented
- [ ] Expired delegations cannot make decisions

---

### Task 3.2: Session Concurrency on Role Switch (GAP-002)
**Status**: 🔴 Not Started
**Owner**: Identity Lead

**Scope**:
- Define concurrency rules for role switch
- Invalidate or migrate sessions on switch
- Tests for concurrent session scenarios

**Acceptance Criteria**:
- [ ] Role switch handles existing sessions per policy
- [ ] No privilege escalation via session reuse
- [ ] Tests cover switch scenarios

---

### Task 3.3: Scope Registry (GAP-004)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Part of**: Task 1.3

**Scope**:
- Scope registry in DB with hierarchy
- Scope assignment validation
- Effective dates on scopes

**Acceptance Criteria**:
- [ ] Scopes defined in registry
- [ ] Hierarchy validated
- [ ] Assignments checked against registry

---

### Task 3.4: Appointment Verification (GAP-005)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Part of**: Task 1.3

**Scope**:
- Appointment evidence required for role grants
- Verification workflow
- Expiry tracking

**Acceptance Criteria**:
- [ ] Role grant requires appointment proof
- [ ] Verification tracked
- [ ] Expired appointments trigger review

---

### Task 3.5: Notification Delivery (GAP-008)
**Status**: 🟡 Partially Done (Outbox + channels exist)
**Owner**: Integration Lead
**Part of**: Task 1.6

**Scope**:
- Email/SMS provider integration
- Delivery status tracking
- Retry with backoff
- Template management

**Acceptance Criteria**:
- [ ] Notifications delivered via email/SMS
- [ ] Delivery status visible in UI
- [ ] Failed deliveries retried
- [ ] Templates versioned

---

### Task 3.6: Operations Queue (GAP-009)
**Status**: 🟡 Partially Done (IntegrationIncident exists)
**Owner**: Integration Lead
**Part of**: Task 1.6

**Scope**:
- Dead letter queue for failed deliveries
- Operations workspace for queue management
- Escalation rules
- Replay capability

**Acceptance Criteria**:
- [ ] Failed deliveries visible in operations workspace
- [ ] Operators can replay/redirect
- [ ] Escalation alerts on SLA breach
- [ ] Metrics on queue depth

---

### Task 3.7: Review Schedule (GAP-010)
**Status**: 🔴 Not Started
**Owner**: Identity Lead

**Scope**:
- Automated review scheduling for role assignments
- Review notifications
- Expiry warnings (already partially in `ExpiryWarning`)

**Acceptance Criteria**:
- [ ] Reviews scheduled per policy
- [ ] Notifications sent before expiry
- [ ] Review outcomes recorded

---

### Task 3.8: Identity Operation Audit Rows (GAP-013)
**Status**: 🔴 Not Started
**Owner**: Identity Lead

**Scope**:
- Ensure all identity operations create audit events
- Include: grant, revoke, delegate, break-glass, recovery
- Verify `AuditEvent` covers all mutations

**Acceptance Criteria**:
- [ ] All identity mutations audited
- [ ] Read audit for sensitive data (already done)
- [ ] Audit integrity verified

---

### Task 3.9: Review Decision Inputs (GAP-014)
**Status**: 🔴 Not Started
**Owner**: Admissions Lead

**Scope**:
- Define required inputs for review decisions
- Enforce completeness before decision release
- Evidence linkage

**Acceptance Criteria**:
- [ ] Decision cannot release without required inputs
- [ ] Evidence linked to decision
- [ ] Audit trail complete

---

### Task 3.10: Correction Scope Routing (GAP-018)
**Status**: 🔴 Not Started
**Owner**: Records Lead

**Scope**:
- Route correction requests to correct office based on scope
- Academic vs administrative corrections
- Workflow per scope type

**Acceptance Criteria**:
- [ ] Corrections routed to correct workspace
- [ ] Scope-based workflow enforced
- [ ] Tests for routing rules

---

## Priority 4: LOW — Refinements (GAP-003, 007, 016, 017, 019, 021)

### Task 4.1: Capability Registry Completion (GAP-003)
**Status**: 🟡 Partially Done (Config exists)
**Owner**: Identity Lead
**Part of**: Task 1.3

### Task 4.2: Training Checks (GAP-007)
**Status**: 🔴 Not Started
**Owner**: Identity Lead
**Part of**: Task 1.3

### Task 4.3: Staff Signal Inbox (GAP-016)
**Status**: 🔴 Not Started
**Owner**: Student Success Lead

### Task 4.4: Sim Endpoint Removal (GAP-017)
**Status**: 🔴 Not Started
**Owner**: Integration Lead
**Note**: Remove demo simulator endpoints before production

### Task 4.5: Ticket Categories + Appeal Route (GAP-019)
**Status**: 🔴 Not Started
**Owner**: Admissions Lead

### Task 4.6: Teaching Group Timetable Validation (GAP-021)
**Status**: 🔴 Not Started
**Owner**: Teaching Lead

---

## Execution Order

```
Week 1-2: Task 1.1, 1.2, 1.3 (Production config, Contact verification, Scope hierarchy)
Week 2-3: Task 1.4, 1.5, 1.6 (Document safety, File storage, Delivery workflows)
Week 3-4: Task 1.7, 1.8, 1.9, 1.10 (Accessibility, Test suite, ASVS L3, Breach notification)
Week 4-5: Task 2.1, 2.2, 2.3, 2.4 (Approver authority, Suspicious recovery, SoD, Finance step-up)
Week 5-6: Task 3.1-3.10 (Medium priority gaps)
Week 6+: Task 4.1-4.6 (Low priority)
```

---

## Success Criteria for Production Unblock

| Gate | Criteria | Verification |
|------|----------|--------------|
| **GAP-015 Closed** | All 7 rows resolved | Gap doc updated with approval dates |
| **Gate S** | Production applicant config active | Config deployed, demo separated |
| **Gate T** | Full test suite green | `npm test`, `test:browser`, `backup:test` all pass |
| **Gate U** | ASVS L3 for 4 domains | Checklist signed off |
| **Gate V** | Breach notification automated | End-to-end test passes |

---

## Notes

- **Do not invent policy**: All institutional decisions (fee amounts, role hierarchies, SoD pairs, retention periods) must come from business/data owners
- **Demo mode preserved**: Keep `DEMO_MODE=true` path for presentations; production config separate
- **Human review required**: Charles/Chitindu must replay and sign off before any production claim
- **Branch protection**: Enable on `main` before production deployment
- **Remote CI**: GitHub Actions must run and pass before merge

---

## Tracking

Update this plan as tasks progress. Each task should have:
- [ ] Todo created in task tracker
- [ ] Branch created for implementation
- [ ] Tests written first (TDD)
- [ ] Code review completed
- [ ] Verification run on fresh DB
- [ ] Gap doc updated with resolution