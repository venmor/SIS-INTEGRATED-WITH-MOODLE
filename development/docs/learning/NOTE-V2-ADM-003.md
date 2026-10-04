# V2-ADM-003 — deterministic admissions queue ordering, 2026-10-02

The existing scoped admissions queue now supports **Oldest first** and **Newest first**. The API orders claimable cases by creation time and my cases by claim time, using application ID to break ties. The signed keyset cursor binds the direction, so a saved page link cannot silently switch order. The UI retains the order in the URL and starts at page one when it changes. Default oldest-first behavior and all existing claim, intake and assignment restrictions remain.

The equal-timestamp API case first failed before the `sort` parameter was implemented, then passed for both directions and rejected a cursor reused with the other direction. On the isolated synthetic PostgreSQL database, combined queue/setup API suites passed **19/19**; the admissions browser suite passed **4/4**, including 390px pagination, URL/reload retention, and claim/release. API and web production builds and `npm run typecheck` passed. See [packet](../task-packets/TASK-V2-ADM-003.md).

This is reviewer-controlled ordering, not an approved priority or deadline policy. It does not allocate work, balance officers, or authorize bulk decisions. Concurrent mutations, manual accessibility review, production load targets and institutional school/programme scope remain open.
