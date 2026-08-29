# AI-Agent Development Protocol

## Problem addressed

AI agents lose conversational context and may change patterns as a repository grows. The project therefore stores its memory in versioned documents, bounded task packets, contracts, tests and review gates—not in a long prompt or prior chat.

## Repository memory hierarchy

```text
Root AGENTS.md
→ blueprint DESIGN-INDEX and approved baseline
→ module-local AGENTS.md/README
→ linked role/action/screen/permission/test records
→ task packet and out-of-scope list
→ current code/contracts/tests
```

## Mandatory task packet

Every AI development request supplies:

```text
Task ID and phase
Approved requirement/action/screen IDs
Role and scope
Policy/configuration version
Module owner and permitted dependencies
API/command/event contracts
Database entities/migration impact
Permission and privacy rules
Integration dependencies
Error/recovery/idempotency/rate-limit requirements
Audit requirements
Acceptance-test IDs
Documentation updates
Explicit out-of-scope list
```

## Agent workflow

1. Read the linked approved records completely.
2. Summarize the intended vertical slice and boundaries.
3. Inspect existing module patterns and contracts.
4. Report a design gap or contradiction; never silently decide it.
5. Implement the smallest cohesive slice.
6. Add/adjust tests, documentation and traceability.
7. Run relevant verification.
8. Explain the change at business, architecture and code levels.
9. Await human review for high-impact work.

## Context-size strategy

- Do not load the entire blueprint into every task.
- Use `DESIGN-INDEX.md` to route to the smallest authoritative set.
- Keep module README files short and current.
- Split large features into independently reviewable vertical slices.
- Use contracts and tests as executable pattern checks.
- Begin a fresh agent session when context becomes noisy, using the same task packet and source documents.
- Record decisions in the repository before ending a development session.

## Human review

Charles and Chitindu retain design authority. Generated work does not merge unless the reviewer confirms scope, module ownership, permissions, states, data changes, audit, recovery, dependency need and test evidence. If neither developer can explain the code, the task remains incomplete and the agent must teach/explain it.

## Three-level explanation requirement

For learning and presentation, agents explain:

1. **Plain language:** what user problem the change solves.
2. **Architecture:** UI, module, command/API, data, authorization, event and recovery flow.
3. **Code level:** key files, functions/classes, validation, tests and limitations.

## Drift detection

CI and review should detect unapproved imports/dependencies, direct cross-module data access, missing authorization tests, duplicated contracts, undocumented routes/screens and policy literals. Human review compares the PR against the task packet rather than trusting the agent summary.
