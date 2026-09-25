import { test, expect } from "@playwright/test";
import {
  createAssessmentCoordinator,
  createLecturer,
  ensureAssessmentShell,
  ensureStagedStudent,
} from "./fixtures";

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

// Phase 7 slice 1: lecturer drafts a versioned plan, a second officer
// approves on the decision page (self-approval refused), then a mapping
// is drafted, synthetically tested and activated by the coordinator.
test("assessment plan: plan to mapping activation journey", async ({
  page,
}) => {
  const lecturer = await createLecturer();
  const coordinator = await createAssessmentCoordinator();
  const shellRef = await ensureAssessmentShell();
  await page.setViewportSize({ width: 390, height: 844 });

  // Lecturer drafts the demo scheme plan.
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(lecturer.username);
  await page.getByLabel("Password", { exact: true }).fill(lecturer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/assessment/plans");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Assessment plans" })
      .first(),
  ).toBeVisible();
  await page.getByLabel("Offering reference").fill(lecturer.offeringRef);
  await page.getByLabel("Period code").fill(lecturer.periodCode);
  const draftButton = page.getByRole("button", { name: "Draft plan" });
  await draftButton.focus();
  await expect(draftButton).toBeFocused();
  const [draftResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/assessment/plans") &&
        r.request().method() === "POST",
    ),
    page.keyboard.press("Enter"),
  ]);
  const draftBody = (await draftResponse.json()) as {
    id?: string;
    components?: Array<{ id?: string; code?: string }>;
  };
  const planId = uuidFrom(draftBody.id);
  expect(planId).not.toBe("");
  const draftComponentId = uuidFrom(
    draftBody.components?.find((c) => c.code === "CA-QUIZ1")?.id,
  );
  expect(draftComponentId).not.toBe("");
  await expect(page.getByText(/Plan drafted/)).toBeVisible();
  await expect(page.getByText(lecturer.offeringRef).first()).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  const planRow = page
    .locator("li", { hasText: lecturer.offeringRef })
    .filter({ hasText: "DRAFT" })
    .first();
  await expect(planRow).toBeVisible();

  // Four-eyes: the creator cannot approve their own plan. The lecturer
  // sees the refusal on the dedicated decision page.
  await page.goto(`/admin/assessment/plans/${planId}/decide`);
  await expect(page.getByRole("heading", { name: /Plan approval/ })).toBeVisible();
  await expect(
    page
      .getByText(
        "I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.",
      )
      .first(),
  ).toBeVisible();
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  await page.getByRole("button", { name: "Approve plan" }).click();
  await expect(
    page.getByText(/second officer|unavailable/i).first(),
  ).toBeVisible();

  // Second officer (coordinator) approves on the same decision page.
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(coordinator.username);
  await page.getByLabel("Password", { exact: true }).fill(coordinator.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto(`/admin/assessment/plans/${planId}/decide`);
  await expect(page.getByRole("heading", { name: /Plan approval/ })).toBeVisible();
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  const approveButton = page.getByRole("button", { name: "Approve plan" });
  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  const [approveResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/assessment/plans/${planId}/approve`) &&
        r.request().method() === "POST",
    ),
    page.keyboard.press("Enter"),
  ]);
  expect(approveResponse.status()).toBe(201);
  await expect(page.getByText(/Decision closed/).first()).toBeVisible();
  await expect(page.getByText(/APPROVED/).first()).toBeVisible();
  await noOverflow(page);

  // Component to bind: the draft response already carried the frozen
  // component IDs; the detail page is visited to prove the evidence view.
  const componentId = draftComponentId;
  await page.goto(`/admin/assessment/plans/${planId}`);
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Components", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText(/APPROVED/).first(),
  ).toBeVisible();
  const detailText = await page.locator("main").textContent();
  expect(detailText).toContain("CA-QUIZ1");
  expect(detailText).toContain(componentId);

  // Lecturer drafts + tests the grade mapping (synthetic, writes nothing
  // on failure); activation stays coordinator-only.
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(lecturer.username);
  await page.getByLabel("Password", { exact: true }).fill(lecturer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  const activity = `SIM-QUIZ-${Date.now().toString(36).toUpperCase()}`;
  await page.goto("/admin/assessment/mappings");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Grade mappings" })
      .first(),
  ).toBeVisible();
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
  const mapBody = (await mapResponse.json()) as { id?: string };
  const mappingId = uuidFrom(mapBody.id);
  expect(mappingId).not.toBe("");
  await expect(page.getByText(/Mapping drafted/)).toBeVisible();
  await expect(page.locator("main")).toContainText(activity);

  const mappingRow = page
    .locator("li", { hasText: activity })
    .filter({ hasText: "DRAFT" })
    .first();
  await expect(mappingRow).toBeVisible();

  await page.getByLabel("Mapping ID").fill(mappingId);
  await page.getByRole("button", { name: "Run synthetic test" }).click();
  await expect(page.getByText(/Synthetic test PASS/)).toBeVisible();

  await page.goto(`/admin/assessment/mappings/${mappingId}`);
  await expect(page.getByText("PASS").first()).toBeVisible();
  await expect(page.getByText("component-present").first()).toBeVisible();
  await noOverflow(page);

  // Lecturer cannot self-activate; the refusal names the second officer.
  await page.goto(`/admin/assessment/mappings/${mappingId}/decide`);
  await expect(
    page.getByRole("heading", { name: /Mapping activation/ }),
  ).toBeVisible();
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  await page.getByRole("button", { name: "Activate mapping" }).click();
  await expect(
    page.getByText(/second officer|unavailable/i).first(),
  ).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(coordinator.username);
  await page.getByLabel("Password", { exact: true }).fill(coordinator.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto(`/admin/assessment/mappings/${mappingId}/decide`);
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  const activateButton = page.getByRole("button", {
    name: "Activate mapping",
  });
  await activateButton.focus();
  await expect(activateButton).toBeFocused();
  const [activateResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/assessment/mappings/${mappingId}/activate`) &&
        r.request().method() === "POST",
    ),
    page.keyboard.press("Enter"),
  ]);
  expect(activateResponse.status()).toBe(201);
  await expect(page.getByText(/Decision closed or not ready/).first()).toBeVisible();
  await noOverflow(page);

  // Slice 2 leg: the lecturer stages a batch through the ACTIVE mapping —
  // one genuine student (stays STAGED) plus one unknown reference
  // (flagged MOODLE_ONLY, evidence preserved, converts to nothing).
  const stagedStudent = await ensureStagedStudent();
  const ghost = `GHOST-${Date.now().toString(36).toUpperCase()}`;
  const revision = `SIM-REV-${Date.now().toString(36).toUpperCase()}`;
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(lecturer.username);
  await page.getByLabel("Password", { exact: true }).fill(lecturer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/assessment/batches");
  await expect(
    page.locator("main").getByRole("heading", { name: "Grade batches", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mapping ID").fill(mappingId);
  await page.getByLabel("Source revision").fill(revision);
  await page.getByLabel("Student reference 1").fill(stagedStudent);
  await page.getByLabel("Raw mark 1").fill("15");
  await page.getByLabel("Student reference 2").fill(ghost);
  await page.getByLabel("Raw mark 2").fill("12");
  const [stageResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/assessment/batches") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Stage batch" }).click(),
  ]);
  expect(stageResponse.status()).toBe(201);
  const stageBody = (await stageResponse.json()) as { id?: string };
  const batchId = uuidFrom(stageBody.id);
  expect(batchId).not.toBe("");
  await expect(page.getByText(/Batch staged/).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(revision);

  await page.goto(`/admin/assessment/batches/${batchId}`);
  await expect(
    page.locator("main").getByRole("heading", { name: /Grade batch/, exact: false }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("MOODLE_ONLY");
  await expect(page.locator("main")).toContainText("STAGED");
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
