import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { createApplicant } from "./fixtures";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function noPageGradient(page: Page) {
  const values = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(values.every((value) => value === "none")).toBe(true);
}

async function signIn(page: Page, username: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 20000 });
}

async function submitApplication(page: Page) {
  const applicant = await createApplicant();

  await page.goto("/discover");
  await page
    .getByRole("link", { name: /BSc Software Engineering/ })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Start application", exact: true })
    .click();

  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start an application" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application overview" }),
  ).toBeVisible();

  const applicationUrl = page.url();
  const applicationId = applicationUrl.split("/").pop() as string;

  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Evidence");
  await page.getByLabel("Date of birth").fill("2000-01-01");
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");

  await page.getByLabel("Reminder channel").selectOption("PORTAL");
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");

  await page.getByRole("link", { name: /Qualifications and results/ }).click();
  await page
    .getByLabel("Qualification route", { exact: false })
    .selectOption("ECZ");
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
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");

  await page.getByRole("link", { name: /Supporting documents/ }).click();
  await page
    .getByLabel("Choose file")
    .setInputFiles(
      path.resolve("packages/test-fixtures/documents/fictional-result.pdf"),
    );
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await expect(
    page.getByText(/fictional-result.pdf · Checking file safety/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check file safety", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Preview fictional-result.pdf" }),
  ).toBeVisible();

  await page.goto(`${applicationUrl}/review`);
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await checkbox.check();
  }
  await page
    .getByRole("button", { name: "Continue to submission confirmation" })
    .click();
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();

  const referenceText =
    (await page.getByText(/Reference: APP-/).textContent()) ?? "";
  return {
    applicationId,
    reference: referenceText.replace("Reference:", "").trim(),
  };
}

test("admissions workspace visual evidence", async ({ page }) => {
  const submitted = await submitApplication(page);

  await signIn(page, "temwani.r", "Seed-2026-Temwani");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/admissions/queue");
  await page.getByRole("button", { name: "Claimable pool" }).click();

  await expect(
    page.getByRole("complementary", { name: "Staff workspace navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: `Claim case ${submitted.reference}`,
      exact: true,
    }),
  ).toBeVisible();
  await noOverflow(page);
  await noPageGradient(page);
  await page.screenshot({
    path: "test-results/ui-admissions-queue-1440.png",
    fullPage: true,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({
    path: "test-results/ui-admissions-queue-390.png",
    fullPage: true,
    animations: "disabled",
  });

  await page
    .getByRole("button", {
      name: `Claim case ${submitted.reference}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByText(`Case ${submitted.reference} claimed.`),
  ).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/admin/admissions/case/${submitted.applicationId}`);
  await expect(
    page.getByRole("heading", { name: "Evidence review", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Release a decision" }),
  ).toHaveCount(0);
  await noOverflow(page);
  await noPageGradient(page);
  await page.screenshot({
    path: "test-results/ui-admissions-reviewer-case-1440.png",
    fullPage: true,
    animations: "disabled",
  });

  await page.getByLabel("Eligibility outcome").selectOption("ELIGIBLE");
  await page
    .getByLabel("Recommendation", { exact: true })
    .selectOption("FAVOURABLE");
  await page.getByLabel("Rationale").fill("Evidence meets demo criteria.");
  await page.getByRole("button", { name: "Record recommendation" }).click();
  await expect(page.getByText("Recommendation recorded.")).toBeVisible();

  await signIn(page, "kasonde.a", "Seed-2026-Kasonde");
  await page.goto(`/admin/admissions/case/${submitted.applicationId}`);
  await expect(
    page.getByRole("heading", { name: "Decision", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Release a decision" }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Record a recommendation" }),
  ).toHaveCount(0);
  await noOverflow(page);
  await noPageGradient(page);
  await page.screenshot({
    path: "test-results/ui-admissions-approver-case-1440.png",
    fullPage: true,
    animations: "disabled",
  });
});
