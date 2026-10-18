# UI-014 — Student dashboard and study navigation simplification

Date: 18 October 2026. Lead Charles Hangoma; reviewer Chitindu Milimbo. User direction in this session authorizes a simpler student dashboard, context-sensitive registration and studies, a results table, an account area, notifications inside the student shell, and a useful sign-out action. Human visual acceptance remains pending.

Authority: TASK-V2-UI-003/UI-011/UI-013; exact Student Blueprint 2 Parts 1, 3, 4 and 5 (records 012, 014, 015, 016); exact Section 19 Part 1 UI Constitution and cross-blueprint Part 2A; later privacy, security and official-record rules. The handbook source bodies remain unchanged.

Scope: student shell, dashboard, account, courses/readiness/register presentation, own notification view and official results presentation. Preserve existing server-authorized own-record endpoints, no-store reads, registration idempotency and receipt, published-result mark suppression, correction approval and notice action safety. Use source state for registration prompts. A failed status read remains unknown. Keep academic attempt/period links on the registration routes.

Dashboard shows registration state and entry links. It does not show bio data, correction forms or a wall of operational records. My account shows bio data, contact details, status, contact change and official correction request/history. Contact changes use the existing save and verification flow; official corrections retain approval review. Notifications render under `/student/notifications` within the student shell and use the existing own-record service/actions. The standalone `/notifications` route remains available to other roles.

Registered readiness and registration routes omit the draft step strip while retaining receipt and current checks. Course planning uses a draft heading only for editable plans; submitted plans are read-only and named My courses. Results render a bounded table with search, period and ordering; one selected course opens details, review instructions and version history.

The current student results contract has only final official course outcomes and a period code. It has no assessment kind, year of study or semester. See [GAP-V2-RESULTS-UI-001](../gaps/GAP-V2-RESULTS-UI-001.md). Do not infer these from course type or period text or show provisional Moodle marks as official results.

Verification: scoped web lint/typecheck, isolated Playwright study-workflow suite, mobile axe and visual captures, plus connected role/API checks before human acceptance. No commits, merges, pushes, policy changes or database resets in this increment.
