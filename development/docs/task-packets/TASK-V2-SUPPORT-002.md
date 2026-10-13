# TASK-V2-SUPPORT-002 — Find and triage assigned academic requests

- Release: v2.0 Task 6/7 increment. Implementation lead Charles Hangoma; reviewer Chitundu Milimbo. Institutional service ownership remains unapproved under GAP-V2-002.
- Authority: exact Student Blueprint 2 Part 6, Design Sections 8 and 19, permission/visibility Parts 3A/3B, TASK-V2-SUPPORT-001 and the v2 operating-SIS spec §3.7.
- Scope: a bounded, appointment-scoped adviser queue with database-side reply-need/status filter and exact case-reference lookup; URL-preserved filter/page context; synthetic demo data only.
- Exclusions: automated priority or risk scoring, counselling/referral queues, case reassignment, service target calculation, student notifications and live activation.

## Behavior and checks

The selected, live adviser appointment remains the first database predicate. A filter for “Needs reply” includes newly received and student-replied cases; “I replied” is distinct. Exact case reference does not search student names or private narrative. An invalid status/reference is rejected. Each changed filter starts at the first page; paging carries the filter, and a stale cursor is recoverable. Neither search nor page links expose case details. Verify allow/deny and filter combinations in the API, a connected adviser browser path at mobile width, production builds, lint and Prisma migration on the isolated review database.
