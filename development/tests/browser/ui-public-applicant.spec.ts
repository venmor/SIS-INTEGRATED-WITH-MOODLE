import { test, expect } from "@playwright/test";
import path from "node:path";
import { createApplicant } from "./fixtures";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function startDraft(page: import("@playwright/test").Page) {
  const applicant = await createApplicant();

  await page.goto("/discover");
  await page
    .getByRole("link", { name: /BSc Software Engineering/ })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Start application", exact: true })
    .click();

  await expect(page).toHaveURL(/sign-in/);
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

  return page.url();
}

async function submitBasicApplication(
  page: import("@playwright/test").Page,
): Promise<string> {
  const applicationUrl = await startDraft(page);

  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Timeline");
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
  await page
    .getByRole("button", { name: "Check file safety", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Preview fictional-result.pdf" }),
  ).toBeVisible();

  await page.goto(`${applicationUrl}/review`);
  const declarations = page.getByRole("checkbox");
  for (let index = 0; index < (await declarations.count()); index += 1) {
    await declarations.nth(index).check();
  }
  const continueButton = page.getByRole("button", {
    name: "Continue to submission confirmation",
  });
  if (await continueButton.isDisabled()) {
    console.log(
      "REVIEW_DIAGNOSTIC\n" + (await page.locator("main").innerText()),
    );
  }
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();

  return applicationUrl;
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
    card.getByRole("link", {
      name: /Add BSc Software Engineering to comparison/,
    }),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

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

test("draft overview identifies the next required application step", async ({
  page,
}) => {
  await startDraft(page);

  const progress = page.getByRole("region", { name: "Application progress" });
  await expect(progress).toBeVisible();
  await expect(progress.getByText("Next required step:")).toBeVisible();
  await expect(progress).toContainText("Personal details");

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
});

test("required documents always expose a clear state", async ({ page }) => {
  const applicationUrl = await startDraft(page);
  await page.goto(`${applicationUrl}/documents`);

  await expect(page.getByText("Status: Not uploaded").first()).toBeVisible();

  await page
    .getByLabel("Choose file")
    .setInputFiles(
      path.resolve("packages/test-fixtures/documents/fictional-result.pdf"),
    );
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();

  await expect(
    page.getByText("Status: Checking file safety").first(),
  ).toBeVisible();
});

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
  await expectNoHorizontalOverflow(page);
});
