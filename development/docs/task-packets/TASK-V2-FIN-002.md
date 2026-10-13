# TASK-V2-FIN-002 — Payment-arrangement review queue

- Release: v2.0 finance workbench increment. Lead Chitundu Milimbo; reviewer Charles Hangoma. Human institutional and release approval remain pending.
- Controlling source: exact Design Section 6 student-finance evidence, Finance Blueprint 8 arrangement journey, permission matrix Part 3A, UI table/filter/loading/empty patterns, TASK-PH5-006 and the approved v2 operating-SIS spec. Later security and official-record controls take precedence.
- Scope: read-only, bounded pending-arrangement pages for the current live Finance Officer or Finance Approver appointment. A staff table shows terms, reason and state, with a count, oldest/newest ordering, URL-preserved next/first navigation and safe stale-page recovery. Synthetic records only.
- Exclusions: new arrangement terms, payment or clearance policy, authority changes, bulk decisions, real provider calls, certified reporting, student-owned history paging and adjustment queue paging.

## Required behavior

1. The API limits requested arrangements in the database, orders by `(createdAt,id)`, and returns the exact pending count. A cursor is signed and bound to resource, account, live selected appointment and order; changed or removed anchors fail closed.
2. Only the selected live finance role can read the staff queue. Student `GET /arrangements` keeps its current own-account response and cannot use a staff cursor to view pending peers. Other roles remain denied.
3. At 390px and desktop widths, staff can see useful summaries without an unbounded list. Navigation preserves order; the first-page link recovers from stale cursors. Individual decision remains an existing separately authorized command, with no bulk money effect.

## Verification

Observe an API test fail before implementation, then cover equal-time traversal, ordering, actor/appointment binding, tamper and stale-anchor denial, invalid limits and student/other-role isolation. Check the connected staff browser queue at 390px, the existing arrangement decision journey, production builds, lint, Prisma validation and diff integrity on the isolated review database.
