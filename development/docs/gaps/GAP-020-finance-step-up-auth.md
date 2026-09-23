# GAP-020: finance step-up authentication

- Date: 2026-09-23. Phase: 5 slice 6 (TASK-PH5-006).
- Rule: Design Sec 10 + Part 3A require re-authentication for
  high-impact actions including financial adjustment and refund
  approval; MFA is strongly recommended for finance roles.
- Fact: no step-up / re-authentication / MFA ceremony exists in the
  identity-access module (policy service notes those flows "do not
  exist yet").
- Effect: adjustment, waiver, refund and arrangement approvals enforce
  maker/checker separation (requester ≠ decider), configured
  thresholds, evidence rules and full audit — but NOT an interactive
  re-authentication proof.
- Stop rule applied: no invented auth ceremony. This gap blocks any
  production claim for finance approvals; demo approvals are
  explicitly labelled fictional.
- Resolve by: implementing the approved step-up flow in identity-access
  and wiring it into the finance decide endpoints, with tests.
