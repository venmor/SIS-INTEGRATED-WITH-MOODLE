import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  assessmentCoordinatorSid,
  assessmentLecturerSid,
  createExaminationsOfficer,
  createLecturer,
  createModerator,
  createStudent,
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

// Phase 7 slice 7: release publishes 68.8, the student sees it, an
// authorized amendment case corrects it to 74, the examinations
// authority approves, and the student sees only the amended current
// version — the original stays in staff history, never overwritten.
test("result amendment: request, approve, student sees amended total", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const lecturer = await createLecturer();
  const moderator = await createModerator();
  const officer = await createExaminationsOfficer();
  const stu = await createStudent();
  const shellRef = await ensureAssessmentShell();
  const studentA = stu.studentNumber;
  const studentB = await ensureStagedStudent();
  const lecSid = await assessmentLecturerSid(lecturer.offeringRef);
  const coordSid = await assessmentCoordinatorSid();
  const examSid = await examinationsOfficerSid();
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: candidate list, approved plan, then per
  // component an active mapping, staged batch, validation and
  // submission. Moderation begin/decide runs through the UI below so
  // the journey proves the staff screens end to end.
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
        moodleActivityId: `SIM-AMD-${randomUUID().slice(0, 8).toUpperCase()}`,
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

  // Package assembly, board approval and official release via the API
  // (the board-release journey already proves those screens); the UI
  // under test here is the amendment request → approval below.
  const pkg = await apiPost(
    "/packages",
    {
      idempotencyKey: randomUUID(),
      offeringRef: lecturer.offeringRef,
      periodCode: lecturer.periodCode,
      declaration: PACKAGE_DECLARATION,
    },
    lecSid,
  );
  const pkgDetail = (await (
    await fetch(`${api}/assessment/packages/${pkg.id as string}`, {
      headers: { cookie: lecSid },
    })
  ).json()) as { version: number };
  await apiPost(
    `/packages/${pkg.id as string}/decide`,
    {
      idempotencyKey: randomUUID(),
      version: pkgDetail.version,
      to: "APPROVE_FOR_RELEASE",
      reason: "Board minute 12.",
    },
    examSid,
  );
  await apiPost(
    "/releases",
    { idempotencyKey: randomUUID(), packageId: pkg.id as string },
    examSid,
  );
  const packageId = pkg.id as string;

  // The student sees the released 68.8 before any amendment.
  await signIn(page, stu.username, stu.password, base);
  await page.goto("/student/results");
  await expect(
    page.locator("main").getByText("Official result — released").first(),
  ).toBeVisible();
  await expect(page.locator("main").getByText("68.8").first()).toBeVisible();
  await page.context().clearCookies();

  // The lecturer opens an amendment case through the package page.
  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto(`/admin/assessment/packages/${packageId}`);
  await expect(page.locator("main")).toContainText("Result amendments");
  await page.getByLabel("Student reference").fill(studentA);
  await page.getByLabel(/Corrected total/).fill("74");
  await page
    .getByLabel("Reason with documented authority")
    .fill("Verified clerical error: FINAL-EXAM 68 misrecorded as 66.");
  await page.getByLabel("Evidence reference").fill("remark-slip-001");
  await page
    .getByLabel(/this official-result amendment is complete for its student/)
    .check();
  const requestButton = page.getByRole("button", { name: "Request amendment" });
  await requestButton.focus();
  await expect(requestButton).toBeFocused();
  await requestButton.click();
  await expect(page.getByText(/Amendment case opened/)).toBeVisible();
  await noOverflow(page);
  await page.context().clearCookies();

  // Pre-approval the student still sees the original 68.8.
  await signIn(page, stu.username, stu.password, base);
  await page.goto("/student/results");
  await expect(page.locator("main").getByText("68.8").first()).toBeVisible();
  await expect(page.locator("main").getByText("74")).toHaveCount(0);
  await page.context().clearCookies();

  // The examinations authority approves the case.
  await signIn(page, officer.username, officer.password, base);
  await page.goto(`/admin/assessment/packages/${packageId}`);
  await page
    .getByLabel("Amendment decision", { exact: true })
    .selectOption("APPROVE");
  const approveButton = page.getByRole("button", {
    name: "Record amendment decision",
  });
  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  await approveButton.click();
  await expect(page.getByText(/Amendment approved/)).toBeVisible();
  await expect(page.locator("main")).toContainText("APPROVED");
  await noOverflow(page);
  await page.context().clearCookies();

  // The student now sees only the amended 74 with its version note.
  await signIn(page, stu.username, stu.password, base);
  await page.goto("/student/results");
  await expect(
    page.locator("main").getByText("Official result — released").first(),
  ).toBeVisible();
  await expect(page.locator("main").getByText("74").first()).toBeVisible();
  await expect(
    page.locator("main").getByText(/amended official version [0-9]+/),
  ).toBeVisible();
  await expect(page.locator("main").getByText("68.8")).toHaveCount(0);
  await expect(page.locator("main").getByText("Board minute")).toHaveCount(0);
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
