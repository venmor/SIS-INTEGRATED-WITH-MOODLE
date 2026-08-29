# AI Context Loading and Session Recovery

## Start of every task

Load in this order:

1. Root `AGENTS.md`
2. Current task packet
3. Linked role journey/action contract
4. Linked permission/security rules
5. Linked UI or architecture contract
6. Linked acceptance tests and current module README/ADR

Do not load the whole 70-record compendium unless investigating provenance. Large context increases contradiction and pattern drift.

## During work

Keep a task-local decision log. Stop if a requested change crosses the out-of-scope list, changes institutional policy, introduces a dependency or conflicts with a controlling rule.

## End of session

Produce a handoff containing task ID, objective, completed work, files/records changed, tests/evidence, decisions, unresolved questions, next safe step and exact controlling documents. Update repository docs before context is lost.

## Fresh-agent recovery

A new agent reads the handoff and repository state, verifies rather than trusts claimed completion, and continues only inside the same task packet. It does not ask the previous model to “remember” hidden context.
