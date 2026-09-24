# Student and Teaching Experience Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visualize the approved Student and Lecturer/Tutor handbook experiences as clearly marked, fictional-data design previews without pretending the unimplemented student, registration, teaching, or Moodle workflows are live.

**Architecture:** Add an isolated `/design-preview` route family in the existing Next.js App Router. Preview pages use static fictional records and internal preview navigation only; they never call the SIS API, never mutate state, never appear in normal production navigation, and carry a persistent preview banner plus `noindex` metadata. Shared preview layout/CSS expresses the future institutional workspace grammar while remaining visually consistent with the live applicant/admissions modernization.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript, CSS Modules, `@sis/ui`, Playwright 1.63.0.

**Spec:** `development/docs/superpowers/specs/2026-09-23-handbook-driven-ui-modernization-design.md`

## Global Constraints

- This is a **design preview**, not a production student or teaching implementation.
- Preview pages use fictional/static data only and perform no API calls or mutations.
- Preview routes are not linked from the live SIS home, applicant portal, or staff navigation.
- Every preview page displays `Design preview` and `No live records or actions.`.
- Add robots metadata that prevents indexing/following the preview route family.
- Do not create student, teaching, registration, class-list, grade, Moodle-sync, finance, or results API contracts in this plan.
- Do not imply that a preview action has changed an official record.
- SIS is explicitly authoritative for registration, class lists, official results and teaching assignments.
- Moodle is shown as a separate learning/integration state.
- Use `Class list`, not `roster`.
- Use `TG group` for tutorial-group scope where appropriate.
- UI copy stays short and direct; hierarchy, labels and status communicate first.
- No gradients, glassmorphism, oversized welcome banners, decorative metric cards, random illustrations, unexplained charts, floating assistants or generic SaaS dashboard composition.
- No status may rely on colour alone.
- Responsive verification includes 1440px and 390px.
- No horizontal scrolling in the preview's critical workspace surfaces.
- Existing live applicant/admissions routes and tests must remain unchanged and green.

## Handbook Sources

- `03-USER-EXPERIENCE-BLUEPRINTS/02-student-journey-book.md`
- `03-USER-EXPERIENCE-BLUEPRINTS/03-lecturer-tutor-journey-book.md`
- `03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md`
- `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/012-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`
- `15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/020-role-blueprint-3-lecturer-and-tutor.md`

## File Structure

- Create `development/apps/web/app/design-preview/layout.tsx` — preview-only metadata and persistent preview header/navigation.
- Create `development/apps/web/app/design-preview/preview.module.css` — restrained shared workspace styling.
- Create `development/apps/web/app/design-preview/data.ts` — fictional typed preview records only.
- Create `development/apps/web/app/design-preview/page.tsx` — preview index and scope statement.
- Create `development/apps/web/app/design-preview/student/page.tsx` — student home preview.
- Create `development/apps/web/app/design-preview/student/registration/page.tsx` — registration readiness preview.
- Create `development/apps/web/app/design-preview/teaching/page.tsx` — lecturer/tutor work-queue preview.
- Create `development/apps/web/app/design-preview/teaching/course/page.tsx` — course workspace / SIS–Moodle status preview.
- Create `development/tests/browser/ui-student-teaching-preview.spec.ts` — semantic, boundary and responsive contracts.
- Create `development/tests/browser/ui-student-teaching-preview.visual.spec.ts` — deterministic screenshot evidence.

## Review Focus

1. **Preview mistaken for production:** every preview page must expose the preview banner and no live form/mutation controls.
2. **SIS/Moodle authority confusion:** registration/class-list state and Moodle state must appear as separate labelled facts; delayed Moodle sync must not imply SIS registration loss.
3. **Dashboard drift:** student and teaching home pages must prioritize required work/status rather than metrics or decorative cards.
4. **Scope leakage:** tutor preview must use TG-group/class-list language and must not imply institution-wide student access.
5. **Small-screen degradation:** 390px pages must keep status, tasks, class-list summaries and integration state readable without horizontal overflow.

---

### Task 1: Create an isolated preview shell and fictional preview data

**Files:**
- Create: `development/apps/web/app/design-preview/layout.tsx`
- Create: `development/apps/web/app/design-preview/preview.module.css`
- Create: `development/apps/web/app/design-preview/data.ts`
- Create: `development/apps/web/app/design-preview/page.tsx`
- Create: `development/tests/browser/ui-student-teaching-preview.spec.ts`

**Interfaces:**
- `studentPreview`: fictional student identity/current-period/readiness/task/hold/Moodle state.
- `teachingPreview`: fictional teaching assignment/course/TG-group/Moodle state.
- Preview pages import these static objects; no fetch/action functions exist.

- [ ] **Step 1: Write the failing preview-boundary test**

Create `ui-student-teaching-preview.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("design preview is explicit and isolated from live navigation", async ({
  page,
}) => {
  await page.goto("/design-preview");

  await expect(
    page.getByRole("status", { name: "Design preview" }),
  ).toContainText("No live records or actions.");
  await expect(
    page.getByRole("link", { name: "Student home preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Teaching workspace preview" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Student home preview" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Teaching workspace preview" }),
  ).toHaveCount(0);
});
```

- [ ] **Step 2: Run CI and verify RED**

Expected browser failure: `/design-preview` does not exist and the preview status/links are absent.

- [ ] **Step 3: Create static preview records**

Create `data.ts`:

```ts
export const studentPreview = {
  studentNumber: "202700123",
  academicPeriod: "January 2027",
  programme: "BSc Software Engineering",
  campus: "Great East Road",
  registrationState: "Registration in progress",
  registrationProgress: { complete: 2, total: 5 },
  deadline: "20 January 2027, 17:00 CAT",
  nextAction: "Check financial clearance",
  tasks: [
    {
      title: "Financial clearance",
      state: "Awaiting institution",
      owner: "Finance",
      due: "18 January 2027",
    },
    {
      title: "Confirm course package",
      state: "Action required",
      owner: "Student",
      due: "19 January 2027",
    },
  ],
  holds: [
    {
      title: "Financial clearance hold",
      effect: "Blocks final registration",
      owner: "Finance",
      state: "Sponsorship confirmation pending",
    },
  ],
  moodle: {
    sisRegistration: "Registration in progress",
    learningAccess: "Waiting for final registration",
    lastConfirmed: "14:32 CAT",
  },
} as const;

export const teachingPreview = {
  academicPeriod: "January 2027",
  scope: "School of Natural Sciences",
  role: "Lecturer · Course coordinator",
  urgent: [
    {
      title: "Review Quiz 1 grade import",
      course: "CSC 4792",
      due: "Today",
    },
  ],
  course: {
    code: "CSC 4792",
    title: "Data Mining and Warehousing",
    scope: "Course-wide",
    classCount: 118,
    tgGroups: 4,
    nextSession: "Thursday · 10:00 CAT",
    sisClassList: 118,
    moodleEnrolled: 117,
    moodleState: "1 learner pending sync",
    teachingRoles: "4 of 4 synced",
    groups: "4 of 4 TG groups synced",
    lastSync: "14:32 CAT",
  },
} as const;
```

- [ ] **Step 4: Create preview layout**

`layout.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "SIS experience preview",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.previewShell}>
      <header className={styles.previewHeader}>
        <div role="status" aria-label="Design preview">
          <strong>Design preview</strong>
          <span>No live records or actions.</span>
        </div>
        <nav aria-label="Preview workspaces">
          <Link href="/design-preview">Overview</Link>
          <Link href="/design-preview/student">Student</Link>
          <Link href="/design-preview/teaching">Teaching</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Create preview index**

Use one short heading, one short sentence, then links:
- `Student home preview`
- `Teaching workspace preview`

Do not include marketing copy.

- [ ] **Step 6: Run browser contract and verify GREEN**

Expected: preview route passes; live home has no preview links.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(ui): add isolated experience preview shell"
```

---

### Task 2: Build the handbook student-home preview

**Files:**
- Create: `development/apps/web/app/design-preview/student/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-student-teaching-preview.spec.ts`

**Interfaces:**
- Consumes `studentPreview`.
- Produces a static student-home composition only; no buttons perform mutations.

- [ ] **Step 1: Add failing student-home contract**

```ts
test("student home preview is task-first and separates SIS from Moodle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview/student");

  await expect(
    page.getByText("Student portal · January 2027 · 202700123"),
  ).toBeVisible();

  const headings = await page.locator("main h2").allTextContents();
  expect(headings.slice(0, 4)).toEqual([
    "Registration",
    "Required action",
    "Holds",
    "Current period",
  ]);

  await expect(page.getByText("Registration in progress").first()).toBeVisible();
  await expect(page.getByText("SIS registration")).toBeVisible();
  await expect(page.getByText("Moodle learning access")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 2: Verify RED**

Expected: student preview route missing.

- [ ] **Step 3: Implement student-home composition**

Required structure:

```tsx
<main className={styles.workspace}>
  <p className={styles.workspaceContext}>
    Student portal · {studentPreview.academicPeriod} · {studentPreview.studentNumber}
  </p>
  <h1>Student home</h1>

  <section aria-labelledby="registration-heading">...</section>
  <section aria-labelledby="required-action-heading">...</section>
  <section aria-labelledby="holds-heading">...</section>
  <section aria-labelledby="period-heading">...</section>
  <section aria-labelledby="updates-heading">...</section>
</main>
```

Registration:
- `Registration in progress`
- `2 of 5 steps complete`
- deadline
- next: `Check financial clearance`
- link to preview registration readiness.

Required action:
- show the student-owned `Confirm course package` first.
- institution-owned finance task is visibly labelled `Finance`; no student action button.

Holds:
- `Financial clearance hold`
- `Blocks final registration`
- `Finance`
- `Sponsorship confirmation pending`

Current period:
- programme
- campus
- `SIS registration: Registration in progress`
- `Moodle learning access: Waiting for final registration`
- `Last confirmed: 14:32 CAT`

Do not add balance charts, completion donuts or hero cards.

- [ ] **Step 4: Run test and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): preview task-first student home"
```

---

### Task 3: Visualize registration readiness without pretending registration exists

**Files:**
- Create: `development/apps/web/app/design-preview/student/registration/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-student-teaching-preview.spec.ts`

**Interfaces:**
- Consumes `studentPreview`.
- Read-only preview rows use states `Ready`, `Action required`, `Awaiting institution`, `Blocked`.

- [ ] **Step 1: Add failing readiness test**

```ts
test("registration preview explains readiness by owner and state", async ({
  page,
}) => {
  await page.goto("/design-preview/student/registration");

  await expect(
    page.getByRole("heading", { name: "Registration readiness" }),
  ).toBeVisible();
  await expect(page.getByText("Student record")).toBeVisible();
  await expect(page.getByText("Financial clearance")).toBeVisible();
  await expect(page.getByText("Awaiting institution")).toBeVisible();
  await expect(page.getByText("Course package")).toBeVisible();
  await expect(page.getByText("Action required")).toBeVisible();

  await expect(page.getByRole("button")).toHaveCount(0);
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement static readiness page**

Render a compact labelled list:

```ts
const readiness = [
  { item: "Student record", state: "Ready", owner: "Registry" },
  { item: "Programme and intake", state: "Ready", owner: "Registry" },
  {
    item: "Financial clearance",
    state: "Awaiting institution",
    owner: "Finance",
  },
  {
    item: "Course package",
    state: "Action required",
    owner: "Student",
  },
  {
    item: "Registration declaration",
    state: "Blocked",
    owner: "Student",
  },
];
```

The page contains no submit/start/finalize buttons because registration APIs are absent.

- [ ] **Step 4: Verify GREEN and 390px no-overflow**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): preview registration readiness"
```

---

### Task 4: Build the lecturer/tutor work-queue preview

**Files:**
- Create: `development/apps/web/app/design-preview/teaching/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-student-teaching-preview.spec.ts`

**Interfaces:**
- Consumes `teachingPreview`.
- Produces static work queue + current course records.

- [ ] **Step 1: Add failing teaching-home test**

```ts
test("teaching preview is a work queue, not an analytics dashboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview/teaching");

  await expect(
    page.getByText(
      "Teaching workspace · School of Natural Sciences · January 2027",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Urgent actions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current courses" }),
  ).toBeVisible();
  await expect(page.getByText("CSC 4792")).toBeVisible();
  await expect(page.getByText("4 TG groups")).toBeVisible();
  await expect(page.getByText("Dashboard")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement teaching workspace**

Order:
1. `Urgent actions`
2. `Current courses`
3. `Teaching and integration notices`
4. `Recent work`

Course record shows:
- `CSC 4792 — Data Mining and Warehousing`
- `Lecturer · Course coordinator`
- `118 students`
- `4 TG groups`
- `Moodle: 1 learner pending sync`
- `Next: Review Quiz 1 grade import`
- internal preview link `Open course workspace`.

Do not add chart widgets or “performance” metrics.

- [ ] **Step 4: Verify GREEN**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): preview teaching work queue"
```

---

### Task 5: Build the course workspace and explicit SIS–Moodle status preview

**Files:**
- Create: `development/apps/web/app/design-preview/teaching/course/page.tsx`
- Modify: `development/apps/web/app/design-preview/preview.module.css`
- Modify: `development/tests/browser/ui-student-teaching-preview.spec.ts`

**Interfaces:**
- Consumes `teachingPreview.course`.
- Produces a read-only course workspace; no Moodle URL or live integration action exists.

- [ ] **Step 1: Add failing course-workspace contract**

```ts
test("course preview keeps SIS class list and Moodle synchronization distinct", async ({
  page,
}) => {
  await page.goto("/design-preview/teaching/course");

  await expect(
    page.getByText("CSC 4792 · January 2027 · Lecturer · Course-wide"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Class list status" }),
  ).toBeVisible();
  await expect(page.getByText("SIS registered students")).toBeVisible();
  await expect(page.getByText("118", { exact: true }).first()).toBeVisible();

  const sync = page.getByRole("region", { name: "Moodle synchronization" });
  await expect(sync).toContainText("Moodle enrolled students");
  await expect(sync).toContainText("117");
  await expect(sync).toContainText("1 learner pending sync");

  await expect(page.getByText("Registration lost")).toHaveCount(0);
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement course header and compact subnavigation**

Header:
- `CSC 4792 · January 2027 · Lecturer · Course-wide`
- `Data Mining and Warehousing`
- state label `Active teaching period`

Compact section navigation labels only:
- Overview
- Class list
- Assessment
- Learning and Moodle
- Grade review
- Communication
- TG groups
- Course history

These may be non-action text tabs in preview; do not create fake page actions.

- [ ] **Step 4: Implement class-list/integration status**

`Class list status`:
- `SIS registered students: 118`
- `4 TG groups`
- `Last class-list update: 14:32 CAT`

`Moodle synchronization`:
- status: `Attention needed`
- `Moodle enrolled students: 117`
- `1 learner pending sync`
- `Teaching roles: 4 of 4 synced`
- `TG groups: 4 of 4 synced`
- `Last synchronized: 14:32 CAT`

Then a short recovery row:
- `Next: integration team reconciles the pending learner.`

Do not show `Open Moodle course` because no live Moodle mapping/link exists in this implementation.

- [ ] **Step 5: Verify GREEN**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(ui): preview SIS Moodle course workspace"
```

---

### Task 6: Capture responsive preview evidence and run the complete gate

**Files:**
- Create: `development/tests/browser/ui-student-teaching-preview.visual.spec.ts`
- Create/update: `development/docs/superpowers/progress/2026-09-23-student-teaching-ui-modernization.md`

- [ ] **Step 1: Add screenshot evidence tests**

Capture:
- student home at 1440px
- student home at 390px
- registration readiness at 390px
- teaching home at 1440px
- teaching home at 390px
- course workspace at 1440px
- course workspace at 390px

Each capture must first assert:
- `Design preview` visible
- no horizontal overflow
- page-level `backgroundImage === "none"`
- no enabled form submission buttons.

Use `page.screenshot({ fullPage: true, animations: "disabled" })` into `test-results/ui-preview-*.png`.

- [ ] **Step 2: Run the targeted preview browser suite**

Expected: all semantic and visual-evidence tests pass.

- [ ] **Step 3: Run complete repository verification**

CI must pass:
- source scan and script tests
- lint
- unit tests
- migrations/seed
- both API e2e groups
- production build
- typecheck
- complete browser suite
- `browser-evidence` artifact upload

- [ ] **Step 4: Whole-slice self-review**

Verify:
- no live navigation points into preview
- no API calls in `app/design-preview/**`
- no form submission or mutation controls
- every preview page states `No live records or actions.`
- no gradients/glass
- no dashboard/KPI language
- student page order follows the handbook
- class-list wording replaces `roster`
- TG group wording is used
- SIS and Moodle state remain visibly distinct
- 390px has no horizontal overflow

- [ ] **Step 5: Record the Vercel result accurately**

If Vercel reports `build-rate-limit`, record it as platform throttling, not a product build error. GitHub CI production build remains the correctness gate.

- [ ] **Step 6: Commit ledger closure**

```bash
git commit -m "docs(ui): close student teaching preview slice"
```

## Completion Contract

This plan is complete only when:

- Preview routes are clearly isolated from live SIS routes and normal navigation.
- All preview data is fictional/static.
- No preview route calls an API or performs a mutation.
- Student home follows registration → required action → holds → current period ordering.
- Registration readiness visibly separates student-owned and institution-owned states.
- Teaching home behaves like a work queue, not a metric dashboard.
- Course workspace uses `Class list` and `TG group`, not `roster`.
- SIS class-list/registration facts and Moodle synchronization facts are separate.
- 1440px and 390px screenshot evidence is uploaded.
- Complete GitHub CI is green.
- Live applicant/admissions journeys remain green.
- Final self-review finds no Critical or Important handbook mismatch.
