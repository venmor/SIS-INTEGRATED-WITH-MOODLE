# Operations Preview and Cross-Workspace Visual QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visualize the approved System/Moodle/Integration Operations experience as an isolated fictional-data preview, then run a final cross-workspace visual/accessibility QA pass over the modernized SIS UI.

**Architecture:** Extend the existing `/design-preview` route family with an Operations workspace backed only by static fictional records. Add read-only reconciliation/event-detail previews that show source authority, destination state, last-confirmed time, impact and safe next action without exposing live retry controls. Finish with browser contracts and screenshot evidence spanning public, applicant, admissions, student, teaching and operations surfaces.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript, CSS Modules, `@sis/ui`, Playwright 1.63.0.

**Spec:** `development/docs/superpowers/specs/2026-09-23-handbook-driven-ui-modernization-design.md`

## Global Constraints

- Operations screens in this plan are **design previews only**.
- Fictional/static records only; no API calls, server actions, mutations, retries, replays or mapping changes.
- Every Operations preview remains under `/design-preview/**` and inherits `noindex, nofollow`.
- Every page continues to show `Design preview · No live records or actions.`.
- Operations preview must not appear in live SIS home/staff navigation.
- SIS/source-domain authority must remain explicit; an integration screen never edits the authoritative source record.
- Moodle can be authoritative for learning activity while SIS remains authoritative for registration, official class list, teaching assignment and official academic result.
- Failed events and reconciliation cases are records to resolve, never deletable decoration.
- Safe retry/replay language must mention idempotency and confirmation, but no actual preview button performs it.
- UI copy stays short and direct. Do not narrate obvious screen behavior.
- No gradients, glassmorphism, decorative metric cards, KPI-dashboard styling, unexplained charts or oversized hero blocks.
- Use text states: `Healthy`, `Degraded`, `Unknown`, `Needs attention`, `Reconciled`, etc.; never colour alone.
- Use `Class list` and `TG group` terminology where academic integration is shown.
- 390px pages must not horizontally overflow.
- Existing live applicant/admissions behavior and the Student/Teaching preview boundary must remain unchanged.

## Handbook Sources

- `02-INSTITUTIONAL-AND-SYSTEM-DESIGN/09-design-section-9-integration-architecture.md`
- `03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md`
- `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/036-role-blueprint-12-part-2-moodle-administrator-real-sis-moodle-learning-integration.md`
- `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/037-role-blueprint-12-part-3-integration-support-officer-monitored-recoverable-and-governed-ex.md`
- `15-APPROVED-DESIGN-EVIDENCE/05-final-review-roadmap/003-section-22-mvp-to-complete-system-expansion-roadmap.md`

## File Structure

- Modify `development/apps/web/app/design-preview/layout.tsx` — add internal Operations preview navigation only.
- Modify `development/apps/web/app/design-preview/data.ts` — static integration/operations preview records.
- Modify `development/apps/web/app/design-preview/preview.module.css` — operations queue/reconciliation/timeline styling.
- Create `development/apps/web/app/design-preview/operations/page.tsx` — operational home.
- Create `development/apps/web/app/design-preview/operations/reconciliation/page.tsx` — SIS/Moodle side-by-side reconciliation case.
- Create `development/apps/web/app/design-preview/operations/event/page.tsx` — event delivery/retry-safety detail.
- Create `development/tests/browser/ui-operations-preview.spec.ts` — semantic/boundary/mobile contracts.
- Create `development/tests/browser/ui-operations-preview.visual.spec.ts` — operations screenshots.
- Create `development/tests/browser/ui-modernization-quality.spec.ts` — final anti-slop/responsive cross-workspace checks.
- Create/update `development/docs/superpowers/progress/2026-09-23-operations-visual-quality.md` — durable execution ledger.

## Review Focus

1. **Authority inversion:** reconciliation preview must not imply Operations can activate registration, alter grades or edit source-domain facts.
2. **Retry ambiguity:** an event detail must say retry reuses the same idempotency reference and requires confirmed delivery/reconciliation; no live preview action exists.
3. **Moodle outage confusion:** degraded Moodle state must explicitly leave SIS registration/class-list truth unchanged.
4. **Dashboard drift:** operational home must prioritize queues/cases/incidents and freshness—not decorative totals/charts.
5. **Cross-workspace regressions:** final QA must catch gradients/glass, mobile overflow, missing visible status text, and accidental preview links in live navigation.

---

### Task 1: Add Operations preview home

**Files:**
- Modify: `development/apps/web/app/design-preview/layout.tsx`
- Modify: `development/apps/web/app/design-preview/data.ts`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Create: `development/apps/web/app/design-preview/operations/page.tsx`
- Create: `development/tests/browser/ui-operations-preview.spec.ts`

**Interfaces:**
- Produces `operationsPreview` with health, queue, reconciliation and incident records.
- Existing Student/Teaching preview imports remain unchanged.

- [ ] **Step 1: Write the failing Operations-home contract**

```ts
import { test, expect, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.describe.serial("operations experience preview", () => {
  test("operations preview is queue-first and keeps authority explicit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/operations");

    await expect(
      page.getByText("Integration Support workspace · Production environment"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Needs attention" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Integration health" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reconciliation cases" }),
    ).toBeVisible();
    await expect(page.getByText("Moodle enrolment sync")).toBeVisible();
    await expect(page.getByText("Dashboard")).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
```

- [ ] **Step 2: Verify RED**

Expected: `/design-preview/operations` is missing.

- [ ] **Step 3: Add static Operations data**

Append to `data.ts`:

```ts
export const operationsPreview = {
  environment: "Production environment",
  health: [
    {
      integration: "Moodle",
      state: "Degraded",
      lastSuccess: "14:02 CAT",
      detail: "27 delayed enrolment events",
    },
    {
      integration: "Notifications",
      state: "Healthy",
      lastSuccess: "14:31 CAT",
      detail: "No delayed deliveries",
    },
    {
      integration: "Qualification verification",
      state: "Unknown",
      lastSuccess: "13:48 CAT",
      detail: "Health check unavailable",
    },
  ],
  attention: [
    {
      title: "Moodle enrolment sync",
      state: "Needs attention",
      detail: "27 events delayed",
      age: "18 minutes",
    },
    {
      title: "Qualification verification",
      state: "Check provider",
      detail: "4 callbacks awaiting confirmation",
      age: "11 minutes",
    },
  ],
  reconciliation: [
    {
      title: "Registered student missing from Moodle",
      sourceRef: "STU-202700123 · CSC 4792",
      state: "Open",
      lastConfirmed: "14:02 CAT",
    },
  ],
  incident: {
    reference: "INC-2027-004",
    title: "Moodle enrolment sync delayed",
    state: "Investigating",
    impact: "Learning access delayed; SIS registration unaffected",
  },
} as const;
```

- [ ] **Step 4: Add Operations to preview-only navigation**

In `design-preview/layout.tsx`, add only:

```tsx
<Link href="/design-preview/operations">Operations</Link>
```

Do not add this route anywhere outside `app/design-preview/**`.

- [ ] **Step 5: Implement Operations home**

Required order:

```tsx
<main className={styles.workspace}>
  <header className={styles.workspaceHeader}>
    <p className={styles.workspaceContext}>
      Integration Support workspace · Production environment
    </p>
    <h1>Operations</h1>
  </header>

  <section aria-labelledby="needs-attention-heading">...</section>
  <section aria-labelledby="integration-health-heading">...</section>
  <section aria-labelledby="reconciliation-heading">...</section>
  <section aria-labelledby="incident-heading">...</section>
</main>
```

Use compact records with text status and last-confirmed/age. Link the fictional reconciliation case to `/design-preview/operations/reconciliation` and event queue item to `/design-preview/operations/event`.

- [ ] **Step 6: Verify GREEN**

Expected: semantic contract and 390px overflow test pass.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(ui): preview integration operations workspace"
```

---

### Task 2: Build SIS–Moodle reconciliation case preview

**Files:**
- Create: `development/apps/web/app/design-preview/operations/reconciliation/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-operations-preview.spec.ts`

**Interfaces:**
- Static case compares SIS registration/class-list facts with Moodle enrolment.
- No source record can be edited.

- [ ] **Step 1: Add failing reconciliation contract**

```ts
test("Moodle reconciliation shows both systems without changing SIS authority", async ({
  page,
}) => {
  await page.goto("/design-preview/operations/reconciliation");

  await expect(
    page.getByRole("heading", { name: "Reconciliation case" }),
  ).toBeVisible();
  await expect(page.getByText("SIS source")).toBeVisible();
  await expect(page.getByText("Registered · CSC 4792")).toBeVisible();
  await expect(page.getByText("Moodle destination")).toBeVisible();
  await expect(page.getByText("Enrolment missing")).toBeVisible();
  await expect(
    page.getByText("SIS registration remains authoritative."),
  ).toBeVisible();

  await expect(page.getByText("Activate SIS registration")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement case header**

Display:

- `Reconciliation case`
- `Moodle enrolment mismatch`
- `STU-202700123 · CSC 4792`
- `Open`
- `Last confirmed 14:02 CAT`

- [ ] **Step 4: Implement side-by-side authority facts**

```tsx
<section aria-label="SIS source">
  <h2>SIS source</h2>
  <dl>
    <div><dt>Registration</dt><dd>Registered · CSC 4792</dd></div>
    <div><dt>Class list</dt><dd>Included</dd></div>
    <div><dt>Authority</dt><dd>Official academic registration</dd></div>
  </dl>
</section>

<section aria-label="Moodle destination">
  <h2>Moodle destination</h2>
  <dl>
    <div><dt>Enrolment</dt><dd>Enrolment missing</dd></div>
    <div><dt>Last confirmed</dt><dd>14:02 CAT</dd></div>
    <div><dt>Next safe action</dt><dd>Retry valid Moodle enrolment delivery</dd></div>
  </dl>
</section>
```

Then:

```tsx
<p className={styles.authorityNote}>
  SIS registration remains authoritative.
</p>
```

- [ ] **Step 5: Verify GREEN + 390px no overflow**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(ui): preview Moodle reconciliation case"
```

---

### Task 3: Visualize event delivery and safe retry semantics

**Files:**
- Create: `development/apps/web/app/design-preview/operations/event/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-operations-preview.spec.ts`

**Interfaces:**
- Read-only fictional event.
- Shows retry eligibility and idempotency reference without executing retry.

- [ ] **Step 1: Add failing event-detail contract**

```ts
test("event preview explains safe retry without exposing a live retry control", async ({
  page,
}) => {
  await page.goto("/design-preview/operations/event");

  await expect(
    page.getByRole("heading", { name: "Event delivery" }),
  ).toBeVisible();
  await expect(page.getByText("RegistrationCompleted")).toBeVisible();
  await expect(page.getByText("Delivery failed · destination timeout")).toBeVisible();
  await expect(page.getByText("Idempotency reference")).toBeVisible();
  await expect(
    page.getByText("Resend the same event after confirming destination state."),
  ).toBeVisible();
  await expect(
    page.getByText("Mark resolved only after confirmed delivery or reconciliation."),
  ).toBeVisible();

  await expect(page.getByRole("button")).toHaveCount(0);
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement event detail**

Use fictional values:

```ts
const event = {
  type: "RegistrationCompleted",
  sourceReference: "REG-2027-00123",
  destination: "Moodle",
  state: "Delivery failed · destination timeout",
  lastAttempt: "14:20 CAT",
  nextRetry: "14:35 CAT",
  idempotencyReference: "evt_reg_2027_00123_v1",
  impact: "Moodle learning access delayed; SIS registration is valid",
} as const;
```

Show sections:
- Delivery
- Business impact
- Retry safety
- Audit timeline

Retry-safety text must be exactly:

```text
Resend the same event after confirming destination state.
Mark resolved only after confirmed delivery or reconciliation.
```

No live button.

- [ ] **Step 4: Verify GREEN**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): preview safe integration event recovery"
```

---

### Task 4: Add Operations screenshot evidence

**Files:**
- Create: `development/tests/browser/ui-operations-preview.visual.spec.ts`

- [ ] **Step 1: Create deterministic evidence test**

```ts
import { test, expect, type Page } from "@playwright/test";

async function assertPreview(page: Page) {
  await expect(
    page.getByRole("status", { name: "Design preview" }),
  ).toContainText("No live records or actions.");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const images = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(images.every((value) => value === "none")).toBe(true);

  await expect(page.getByRole("button")).toHaveCount(0);
}

test("operations preview visual evidence", async ({ page }) => {
  for (const [route, width, height, file] of [
    ["/design-preview/operations", 1440, 1000, "ui-preview-operations-1440.png"],
    ["/design-preview/operations", 390, 844, "ui-preview-operations-390.png"],
    ["/design-preview/operations/reconciliation", 1440, 1000, "ui-preview-reconciliation-1440.png"],
    ["/design-preview/operations/reconciliation", 390, 844, "ui-preview-reconciliation-390.png"],
    ["/design-preview/operations/event", 1440, 1000, "ui-preview-event-1440.png"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(route);
    await assertPreview(page);
    await page.screenshot({
      path: `test-results/${file}`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
```

- [ ] **Step 2: Verify GREEN**

Expected: all captures produced into `browser-evidence`.

- [ ] **Step 3: Commit**

```bash
git commit -m "test(ui): capture operations preview evidence"
```

---

### Task 5: Add cross-workspace modernization quality gate

**Files:**
- Create: `development/tests/browser/ui-modernization-quality.spec.ts`

**Interfaces:**
- Read-only browser checks across public and preview routes.
- Existing applicant/admissions journeys remain covered by their dedicated tests.

- [ ] **Step 1: Write cross-workspace quality contract**

```ts
import { test, expect, type Page } from "@playwright/test";

async function assertNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function assertNoPageGradient(page: Page) {
  const images = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(images.every((value) => value === "none")).toBe(true);
}

test("modernized public and preview surfaces keep the institutional visual rules", async ({
  page,
}) => {
  const routes = [
    "/discover",
    "/design-preview/student",
    "/design-preview/student/registration",
    "/design-preview/teaching",
    "/design-preview/teaching/course",
    "/design-preview/operations",
    "/design-preview/operations/reconciliation",
    "/design-preview/operations/event",
  ];

  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await assertNoOverflow(page);
    await assertNoPageGradient(page);
  }

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Operations" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Student home preview" }),
  ).toHaveCount(0);
});
```

- [ ] **Step 2: Verify GREEN**

- [ ] **Step 3: Run existing modernization semantic suites together**

```bash
npx playwright test \
  tests/browser/ui-public-applicant.spec.ts \
  tests/browser/ui-admissions-workspace.spec.ts \
  tests/browser/ui-student-teaching-preview.spec.ts \
  tests/browser/ui-operations-preview.spec.ts \
  tests/browser/ui-modernization-quality.spec.ts
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "test(ui): add cross-workspace modernization gate"
```

---

### Task 6: Complete final branch verification and handbook review

**Files:**
- Update: `development/docs/superpowers/progress/2026-09-23-operations-visual-quality.md`

- [ ] **Step 1: Run complete CI**

Required green gates:
- source scan / script tests
- lint
- unit tests
- migrations/seed
- both API e2e groups
- production build
- typecheck
- complete Playwright suite
- browser-evidence artifact upload

- [ ] **Step 2: Perform source-boundary scan**

For every file under `development/apps/web/app/design-preview/**`, assert:
- no `fetch(`
- no `"use server"`
- no `<form`
- no `<button`
- no CSS `gradient(`
- no `backdrop-filter`
- no `dashboard`/KPI language
- no `roster` terminology

- [ ] **Step 3: Verify live navigation isolation**

Inspect:
- `development/apps/web/app/page.tsx`
- `development/apps/web/app/applicant/**`
- `development/apps/web/app/admin/**`

No live navigation may point to `/design-preview`.

- [ ] **Step 4: Final handbook review**

Review the full `ui-modernization` branch against:
- task-first home pages,
- status/next-action clarity,
- concise routine copy,
- role/scope visibility,
- reviewer/approver separation,
- SIS/Moodle authority separation,
- loading states,
- mobile transformations,
- recovery/uncertainty wording,
- anti-SaaS visual rules.

Any Critical/Important finding gets one RED→GREEN fix pass. Minor findings are ledgered, not silently polished.

- [ ] **Step 5: Record Vercel result accurately**

If a final Vercel status is `build-rate-limit`, document it as platform throttling. Do not report it as a code/build regression when GitHub CI production build is green.

- [ ] **Step 6: Close ledger**

Record final CI run ID, artifact ID, self-review result, rulings and any deferred minors.

Commit:

```bash
git commit -m "docs(ui): close operations visual quality slice"
```

## Completion Contract

This plan is complete only when:

- Operations preview is fictional/read-only and isolated from live navigation.
- Integration home is queue/action focused rather than dashboard styled.
- Reconciliation presents SIS/source and Moodle/destination side by side.
- No Operations preview offers source-record editing.
- Event recovery communicates retry safety/idempotency without a live preview action.
- Student/Teaching/Operations preview routes remain noindex and carry the preview banner.
- Cross-workspace 390px checks have no horizontal overflow.
- No page-level gradients/glass are introduced.
- Full CI is green.
- Browser evidence artifact includes Operations captures.
- Final branch review finds no unresolved Critical/Important handbook mismatch.
