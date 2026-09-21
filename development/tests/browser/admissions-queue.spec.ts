import { test, expect } from "@playwright/test";
import path from "node:path";
import { createApplicant } from "./fixtures";

async function submitApplication(page: any, applicant: any) {
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
  const applicationUrl = page.url();
  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Review");
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
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(2).check();
  await page
    .getByRole("button", { name: "Continue to submission confirmation" })
    .click();
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();
  return applicationUrl;
}

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("staff queue: officer claims a case, records a finding, raises clarification", async ({
  page,
}) => {
  const applicant = await createApplicant();
  await page.setViewportSize({ width: 390, height: 844 });
  await submitApplication(page, applicant);

  // Sign out the applicant, sign in as the seeded demonstration officer.
  await page.goto("/applicant");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.getByLabel("Username", { exact: true }).fill("temwani.r");
  await page.getByLabel("Password", { exact: true }).fill("Seed-2026-Temwani");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Wait for the sign-in round-trip: the form replaces to home on success.
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: "Student Information System" }),
  ).toBeVisible();
  // Officer landing offers the queue directly.
  await expect(
    page.getByRole("link", { name: "Admissions queue" }),
  ).toBeVisible();

  await page.goto("/admin/admissions/queue");
  await expect(
    page.getByRole("heading", { name: "Admissions queue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Claimable pool" }).click();
  const claimButton = page
    .getByRole("button", { name: /Claim case APP-/ })
    .first();
  await expect(claimButton).toBeVisible();
  const caseRef =
    (await claimButton.getAttribute("aria-label")) ?? "claimed case";
  await claimButton.click();
  await expect(page.getByText(/claimed\./)).toBeVisible();
  await page.getByRole("button", { name: "My cases", exact: true }).click();
  const claimedRef = caseRef.replace("Claim case ", "");
  await expect(
    page.getByRole("link", { name: `Open case ${claimedRef}` }),
  ).toBeVisible();
  await noOverflow(page);

  // Open the case comparison workspace.
  await page
    .getByRole("link", { name: /Open case APP-/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /Review case/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Declarations vs documents" }),
  ).toBeVisible();
  await expect(page.getByText("fictional-result.pdf")).toBeVisible();
  await noOverflow(page);

  // Empty finding submit shows a persistent error summary.
  await page.getByRole("button", { name: "Record finding" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Subject").fill("Checklist complete");
  await page.getByLabel("Detail").fill("All required evidence present.");
  await page.getByRole("button", { name: "Record finding" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Finding recorded.")).toBeVisible();
  await expect(page.getByText("Checklist complete")).toBeVisible();
  await noOverflow(page);

  // Raise a scoped clarification.
  await page
    .getByLabel("Exact items needed")
    .fill("Provide a complete result statement.");
  await page
    .getByRole("button", { name: "Raise clarification" })
    .click();
  await expect(page.getByText(/Clarification raised/)).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
