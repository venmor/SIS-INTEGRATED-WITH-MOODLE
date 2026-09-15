# TASK-PH0-004: Design tokens + Status/Notice/Empty components

## Authority

- Phase/release: v0.1.0 Phase 0 (slice 4)
- Requirement IDs: REQ-NFR-003, REQ-NFR-006, REQ-NFR-008
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope `packages/ui` + shell re-skin only
- Action/screen/component IDs: UI-STATUS-001, UI-NOTICE-001, UI-EMPTY-001 (contracts in `packages/ui/README.md`); no screen IDs — shell only
- Policy/configuration version: none — palette is PROPOSED, requires institutional approval (not policy truth)
- Acceptance-test IDs: shell verification only (build, lint, contrast math, render check, pattern scan)
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md (19.2, 19.4, 19.6–19.10)
  - unza-sis-moodle-design-handbook-v3.0.0/04-UI-UX-DESIGN-SYSTEM/02-screen-and-component-catalogue.md
  - unza-sis-moodle-design-handbook-v3.0.0/04-UI-UX-DESIGN-SYSTEM/03-foundations-and-input-components.md (§14.2–14.3)
- Palette proposal: supervisor colour guide (Green `#007A20` / Gold `#F3950C` / Blue `#46B8DA` / Red `#C0392B`), adopted with amendments A1–A4 below
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (Repository/Git/learning/CI foundation)
- Open design-gap IDs: none blocking Phase 0 (final brand approval stays open production decision)

## User outcome

The shell page follows the 19.4 hierarchy in proposed UNZA colours, and the three simplest approved components exist with full §14.2 contracts for journey slices to reuse.

## Architecture boundary

- Owning module: none yet — `@sis/ui` shared primitives, web shell only consumer
- Permitted dependencies: none new (react peer only); `transpilePackages: ["@sis/ui"]` in web config
- API/command/event contracts: none
- Data entities/migration impact: none
- External adapters: none

## Required controls

- Authorization/relationship: n/a — static shell
- Privacy/classification: no personal data; static copy only
- Validation/state transitions: n/a (Notice dismissal is local-only, never evidence)
- Audit: verification log below for reviewer re-run
- Idempotency/rate limiting: n/a
- Failure/recovery: n/a — static render; API-health link degrades to plain link text offline
- Accessibility/UI states: role=status/alert per severity, aria-labels, visible focus ring, 200%-zoom-safe single column, mobile padding breakpoint; colour never alone

## Amendments to palette proposal (Lead-approved)

- A1: link resting state `--blue-700` (measured 4.89:1 on white); `--blue-600` measured 3.14:1 — large/bold only.
- A2: danger hover/active tokenized as `--error-dark`/`--error-darker`; no raw hex in components.
- A3: Attention mapped distinctly (`--attention-*`, gold-700 text grade) — 19.7 lists it separately from Warning.
- A4: `tokens.css` header marks everything PROPOSED; final brand needs institutional sign-off.

## Verification (all run, Node 24.21.0)

- `npm install` clean; `next build` passes (TS + static prerender); `eslint` web clean.
- Contrast math (WCAG): gray-900/white 17.40, green-500/white 5.52, green-700/white 8.84, blue-700/white 4.89, gold-700/white 4.32 (AA-large only — never body text; components use it for borders/large text only), white/green-500 5.52, gray-900/gold-500 7.55.
- Live render (`next start` + curl): shell hierarchy + Status copy present server-side.
- Fixes during build: ui barrel uses extensionless imports (Turbopack); CSS imports package subpath `@sis/ui/tokens.css` (tsconfig wildcard had hijacked it — removed).
- Forbidden-pattern scan (gradient/glass/chatbot): absent. `git diff --check`: clean.

## Out of scope

Field/Button/Table/Timeline/Decision/Document, component render-test runner (web has eslint only — arrives with CI/testing slice), form logic, data wiring (Status copy is static), final brand sign-off.

## Definition of done

- [x] Tokens encode palette + A1–A4 + spacing/type/radius/focus; header marks PROPOSED
- [x] Three components with complete §14.2 contracts in `packages/ui/README.md`
- [x] Shell re-skinned (19.4 order, one primary action, Status static)
- [x] Verification above all green
- [ ] Chitindu reproduces on WSL (pending)
- [ ] Reviewer can explain the change (pending walkthrough)
