import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  assessmentCoordinatorSid,
  assessmentLecturerSid,
  createExaminationsOfficer,
  createLecturer,
  createModerator,
  ensureAssessmentShell,
  ensureStagedStudent,
  examinationsOfficerSid,
} from "./fixtures";

const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";
const SUBMISSION_DECLARATION =
  "I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.";
const PACKAGE_DECLARATION =
  "I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.";

const COMPONENTS = [
  { code: "CA-QUIZ1", maxMark: 20, weight: 20, mark: 14 },
  { code: "CA-ASSIGN", maxMark: 30, weight: 20, mark: 21 },
  { code: "FINAL-EXAM", maxMark: 100, weight: 60, mark: 68 },
];

async function apiPost(path: string, body: object, sid: string) {
  const res = await fetch(`${api}/assessment${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      cookie: sid,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Record<string, any>;
}

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

function uuidFrom(text: string | null | undefined): string {
  return text?.match(/[0-9a-fA-F-]{36}/)?.[0] ?? "";
}

async function signIn(
  page: any,
  username: string,
  password: string,
  base: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${base}/`, { timeout: 20000 });
}

// Phase 7 slice 5: a lecturer assembles the frozen board package through
// the UI declaration, and the examinations authority approves it for
// release. Students still see nothing: there is no release in this slice.
test("board packages: assemble to approve-for-release", async ({ page }) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const lecturer = await createLecturer();
  const moderator = await createModerator();
  const officer = await createExaminationsOfficer();
  const shellRef = await ensureAssessmentShell();
  const studentA = await ensureStagedStudent();
  const studentB = await ensureStagedStudent();
  const lecSid = await assessmentLecturerSid(lecturer.offeringRef);
  const coordSid = await assessmentCoordinatorSid();
  const examSid = await examinationsOfficerSid();
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: candidate list, approved plan, then per
  // component an active mapping, staged batch, validation and submission.
  // Moderation begin/decide runs through the UI below so the journey
  // proves the staff screens end to end.
  await apiPost(
    "/candidate-lists",
    {
      idempotencyKey: randomUUID(),
      offeringRef: lecturer.offeringRef,
      periodCode: lecturer.periodCode,
      studentRefs: [studentA, studentB],
    },
    coordSid,
  );
  const plan = await apiPost(
    "/plans",
    {
      idempotencyKey: randomUUID(),
      offeringRef: lecturer.offeringRef,
      periodCode: lecturer.periodCode,
      components: COMPONENTS.map(({ code, maxMark, weight }) => ({
        code,
        maxMark,
        weight,
      })),
    },
    lecSid,
  );
  await apiPost(
    `/plans/${plan.id}/approve`,
    { idempotencyKey: randomUUID(), version: plan.version },
    coordSid,
  );
  const plansRes = await fetch(
    `${api}/assessment/plans?offeringRef=${lecturer.offeringRef}&periodCode=${lecturer.periodCode}`,
    { headers: { cookie: lecSid } },
  );
  const plans = (await plansRes.json()) as {
    items: Array<{ components: Array<{ id: string; code: string }> }>;
  };
  const caseIds: string[] = [];
  for (const component of COMPONENTS) {
    const componentId =
      plans.items[0]?.components.find((c) => c.code === component.code)?.id ??
      "";
    expect(componentId).not.toBe("");
    const mapping = await apiPost(
      "/mappings",
      {
        idempotencyKey: randomUUID(),
        componentId,
        moodleActivityId: `SIM-BRD-${randomUUID().slice(0, 8).toUpperCase()}`,
        moodleCourseRef: shellRef,
      },
      lecSid,
    );
    await apiPost(
      `/mappings/${mapping.id}/test`,
      { idempotencyKey: randomUUID() },
      lecSid,
    );
    await apiPost(
      `/mappings/${mapping.id}/activate`,
      { idempotencyKey: randomUUID() },
      coordSid,
    );
    const batch = await apiPost(
      "/batches",
      {
        idempotencyKey: randomUUID(),
        mappingId: mapping.id,
        sourceRevision: `SIM-REV-${randomUUID()}`,
        lines: [
          { studentRef: studentA, rawValue: component.mark },
          { studentRef: studentB, rawValue: component.mark },
        ],
      },
      lecSid,
    );
    await apiPost(
      `/batches/${batch.id}/validate`,
      { idempotencyKey: randomUUID() },
      examSid,
    );
    const submitted = await apiPost(
      `/batches/${batch.id}/submit`,
      { idempotencyKey: randomUUID(), declaration: SUBMISSION_DECLARATION },
      lecSid,
    );
    caseIds.push(submitted.id as string);
  }
  expect(caseIds).toHaveLength(3);

  // Independent moderator begins review and approves each case.
  await signIn(page, moderator.username, moderator.password, base);
  for (const caseId of caseIds) {
    await page.goto(`/admin/assessment/moderation/${caseId}`);
    await page.getByLabel("Decision").selectOption("BEGIN");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expect(page.getByText(/under moderation/).first()).toBeVisible();
    await page.getByLabel("Decision").selectOption("APPROVED");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expect(
      page.getByText(/Official CA records written/).first(),
    ).toBeVisible();
  }
  await page.context().clearCookies();

  // Lecturer assembles the board package through the UI declaration.
  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto("/admin/assessment/packages");
  await expect(
    page.locator("main").getByRole("heading", { name: "Board packages" }).first(),
  ).toBeVisible();
  await page
    .getByLabel(/I confirm that the approved results, moderation outcomes/)
    .check();
  const assembleButton = page.getByRole("button", {
    name: "Assemble package",
  });
  await assembleButton.focus();
  await expect(assembleButton).toBeFocused();
  await assembleButton.click();
  await expect(
    page.getByText(/Result package assembled/),
  ).toBeVisible();
  await noOverflow(page);

  // Open the frozen package: hash, declaration and weighted preview.
  const packageLink =
    (await page
      .locator("li", { hasText: "ASSEMBLED" })
      .first()
      .getByRole("link", { name: "Open package" })
      .getAttribute("href")) ?? "";
  const packageId = uuidFrom(packageLink);
  expect(packageId).not.toBe("");
  await page.goto(`/admin/assessment/packages/${packageId}`);
  await expect(page.locator("main")).toContainText(PACKAGE_DECLARATION);
  await expect(page.locator("main")).toContainText("Package hash");
  await expect(page.locator("main")).toContainText("weighted-total-v1");
  await noOverflow(page);
  await page.context().clearCookies();

  // Examinations authority approves for release. Students see nothing:
  // no release exists in this slice.
  await signIn(page, officer.username, officer.password, base);
  await page.goto(`/admin/assessment/packages/${packageId}`);
  await page.getByLabel("Board decision", { exact: true }).selectOption("APPROVE_FOR_RELEASE");
  const decideButton = page.getByRole("button", {
    name: "Record board decision",
  });
  await decideButton.focus();
  await expect(decideButton).toBeFocused();
  await decideButton.click();
  await expect(
    page.getByText(/approved for release/i).first(),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("APPROVED_FOR_RELEASE");
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
