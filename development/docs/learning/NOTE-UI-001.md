# Learning Note — UI-POLISH Wave 1 (money screens)

- Lead developer: Chitindu Milimbo (proposed; TASK-UI-POLISH)
- Reviewer: Charles Hangoma (proposed)
- Date: 2026-09-24, presentation track

## What was restyled and why

Money screens now use one pattern per information kind: finance home
(PageHeader + clearance Notice + invoice/statement DataTables with
aligned tabular amounts + receipts), pay page (request table with
status chips), admin finance home (work cards with live counts +
single CTAs), reconciliation queue and adjustments (governed tables).
Copy aligned to journey wording (clearance lines, block-explanation,
partial-payment context preserved).

## Verification

- Typecheck/lint/builds clean; portal + finance-workspace browser
  specs green (assertions updated for table+card duality and
  single-visible-heading rule).
- DataTable renders both table and mobile cards; tests assert both
  exist (responsive requirement, not an accident).
- Duplicate Card/DataTable titles resolved with sr-only table titles.
