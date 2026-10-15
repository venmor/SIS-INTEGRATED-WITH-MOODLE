# TASK-V2-UI-010 — Consistent presentation across staff routes

Lead Charles Hangoma; reviewer Chitindu Milimbo. Authority is the user's 14 October 2026 request to extend the selected UI direction to every page and correct independent sidebar/workspace scrolling. The UI Constitution and cross-blueprint input catalogue remain controlling.

Scope: all 49 current staff routes and their existing forms, details, decisions, summaries and comparison views. Use explicit staff-only primitives and retain component-specific layouts where the workflow needs them. Desktop navigation scrolls separately from the workspace; the sidebar/account stay visible. Mobile navigation collapses accessibly with ordinary document scrolling.

Preserve labels, field IDs, values, endpoint paths, pending/error/success states, authority checks, evidence, decision consequences and idempotency. No API/schema changes, provider success, extra authority, fake charts, new actions, image/font/icon download, or claimed institutional signoff.

Source coverage: [staff inventory](../design/STAFF-UI-COVERAGE-2026-10-14.md). The supplied unchanged pages — grade mappings, validation findings and Moodle administration — are explicitly included. Deep assessment, finance, access review and integration decisions are included, not deferred behind the two initial registries.

Verification: the new browser case must fail on the native short mapping field and missing task regions before implementation. After the coordinated build, verify labelled controls, real task links, mobile overflow, independent scroll/account persistence and existing connected actions. Check TypeScript, lint, focused workflow tests, accessibility and the full browser suite. Compare staff screenshots with the selected visual direction. Record any remaining visual issues; source coverage alone is not browser acceptance.

The complete interface programme also covers all 34 public/auth/applicant/student templates and 9 notification/design-preview templates, totalling 92. See PORTAL-UI-COVERAGE-2026-10-14.md and the root-owned notification/fallback/preview patterns. This staff packet remains the shared scrolling and staff-content contract; existing portal focus/navigation contracts remain distinct.
