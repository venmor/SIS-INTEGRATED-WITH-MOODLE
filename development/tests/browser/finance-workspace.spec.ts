import { test, expect } from "@playwright/test";
import {
  createFinanceOfficer,
  createStudent,
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
  await seedReconCase();
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
  await page.getByRole("link", { name: /UNMATCHED/ }).first().click();
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
  await page.getByLabel("Evidence reference (confirms immediately)").fill("BB-BROWSER-1");
  await page.getByRole("button", { name: "Record sponsorship" }).click();
  await expect(page.getByText("Sponsorship recorded")).toBeVisible();
  await expect(
    page.getByText("Fictional Bursary Board").first(),
  ).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
