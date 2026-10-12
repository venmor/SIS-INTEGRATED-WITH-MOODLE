# Review Pack — TASK-PH8-005 Accessibility/performance/low-bandwidth (for Charles)

Commit `6b2e48b` (+axe dep; ~30 files). Lead Chitundu Milimbo.
Packet: `docs/task-packets/TASK-PH8-005.md` (draft — your
approval keystroke pending). Note: `NOTE-PH8-005.md`.

## What changed and why (30 seconds)

- axe scans (WCAG 2A/AA) on 4 journeys: clean, no code needed.
- Skip link repaired (was broken everywhere except admin);
  one `#main-content` target per page; new `RouteFocus`
  repairs focus after SPA navigation without stealing
  user-placed focus.
- Label sweep (2 checkboxes given explicit ids); 640/320px
  reflow; slow-connection proof; token contrast A5/A6 (script
  caught 4.33 + 3.93 pairs); reduced-motion guard.
- Deliberately NOT changed: plain-`<a>` cards keep MPA
  top-focus (framework boundary, recorded); no palette
  redesign; human passes stay human.

## Proof to spot-check

- `accessibility.spec.ts` 10/10 fresh DB + rebuilt apps;
  contrast script 11/11 RED-first; `notifications` +
  `ops-queue` 1/1 regressions; unit 78/78.
- Key files: `app/route-focus.tsx` (77 lines),
  `accessibility.spec.ts`, `tokens.css` A5/A6,
  `docs/demo/ACCESSIBILITY-CHECKLIST.md` (your runs pending).

## Open questions for you

1. RouteFocus repair-tick design (max 4s, never steals focus)
   — acceptable, or prefer per-page focus?
2. MPA/SPA split recorded correctly?
3. Contrast amendments A5/A6 (darker info/warning text) —
   acceptable within the proposed palette?
4. Approve `TASK-PH8-005`? (edit its Completion line)

## Approval (human keystroke only)

- [ ] Charles Hangoma approves TASK-PH8-005 — date: ______
