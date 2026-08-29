# Multi-Agent Isolation and Handoffs

Future parallel AI work follows the same isolation as human work:

- One issue/task packet per branch or worktree.
- No two agents edit the same module/contract/migration without explicit coordination.
- Shared contracts are changed first in a dedicated reviewed task.
- Each agent receives an out-of-scope list and dependency boundaries.
- Agents do not merge; humans review and integrate.
- Handoffs record assumptions, affected interfaces and tests.
- A coordinator checks combined behaviour and runs the full relevant suite.

Parallelism is used only for independent tasks. Work that changes the same state machine, permission contract or schema remains sequential to avoid contradictory implementations.
