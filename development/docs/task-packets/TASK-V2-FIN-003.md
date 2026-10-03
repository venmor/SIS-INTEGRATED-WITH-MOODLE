# TASK-V2-FIN-003 — Adjustment and refund review queue

- Release: v2.0 finance workbench increment. Lead Chitundu Milimbo; reviewer Charles Hangoma. Institutional and release approval remain pending.
- Authority: exact Design Section 6 student-finance evidence, Finance Blueprint 8, permission matrix Part 3A, UI table/filter/empty patterns, TASK-PH5-006 and the approved v2 operating-SIS design. Later security and official-record rules take precedence.
- Scope: read-only, bounded pending adjustment/refund pages for the selected live Finance Officer or Finance Approver appointment; kind and oldest/newest filters; exact matching count; actor/appointment/filter-bound signed cursor; responsive worklist and current-page decision selection. Synthetic records only.
- Exclusions: money-rule or threshold changes, real refund execution, provider connection, bulk decisions, new staff scope, certified reporting, exact-account lookup, and student-owned adjustment history.

## Required behavior

1. The API limits `REQUESTED` rows in the database, orders by `(createdAt,id)`, and counts the exact selected kind. `ALL`, `CREDIT_NOTE`, `WAIVER`, and `REFUND` are the allowed kind views. Cursor changes, stale anchors and invalid limits fail closed.
2. The selected live finance role alone can read the queue. The existing request/approval separation, step-up challenge, maker/checker denial and compensating ledger behavior are not bypassed.
3. Staff can see the applied kind/order, the number matching, a first-page recovery route and next page at 390px or desktop widths. The decision selector contains only the current page; it never submits a batch approval.

## Verification

Observe a red API test before implementation. Cover equal-time traversal, kind/order/actor binding, tamper and stale-anchor denial, invalid limit and role denial. Re-run the full finance governance suite, connected finance browser story at 390px, Prisma validation, API/web builds, lint and diff integrity against the isolated synthetic review database.
