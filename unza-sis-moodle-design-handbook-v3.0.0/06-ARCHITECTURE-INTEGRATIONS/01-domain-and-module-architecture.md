# Domain and Module Architecture

## Architectural form

The initial implementation is a **modular monolith**. Modules run in one backend deployment but retain explicit ownership and stable contracts. This supports learning and reliable transactions without losing the option to separate a module later.

## Principles

- High cohesion and low coupling
- Information Expert: policy lives with the domain that owns the information
- Controllers accept requests and delegate to application/domain services
- Protected Variations: providers and institutional policy are replaceable
- Explicit state machines for high-impact records
- Immutable decision/history versions
- Transactional outbox for external work
- No module writes another module’s core tables

## Module ownership

| Module | Owns | Must not own |
|---|---|---|
| Identity & Access | Person/account linkage, role assignments, scope, sessions | Academic/finance decisions |
| Admissions | Applications, evidence review, recommendations, offers | Student charges or official student record correction |
| Student Records | Authoritative identity, status, record corrections, transcript basis | Moodle activity or payment callbacks |
| Registration & Progression | Study plans, course selection, registration, progression outcomes | Provider payments or result release |
| Learning Integration | Moodle mapping, shell/enrolment/TG/grade staging and reconciliation | Official result publication |
| Assessment & Examinations | Assessment plans, marks, validation, boards, release/amendments | Financial clearance |
| Finance | Charges, payments, allocations, sponsorships, refunds, clearance | Academic progression |
| Support Services | Restricted counselling/disability/welfare/discipline cases | General academic record ownership |
| Quality Governance | Review, evidence, finding, action and verification | Source-record correction |
| Reporting & Regulatory | Metric definitions, certified packages, submissions | Source data edits |
| Notifications | Template/rendering/delivery evidence | Underlying domain decision |
| Integration Hub | Adapter delivery, retry, dead-letter and reconciliation | University policy decisions |
| Audit & Archive | Audit trail, retention, archive/legal holds | Operational workflow decisions |

## Shared kernel

Only concepts genuinely shared across domains belong here:

- Person/reference identifier
- Organization and scope
- Academic period
- Active role assignment reference
- Policy/configuration version reference
- Money/currency value
- Document reference/classification
- Audit/domain-event envelope
- Correlation, causation and idempotency references
- Approval/delegation reference
- Institutional time-zone utility

The shared kernel is not a “shared everything” library.

## Logical request flow

```text
Next.js screen
→ authenticated API request
→ NestJS controller
→ authorization guard/policy check
→ application command handler
→ domain validation/state transition
→ Prisma transaction and outbox event
→ response/receipt
→ worker/adapter external delivery
→ reconciliation/audit
```

## Cross-module interaction

Synchronous queries may use explicit read contracts for current facts. High-impact changes use commands or completed-fact events. Cross-module SQL joins must not become an undocumented write path; governed reporting may use read models with freshness/provenance.
