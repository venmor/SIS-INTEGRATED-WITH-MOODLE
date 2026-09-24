# Demo-Ready V2 Frontend Completion Programme

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Phase-6 SIS into a polished, coherent, presentation-ready institutional product while preparing the front end for Phase 7–9 and honestly visualizing approved v1.1–v2.0 modules that do not yet have backend implementations.

**Architecture:** Work from the current `main` baseline at `4d32f6e6ea182b9128e14c7a34c21f65f8d4dfe1` on branch `demo-v2-readiness`. Preserve all live Phase 1–6 domain behavior. Consolidate shared shells/navigation/components first, then polish live student/staff workspaces, add deterministic demo orchestration, add preview-only future workspaces, and finish with cross-workspace visual/accessibility/demo-rehearsal gates.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, NestJS, Prisma 7, PostgreSQL 18, CSS Modules, `@sis/ui`, Playwright 1.63, Node 24.

**Spec:** `development/docs/superpowers/specs/2026-09-23-handbook-driven-ui-modernization-design.md`

## Current Baseline

Already live and must not be rebuilt:

- Identity, login, workspace switching, scoped authorization.
- Public programme discovery and applicant workflow.
- Admissions queue, case review, recommendation and approval.
- Student conversion, registration/readiness/course selection/change requests.
- Finance account, pay request, arrangements, officer workspace, reconciliation, sponsorships, cashier and adjustments.
- Teaching TG management.
- Moodle administration, mappings and maintenance.
- Integration deliveries, replay decisions and reconciliation.
- Audit, access review and role-assignment administration.
- Existing responsive/skeleton/error-state polish waves.
- Deterministic local `npm run demo:reset` guard.
- Phase-6 simulator/recovery implementation and tests.

Still missing from the presentation sequence:

- Phase 7 Assessment and Official Results.
- Phase 8 full notification/audit/operations/accessibility/demo evidence hardening.
- Phase 9 presentation orchestration and reproducible story pack.
- Later v1.1–v1.8/V2 modules that do not yet have backend domains.

## Global Constraints

- Do not rewrite Phase 1–6 business rules during UI completion.
- Do not replace real Phase-6 Moodle/integration routes with old preview screens.
- Unimplemented Phase 7+/V2 areas must be labelled `Design preview · No live records or actions.` until their backend exists.
- Preview routes remain under `/design-preview/**`, `noindex, nofollow`, and never appear as production-capability links.
- No gradients, glassmorphism, excessive rounded cards, decorative metric dashboards, floating assistants, or generic SaaS layouts.
- Status and authority are written in text; colour never carries meaning alone.
- Routine UI copy stays short. Explain only policy, consequence, uncertainty, ownership, or recovery.
- Every staff workspace shows active role/scope.
- Every critical state has loading, empty, error, stale/unknown, denied and recovery handling where applicable.
- Every live action remains backend-authorized; hiding a button is never the security boundary.
- 390px and 1440px are required visual evidence sizes.
- No horizontal overflow on critical journeys.
- Existing Phase 1–6 regression tests remain green.
- Demo data is fictional and resettable. No real credentials or personal data are added.
- V2 preview work must not create empty backend modules solely to claim coverage.

## Review Focus

1. **Route fragmentation:** a reasonable user should always know which workspace they are in, where to go next, and how to return home.
2. **Demo-state drift:** after reset, the exact personas/story records needed for presentation must exist predictably.
3. **Preview/live confusion:** future V2 screens must never look like actions already affect authoritative records.
4. **Role leakage:** finance, admissions, Moodle, integration, teaching, examinations and admin controls must remain scope-correct.
5. **Presentation recovery:** if Moodle/provider/network/browser state fails during the demo, the system must still expose evidence, fallback routes and a clear next step.

---

## Workstream A — One coherent live product shell

### Task 1: Consolidate live workspace navigation and page framing

**Files:**
- Create: `development/apps/web/app/workspace-nav.tsx`
- Create: `development/apps/web/app/workspace-nav.module.css`
- Modify: `development/apps/web/app/page.tsx`
- Modify: `development/apps/web/app/admin/layout.tsx`
- Modify: `development/apps/web/app/admin/admin-shell.module.css`
- Modify: `development/apps/web/app/applicant/applicant.module.css`
- Modify: `development/apps/web/app/student/student.module.css` if present; otherwise create it.
- Test: `development/tests/browser/ui-workspace-navigation.spec.ts`

**Interfaces:**
- Consumes active workspace `{ role, scopeType, scopeRef }`.
- Produces a single role-aware navigation model used by home/admin/student surfaces.

- [ ] **Step 1: Write failing role-navigation contracts**

Test representative personas:
- Student sees Student home, Courses, Registration/Readiness, Finance.
- Finance officer sees Finance workspace.
- Moodle admin sees Moodle workspace.
- Integration support sees Integration workspace.
- Admissions officer sees Admissions queue.
- No user sees links for a role they do not hold.
- 390px navigation remains accessible without horizontal overflow.

- [ ] **Step 2: Verify RED**

Run the browser spec against current role routes. Expected: fragmented/missing onward links fail.

- [ ] **Step 3: Implement a role-aware navigation model**

Use a pure mapping:

```ts
export interface WorkspaceNavItem {
  label: string;
  href: string;
  roles: readonly string[];
}

export const workspaceNavItems: readonly WorkspaceNavItem[] = [
  { label: "Student home", href: "/student", roles: ["STU"] },
  { label: "Courses", href: "/student/courses", roles: ["STU"] },
  { label: "Finance", href: "/student/finance", roles: ["STU"] },
  { label: "Admissions", href: "/admin/admissions/queue", roles: ["ADMISSIONS_OFFICER", "ADMISSIONS_APPROVER"] },
  { label: "Finance workspace", href: "/admin/finance", roles: ["FINANCE_OFFICER", "FINANCE_APPROVER"] },
  { label: "Teaching groups", href: "/admin/teaching/groups", roles: ["LEC", "TUT", "COURSE_COORDINATOR"] },
  { label: "Moodle", href: "/admin/moodle", roles: ["MOODLE_ADMIN"] },
  { label: "Integration", href: "/admin/integration", roles: ["INTEGRATION_SUPPORT"] },
];
```

Reuse the same labels on the signed-in home and admin shell.

- [ ] **Step 4: Add page-frame consistency**

Every live workspace gets:
- short context line,
- page title,
- status/next-action region if needed,
- consistent max-width,
- consistent section spacing,
- same focus treatment,
- restrained surfaces.

- [ ] **Step 5: Verify GREEN and commit**

Commit: `feat(ui): unify live workspace navigation`

---

### Task 2: Polish all live Phase-4/5 student and finance journeys

**Files:**
- Modify:
  - `development/apps/web/app/student/page.tsx`
  - `development/apps/web/app/student/courses/page.tsx`
  - `development/apps/web/app/student/readiness/page.tsx`
  - `development/apps/web/app/student/register/page.tsx`
  - `development/apps/web/app/student/changes/page.tsx`
  - `development/apps/web/app/student/finance/page.tsx`
  - `development/apps/web/app/student/finance/pay/page.tsx`
  - `development/apps/web/app/student/finance/arrange/page.tsx`
  - `development/apps/web/app/admin/finance/**/*.tsx`
- Modify shared CSS/modules only where the current route already uses them.
- Test: `development/tests/browser/ui-student-finance-polish.spec.ts`

**Interfaces:**
- No API contract change.
- Reuses live Phase-4/5 responses.

- [ ] **Step 1: Add failing hierarchy/mobile contracts**

Pin:
- student home order = required action → registration → finance → courses/recent state.
- money values align consistently and remain distinguishable from statuses.
- payment uncertainty never looks like success.
- holds always state effect + owner + next step.
- finance staff queues remain table/list oriented rather than metric-dashboard oriented.
- 390px no-overflow on every student/finance route.

- [ ] **Step 2: Verify RED where hierarchy/current copy differs**

- [ ] **Step 3: Refine visual hierarchy only**

Use existing `Card`, `DataTable`, `Money`, `StatusChip`, `PageHeader`, `Status`, `Notice`, `Skeleton` primitives. Do not introduce local duplicate primitives.

- [ ] **Step 4: Shorten routine copy**

Examples:
- `Your account is currently financially cleared for registration.` → `Financially cleared.`
- retain detail only when explaining a hold, uncertain payment, reversal or approval dependency.

- [ ] **Step 5: Verify GREEN and commit**

Commit: `feat(ui): finish student finance workspace polish`

---

### Task 3: Polish Phase-6 Teaching, Moodle and Integration operations

**Files:**
- Modify:
  - `development/apps/web/app/admin/teaching/groups/page.tsx`
  - `development/apps/web/app/admin/moodle/page.tsx`
  - `development/apps/web/app/admin/moodle/mappings/page.tsx`
  - `development/apps/web/app/admin/moodle/maintenance/page.tsx`
  - `development/apps/web/app/admin/integration/page.tsx`
  - `development/apps/web/app/admin/integration/deliveries/[id]/page.tsx`
  - `development/apps/web/app/admin/integration/replays/[id]/page.tsx`
  - `development/apps/web/app/admin/integration/reconciliation/page.tsx`
- Test: `development/tests/browser/ui-phase6-operations-polish.spec.ts`

**Interfaces:**
- No changes to Phase-6 simulator/worker/reconciliation contracts.

- [ ] **Step 1: Add semantic contracts**

Pin:
- operational home order = needs attention → health/freshness → deliveries/reconciliation → recent incident evidence.
- delivery detail clearly separates SIS source truth, Moodle destination state, attempt history and safe action.
- replay decision visibly states idempotency/four-eyes consequence.
- maintenance mode states affected integration and expected impact.
- teaching-group screen shows role/scope and TG authority.
- 390px no overflow.

- [ ] **Step 2: Verify RED only for presentation/hierarchy gaps**

- [ ] **Step 3: Implement polish without changing Phase-6 state machines**

- [ ] **Step 4: Verify GREEN and commit**

Commit: `feat(ui): polish teaching Moodle and integration workspaces`

---

## Workstream B — Demo with no hustle

### Task 4: Expand deterministic demo seed to the current live Phase-6 scope

**Files:**
- Modify: `development/prisma/seed/seed.ts`
- Create: `development/prisma/seed/demo-scenarios.ts`
- Create: `development/scripts/demo-doctor.mjs`
- Modify: `development/package.json`
- Test: existing API/browser suites plus a new seed assertion script.

**Interfaces:**
- `demo:reset` remains destructive/local-only and guarded.
- New `demo:doctor` is read-only.
- Scenario constants remain fictional.

- [ ] **Step 1: Add failing deterministic-scenario assertions**

Require after reset:
- known applicant draft,
- submitted application awaiting review,
- approved offer ready for acceptance/conversion,
- registered student,
- student with financial hold,
- successful payment/clearance scenario,
- Moodle delayed delivery,
- dead-letter/replay scenario,
- reconciliation mismatch,
- teaching/TG assignment,
- finance officer/approver,
- Moodle admin,
- integration support.

Do not add Phase-7 official results until Phase 7 exists.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Split seed scenario data from seed mechanics**

`demo-scenarios.ts` exports stable references and scenario labels; `seed.ts` writes them.

- [ ] **Step 4: Add `demo:doctor`**

It checks:
- environment is demo/local,
- DB reachable,
- required personas exist,
- required story records exist,
- frontend/API env variables are present,
- outputs PASS/FAIL with concise recovery commands.

Add package script:

```json
"demo:doctor": "node scripts/demo-doctor.mjs"
```

- [ ] **Step 5: Verify reset → doctor → browser smoke**

- [ ] **Step 6: Commit**

Commit: `feat(demo): seed deterministic phase6 story pack`

---

### Task 5: Add a safe Demo Control Centre

**Files:**
- Create:
  - `development/apps/web/app/demo/layout.tsx`
  - `development/apps/web/app/demo/page.tsx`
  - `development/apps/web/app/demo/demo.module.css`
  - `development/apps/web/app/demo/stories/page.tsx`
- Modify `development/apps/web/app/layout.tsx` only for metadata if needed.
- Test: `development/tests/browser/demo-control.spec.ts`

**Interfaces:**
- Visible only when `DEMO_MODE === "true"`.
- No passwords displayed.
- No production reset button.
- Links only to real live routes or clearly labelled previews.

- [ ] **Step 1: Write failing boundary tests**

Pin:
- route returns not-found/denied when DEMO_MODE is false.
- demo banner says `Demonstration environment · fictional records`.
- three story cards exist.
- each card identifies persona, starting route, objective and fallback.
- no password/token appears in DOM.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement control centre**

Story 1: Applicant → Student → Finance → Registration → Moodle event.  
Story 2: Teaching/Assessment → Official result; until Phase 7 is live, label remaining segment `Phase 7 preview`.  
Story 3: Moodle failure → Integration recovery.

- [ ] **Step 4: Add presenter checklist**

Show:
- `npm run demo:reset`
- `npm run demo:doctor`
- role/persona names
- clean-browser/profile reminder
- current story readiness state.

Do not expose seeded passwords in browser UI.

- [ ] **Step 5: Verify GREEN and commit**

Commit: `feat(demo): add presentation control centre`

---

## Workstream C — Complete the presentation release path

### Task 6: Prepare Phase-7 Assessment/Results front end without faking live results

**Files:**
- Create preview-only routes:
  - `development/apps/web/app/design-preview/assessment/page.tsx`
  - `development/apps/web/app/design-preview/assessment/staging/page.tsx`
  - `development/apps/web/app/design-preview/assessment/release/page.tsx`
  - `development/apps/web/app/design-preview/student/results/page.tsx`
- Extend preview navigation/data/CSS.
- Test semantic + visual preview specs.

**Interfaces:**
- Static fictional data only until Phase-7 API lands.
- Exact future live route names are documented but not linked as live actions.

- [ ] **Step 1: Write contracts from Phase-7 handbook**

Pin:
- provisional Moodle marks ≠ official SIS result.
- validation queue shows missing/out-of-range/unmapped states.
- lecturer can correct/stage only assigned scope.
- examination validation and result release are separate authorities.
- student sees only published official result.
- sysadmin never gets result-edit action.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement preview workspaces**

Follow professional workspace grammar already established; no dashboard cards.

- [ ] **Step 4: Add Phase-7 readiness note in Demo Control Centre**

- [ ] **Step 5: Verify GREEN and commit**

Commit: `feat(ui): preview assessment and official results journey`

When your real Phase-7 backend lands, a later task replaces these preview routes with live routes and preserves the visual contracts.

---

### Task 7: Phase-8/9 presentation hardening UI

**Files:**
- Modify live notification/audit/operations surfaces.
- Create `development/apps/web/app/demo/evidence/page.tsx`.
- Create/update browser tests for low-bandwidth/loading/error/denial/fallback states.

**Interfaces:**
- Evidence page is demo-only and read-only.
- Pulls no secrets.
- CI/artifact IDs may be static build metadata or documentation links; do not require GitHub credentials in browser.

- [ ] **Step 1: Pin presentation evidence requirements**

Show:
- current build/release identifier,
- audit evidence routes,
- deliberate Moodle failure/recovery route,
- authorization denial route,
- accessibility evidence checklist,
- known limitations.

- [ ] **Step 2: Add network/error state tests**

Use Playwright route interception where safe to show:
- API temporarily unavailable,
- stale/unknown status,
- retry/recovery instructions,
- no destructive duplicate action.

- [ ] **Step 3: Implement concise hardening states**

- [ ] **Step 4: Verify GREEN and commit**

Commit: `feat(demo): add presentation evidence and fallback states`

---

## Workstream D — V2 visual completeness without fake functionality

### Task 8: Add V2 module preview index and approved future workspace previews

**Files:**
- Modify: `development/apps/web/app/design-preview/page.tsx`
- Create preview families:
  - `student-depth` — add/drop, progression, transcript basis
  - `teaching-depth` — calendar, grade mapping
  - `finance-depth` — sponsorship/refund/reversal/reporting views not already live
  - `support` — advising/support request with privacy boundary
  - `quality` — review/evidence/findings/action ownership
  - `graduation` — readiness/award/verification
  - `reporting` — certified package/signatory/privacy suppression
  - `integrations` — production-provider health/credential-rotation concepts
- Test: one semantic contract file per preview family or one serial family suite.

**Interfaces:**
- Static fictional data.
- Always preview-labelled.
- No API calls/forms/buttons that imply authoritative mutation.

- [ ] **Step 1: Add preview-index maturity labels**

Every family visibly states one of:
- `Live`
- `Preview — planned v1.x`
- `Operational completion target — v2.0`

Do not label Phase-6 routes as previews.

- [ ] **Step 2: Add minimum approved journey per future family**

Each family gets enough UI to make the system feel designed end-to-end:
- home/work queue,
- one record/detail,
- one state/recovery example.

Do not build empty module directories beyond those views.

- [ ] **Step 3: Add authority/privacy contracts**

Especially:
- counselling/support notes remain restricted,
- reporting suppression visible,
- graduation source integrity visible,
- refunds/reversals show approval boundary,
- production integration secrets never rendered.

- [ ] **Step 4: Verify no API calls/mutations and commit**

Commit: `feat(ui): add v2 approved workspace previews`

---

## Workstream E — Final finish and rehearsal

### Task 9: Cross-workspace visual/accessibility consistency pass

**Files:**
- Extend `development/tests/browser/ui-modernization-quality.spec.ts`
- Add visual evidence specs where live Phase-4–6 routes currently lack screenshots.
- Modify only screens that fail explicit contracts.

- [ ] **Step 1: Add route matrix**

Check representative 390/1440 pages for:
- public,
- applicant,
- admissions,
- student,
- finance,
- teaching,
- Moodle,
- integration,
- demo control,
- Phase-7 preview,
- each V2 preview family.

- [ ] **Step 2: Assert anti-slop rules**

No:
- page-level gradients,
- blur/glass,
- giant radii,
- dashboard/KPI language where task queues should exist,
- horizontal overflow,
- hidden status text,
- unlabeled icon-only critical actions.

- [ ] **Step 3: Keyboard/focus checks**

Critical journey must work with keyboard:
- navigation,
- filters,
- forms,
- review/release controls,
- demo story navigation.

- [ ] **Step 4: Fix only observed failures and commit**

Commit: `fix(ui): finish cross-workspace visual consistency`

---

### Task 10: One-command rehearsal and final release-readiness gate

**Files:**
- Create: `development/scripts/demo-rehearse.mjs`
- Modify: `development/package.json`
- Create/update: `development/docs/demo/DEMO-RUNBOOK.md`
- Create/update execution ledger.

**Interfaces:**
- `npm run demo:rehearse` is read-only except when explicitly composed after `demo:reset`.
- Does not start production providers.
- Refuses unsafe environment.

- [ ] **Step 1: Add rehearsal script**

Sequence:
1. validate demo environment,
2. run `demo:doctor`,
3. run critical browser story subset,
4. report story readiness,
5. list fallback evidence locations.

Package script:

```json
"demo:rehearse": "node scripts/demo-rehearse.mjs"
```

- [ ] **Step 2: Add runbook**

One page only:
- reset,
- doctor,
- start API/web,
- persona/story order,
- failure injection steps,
- fallback screenshots/evidence,
- cleanup.

- [ ] **Step 3: Cold-reset rehearsal**

Required:
```text
demo:reset
→ demo:doctor
→ start API/web
→ Story 1
→ Story 3 Phase-6 recovery
→ Phase-7 preview/live depending current backend
→ evidence/fallback
```

- [ ] **Step 4: Full CI and visual evidence**

Require:
- lint,
- unit,
- API e2e,
- build,
- typecheck,
- complete browser suite,
- screenshots,
- source scan,
- no preview leakage into live navigation.

- [ ] **Step 5: Final branch review**

No unresolved Critical/Important issues.

Commit: `docs(demo): close v2 frontend readiness programme`

## Completion Contract

This programme is complete when:

- The current Phase-1–6 site feels like one coherent institutional product.
- Every implemented role has an obvious landing point and onward navigation.
- Student/Finance/Moodle/Integration live screens are polished without business-rule changes.
- `demo:reset` plus `demo:doctor` creates/verifies deterministic presentation scenarios.
- Demo Control Centre can launch the presentation stories without exposing credentials.
- Phase-7 missing UI is represented honestly as preview until its backend exists.
- Phase-8/9 demo evidence/fallback surfaces are usable.
- v1.1–v1.8/V2 future modules are visually represented with explicit maturity labels.
- No preview screen implies a real mutation.
- 390px and 1440px evidence is complete.
- Cross-workspace keyboard/focus/status checks pass.
- Existing Phase-1–6 regression suites remain green.
- A cold-reset rehearsal can be run without manually hunting for routes or records.
- Final review has no unresolved Critical or Important finding.
