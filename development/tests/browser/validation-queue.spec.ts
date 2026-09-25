import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  assessmentCoordinatorSid,
  assessmentLecturerSid,
  createExaminationsOfficer,
  createLecturer,
  ensureAssessmentShell,
  ensureStagedStudent,
  examinationsOfficerSid,
} from "./fixtures";

const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";

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

// Phase 7 slice 3: a staged batch with a missing mark validates into a
// MISSING_MARK work item; examinations triages it; the lecturer corrects
// by new revision; the new batch validates clean. Findings stay history.
test("validation queue: finding to correction to clear batch", async ({
  page,
}) => {
  const base =
    process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const lecturer = await createLecturer();
  const officer = await createExaminationsOfficer();
  const shellRef = await ensureAssessmentShell();
  const goodStudent = await ensureStagedStudent();
  const missingStudent = await ensureStagedStudent();
  const lecSid = await assessmentLecturerSid(lecturer.offeringRef);
  const coordSid = await assessmentCoordinatorSid();
  await examinationsOfficerSid();
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: approved plan, active mapping, staged batch
  // with one genuine mark and one declared missing mark.
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
  const activity = `SIM-QUIZ-${Date.now().toString(36).toUpperCase()}`;

  // Lecturer signs in and drafts the mapping through the real form so
  // component IDs stay server-resolved.
  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto("/admin/assessment/mappings");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Grade mappings" })
      .first(),
  ).toBeVisible();
  // The component ID is resolved from the approved plan via the API.
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
  await page.getByLabel("Component ID").fill(componentId);
  await page.getByLabel("Moodle activity ID").fill(activity);
  await page.getByLabel("Moodle course reference").fill(shellRef);
  const [mapResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/assessment/mappings") &&
        r.request().method() === "POST" &&
        !r.url().includes("/test") &&
        !r.url().includes("/activate"),
    ),
    page.getByRole("button", { name: "Draft mapping" }).click(),
  ]);
  const mappingId = uuidFrom(((await mapResponse.json()) as { id?: string }).id);
  expect(mappingId).not.toBe("");
  await page.getByLabel("Mapping ID").fill(mappingId);
  await page.getByRole("button", { name: "Run synthetic test" }).click();
  await expect(page.getByText(/Synthetic test PASS/)).toBeVisible();
  await page.context().clearCookies();

  // Coordinator activates; lecturer stages genuine + missing marks.
  await signIn(page, officer.username, officer.password, base);
  await page.goto(`/admin/assessment/mappings/${mappingId}/decide`);
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  await page.getByRole("button", { name: "Activate mapping" }).click();
  // The examinations officer cannot activate academic mappings: the
  // refusal proves separation, then the API path completes setup.
  await expect(
    page.getByText(/second officer|unavailable/i).first(),
  ).toBeVisible();
  await apiPost(
    `/mappings/${mappingId}/activate`,
    { idempotencyKey: randomUUID() },
    coordSid,
  );
  const revision = `SIM-REV-${Date.now().toString(36).toUpperCase()}`;
  const batch = await apiPost(
    "/batches",
    {
      idempotencyKey: randomUUID(),
      mappingId,
      sourceRevision: revision,
      lines: [
        { studentRef: goodStudent, rawValue: 15 },
        { studentRef: missingStudent, outcome: "MISSING_MARK" },
      ],
    },
    lecSid,
  );
  const batchId = batch.id as string;

  // Examinations runs validation from the batch page.
  await page.goto(`/admin/assessment/batches/${batchId}`);
  await expect(
    page.locator("main").getByRole("heading", { name: /Grade batch/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByText(/Validation complete/)).toBeVisible();
  await expect(page.locator("main")).toContainText("MISSING_MARKS");
  await noOverflow(page);

  // Queue shows the work item; detail carries owner + deadline.
  await page.goto("/admin/assessment/findings");
  await expect(
    page.locator("main").getByRole("heading", { name: "Findings" }).first(),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("MISSING_MARK");
  const findingRow = page
    .locator("tr", { hasText: "MISSING_MARK" })
    .first();
  const href =
    (await findingRow.getByRole("link", { name: "Open finding" }).getAttribute("href")) ?? "";
  const findingId = uuidFrom(href);
  expect(findingId).not.toBe("");
  await page.goto(`/admin/assessment/findings/${findingId}`);
  await expect(page.locator("main")).toContainText("MISSING_MARK");
  await expect(page.locator("main")).toContainText(lecturer.offeringRef);
  // Triage resolves with a recorded reason; staged marks stay.
  await page.getByLabel("Decision").selectOption("RESOLVED");
  await page
    .getByLabel(/Reason \(required to resolve or dismiss\)/)
    .fill("Lecturer will correct in a new revision.");
  const resolveButton = page.getByRole("button", { name: "Record decision" });
  await resolveButton.focus();
  await expect(resolveButton).toBeFocused();
  await resolveButton.click();
  await expect(page.getByText(/Finding resolved/).first()).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  // Lecturer corrects by new revision through the batches form.
  await page.context().clearCookies();
  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto("/admin/assessment/batches");
  await page.getByLabel("Mapping ID").fill(mappingId);
  const revision2 = `SIM-REV-${Date.now().toString(36).toUpperCase()}B`;
  await page.getByLabel("Source revision").fill(revision2);
  await page.getByLabel("Student reference 1").fill(missingStudent);
  await page.getByLabel("Raw mark 1").fill("14");
  const [stageResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/assessment/batches") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Stage batch" }).click(),
  ]);
  const batch2Id = uuidFrom(((await stageResponse.json()) as { id?: string }).id);
  expect(batch2Id).not.toBe("");

  // The corrected batch validates clean: the finding clears.
  await page.context().clearCookies();
  await signIn(page, officer.username, officer.password, base);
  await page.goto(`/admin/assessment/batches/${batch2Id}`);
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByText(/Validation complete \(0 findings/).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("No validation findings");
  await noOverflow(page);
});
