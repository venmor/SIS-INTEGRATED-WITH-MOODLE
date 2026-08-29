# Authority, Supersession and Change Control

## Authority test

A statement controls implementation only when it is an approved design rule, a later correction, a security/integrity rule, or a decision recorded through the change process. Brainstorming examples are not policy.

## Supersession rules

- Documentation-only handoff supersedes earlier wording that implied this ZIP would contain a base application scaffold.
- The lean TypeScript stack supersedes earlier exploratory stack suggestions.
- CSS Modules is the baseline; Tailwind is excluded unless a later ADR approves it.
- Modular monolith is the baseline; microservices are a future option, not an MVP requirement.
- User-specific workspaces supersede generic dashboards.
- Human-reviewed, explainable assistance supersedes automatic AI decision-making.

## Change process

1. Create a design-gap or change proposal.
2. State the affected requirement, journey, permission, data, integration, UI and tests.
3. Compare options and consequences.
4. Obtain human approval.
5. Record an ADR or policy/configuration version.
6. Update traceability and supersession records.
7. Implement through a bounded task packet.

No AI agent may silently reinterpret an approved rule to make implementation easier.
