# TASK-V2-FIN-004 — Student-owned finance periods

- Release: v2.0 student-finance navigation increment. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human/institutional acceptance remains pending.
- Authority: exact Design Section 6 student-finance evidence; cross-blueprint permission matrix Part 3A (student own charges, payments, statement/receipt); Student Blueprint 2; Section 19 UI constitution; approved v2 operating-SIS direction. The current fictional fee and payment policy remains demo-only.
- Scope: list only the signed-in student's invoiced academic periods from Finance-owned records; choose an existing period by URL; read that period's account, invoice, statement and payment requests; pass the selected period into the existing payment/arrangement actions. Preserve server-side student ownership and existing finance approval/confirmation rules. Synthetic records only.
- Exclusions: new fee policy, payment provider, refund authority, downloadable official statement, all-period aggregate, institutional current-period inference, currency conversion, and bulk finance operations.

## Required behavior

1. An authenticated student receives their own invoiced period codes, issued dates and due dates. Other roles and other students get no finance details; an unknown/foreign period is not silently replaced with a default.
2. The newest issued invoice is the initial view, labelled **Latest invoice**, not assumed to be the current academic period. The selected period remains in the URL and on payment/arrangement routes. A failure to load periods is explicit; zero periods explains why no statement exists.
3. Payment initiation, payment reporting and arrangement requests use the visibly selected period in their existing audited/idempotent backend commands. The page says which period will be affected. No payment may be inferred as confirmed from form submission.
4. Period controls, statement rows and payment history stay readable at 390px and keyboard accessible. Existing amounts continue to come from Finance, not client calculation.

## Verification

Red API test for absent period list and wrong-role/other-student isolation; then focused finance API suite, selected-period browser journey, API/web production builds, lint, formatting and diff integrity against the isolated synthetic review database. Preserve fail-closed money and official-record boundaries.
