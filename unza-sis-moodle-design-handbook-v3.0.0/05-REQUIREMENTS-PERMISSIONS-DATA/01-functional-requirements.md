# Functional and Non-Functional Requirements

## Identity and access

- **REQ-IAM-001:** The system shall link a person to one or more accounts without using the username as the authoritative person identifier.
- **REQ-IAM-002:** A user with multiple roles shall deliberately select an active workspace; authority shall be evaluated from the active role and scope.
- **REQ-IAM-003:** Role assignments shall have scope, effective dates, issuer, reason and revocation/expiry history.
- **REQ-IAM-004:** The backend shall deny access unless identity, role, scope, relationship, record state and required capability all permit it.
- **REQ-IAM-005:** Privileged and high-impact actions shall support re-authentication and MFA-ready controls.
- **REQ-IAM-006:** Account recovery shall avoid account-existence disclosure and invalidate affected sessions.

## Admissions

- **REQ-ADM-001:** A prospective applicant shall discover programmes and eligibility guidance without creating an account.
- **REQ-ADM-002:** An applicant shall create, save and resume an application draft.
- **REQ-ADM-003:** The system shall validate required application sections and evidence before formal submission.
- **REQ-ADM-004:** Formal submission shall be idempotent and issue an authoritative receipt.
- **REQ-ADM-005:** Admissions staff shall review assigned evidence against versioned criteria without modifying applicant-submitted evidence.
- **REQ-ADM-006:** Recommendation and final decision authority shall be separated where configured.
- **REQ-ADM-007:** Offers shall record conditions, expiry, acceptance/decline and superseded versions.
- **REQ-ADM-008:** An accepted applicant shall convert to a student record through an auditable command, not manual re-entry.

## Student records, registration and progression

- **REQ-REG-001:** The authoritative student record shall preserve prior values and correction evidence.
- **REQ-REG-002:** Course selection shall use the effective programme/study plan, prerequisites, repeats, limits and academic period.
- **REQ-REG-003:** Registration shall distinguish saved selection, submitted request, financial review, academic validation, confirmed registration and failed/recovery states.
- **REQ-REG-004:** Duplicate registration confirmation shall be prevented by idempotency and database constraints.
- **REQ-REG-005:** Progression outcomes shall cite the policy/configuration version and input results used.
- **REQ-REG-006:** Manual exceptions shall require an authorized reason, evidence and approval route.
- **REQ-REG-007:** Amendments after confirmation shall create controlled history and downstream reconciliation.

## Learning integration

- **REQ-LRN-001:** Course offerings, teaching assignments and Tutorial Groups shall map to Moodle through versioned integration configuration.
- **REQ-LRN-002:** Confirmed registration shall produce a durable enrolment event.
- **REQ-LRN-003:** Moodle failure shall not reverse authoritative SIS registration.
- **REQ-LRN-004:** Integration delivery shall support timeout, retry, duplicate tolerance, dead-letter state, authorized replay and reconciliation.
- **REQ-LRN-005:** Moodle grades shall be staged and validated; Moodle shall never directly release official results.

## Assessment and examinations

- **REQ-ASM-001:** Assessment structures, weightings and boundaries shall be versioned by offering/period.
- **REQ-ASM-002:** Lecturers and tutors shall enter marks only within assigned offerings and explicit authority.
- **REQ-ASM-003:** Validation shall detect missing, out-of-range, duplicate, structurally invalid and inconsistent marks.
- **REQ-ASM-004:** Moderation, board review and release shall use explicit roles and states.
- **REQ-ASM-005:** A released result shall be immutable; correction shall create a reasoned, approved result version.
- **REQ-ASM-006:** Supplementary, deferred, repeat and progression decisions shall use the effective policy version.
- **REQ-ASM-007:** Students shall see only officially released results intended for them.

## Finance

- **REQ-FIN-001:** Charges shall derive from approved fee policy, enrolment context and effective period.
- **REQ-FIN-002:** Payments shall preserve provider/reference evidence, allocation and reversal history.
- **REQ-FIN-003:** Duplicate or delayed callbacks shall not duplicate financial effects.
- **REQ-FIN-004:** Financial clearance shall be calculated from approved policy and current authoritative records, not a free manual switch.
- **REQ-FIN-005:** Adjustments, waivers, sponsorships and refunds shall use configured thresholds and approval chains.
- **REQ-FIN-006:** Students shall see understandable balances, allocations, status, last update and dispute/support route.
- **REQ-FIN-007:** Payment and registration shall reconcile after reversals or late changes.

## Support services

- **REQ-SUP-001:** Academic observation/outreach shall not automatically disclose counselling or disability information.
- **REQ-SUP-002:** Restricted support cases shall be visible only to assigned/authorized support roles and minimum necessary operational staff.
- **REQ-SUP-003:** Consent, safeguarding exception and information-sharing decisions shall be recorded.
- **REQ-SUP-004:** Private notes shall be separated from student-visible communication and general academic records.
- **REQ-SUP-005:** Emergency/break-glass access shall be time-limited, reasoned, narrowly scoped, reviewed and audited.

## Quality, reporting and regulatory work

- **REQ-QA-001:** Quality reviews shall link scope, criteria, evidence, findings, actions, owners, deadlines and verification.
- **REQ-QA-002:** Evidence submitters shall not independently verify their own evidence where conflict rules apply.
- **REQ-QA-003:** Reports shall state metric definition/version, population, period, freshness, limitations and source.
- **REQ-QA-004:** Regulatory packages shall require validation, signatory authority, delivery evidence and acknowledgement.
- **REQ-QA-005:** Corrections shall preserve earlier certified/submitted versions.

## Notifications, operations and audit

- **REQ-OPS-001:** Notifications shall record template version, recipient, safe payload, channel, status and delivery result.
- **REQ-OPS-002:** Failed notification delivery shall not reverse the underlying domain decision.
- **REQ-OPS-003:** Integration and operational queues shall show state, reason, attempts, next action, owner and correlation reference.
- **REQ-OPS-004:** High-impact audit history shall be append-only and include actor, active role, scope, command, outcome, time, policy version and correlation.
- **REQ-OPS-005:** Operators may replay approved failed work but may not change the underlying academic/financial/support decision.

## Non-functional requirements

- **REQ-NFR-001 Security:** Deny by default, least privilege, server-side enforcement, secure sessions, protected secrets and safe logging.
- **REQ-NFR-002 Privacy:** Minimize displayed/processed data and maintain explicit classifications and retention rules.
- **REQ-NFR-003 Accessibility:** Critical journeys support keyboard, screen reader, visible focus, reflow/zoom, accessible errors and non-colour status.
- **REQ-NFR-004 Reliability:** High-impact commands are transactional/idempotent; external work is durable and reconcilable.
- **REQ-NFR-005 Performance:** Paginate large data, bound requests/uploads, query only required fields and measure before adding cache infrastructure.
- **REQ-NFR-006 Maintainability:** High cohesion, low coupling, stable contracts, limited dependencies and recorded ADRs.
- **REQ-NFR-007 Portability:** Arch Linux and Windows/WSL developers use pinned versions, Docker services and common commands.
- **REQ-NFR-008 Explainability:** Documentation shall explain workflows from business outcome to UI, API, data, security and tests.
- **REQ-NFR-009 Configurability:** Institutional variations shall be approved, versioned, effective-dated and tested.
- **REQ-NFR-010 Recoverability:** Backups are useful only after tested restore and reconciliation evidence.
