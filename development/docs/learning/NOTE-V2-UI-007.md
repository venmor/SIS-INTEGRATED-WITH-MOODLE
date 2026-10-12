# UI-007 — Workspace visual structure and route cues

User-directed visual cleanup, 12 October 2026. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human visual acceptance remains pending.

The existing workspace positions and role-scoped destinations are retained. Student and applicant navigation now uses a white navigation surface, token-based emerald selected state and a small decorative route icon beside its visible label. The student header has a clear brand edge and the workspace switch is a distinct secondary control. Staff navigation uses a darker emerald rail with high-contrast labels and a light selected destination; top-bar account actions remain visibly secondary. Student task destinations use a consistent section edge, while facts and history remain quieter.

This follows the exact Section 19 Part 1 UI constitution, Section 12 portal/navigation/accessibility rules and cross-blueprint Part 2A. Existing TASK-V2-UI-003 and TASK-V2-UI-005 retain the source scope: focused portal navigation, persistent staff navigation and real destinations only. The user requested colour and icons; these changes improve orientation without adding a dashboard, feature, role or institutional branding claim.

All colours use the existing proposed design tokens. Icons are local inline SVG with `aria-hidden` and `focusable=false`; visible link text remains the accessible name. No icon font, external image, new package, provider, tracking or network request was introduced. Navigation touch targets remain at least 44px; keyboard focus is explicit on details controls and the darker staff rail. Transitions are brief and disabled under reduced-motion preference.

Data, API contracts, policy decisions, permissions and audit behavior are unaffected. Academic-context preservation in portal navigation is a separate registration correction and is retained unchanged by this cleanup.

Verification: scoped ESLint passed for `navigation-icon.tsx` and `portal-nav.tsx`; `git diff --check` passed. Production build, connected browser checks and visual desktop/mobile review are coordinated by the root agent after all concurrent source changes freeze. Do not interpret this source check as complete WCAG or human acceptance evidence.
