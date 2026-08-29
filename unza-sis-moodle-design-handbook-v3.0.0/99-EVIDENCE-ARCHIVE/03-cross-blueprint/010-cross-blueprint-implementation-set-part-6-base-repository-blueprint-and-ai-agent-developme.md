<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 3bf10d4e-589e-5b62-940a-a67e9a5fec84; chronological message: 253. -->

# Cross-Blueprint Implementation Set, Part 6 — Base repository blueprint and AI-agent development protocol

This is the bridge from approved design into a buildable final-year-project repository. The future ZIP will contain this structure, the specifications, configuration examples, contracts, test skeletons and implementation guidance—not undocumented assumptions.

## 18.1 Architecture principles

The base project must use:

- **High cohesion**: each module owns one clear responsibility.
- **Low coupling**: modules communicate through stable commands/events, not direct database edits.
- **Information Expert**: business rules live with the domain object/service that owns the information.
- **Controller**: application controllers accept requests and delegate to domain commands.
- **Protected Variations**: university-specific policies and integrations are replaceable configuration/strategies.
- **Indirection**: adapters isolate Moodle, payment, SMS/email, verification and regulator systems.
- **Explicit state machines**: applications, registration, results, payments, findings and cases use controlled lifecycle states.
- **Immutable audit/history**: high-impact decisions are versioned, not overwritten.
- **Outbox/event pattern**: external effects are reliable and idempotent.

## 18.2 Repository structure

```text
university-sis/
  docs/
    approved-design/
      policies/
      role-blueprints/
      action-contracts/
      ui-catalogue/
      permissions/
      error-recovery/
      acceptance-tests/
      traceability/
    architecture/
      decisions/
      domain-model/
      integration-contracts/
      configuration-model/
    developer-guide/
      ai-agent-protocol.md
      contribution-rules.md
      glossary.md

  apps/
    web-portal/
    staff-workspace/
    operations-workspace/

  services/
    identity-access/
    admissions/
    student-records/
    registration-progression/
    learning-integration/
    assessment-examinations/
    finance/
    support-services/
    quality-governance/
    reporting-regulatory/
    notifications/
    integration-hub/
    audit-archive/

  shared/
    domain-kernel/
    ui-design-system/
    authorization/
    configuration/
    event-contracts/
    observability/
    test-fixtures/

  config/
    institutions/
    academic-policies/
    progression-policies/
    assessment-policies/
    fee-policies/
    workflow-definitions/
    role-capabilities/
    approval-chains/
    metrics/
    notification-templates/
    retention-rules/
    integration-mappings/

  contracts/
    commands/
    events/
    integrations/
    api/

  tests/
    unit/
    integration/
    authorization/
    accessibility/
    e2e/
    recovery/
    fixtures/
```

The actual technology stack can be selected later, but the logical boundaries above remain stable.

## 18.3 Domain-service boundaries

| Service | Owns | Must not own |
|---|---|---|
| Identity & Access | Person-account linkage, roles, scope, authentication state | Academic/final-result decisions |
| Admissions | Applications, evidence review, offers and conversion | Student financial allocation |
| Student Records | Authoritative student identity/record corrections, transcript basis | Moodle learning activities |
| Registration & Progression | Registration, study plan, course repeats, policy outcome | Payment-provider callbacks |
| Learning Integration | Moodle shell/enrolment/TG/grade staging | Official result release |
| Assessment & Examinations | Assessment plan, marks, boards, release/amendment | Financial clearance |
| Finance | Charges, payments, allocations, sponsorship, refunds, clearance | Academic progression rules |
| Support Services | Counselling/disability/welfare/discipline restricted cases | General academic records |
| Quality Governance | Reviews, evidence, findings, actions, programme review | Source data corrections |
| Reporting & Regulatory | Certified metrics, report packages, submission control | Source-record edits |
| Notifications | Authoritative notification record and channel delivery | Underlying domain decision |
| Integration Hub | Adapter delivery, retry and reconciliation | Domain policy decisions |
| Audit & Archive | Audit trail, archive, retention/legal holds | Operational workflow ownership |

No service may write directly into another service’s core records.

## 18.4 Shared domain kernel

The shared kernel contains only cross-domain concepts:

- Person/reference identifiers
- Organization and scope
- Academic period
- Role assignment
- Policy/configuration version reference
- Money/currency value object
- Document reference/classification
- Audit event
- Domain-event envelope
- Idempotency reference
- Approval/delegation reference
- Time and institutional time-zone utilities

It must not become a “shared everything” library.

## 18.5 Configuration model

All institutional variation lives in versioned configuration with:

- Identifier
- Owner
- Effective start/end date
- Scope
- Approval status
- Change reason
- Prior/superseded version
- Validation rules
- Test fixtures
- Audit history

Configuration categories include:

| Category | Examples |
|---|---|
| Academic policy | Progression, repeat, supplementary, prerequisite, award rules |
| Finance policy | Course charges, payment arrangements, refund/waiver thresholds |
| Workflow | Approval chain, escalation, case states, deadline rules |
| Role capability | Dean scope, tutor quiz authority, signatory powers |
| UI/content | Labels, notification templates, institutional terminology |
| Reporting | Metric definition, suppression, regulatory template |
| Integration | Moodle mapping, payment adapter, notification channel |
| Retention | Archive duration, legal hold, disposal authority |

No programme, role, fee, grade boundary, authority chain or provider identifier is hard-coded in the interface or business rules.

## 18.6 Command and event standards

### Commands

Commands express an intentional request:

```text
RequestStudentSupportOutreach
ConfirmAcademicRegistration
StageMoodleGradeTransfer
ApproveFinancialAdjustment
ReleaseOfficialResults
ConfirmAcademicAward
IssueProposedQualityFinding
SubmitRegulatoryReturn
```

Every command includes:

- Command ID
- Acting identity/active role
- Scope
- Idempotency reference where needed
- Target record reference
- Inputs
- Policy/configuration version
- Validation result
- Audit context

### Events

Events state an already completed fact:

```text
StudentAcademicRegistrationConfirmed
MoodleGradeTransferStaged
FinancialClearanceGranted
OfficialResultsReleased
AcademicAwardConfirmed
QualityFindingProposed
RegulatorySubmissionAcknowledged
```

Every event includes:

- Event ID/version
- Aggregate/record reference
- Occurred time
- Causation/correlation reference
- Minimal safe payload
- Classification
- Producer
- Schema version

Consumers must tolerate duplicate delivery and event-version change.

## 18.7 Integration adapter standard

Each external provider is implemented behind an adapter contract.

```text
Domain service
  → approved event/outbox
  → integration adapter
  → external provider
  → delivery result/reconciliation
```

An adapter must provide:

- Connection/configuration validation
- Request mapping
- Authentication/credential isolation
- Idempotency support
- Timeout/retry classification
- Provider-result normalization
- Error masking
- Reconciliation query
- Audit/observability hooks
- Test double/mock implementation

Adapters do not contain academic, financial, admissions or support policy logic.

## 18.8 UI implementation protocol

Frontend agents must:

1. Select only approved `UI-*` components.
2. Compose them into an approved `SCR-*` screen.
3. Implement the linked `ACT-*` action contract.
4. Query only the permitted role/scope view model.
5. Include every documented state: loading, empty, stale, validation error, permission denial, conflict and recovery.
6. Implement responsive and keyboard/screen-reader behaviour.
7. Use approved content/template IDs.
8. Add accessibility and E2E test references before completion.

Frontend agents must not add undocumented dashboards, chatbot widgets, visual effects, alternative role flows or generic admin menus.

## 18.9 AI-agent development protocol

Every AI development task begins with a task packet:

```text
Task ID:
Approved requirement/action IDs:
Role and scope:
Policy/configuration version:
Screens/components:
Command/event contracts:
Permission rules:
Integration dependencies:
Error/recovery requirements:
Audit requirements:
Acceptance-test IDs:
Out-of-scope list:
```

The agent must then:

1. Read the linked approved design records.
2. Identify any missing/contradictory requirement.
3. Raise a design-gap issue rather than assume.
4. Implement the smallest cohesive vertical slice.
5. Add tests before claiming completion.
6. Update traceability links.
7. Provide evidence of test results and known limitations.
8. Never alter approved policy/configuration merely to satisfy a test.

## 18.10 Human-developer protocol

Human developers use the same task packet and retain final design authority.

They can:

- Review AI-generated implementation against action contracts.
- Reject scope creep or undocumented UI.
- Change technology without changing approved domain behaviour.
- Add a design-gap decision when requirements are incomplete.
- Require code review for high-impact domains.
- Approve configuration defaults for the target university.

The documents remain readable without any AI tooling: role blueprints describe the user experience; action contracts describe behaviour; commands/events describe architecture; tests describe proof.

## 18.11 Required engineering controls

Before a change can merge:

- Formatting, linting and type/static checks pass.
- Relevant unit and integration tests pass.
- Authorization test passes.
- Accessibility test passes for changed critical screen.
- Event/adapter contract test passes where applicable.
- No secret, personal production data or hard-coded institution policy appears in code.
- Traceability record is complete.
- Human review is required for high-impact workflows.

High-impact workflows include admissions decision, official results, progression, finance adjustments/refunds, support/safeguarding, discipline, award/certificate, regulatory submission, privileged access and production operations.

## 18.12 Future ZIP deliverables

Once all design sections are approved and the chosen implementation stack is confirmed, the final ZIP will include:

- Approved requirements and policy catalogue
- Every role blueprint and action contract
- UI component/microinteraction catalogue
- Permission/visibility matrix
- Error/recovery and notification catalogue
- Traceability matrix
- Acceptance-test catalogue and test fixtures
- Domain/service/module architecture
- Command, event and integration contracts
- Versioned sample configuration for a demonstration institution
- Base application/service skeleton
- Shared UI design-system skeleton
- Test and CI-quality skeleton
- Developer and AI-agent contribution protocol
- README explaining how to start, configure, test and extend the project

## 18.13 Acceptance requirements

Part 6 is accepted only when:

- Service ownership and module boundaries are explicit.
- All university variation is versioned configuration, not embedded assumptions.
- Commands, events and adapters isolate domains and external systems.
- AI agents and human developers follow the same traceable task packet.
- Only approved UI/components and workflows can enter the project.
- High-impact changes require test evidence and human review.
- The future repository ZIP contains both build scaffolding and the complete human-readable design contract.

Please approve **Part 6**. After approval, the next step is a final **design completeness review and base-repository creation plan**, identifying any remaining policy decisions before we generate the ZIP.

---

## Following user responses before the next design record

### User message 0254

Have we made the actual UI/UX principals that ai will follow? These are the actual rules that will produce a website that doesn't feel like it's ai developed ,do we have versioning rules during implementation? Do we have a suggested tech stack? And do we have an easy way to showcase the system during presentation,we are a two team developers Charles hangoma and chitindu milimbo ,we will handle tasks differently so that we both learn as we developing we might not know the actual programming languages or the actual development phases but we need to learn during this development we won't just be prompting ai agents to code we need to know what the ai means from high level up to code level hence we need traceable documentation of the implementation and phases of how it will be carried out,we need proper security,we need to utilize proper git workflows for multi tasking and working in isolation that is ci/CD.we to understand so that during presentation of our projects we will be able to answer questions from high level implementation to how and what workflows and processes are interconnected.

Thank you.

### User message 0257

So far in class we have done python, JavaScript,html,css and java(not many are comfortable with it) we have also touched abit of react and next js but not in details including ccs tailwind. From these what is the best stack not just because of what we already know but the best for this architecture

### User message 0259

Alright we don't really need to combine too much stack ,it will also slow down progress eg do we really need tailwind css? Or next.js and react together? Short answer

### User message 0261

Alright we can now proceed
