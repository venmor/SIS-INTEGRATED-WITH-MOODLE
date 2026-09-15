# Learning Note — TASK-PH0-004

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.1.0 Phase 0 slice 4

## What we built and why

Design-token foundation plus the three simplest approved components, so journey slices compose instead of inventing UI. Palette = supervisor proposal adopted with A1–A4; everything stays PROPOSED until institutional sign-off.

## Frontend explanation

- `packages/ui/src/tokens.css`: full palette scales + semantic aliases bound to 19.7 meanings + link tokens (A1) + `--error-dark/-darker` (A2) + `--attention-*` (A3) + role tokens (page/surface/text/border, light + dark) + spacing/type/radius/focus. Web consumes via `@import "@sis/ui/tokens.css"` (exports subpath) in `globals.css`.
- `Status` (server): 19.10 anatomy — state/reason/updated/owner/action; six severities; `role="status"`.
- `Notice` (client): 19.9 message shape; live role escalates to `alert` for attention/warning/error; local-only dismiss.
- `Empty` (server): `nothing/scoped/action` cases — empty must never look like denial.
- Web shell: 19.4 order (context → title → lede → Status → one primary action → supporting), single primary link per 19.11, `transpilePackages: ["@sis/ui"]`.

## Backend/domain explanation

No backend change. API `/health` untouched and still green.

## Database/migration explanation

None. Prisma contract untouched.

## Security and authorization explanation

No auth yet. Scoped-empty copy pattern (UI-EMPTY-001 `scoped` case) is in place for future use — no existence disclosure by construction.

## Tests and what they prove

`next build` (TS + prerender), web `eslint`, live-render curl (Status copy server-side), contrast math per pair (see TASK), forbidden-pattern scan, `diff --check`. Component render-test runner deferred to CI/testing slice (stated gap, not hidden).

## What failed or confused us

1. Turbopack rejects `.js`-suffixed re-exports in the ui barrel → extensionless imports (API keeps `.js` style under nodenext; ui follows bundler style — documented divergence).
2. A tsconfig `@sis/ui/*` wildcard hijacked the CSS package import (`src/src` doubling) → CSS uses the exports subpath, TS keeps the exact alias only.

## Terms/concepts learned

- 19.7 meanings-vs-values split; AA math (4.5 normal / 3.0 large); colour-never-alone.
- `transpilePackages` for workspace TS; package `exports` subpaths; live roles status vs alert.

## Questions to revise before presentation

1. Why is the palette “proposed” and who approves it? 2. Why is the link blue-700, not blue-600? 3. Why three Empty cases? 4. Why is Notice dismissal not evidence?
