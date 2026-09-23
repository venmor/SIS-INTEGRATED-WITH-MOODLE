# Learning Note — TASK-PH5-002 (student account and statement)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH5-002)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 2
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Read-only student finance home: account summary (student number, period,
clearance status + student-facing wording, outstanding with block
explanation, next action, due date, sponsorship line, refresh time,
support route), charge statement (ordered lines + invoiced/paid/
outstanding totals), and a receipt endpoint that safely 404s before any
confirmed payment exists. Balances derive from posted lines; no stored
balance column. Payments/allocations arrays are present but empty —
shape-stable for slices 3–5.

## Frontend

- `/student/finance` expanded to summary notice + invoice + statement;
  `/api/finance` proxy allows `account|statement|receipts/*` reads.

## Backend/domain

- `accountSummary` (clearance row or NOT_ASSESSED default; outstanding =
  invoice total until slice-5 allocations; blocksRegistration unless
  CLEARED), `statement` (charge lines + empty payments/allocations),
  `receipt` (RECEIPT_NOT_FOUND until slice 4). View audits on reads.

## Security + authz

- Own record only; lecturers/applicants 403 on all three reads; unknown
  periods neutral 404; empty (no invoice) 404 with safe message.

## Tests and what they prove

- `finance-statement.e2e-spec.ts` (8 tests): summary contents + wording,
  HELD wording ("Registration is currently blocked"), statement order +
  totals math, absent receipt, empty states, denials, neutrals. 16/16 with
  slice-1 spec on the same DB.
- Browser finance leg extended: clearance wording, outstanding, statement
  heading. Green.

## What failed or confused us

- Service defaulted missing clearance to NOT_EVALUATED (design-system
  name) but the Phase-4 model default is NOT_ASSESSED — kept the model
  default for consistency.
- Redesigned notice dropped the verbatim "Invoice {ref}" string the
  browser asserted; asserted "Official reference {ref}" instead.
- Course title now renders twice (invoice + statement); asserted the
  exact course line.

## Questions to revise

- Summary/statement/receipt field map; why balances are never stored;
  where payments will attach (slices 3–5).
