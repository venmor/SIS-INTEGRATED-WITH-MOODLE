import { test, expect } from "@playwright/test";
import {
  createFinanceApprover,
  createFinanceOfficer,
  createStudent,
  seedAdjustment,
  seedArrangement,
  seedReconCase,
} from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

// Phase 5 slice 6 finance workspace: queue triage, case evidence and
// escalation, sponsorship recording. Follows the student-portal pattern:
// isolated fixtures, labelled fields, no localStorage writes.
test("finance workspace: queue, case escalation, sponsorship", async ({
  page,
}) => {
  const officer = await createFinanceOfficer();
  const student = await createStudent();
  const caseId = await seedReconCase();
  const arrangementId = await seedArrangement(student.studentNumber);
  const adjustmentId = await seedAdjustment(student.studentNumber);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  // Workspace home prioritizes queues with counts.
  await page.goto("/admin/finance");
  await expect(
    page.getByRole("heading", { name: "Finance workspace" }),
  ).toBeVisible();
  await expect(page.getByText("Reconciliation queue")).toBeVisible();
  await noOverflow(page);

  // Queue triage: open the seeded case.
  await page.goto("/admin/finance/cases");
  await expect(
    page.getByRole("heading", { name: "Reconciliation queue" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Case status" })
    .selectOption("OPEN");
  await page.getByRole("combobox", { name: "Order" }).selectOption("newest");
  await page.getByRole("button", { name: "Apply queue filters" }).click();
  await expect(page).toHaveURL(/status=OPEN.*sort=newest/);
  await expect(page.getByText(/cases match this view/)).toBeVisible();
  await page.goto(
    "/admin/finance/cases?status=OPEN&sort=newest&cursor=not-a-cursor",
  );
  await expect(page.getByText("Case page unavailable")).toBeVisible();
  await page.getByRole("link", { name: "First page" }).click();
  await page
    .locator(`a[href="/admin/finance/cases/${caseId}"]:visible`)
    .click();
  await expect(
    page.getByRole("heading", { name: /Case UNMATCHED/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert", { name: "We received a payment we" }),
  ).toBeVisible();
  await noOverflow(page);

  // Escalate keeps history and stays visible.
  await page.getByLabel("Action").selectOption("ESCALATE");
  await page.getByLabel("Officer note").fill("Needs bank trace.");
  await page.getByRole("button", { name: "Resolve case" }).click();
  await expect(page.getByText("Case escalated.")).toBeVisible();
  await noOverflow(page);

  // Sponsorship recording with attested evidence confirms immediately.
  await page.goto("/admin/finance/sponsorships");
  await expect(
    page.getByRole("heading", { name: "Sponsorships" }),
  ).toBeVisible();
  await page.getByLabel("Programme attempt ID").fill(student.attemptId);
  await page
    .getByLabel("Sponsoring organisation")
    .fill("Fictional Bursary Board");
  await page.getByLabel("Covered category").selectOption("Tuition");
  await page.getByLabel("Coverage type").selectOption("AMOUNT");
  await page.getByLabel("Coverage value").fill("405000");
  await page
    .getByLabel("Evidence reference (confirms immediately)")
    .fill("BB-BROWSER-1");
  await page.getByRole("button", { name: "Record sponsorship" }).click();
  await expect(page.getByText("Sponsorship recorded")).toBeVisible();
  await expect(page.getByText("Fictional Bursary Board").first()).toBeVisible();
  await noOverflow(page);
  await page.goto("/admin/finance/arrangements");
  await expect(
    page.getByRole("heading", { name: "Payment arrangements" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Order" }).selectOption("newest");
  await page.getByRole("button", { name: "Apply order" }).click();
  await expect(page).toHaveURL(/sort=newest/);
  await expect(
    page
      .locator("strong:visible")
      .filter({ hasText: "Fictional two instalments for browser review" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(`#arrange-id option[value="${arrangementId}"]`),
  ).toHaveCount(1);
  await noOverflow(page);
  await page.goto("/admin/finance/adjustments");
  await expect(
    page.getByRole("heading", { name: "Adjustments and refunds" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Review kind", exact: true })
    .selectOption("WAIVER");
  await page.getByRole("combobox", { name: "Order" }).selectOption("newest");
  await page.getByRole("button", { name: "Apply queue filters" }).click();
  await expect(page).toHaveURL(/kind=WAIVER.*sort=newest/);
  await expect(
    page.locator("strong:visible").filter({ hasText: "WAIVER" }).first(),
  ).toBeVisible();
  await expect(
    page.locator(`#decide-id option[value="${adjustmentId}"]`),
  ).toHaveCount(0);
  await expect(
    page.getByRole("form", { name: "Request finance adjustment" }),
  ).toBeVisible();
  await page.goto(
    "/admin/finance/adjustments?kind=WAIVER&sort=newest&cursor=not-a-cursor",
  );
  await expect(page.getByText("Adjustment page unavailable")).toBeVisible();
  await page.getByRole("link", { name: "First page" }).click();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("finance approver sees only the individual decision form", async ({
  page,
}) => {
  const approver = await createFinanceApprover();
  const student = await createStudent();
  await seedArrangement(student.studentNumber);
  const adjustmentId = await seedAdjustment(student.studentNumber);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(approver.username);
  await page.getByLabel("Password", { exact: true }).fill(approver.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await page.goto("/admin/finance/adjustments?kind=WAIVER&sort=newest");
  await expect(
    page.getByRole("heading", { name: "Adjustments and refunds" }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Request finance adjustment" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("form", { name: "Decide finance adjustment" }),
  ).toBeVisible();
  await expect(
    page.locator(`#decide-id option[value="${adjustmentId}"]`),
  ).toHaveCount(1);
  await noOverflow(page);
});
