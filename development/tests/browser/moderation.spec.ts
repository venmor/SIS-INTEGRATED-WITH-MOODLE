import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  assessmentCoordinatorSid,
  assessmentLecturerSid,
  createLecturer,
  createModerator,
  ensureAssessmentShell,
  ensureStagedStudent,
  examinationsOfficerSid,
} from "./fixtures";

const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";
const DECLARATION =
  "I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.";

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

// Phase 7 slice 4: a validated batch submits for moderation through the
// UI declaration, an independent moderator approves it, and a second
// batch returns with a reason for correction by new revision.
test("moderation: submit to approve, plus returned correction", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const lecturer = await createLecturer();
  const moderator = await createModerator();
  const shellRef = await ensureAssessmentShell();
  const studentA = await ensureStagedStudent();
  const studentB = await ensureStagedStudent();
  const lecSid = await assessmentLecturerSid(lecturer.offeringRef);
  const coordSid = await assessmentCoordinatorSid();
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: candidate list, approved plan, active mapping.
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
      components: [
        { code: "CA-QUIZ1", maxMark: 20, weight: 20 },
        { code: "CA-ASSIGN", maxMark: 30, weight: 20 },
        { code: "FINAL-EXAM", maxMark: 100, weight: 60 },
      ],
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
  const componentId =
    plans.items[0]?.components.find((c) => c.code === "CA-QUIZ1")?.id ?? "";
  expect(componentId).not.toBe("");
  const activity = `SIM-QUIZ-${Date.now().toString(36).toUpperCase()}`;
  const mapping = await apiPost(
    "/mappings",
    {
      idempotencyKey: randomUUID(),
      componentId,
      moodleActivityId: activity,
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
  const revision = `SIM-REV-${Date.now().toString(36).toUpperCase()}`;
  const batch = await apiPost(
    "/batches",
    {
      idempotencyKey: randomUUID(),
      mappingId: mapping.id,
      sourceRevision: revision,
      lines: [
        { studentRef: studentA, rawValue: 15 },
        { studentRef: studentB, rawValue: 16 },
      ],
    },
    lecSid,
  );
  const batchId = batch.id as string;
  const examSid = await examinationsOfficerSid();
  await apiPost(
    `/batches/${batchId}/validate`,
    { idempotencyKey: randomUUID() },
    examSid,
  );

  // Lecturer submits through the UI declaration.
  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto(`/admin/assessment/batches/${batchId}`);
  await expect(
    page.locator("main").getByRole("heading", { name: /Grade batch/ }),
  ).toBeVisible();
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  const submitButton = page.getByRole("button", {
    name: "Submit for moderation",
  });
  await submitButton.focus();
  await expect(submitButton).toBeFocused();
  await submitButton.click();
  await expect(page.getByText(/Batch submitted for moderation/)).toBeVisible();
  await noOverflow(page);

  // Independent moderator begins review and approves.
  await page.context().clearCookies();
  await signIn(page, moderator.username, moderator.password, base);
  await page.goto("/admin/assessment/moderation");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Cases", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("SUBMITTED");
  const caseLink =
    (await page
      .locator("li", { hasText: "SUBMITTED" })
      .first()
      .getByRole("link", { name: "Open case" })
      .getAttribute("href")) ?? "";
  const caseId = uuidFrom(caseLink);
  expect(caseId).not.toBe("");
  await page.goto(`/admin/assessment/moderation/${caseId}`);
  await expect(page.locator("main")).toContainText(DECLARATION);
  await page.getByLabel("Decision").selectOption("BEGIN");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText(/under moderation/).first()).toBeVisible();
  await page.getByLabel("Decision").selectOption("APPROVED");
  const approveButton = page.getByRole("button", { name: "Record decision" });
  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  await approveButton.click();
  await expect(page.getByText(/Official CA records written/).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("APPROVED");
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  // Second batch returns with a reason for correction by new revision.
  const revision2 = `SIM-REV-${Date.now().toString(36).toUpperCase()}B`;
  const batch2 = await apiPost(
    "/batches",
    {
      idempotencyKey: randomUUID(),
      mappingId: mapping.id,
      sourceRevision: revision2,
      lines: [
        { studentRef: studentA, rawValue: 4 },
        { studentRef: studentB, rawValue: 5 },
      ],
    },
    lecSid,
  );
  await apiPost(
    `/batches/${batch2.id}/validate`,
    { idempotencyKey: randomUUID() },
    examSid,
  );
  await apiPost(
    `/batches/${batch2.id}/submit`,
    { idempotencyKey: randomUUID(), declaration: DECLARATION },
    lecSid,
  );
  await page.goto("/admin/assessment/moderation");
  const case2Link =
    (await page
      .locator("li", { hasText: "SUBMITTED" })
      .first()
      .getByRole("link", { name: "Open case" })
      .getAttribute("href")) ?? "";
  const case2Id = uuidFrom(case2Link);
  expect(case2Id).not.toBe("");
  await page.goto(`/admin/assessment/moderation/${case2Id}`);
  await page.getByLabel("Decision").selectOption("BEGIN");
  await page.getByRole("button", { name: "Record decision" }).click();
  await page.getByLabel("Decision").selectOption("RETURNED");
  await page
    .getByLabel(/Reason \(required unless approving\)/)
    .fill("Two marks sit far below the TG distribution; recheck capture.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.locator("main")).toContainText("RETURNED");
  await expect(page.locator("main")).toContainText("recheck capture");
  await noOverflow(page);
});
