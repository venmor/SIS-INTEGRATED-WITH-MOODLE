# Bounded Authority and Design-Gap Protocol

## AI may

- Explain approved design at plain-language, architecture and implementation levels
- Propose a small plan within a task packet
- Generate/refactor code and tests in the future application repository
- Identify contradictions, security concerns and missing acceptance evidence
- Draft documentation for human review

## AI may not

- Invent roles, permissions, policy values, states, screens or provider behaviour
- Change official-record authority boundaries
- Approve its own high-impact decision
- Treat hidden UI as sufficient authorization
- weaken a test or policy to make a build pass
- add a dependency/architecture style without approval
- claim completion without current evidence

## When information is missing

1. Stop the affected work.
2. Create `GAP-###` with the exact missing/contradictory question.
3. Name affected requirements, roles, UI, data, permissions, integrations and tests.
4. Give bounded options and consequences without selecting institutional policy.
5. Obtain a human decision.
6. Record the decision/ADR and update traceability.
7. Resume with a revised task packet.
