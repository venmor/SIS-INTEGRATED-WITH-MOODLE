import { test, expect } from "@playwright/test";
import path from "node:path";
import { createApplicant } from "./fixtures";
test("applicant completes a mobile keyboard journey and recovers a lost submission response", async ({
  page,
}) => {
  const applicant = await createApplicant();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  const programme = page
    .getByRole("link", { name: /BSc Software Engineering/ })
    .first();
  await programme.click();
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
  const applicationUrl = page.url();
  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Applicant");
  await page.getByLabel("Date of birth").fill("2000-01-01");
  let navigationWarning = false;
  page.once("dialog", async (dialog) => {
    navigationWarning = true;
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: /Qualifications and results/ }).click();
  await expect(
    page.getByRole("heading", { name: "Personal details", exact: true }),
  ).toBeVisible();
  expect(navigationWarning).toBe(true);
  await expect(page.getByLabel("Given name (required)")).toHaveValue(
    "Fictional",
  );
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await expect(
    page.getByRole("heading", { name: "Contact details", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Contact details/ }).click();
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
  let releaseSave!: () => void;
  let requestStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  await page.route(
    "**/api/applications/*/sections/qualifications",
    async (route) => {
      await new Promise<void>((resolve) => {
        releaseSave = resolve;
        requestStarted();
      });
      await route.continue();
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await started;
  try {
    await expect(page.getByLabel("Grade 1")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add subject result" }),
    ).toBeDisabled();
  } finally {
    releaseSave();
  }
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
  await expect(
    page.getByRole("heading", {
      name: "Your application is not ready to submit yet",
    }),
  ).toHaveCount(0);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(2).check();
  await page
    .getByRole("button", { name: "Continue to submission confirmation" })
    .click();
  await page.route(
    "**/api/applications/*/submit",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check saved result" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check saved result" }).click();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download submission receipt" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.screenshot({
    path: "test-results/applicant-receipt-mobile.png",
    fullPage: true,
  });
});
test("cross-origin login and application writes are denied at the web proxy", async ({
  request,
}) => {
  const r = await request.post("/api/auth/sign-in", {
    headers: { Origin: "https://foreign.invalid" },
    data: { username: "bwalya.m", password: "irrelevant" },
  });
  expect(r.status()).toBe(403);
  const a = await request.post("/api/applications", {
    headers: { Origin: "https://foreign.invalid" },
    data: {},
  });
  expect(a.status()).toBe(403);
});
