# Public Discovery and Applicant UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing public discovery and applicant flows into a stage-aware, professional 2026 institutional experience without changing admissions authority, backend workflow semantics, or the handbook-defined journey.

**Architecture:** Keep the existing Next.js App Router routes and NestJS/API contracts unchanged. Build on the `ui-modernization` branch's existing shared canvas, skeleton primitives, applicant shell and status components; add only visual/interaction structure that makes the approved stages explicit. Use browser-level tests for user-visible behavior, with visual screenshot baselines added only after semantic behavior is green.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, CSS Modules, `@sis/ui`, Playwright 1.63.0.

**Spec:** `development/docs/superpowers/specs/2026-09-23-handbook-driven-ui-modernization-design.md`

## Global Constraints

- The controlling product sources are `15-APPROVED-DESIGN-EVIDENCE`, `03-USER-EXPERIENCE-BLUEPRINTS`, `02-INSTITUTIONAL-AND-SYSTEM-DESIGN`, then `04-UI-UX-DESIGN-SYSTEM`.
- This is not a SaaS-dashboard redesign.
- No gradients, glassmorphism, oversized hero banners, decorative metric cards, random illustrations, unexplained charts, floating assistants, icon-only critical actions, or generic AI-dashboard patterns.
- Every major screen must make context, current state, required action, working area, next state, evidence/history and help understandable.
- Loading, empty, stale, validation, permission denied, conflict and recovery are real states, not afterthoughts.
- Skeletons may be added ahead of the original implementation phase, but they may not imply false completion.
- SIS remains authoritative; no work in this plan may make Moodle authoritative or invent a backend workflow.
- Do not change API routes, authorization rules, idempotency rules, submission semantics, data models or institutional authority.
- Status must remain text-first; colour may reinforce but never replace meaning.
- Responsive verification widths: 1440px, 1024px, 768px and 390px, with 390px mandatory in browser tests.
- No horizontal scrolling in critical applicant workflows.
- WCAG 2.2 AA expectations from the handbook remain binding.
- Existing code on `ui-modernization` predates this plan. Treat it as the starting baseline; characterize it and only require RED→GREEN for new behavior introduced by this plan.
- UI copy must be brief and direct. Structure, labels and status should carry meaning before helper prose.
- Do not repeat obvious information. Routine helper text should normally be one short sentence or less.
- Long policy/guidance text belongs in contextual help, not the primary workflow.

## Program Decomposition

This spec spans multiple independent workspace families. This plan implements only **public discovery + applicant experience**. Follow-on plans are intentionally separate:

1. `2026-09-23-admissions-staff-ui-modernization.md` — admissions queue, case review, recommendation/decision hierarchy and staff responsive behavior.
2. `2026-09-23-student-teaching-ui-modernization.md` — student home, registration/readiness visual language, lecturer/tutor workspace and SIS–Moodle state presentation.
3. `2026-09-23-operations-visual-quality.md` — operations/reconciliation workspace, cross-workspace screenshot baselines, accessibility/visual regression and final handbook review.

## File Structure

- `development/packages/ui/src/ProgrammeCard.tsx` — factual programme result anatomy and explicit view/compare actions.
- `development/packages/ui/src/ProgrammeCard.module.css` — programme result hierarchy without marketing-card styling.
- `development/apps/web/app/discover/discover.module.css` — public discovery composition/filter/result spacing.
- `development/apps/web/app/applicant/page.tsx` — applicant home and required-action priority.
- `development/apps/web/app/applicant/chrome.tsx` — application context, progress and next-step navigation.
- `development/apps/web/app/applicant/workspace.tsx` — document state and submission-readiness presentation; no domain behavior changes.
- `development/apps/web/app/applicant/applicant.module.css` — shared applicant stage/timeline/document styles.
- `development/apps/web/app/applicant/[id]/status/page.tsx` — post-submission current state + chronological timeline hierarchy.
- `development/tests/browser/ui-public-applicant.spec.ts` — new handbook-facing UI contract and responsive tests.
- `development/tests/browser/ui-public-applicant.visual.spec.ts` — screenshot baselines after semantic tests are green.

## Review Focus

1. **Slow/uncertain transitions:** skeletons and pending states must not look like success or expose stale action controls; Task 7 captures transition screens and Task 5 covers readiness.
2. **Small screens with long programme/status text:** 390px must not overflow or hide actions; Tasks 1, 3, 4, 6 and 7 pin this.
3. **Draft versus submitted ambiguity:** a draft must still clearly require formal submission even when all sections are complete; Tasks 2, 3 and 5 pin this.
4. **Document states without an uploaded file:** required evidence must explicitly say `Not uploaded`, not render an empty card; Task 4 pins this.
5. **Disabled high-impact submission controls:** the user must see why submission is unavailable and what to fix; Task 5 pins this.

---

### Task 1: Make programme results factual records with explicit actions

**Files:**
- Modify: `development/packages/ui/src/ProgrammeCard.tsx`
- Modify: `development/packages/ui/src/ProgrammeCard.module.css`
- Modify: `development/apps/web/app/discover/discover.module.css`
- Create: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: existing `ProgrammeCardProps.viewHref: string`, `compareHref: string`, `compareSelected: boolean`.
- Produces: programme result anatomy with a visible `View programme` action and existing compare action; no API or prop changes.

- [ ] **Step 1: Write the failing browser test**

Create `development/tests/browser/ui-public-applicant.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("programme results expose factual view and compare actions without mobile overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");

  const card = page
    .getByRole("article", { name: /BSc Software Engineering/ })
    .first();

  await expect(card).toBeVisible();
  await expect(
    card.getByRole("link", { name: "View programme", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: /Add BSc Software Engineering to comparison/ }),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run from `development/`:

```bash
npm run build --workspace=@sis/config
npm run build --workspace=web
npm run build --workspace=api
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "programme results expose"
```

Expected: FAIL because the current programme card has the programme-name heading link and compare link, but no visible link named exactly `View programme`.

- [ ] **Step 3: Implement explicit programme action hierarchy**

In `ProgrammeCard.tsx`, replace the current single-action paragraph with:

```tsx
<div className={styles.actions}>
  <a className={styles.primaryAction} href={viewHref}>
    View programme
  </a>
  <a
    className={styles.secondaryAction}
    href={compareHref}
    aria-label={
      compareSelected
        ? `${name} added to comparison. View comparison.`
        : `Add ${name} to comparison`
    }
  >
    {compareSelected ? "Added to comparison" : "Compare"}
  </a>
</div>
```

Keep the programme-name heading link for direct/title navigation.

Update `ProgrammeCard.module.css` so the record reads as a restrained institutional result:

```css
.card {
  display: grid;
  gap: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  padding: var(--space-5, 20px);
  max-width: none;
}

.facts,
.meta,
.note,
.availability {
  margin-top: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.primaryAction,
.secondaryAction {
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  font-weight: 650;
  text-decoration: none;
}

.primaryAction {
  padding: 0 var(--space-4);
  border: 1px solid var(--green-600);
  border-radius: var(--radius-md);
  background: var(--green-500);
  color: var(--white);
}

.primaryAction:hover {
  background: var(--green-600);
  color: var(--white);
}

.secondaryAction {
  color: var(--link);
}
```

Do not introduce badges, ranking, recommendation or decorative icons.

- [ ] **Step 4: Run test and verify GREEN**

Run:

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "programme results expose"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/packages/ui/src/ProgrammeCard.tsx   development/packages/ui/src/ProgrammeCard.module.css   development/apps/web/app/discover/discover.module.css   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): clarify programme result actions"
```

---

### Task 2: Add a true required-action region to applicant home

**Files:**
- Modify: `development/apps/web/app/applicant/page.tsx`
- Modify: `development/apps/web/app/applicant/applicant.module.css`
- Modify: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: existing `ApplicationView[]` returned by `loadApplicant`.
- Produces: a `Required action` section for the first active draft; application cards remain the authoritative list.

- [ ] **Step 1: Add failing applicant-home test**

Append:

```ts
import { createApplicant } from "./fixtures";

async function startDraft(page: import("@playwright/test").Page) {
  const applicant = await createApplicant();

  await page.goto("/discover");
  await page
    .getByRole("link", { name: /BSc Software Engineering/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Start application", exact: true }).click();

  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Start application", exact: true }).click();

  return page.url();
}

test("applicant home puts the next required action before the application list", async ({
  page,
}) => {
  await startDraft(page);
  await page.goto("/applicant");

  const required = page.getByRole("region", { name: "Required action" });
  await expect(required).toBeVisible();
  await expect(
    required.getByRole("link", { name: "Continue application", exact: true }),
  ).toBeVisible();

  const headingOrder = await page.locator("h2").allTextContents();
  expect(headingOrder[0]).toBe("Required action");
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "applicant home puts"
```

Expected: FAIL because the current applicant home has application cards but no region labelled `Required action`.

- [ ] **Step 3: Implement the required-action region**

In `applicant/page.tsx`, derive an active draft before rendering:

```ts
const activeDraft =
  result.data.items.find(
    (item) => item.state !== "Submitted" && item.state !== "Withdrawn",
  ) ?? null;
```

Immediately after the home actions, render:

```tsx
{activeDraft ? (
  <section
    className={styles.requiredAction}
    aria-labelledby="required-action-heading"
  >
    <div>
      <p className={styles.eyebrow}>Next step</p>
      <h2 id="required-action-heading">Required action</h2>
      <p>
        Continue {activeDraft.offering.programmeName} for{" "}
        {activeDraft.offering.intake}.
      </p>
      <p className={styles.muted}>
        {activeDraft.completeCount} of {activeDraft.requiredCount} required
        sections complete.
      </p>
    </div>
    <Link
      className={styles.buttonLink}
      href={`/applicant/${activeDraft.id}`}
    >
      Continue application
    </Link>
  </section>
) : null}
```

Add restrained layout CSS:

```css
.requiredAction {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-6);
  align-items: center;
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-left: 4px solid var(--attention);
  border-radius: var(--radius-md);
  background: var(--attention-bg);
}

@media (max-width: 700px) {
  .requiredAction {
    grid-template-columns: 1fr;
    padding: var(--space-4);
  }
}
```

Do not add metrics or celebratory treatment.

- [ ] **Step 4: Run and verify GREEN**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "applicant home puts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/web/app/applicant/page.tsx   development/apps/web/app/applicant/applicant.module.css   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): prioritize applicant required action"
```

---

### Task 3: Make application progress identify the next required step

**Files:**
- Modify: `development/apps/web/app/applicant/chrome.tsx`
- Modify: `development/apps/web/app/applicant/applicant.module.css`
- Modify: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: `ApplicationView.sections[]`, each with `key`, `label`, `state`.
- Produces: next-step text/link before the section grid; existing section links remain unchanged.

- [ ] **Step 1: Add failing next-step test**

Append:

```ts
test("draft overview identifies the next required application step", async ({
  page,
}) => {
  await startDraft(page);

  const nextStep = page.getByRole("region", { name: "Application progress" });
  await expect(nextStep).toBeVisible();
  await expect(nextStep.getByText("Next required step:")).toBeVisible();
  await expect(
    nextStep.getByRole("link", { name: "Personal details", exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "draft overview identifies"
```

Expected: FAIL because the current progress block shows counts and a progress element but no explicit `Next required step`.

- [ ] **Step 3: Implement next-step calculation**

In `ApplicationSteps`, derive:

```ts
const completedStates = new Set([
  "COMPLETE",
  "Complete",
  "NOT_REQUIRED",
  "NotRequired",
]);

const nextSection = application.sections.find(
  (section) => !completedStates.has(section.state),
);
```

Wrap the progress content:

```tsx
<section className={styles.progressPanel} aria-label="Application progress">
  <div className={styles.progressHeader}>
    <p>
      {application.completeCount} of {application.requiredCount} required
      sections complete
    </p>
    <progress
      value={application.completeCount}
      max={Math.max(application.requiredCount, 1)}
      aria-label="Application completion"
    />
  </div>

  {nextSection ? (
    <p className={styles.nextStep}>
      <strong>Next required step:</strong>{" "}
      <Link
        href={applicationPath(
          application.id,
          nextSection.key === "documents"
            ? "documents"
            : nextSection.key === "review"
              ? "review"
              : nextSection.key,
        )}
      >
        {nextSection.label}
      </Link>
    </p>
  ) : (
    <p className={styles.nextStep}>
      <strong>Next required step:</strong> Review the application before formal
      submission.
    </p>
  )}
</section>
```

Then render the existing `ol` after this section.

Add:

```css
.progressPanel {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

.nextStep {
  color: var(--text-primary);
}
```

- [ ] **Step 4: Run and verify GREEN**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "draft overview identifies"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/web/app/applicant/chrome.tsx   development/apps/web/app/applicant/applicant.module.css   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): show applicant next required step"
```

---

### Task 4: Make required document state explicit before and after upload

**Files:**
- Modify: `development/apps/web/app/applicant/workspace.tsx`
- Modify: `development/apps/web/app/applicant/applicant.module.css`
- Modify: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: existing `a.requiredDocuments` and `a.documents`.
- Produces: every required document record shows a text status, including `Not uploaded`.

- [ ] **Step 1: Add failing document-state test**

At the top of the browser file add:

```ts
import path from "node:path";
```

Append:

```ts
test("required documents always expose a clear state", async ({ page }) => {
  const applicationUrl = await startDraft(page);
  await page.goto(`${applicationUrl}/documents`);

  await expect(page.getByText("Status: Not uploaded").first()).toBeVisible();

  await page
    .getByLabel("Choose file")
    .setInputFiles(
      path.resolve("packages/test-fixtures/documents/fictional-result.pdf"),
    );
  await page.getByRole("button", { name: "Upload document", exact: true }).click();

  await expect(
    page.getByText("Status: Checking file safety").first(),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "required documents always"
```

Expected: FAIL at `Status: Not uploaded`; the current required-document card does not show a status when no file exists.

- [ ] **Step 3: Implement explicit requirement state**

Inside `a.requiredDocuments.map`, derive the files once:

```tsx
{a.requiredDocuments.map((documentRequirement) => {
  const files = a.documents.filter(
    (file) => file.category === documentRequirement.category,
  );
  const latest = files.at(-1) ?? null;

  return (
    <article
      key={documentRequirement.category}
      className={styles.documentRequirement}
    >
      <div className={styles.documentHeading}>
        <div>
          <h2>{documentRequirement.label}</h2>
          <p>{documentRequirement.purpose}</p>
        </div>
        <p className={styles.documentStatus}>
          <strong>Status:</strong>{" "}
          {latest?.statusLabel ?? "Not uploaded"}
        </p>
      </div>

      {files.map((file) => (
        <div key={file.id} className={styles.documentVersion}>
          <p>
            {file.fileName} · {file.statusLabel} · version {file.version}
          </p>
          {/* keep existing preview and scan actions unchanged */}
        </div>
      ))}
    </article>
  );
})}
```

Move the existing preview/scan controls unchanged into the `files.map`.

Add:

```css
.documentRequirement {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5, 20px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.documentHeading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: start;
}

.documentStatus {
  font-size: var(--font-supporting);
  font-weight: 650;
}

.documentVersion {
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

@media (max-width: 700px) {
  .documentHeading {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run and verify GREEN**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "required documents always"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/apps/web/app/applicant/workspace.tsx   development/apps/web/app/applicant/applicant.module.css   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): expose applicant document states"
```

---

### Task 5: Explain submission readiness before the disabled action

**Files:**
- Modify: `development/apps/web/app/applicant/workspace.tsx`
- Modify: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: existing `review.ready: boolean`, `a.blockers[]`, `Status` from `@sis/ui`.
- Produces: explicit `Ready to submit` or `Not ready to submit` status before the review summary; no submit semantics change.

- [ ] **Step 1: Add failing readiness test**

Append:

```ts
test("review explains why formal submission is not yet available", async ({
  page,
}) => {
  const applicationUrl = await startDraft(page);
  await page.goto(`${applicationUrl}/review`);

  const readiness = page.getByRole("status", { name: "Not ready to submit" });
  await expect(readiness).toBeVisible();
  await expect(readiness).toContainText("need attention");

  await expect(
    page.getByRole("button", {
      name: "Continue to submission confirmation",
      exact: true,
    }),
  ).toBeDisabled();
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "review explains why"
```

Expected: FAIL because no `Status` region named `Not ready to submit` exists.

- [ ] **Step 3: Implement submission-readiness status**

Change the `@sis/ui` import in `workspace.tsx` to:

```ts
import { ActionButton, ErrorSummary, Status } from "@sis/ui";
```

At the beginning of the `section === "review"` block, before the summary sections:

```tsx
<Status
  severity={review.ready ? "success" : "attention"}
  state={review.ready ? "Ready to submit" : "Not ready to submit"}
  reason={
    review.ready
      ? "All required items are complete."
      : `${a.blockers.length} required item${a.blockers.length === 1 ? "" : "s"} need attention before formal submission.`
  }
  updated={`Draft last saved ${formatLusaka(a.updatedAt)}`}
  owner="Applicant"
  action={
    review.ready
      ? "Review the details below."
      : "Fix the items below."
  }
/>
```

Keep the existing blocker links and disabled-button logic exactly as-is.

- [ ] **Step 4: Run and verify GREEN**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "review explains why"
```

Expected: PASS.

- [ ] **Step 5: Run existing lost-response submission journey**

```bash
npx playwright test tests/browser/applicant.spec.ts --grep "applicant completes"
```

Expected: PASS. This proves the visual readiness addition did not change submission/idempotency recovery.

- [ ] **Step 6: Commit**

```bash
git add development/apps/web/app/applicant/workspace.tsx   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): explain application submission readiness"
```

---

### Task 6: Turn post-submission status into a case timeline with current-state summary

**Files:**
- Modify: `development/apps/web/app/applicant/[id]/status/page.tsx`
- Modify: `development/apps/web/app/applicant/applicant.module.css`
- Modify: `development/tests/browser/ui-public-applicant.spec.ts`

**Interfaces:**
- Consumes: existing `ApplicantTimeline`, `formatLusaka`, `Status`.
- Produces: current-state status block + explicit `Application timeline` section; event data unchanged.

- [ ] **Step 1: Add failing post-submission hierarchy test**

Add this helper to the test file, using the same completion sequence already proven in `applicant.spec.ts`:

```ts
async function submitBasicApplication(
  page: import("@playwright/test").Page,
): Promise<string> {
  const applicationUrl = await startDraft(page);

  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Timeline");
  await page.getByLabel("Date of birth").fill("2000-01-01");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  await page.getByLabel("Reminder channel").selectOption("PORTAL");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  await page.getByRole("link", { name: /Qualifications and results/ }).click();
  await page.getByLabel("Qualification route", { exact: false }).selectOption("ECZ");
  await page.getByLabel("Awarding institution").fill("Fictional ECZ");
  await page.getByLabel("Award title").fill("Grade 12");
  await page.getByLabel("Completion year").fill("2025");
  await page.getByLabel("Qualification status").selectOption("COMPLETED");
  await page.getByRole("button", { name: "Add subject result" }).click();
  await page.getByLabel("Subject 1").selectOption("Mathematics");
  await page.getByLabel("Grade 1").selectOption("4");
  await page.getByRole("button", { name: "Add subject result" }).click();
  await page.getByLabel("Subject 2").selectOption("English");
  await page.getByLabel("Grade 2").selectOption("4");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  await page.getByRole("link", { name: /Supporting documents/ }).click();
  await page
    .getByLabel("Choose file")
    .setInputFiles(
      path.resolve("packages/test-fixtures/documents/fictional-result.pdf"),
    );
  await page.getByRole("button", { name: "Upload document", exact: true }).click();
  await page.getByRole("button", { name: "Check file safety", exact: true }).click();

  await page.goto(`${applicationUrl}/review`);
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await checkbox.check();
  }
  await page
    .getByRole("button", { name: "Continue to submission confirmation" })
    .click();
  await page.getByRole("button", { name: "Submit application", exact: true }).click();

  return applicationUrl;
}

test("submitted application shows current state before chronological history", async ({
  page,
}) => {
  const applicationUrl = await submitBasicApplication(page);
  await page.goto(`${applicationUrl}/status`);

  await expect(
    page.getByRole("status", { name: "Application received" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Application timeline", exact: true }),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "submitted application shows"
```

Expected: FAIL because the status page has a page heading and event list but no current-state `Status` block or `Application timeline` heading.

- [ ] **Step 3: Implement current-state + timeline hierarchy**

Update imports:

```ts
import { Status } from "@sis/ui";
```

After the page `h1`, derive:

```ts
const latestEvent = timeline.events.at(-1) ?? null;
const currentLabel =
  STATE_LABELS[timeline.state] ?? `Application ${timeline.state}`;
```

Render:

```tsx
<Status
  severity={timeline.state === "Withdrawn" ? "neutral" : "info"}
  state={currentLabel}
  reason={
    timeline.state === "Withdrawn"
      ? "This application was withdrawn."
      : "Admissions received your application."
  }
  updated={
    latestEvent
      ? `Last updated ${formatLusaka(latestEvent.occurredAt)}`
      : undefined
  }
  owner={timeline.state === "Withdrawn" ? "Applicant / Admissions" : "Admissions"}
  action="Check the timeline for updates."
/>

<h2>Application timeline</h2>
```

Give the `ol` `className={styles.timeline}`, and add:

```css
.timeline {
  list-style: none;
  padding: 0 !important;
  display: grid;
  gap: 0;
  max-width: 52rem;
}

.timeline > li {
  position: relative;
  margin: 0 !important;
  padding: 0 0 var(--space-6) var(--space-8);
  border-left: 1px solid var(--gray-300);
}

.timeline > li::before {
  content: "";
  position: absolute;
  left: -0.33rem;
  top: 0.4rem;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--green-500);
}

.timeline > li:last-child {
  border-left-color: transparent;
}
```

This is functional timeline styling, not decorative animation.

- [ ] **Step 4: Run and verify GREEN**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts --grep "submitted application shows"
```

Expected: PASS.

- [ ] **Step 5: Run existing applicant case journey**

```bash
npx playwright test tests/browser/applicant-case.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add development/apps/web/app/applicant/[id]/status/page.tsx   development/apps/web/app/applicant/applicant.module.css   development/tests/browser/ui-public-applicant.spec.ts
git commit -m "feat(ui): clarify submitted application timeline"
```

---

### Task 7: Add responsive visual baselines and run the complete gate

**Files:**
- Create: `development/tests/browser/ui-public-applicant.visual.spec.ts`
- Create/update generated Playwright snapshot files under the repository's Playwright snapshot directory.

**Interfaces:**
- Consumes: completed semantic behavior from Tasks 1–6.
- Produces: stable visual regression baselines at desktop and mobile; no product behavior.

- [ ] **Step 1: Write screenshot tests before generating baselines**

Create:

```ts
import { test, expect } from "@playwright/test";
import { createApplicant } from "./fixtures";

test("public discovery desktop visual contract", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Find a programme" })).toBeVisible();
  await expect(page).toHaveScreenshot("discover-1440.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("public discovery mobile visual contract", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(page).toHaveScreenshot("discover-390.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("applicant empty home visual contract", async ({ page }) => {
  const applicant = await createApplicant();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.goto("/applicant");
  await expect(page).toHaveScreenshot("applicant-home-empty-1440.png", {
    fullPage: true,
    animations: "disabled",
  });
});
```

- [ ] **Step 2: Run and verify RED because baselines do not exist**

Run:

```bash
npx playwright test tests/browser/ui-public-applicant.visual.spec.ts
```

Expected: FAIL with missing screenshot baselines and emit actual images.

- [ ] **Step 3: Generate and inspect baselines**

Run:

```bash
npx playwright test tests/browser/ui-public-applicant.visual.spec.ts --update-snapshots
```

Expected: PASS after baselines are written.

Inspect all three generated images before committing. Reject and fix any of these visible regressions before continuing:

- horizontal overflow
- repeated unnecessary card nesting
- oversized empty space
- hidden or weak primary actions
- decorative gradient/glass treatment
- unreadably dense mobile layout
- status represented only by colour

If a product fix is needed, add a semantic or screenshot test that demonstrates the issue, make it fail, fix it, then regenerate only the affected baseline.

- [ ] **Step 4: Run targeted semantic browser suite**

```bash
npx playwright test tests/browser/ui-public-applicant.spec.ts   tests/browser/applicant.spec.ts   tests/browser/applicant-case.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck, lint and production builds**

```bash
npm run typecheck
npm run lint
npm run build --workspace=@sis/config
npm run build --workspace=web
npm run build --workspace=api
```

Expected:
- typecheck PASS
- lint exits successfully; existing warnings must be reported by name if present
- all three builds PASS

- [ ] **Step 6: Run full project tests**

```bash
npm test
npm run test:scripts
```

Expected: PASS. Any pre-existing or unrelated failure must be named in the completion report rather than omitted.

- [ ] **Step 7: Commit**

```bash
git add development/tests/browser/ui-public-applicant.visual.spec.ts   development/tests/browser/ui-public-applicant.visual.spec.ts-snapshots
git commit -m "test(ui): add public and applicant visual baselines"
```

## Completion Contract

This plan is complete only when:

- Every new behavior test was observed failing for the intended reason before implementation.
- Tasks 1–6 semantic tests pass.
- Existing applicant and applicant-case browser journeys still pass.
- Visual baselines have been manually inspected at 1440px and 390px.
- `npm run typecheck` passes.
- `npm run lint` exits successfully with all warnings reported.
- `@sis/config`, `web` and `api` production builds pass.
- `npm test` and `npm run test:scripts` pass or every failure is explicitly reported.
- No API, database, authorization, submission or Moodle authority behavior changed.
- The final whole-branch review checks explicitly for generic SaaS/dashboard drift, card overuse, false success states, mobile overflow and handbook-stage mismatch.
