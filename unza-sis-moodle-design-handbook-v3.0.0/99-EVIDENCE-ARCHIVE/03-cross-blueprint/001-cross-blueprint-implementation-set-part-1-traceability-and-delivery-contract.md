<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: eb70eb66-99fa-55b7-87df-1332189965a5; chronological message: 225. -->

# Cross-Blueprint Implementation Set, Part 1 — Traceability and delivery contract

This is the control layer that connects every approved design to implementation. An AI agent must not build a screen, API, workflow or integration from a vague feature name.

Each delivered capability must trace back to an approved chain:

> **Policy / rule → role → workspace → screen → user action → permission → domain command → state change → event → integration → audit → acceptance test**

## 13.1 Canonical requirement identifiers

Every requirement receives a stable identifier. IDs are never reused after deletion or redesign.

| Prefix | Meaning | Example |
|---|---|---|
| `POL` | Policy/rule | `POL-PROG-014` |
| `ROLE` | Role blueprint | `ROLE-ADV` |
| `SCR` | Screen/page | `SCR-ADV-OBS-001` |
| `ACT` | User action contract | `ACT-ADV-OBS-004` |
| `PERM` | Permission/visibility rule | `PERM-ADV-017` |
| `CMD` | Domain command | `CMD-RequestStudentSupportOutreach` |
| `EVT` | Domain/integration event | `EVT-StudentSupportOutreachRequested` |
| `INT` | Integration contract | `INT-Moodle-Enrollment-v1` |
| `AUD` | Audit requirement | `AUD-ADV-008` |
| `ERR` | Error/recovery rule | `ERR-PAY-012` |
| `TEST` | Acceptance/E2E test | `TEST-E2E-ADV-004` |
| `DEC` | Unresolved/configurable decision | `DEC-PROG-003` |

A requirement record includes:

- ID
- Title
- Status: draft, approved, superseded, retired
- Owner
- Source/design section
- Effective date
- Dependencies
- Version
- Acceptance criteria
- Links to implementation and tests

## 13.2 Mandatory traceability record

Every implementation ticket must contain this minimum table.

| Field | Required content |
|---|---|
| Requirement | Approved requirement ID and wording |
| Policy | Applicable policy/version or configured rule |
| Role and scope | Who performs it and where |
| Entry screen | Exact screen and navigation path |
| Action | User-visible action label and action ID |
| Permission | Conditions required to show/execute it |
| Domain command | Command and validation rules |
| State transition | Before/after lifecycle state |
| Events | Events emitted and consumers |
| Integrations | External contract, if any |
| UI requirements | Form, feedback, accessibility and mobile behaviour |
| Errors/recovery | Exact failure states and safe recovery |
| Audit | Fields to record |
| Tests | Unit, integration, authorization and E2E IDs |

An AI agent may not mark a task complete if any required field is absent.

## 13.3 Example traceability chain: adviser support invitation

| Layer | Requirement |
|---|---|
| Policy | `POL-SUP-006`: academic observations require human triage; ordinary counselling referral requires acceptance |
| Role | `ROLE-ADV`: Academic Adviser |
| Screen | `SCR-ADV-OBS-001`: Observation review |
| Action | `ACT-ADV-OBS-004`: Send support invitation |
| Permission | `PERM-ADV-017`: assigned adviser or permitted referral owner; active observation; permitted contact route |
| Command | `CMD-RequestStudentSupportOutreach` |
| State change | `Awaiting review → Outreach queued` |
| Events | `EVT-StudentSupportOutreachRequested`, `EVT-StudentSupportOutreachQueued` |
| Integration | `INT-NOTIFY-v1` |
| Audit | `AUD-ADV-008`: role, scope, observation, message template, channel, time, outcome |
| Errors | `ERR-ADV-006`: duplicate outreach; `ERR-ADV-009`: no verified contact route |
| Tests | `TEST-E2E-ADV-004`, `TEST-AUTH-ADV-017`, `TEST-A11Y-ADV-004` |

## 13.4 Example traceability chain: Moodle grade transfer

| Layer | Requirement |
|---|---|
| Policy | `POL-ASM-012`: Moodle data may stage CA evidence but cannot directly publish official marks |
| Role | `ROLE-MOODLE-ADMIN`, `ROLE-LECTURER`, `ROLE-EXAMS` |
| Screen | `SCR-MOD-GRADE-002`: Grade-transfer staging |
| Action | `ACT-MOD-GRD-003`: Stage Moodle grade transfer |
| Permission | Mapping approved by authorized academic owner; course/TG scope valid |
| Command | `CMD-StageMoodleGradeTransfer` |
| State change | `Received → Technically validated → Ready for academic review` |
| Events | `EVT-MoodleGradeTransferStaged`, `EVT-MoodleGradeDiscrepancyDetected` |
| Integration | `INT-Moodle-GradeTransfer-v1` |
| Audit | Mapping version, batch checksum, source activity, actor/service, validation outcome |
| Errors | Missing official student, expired mapping, changed Moodle grade after approval |
| Tests | `TEST-INT-MOODLE-031`, `TEST-E2E-EXAM-014`, `TEST-AUTH-MOD-007` |

## 13.5 Example traceability chain: official regulatory submission

| Layer | Requirement |
|---|---|
| Policy | `POL-REG-004`: only certified metrics and approved evidence may enter official return |
| Role | Regulatory Reporting User and configured signatory |
| Screen | `SCR-REG-SUB-003`: Submission review and authorization |
| Action | `ACT-REG-SUB-003`: Submit to regulator |
| Permission | Active submission authority; complete sign-off chain; frozen package |
| Command | `CMD-SubmitRegulatoryReturn` |
| State change | `Approved for delivery → Delivery in progress → Acknowledged` |
| Events | `EVT-RegulatoryDeliveryAttempted`, `EVT-RegulatorySubmissionAcknowledged` |
| Integration | `INT-REG-DELIVERY-v1` |
| Audit | Submitter, authority, package version, checksum, time, acknowledgement reference |
| Errors | Unknown delivery state; template mismatch; source metric no longer certified |
| Tests | `TEST-E2E-REG-003`, `TEST-SEC-REG-005`, `TEST-REC-REG-002` |

## 13.6 Configurable decisions must be explicit

Open institutional choices must become configuration requirements, never hidden developer assumptions.

Current examples include:

| Decision ID | Configurable question | Required design treatment |
|---|---|---|
| `DEC-PROG-001` | Outcome for exactly three failed half-courses | Versioned progression-policy option |
| `DEC-PROG-002` | Supplementary eligibility for CA 41–49 | Versioned assessment-policy option |
| `DEC-FIN-001` | Course-based versus annual/semester billing | Fee-policy strategy |
| `DEC-AUTH-001` | Award/closure/submission authority chain | Configured approval workflow |
| `DEC-ACC-001` | Programme/accreditation framework | Versioned criteria profile |
| `DEC-NOTIFY-001` | Mandatory notification channels and escalation | Configured communication policy |

An agent must implement configuration schema, validation, effective dates, policy versioning and tests—not a conditional statement tied to one university.

## 13.7 Definition of ready for AI implementation

A development task is ready only when it has:

- Approved requirement/action ID
- Named domain owner
- Clear policy/version source
- Role and organizational scope
- Screen/action description
- State-transition diagram or table
- Permission conditions
- Command/event contract
- Data fields and classifications
- Integration contract or explicit “none”
- Error/recovery rules
- Audit requirements
- Accessibility/mobile requirements
- Acceptance tests

If any item is missing, the agent must raise a **design-gap issue** rather than inventing behaviour.

## 13.8 Definition of done

A capability is complete only when:

- Correct permission checks are implemented and tested.
- The command validates all invariants.
- State transitions are persisted and auditable.
- Events are reliably published and idempotent.
- Integrations are tested with failure/retry behaviour.
- UI includes loading, empty, error and recovery states.
- Accessibility acceptance checks pass.
- Mobile/low-bandwidth behaviour is verified.
- Audit records are present and queryable by authorized users.
- Unit, integration, authorization and E2E tests pass.
- Traceability links are updated with implementation and test references.
- A reviewer confirms the built behaviour matches the approved action contract.

## 13.9 Design-change control

If implementation reveals a missing rule:

1. Agent opens a design-gap issue linked to the requirement ID.
2. The issue explains the conflicting or missing choice.
3. No silent hard-coded behaviour is introduced.
4. The authorized design/policy owner decides.
5. A new or revised policy/configuration version is approved.
6. Traceability links and tests are updated.
7. Old behaviour remains historically reproducible.

A bug fix may not quietly redefine an institutional rule.

## 13.10 Repository structure for the future base project

The final base repository should keep specifications close to implementation:

```text
/docs
  /policies
  /roles
  /actions
  /permissions
  /error-catalogue
  /acceptance-tests
  /traceability
/config
  /academic-policies
  /fee-policies
  /workflow-definitions
  /role-capabilities
  /metric-definitions
/contracts
  /commands
  /events
  /integrations
/apps
/services
/tests
```

Every code module and test references the relevant approved IDs. This gives future AI agents a single, checkable source of truth.

## 13.11 Acceptance requirements

This implementation set is accepted only when:

- Every feature has a stable requirement/action ID.
- Every important action traces from policy to test.
- Open policy choices are configuration records, not hidden code.
- Agents must raise design gaps rather than assume behaviour.
- Tests prove permissions, state transitions, error recovery, audit and accessibility.
- Repository structure preserves this traceability for future development.

Please approve **Cross-Blueprint Implementation Set, Part 1**. Next is Part 2: the shared **UI component and microinteraction catalogue**—password, phone number, saving, uploading, confirmation, loading, error, notification, access-denied, duplicate-submission and other interaction patterns used consistently across every role.

---

## Following user responses before the next design record

### User message 0226

We may proceed and on the UI components remember every part must be designed we don't want the ai agents to develop things out of scope and uncessary or looking like ai generated.it should be real professional and useful.

That does not mean we create design on understood by ai but also by human developers like my self handling the final year project
