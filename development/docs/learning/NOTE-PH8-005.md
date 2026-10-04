# Learning Note — TASK-PH8-005 (accessibility/performance/low-bandwidth)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-10-04 / v0.9.0 track Phase 8 slice 5
- Branch: worktree (human review pending)

## What was built and why

Roadmap slice 5 against applicant journey §10, testing §17.6,
the acceptance catalogue (§Accessibility acceptance + release
blockers) and the a11y/low-bandwidth test doc. Automated proof
where automation is honest; human passes stay human
(`docs/demo/ACCESSIBILITY-CHECKLIST.md`, never auto-claimed).

## Frontend

- `@axe-core/playwright` 4.13.0 (devDependency, user-approved;
  lockfile updated): WCAG 2A/AA scans on sign-in, applicant
  workspace, notifications centre, ops queue — serious/critical
  clean on first runs, no code changes needed.
- One skip target (`#main-content`, `tabIndex={-1}`) on every
  non-admin top-level main; the admin layout content wrapper
  carries it for the whole admin section (no duplicate ids).
  Fixed genuinely broken targets: applicant/student/
  notifications used private ids, discover/sign-in/recovery
  had none, home and error boundaries had none.
- `RouteFocus` (root layout, Suspense-wrapped): repairs focus
  into the landmark after client-side navigation without
  stealing user-placed focus; module-scoped boot flag (layout
  remounts would defeat a ref) plus repair ticks across the
  loading→content swap. Full-load navigations (plain-`<a>`
  cards from `@sis/ui`, which cannot import `next/link`
  without framework coupling) keep standard MPA top-of-document
  focus — recorded, not fought.
- Label sweep: shared helper (explicit, wrapping, aria naming)
  green on all four journeys; two workspace checkboxes gained
  explicit ids (implicit wrapping labels already passed axe).
- `prefers-reduced-motion` guard in `globals.css` (only short
  button transitions exist; they collapse to none).
- Token contrast amendments A5/A6 (info-text blue-800,
  warning/attention-text gold-800) after the proof script
  caught 4.33:1 and 3.93:1 pairs; 11/11 AA now. The
  `aria-live="assertive"` break-glass banner is a genuine
  emergency alert — audited, unchanged.

## Backend/domain

- None (no API change; no migration).

## Database/migration

- None.

## Security + authz

- No change. No new policy values.

## Tests and what they prove

- `accessibility.spec.ts` **10/10** on fresh migrated +
  seeded `sis_ph8_s5_test` with rebuilt apps (axe ×4 with
  label checks, skip-link keyboard path, route focus on a true
  SPA navigation, error-summary focus, 640px/320px reflow +
  touch targets, slow-connection pending→complete): 390px
  elsewhere, keyboard/focus, no overflow, empty localStorage.
- `contrast-check.test.mjs` 11/11 via `test:scripts` (RED
  first: the two failing pairs).
- Regressions on the same DB with the new focus/landmark code
  active: `notifications` + `ops-queue` 1/1 each
  (`entity-timeline` skipped — white-box seed collides on
  rerun, NOTE-PH8-002 lesson).
- Unit 78/78; API typecheck exit 0 (untouched); web typecheck
  exit 0; web production build exit 0; lint clean on touched
  files. `npm run scan` cannot run here (ripgrep unavailable).
- Perf evidence (recorded, not enforced): client JS
  1,959,607 bytes across 84 files (uncompressed, includes
  shared React/Next runtime); zero raster images in the app;
  fonts self-hosted via `next/font` (no runtime CDN).

## What failed or confused us

- Workspace axe-test setup hit the 5-minute catalogue fetch
  cache (`revalidate: 300`): seeded data invisible under the
  cached key. Fixed by searching (distinct query key) — lesson
  for all seeded browser tests, not just a11y.
- Skip-link click is unclickable by design (offscreen until
  focused): drive it with Tab+Enter like a real keyboard user.
- First route-focus design (pathname effect + ref flag) failed
  twice, each diagnosis changing the fix: (1) polling proved
  it was not timing; (2) a `window.__spaMark` probe proved the
  effect remounted with `first=true` → module flag; (3) a
  second probe (`spaMark` null, `navType: navigate`) proved
  full document loads from plain-`<a>` cards → repair ticks
  that never steal user focus. Debug specs deleted after use.
- Label helper initially rejected valid wrapping labels;
  strengthened to mirror accessible-name computation, then
  still gave the two checkboxes explicit ids.
- `Select-String` cannot take `[id]`-style paths (brackets);
  use the scoped grep/read tools for those files.

## Questions to revise

- Human passes in ACCESSIBILITY-CHECKLIST (both developers);
  per-route `<title>`s (root title only today); participant
  acceptance pool (UAT open decision); production perf
  budgets; GAP-009/GAP-024 stay open.
