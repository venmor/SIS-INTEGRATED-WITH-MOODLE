# TASK-V2-SUPPORT-001 — Academic-help request with an accountable receiver

- Release: v2.0 Task 6. Implementation lead Charles Hangoma; reviewer Chitundu Milimbo. Human service-owner and institutional policy approval remain open under GAP-V2-002.
- Authority: exact Student Blueprint 2 Part 6, Design Section 8, cross-blueprint permission/visibility Parts 3A/3B, Section 19 UI constitution and v2 operating-SIS spec §3.7.
- Scope: effective-dated student-to-adviser relationship and academic service route; student readiness and own-request views; demo-only request submission when route and appointed owner are live; receiver-assigned queue; transactional case, history and audit; scoped browser UI. Synthetic records only.
- Exclusions: counselling, welfare, disability, safeguarding, discipline, automatic risk scoring, external notifications, booking and live institutional activation. Existing applicant `SupportTicket` is not reused.

## Required behavior

1. The student sees the exact receiving academic adviser/service before submitting. Missing, conflicting, expired, revoked or out-of-programme routes disable submission and explain why.
2. Only an active student workspace with its own student record can create/read a request. An adviser sees only requests assigned to the selected live adviser appointment. A technical admin has no support-content bypass.
3. A confirmed request writes a case, owner, event and minimized audit in one transaction. A replay with the same key returns the same receipt; a key reused with different content is rejected. No request reports success if the transaction or route check fails.
4. The student can omit narrative and use secure portal contact. Academic narrative is not a counselling record; the form warns against submitting urgent/private wellbeing details.
5. Local demo activation requires `DEMO_MODE=true` and an explicitly demo-only service route. A production route is not activated by this slice; GAP-V2-002 records the remaining authority and operational decisions.

## Verification

Use an isolated synthetic PostgreSQL database. Test allow/deny, relationship and scope changes, idempotency, case/audit atomicity, student/receiver visibility, API failure recovery, 390px layout, keyboard controls, web and API builds. No real student data or Moodle connection.
