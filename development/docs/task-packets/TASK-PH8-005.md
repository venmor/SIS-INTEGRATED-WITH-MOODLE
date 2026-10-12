# TASK-PH8-005: Accessibility/performance/low-bandwidth fixes

## Authority and ownership

User authorization: Phase 8 slice 5 implementation request, 2026-10-04.
Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 5 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); accessibility acceptance
(`12-testing-and-acceptance/01-end-to-end-acceptance-and-test-
strategy.md` §17.6; `02-acceptance-test-catalogue.md`
§Accessibility acceptance + §Release blockers;
`05-accessibility-usability-and-low-bandwidth-tests.md`);
applicant journey §10 (exact requirements: persistent visible
labels, linked + announced errors, named password controls,
text-paired error colour, focus to heading on route change and
to summary on failed submit, 200% zoom without h-scroll,
Saving/Saved/Retry distinction on slow connections). Exact
evidence: applicant journey Part 10 (active requirements).
SUP-001–SUP-013 apply. Depends on TASK-PH8-001..004 (their
behavior is unchanged; prior suites are regressions).

## User outcome and boundaries

Keyboard-only completion, visible/logical focus, zoom/reflow,
slow-connection behavior, and non-colour status proven by
automation on the critical journeys (sign-in, applicant
workspace, notifications centre, ops queue); automated axe
scans (serious/critical fail); skip-link targets that resolve
on every journey page; token-contrast proof; human-run
checklist for screen-reader traversal and participant
acceptance (never auto-claimed). No palette redesign, no
production perf budgets, no real-AT-participant testing.

## Interim demo decisions (fail-closed until approved)

- `@axe-core/playwright` added as a devDependency only (user
  approved 2026-10-04); pinned version, lockfile updated. No
  production dependency change.
- One global skip target (`#main-content`, `tabIndex={-1}`) on
  every top-level `<main>`; the admin wrapper div loses its
  duplicate id. Focus moves to the heading/main on route
  change; failures focus the error summary (existing
  `ErrorSummary` behavior, now asserted).
- Zoom proof at 640px (≈200%) + 320px stress + the existing
  390px journeys; no horizontal scroll and key content
  reachable in each.
- Slow-connection proof via delayed routes (loading states
  appear, resolve, save-state wording distinguishable); no
  real-network throttling dependency.
- Contrast proven by script over `tokens.css` (≥4.5:1 text);
  only genuine failures change values (no invented palette).
- No `OpsIncident` automation from a11y findings; operators
  file follow-ups manually.

## Policy and explicit demonstration scope

No new policy values. Demo data only (SUP-009).

## State authorization failure and recovery

No authorization change. Failing axe/contrast/label checks
fail the suite (release blocker per the acceptance catalogue);
manual checklist results are recorded, never asserted in code.

## Proof and documentation

Browser (fresh migrated + seeded browser DBs, rebuilt apps):
axe scans serious/critical-clean on the four journeys;
skip-link + route-focus + error-summary-focus assertions;
label-association helper green on journey pages; 640px/320px
no-overflow + reachable content; slow-connection loading +
save-state proof; touch-target spot assertions. Scripts:
token-contrast proof. Recorded Next route-size evidence (no
enforcement). Unit/typecheck/lint green; prior suites
regressions on fresh DBs. Record in PHASE-8 review +
NOTE-PH8-005.

## Out of scope and open gates

Real assistive-technology-user testing and participant
acceptance; palette redesign; production performance budgets;
CAPTCHA/SMS routes (absent in demo). Gates: GAP-009, GAP-024,
open decisions (monitoring/escalation ownership, UAT
participants — the participant pool for human acceptance).

## Completion

Implemented in the worktree 2026-10-04 (uncommitted, human
review pending): `@axe-core/playwright` 4.13.0 devDependency,
`accessibility.spec.ts` 10/10 on fresh `sis_ph8_s5_test`
(axe ×4, skip/route/error focus, labels, 640px/320px, slow
connection), unified `#main-content` landmarks + `RouteFocus`,
two checkbox explicit ids, contrast A5/A6 (script 11/11),
reduced-motion guard, manual checklist; `notifications` +
`ops-queue` 1/1 regressions; unit 78/78; see VERIFICATION
Phase 8 slice 5 and NOTE-PH8-005. Human review pending.
