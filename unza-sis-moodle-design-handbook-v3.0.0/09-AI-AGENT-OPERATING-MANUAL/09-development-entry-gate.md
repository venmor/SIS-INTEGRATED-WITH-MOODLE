# Development Entry Gate

Before an AI agent writes code, all answers below must be `YES`.

| Gate | Required evidence |
|---|---|
| The task belongs to an implementation release | Roadmap/release identifier |
| The role journey exists | Standalone or composite journey link and source lineage |
| The action is approved | `ACT-*` or exact action section |
| Permission and privacy are defined | `PERM-*`/visibility rule and denial test |
| State and ownership are defined | Module/state/command/event references |
| UI behaviour is defined | Screen/component/UI constitution references |
| Failures and recovery are defined | Error/recovery catalogue references |
| Policy values are approved or explicitly demo-only | Versioned configuration reference |
| Required tests are named | Unit/API/E2E/security/accessibility/recovery IDs |
| Scope is small enough to review | Explicit out-of-scope list |
| No action-specific design gap remains | Readiness matrix and open-gap check |
| A human lead and reviewer are assigned | Charles/Chitindu rotation |

If any answer is `NO`, the agent must stop and create a design-gap question. It must not fill the missing answer from convention or model memory.
