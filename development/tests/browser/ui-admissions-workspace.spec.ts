import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { createApplicant } from "./fixtures";

test.describe.serial("handbook admissions workspace contracts", () => {
  let applicationUrl = "";
  let applicationId = "";
  let reference = "";

  async function signIn(page: Page, username: string, password: string) {
    await page.context().clearCookies();
    await page.goto("/sign-in");
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 20000 });
  }

  async function noOverflow(page: Page) {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }

  test("setup: submit one application for admissions UI contracts", async ({
    page,
  }) => {
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

    applicationUrl = page.url();
    applicationId = applicationUrl.split("/").pop() as string;

    await page.getByRole("link", { name: /Personal details/ }).click();
    await page.getByLabel("Given name (required)").fill("Fictional");
    await page.getByLabel("Family name (required)").fill("Workspace");
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
    reference = referenceText.replace("Reference:", "").trim();

    expect(applicationId).not.toBe("");
    expect(reference).toMatch(/^APP-/);
  });

  test("queue exposes active filters as work context", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "temwani.r", "Seed-2026-Temwani");
    await page.goto("/admin/admissions/queue");

    await page.getByRole("button", { name: "Claimable pool" }).click();
    const claim = page.getByRole("button", {
      name: `Claim case ${reference}`,
      exact: true,
    });
    await expect(claim).toBeVisible();
    await claim.click();
    await expect(page.getByText(`Case ${reference} claimed.`)).toBeVisible();

    await page.getByRole("button", { name: "My cases", exact: true }).click();
    await page.getByLabel("Only cases needing action").check();
    await page.getByRole("button", { name: "Apply filters" }).click();

    const filters = page.getByRole("region", { name: "Active filters" });
    await expect(filters).toBeVisible();
    await expect(filters).toContainText("Action needed");
    await noOverflow(page);
  });

  test("reviewer case is a governed evidence workspace without decision controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "temwani.r", "Seed-2026-Temwani");
    await page.goto(`/admin/admissions/case/${applicationId}`);

    const summary = page.getByRole("region", { name: "Case summary" });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(reference);
    await expect(summary).toContainText("BSc Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Evidence review", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Declarations vs documents" }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("region", { name: "Findings" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Clarification" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recommendation" }),
    ).toBeVisible();

    await expect(
      page.getByRole("form", { name: "Release a decision" }),
    ).toHaveCount(0);

    await page.getByLabel("Subject").fill("UI contract finding");
    await page.getByLabel("Detail").fill("Evidence reviewed.");
    await page.getByRole("button", { name: "Record finding" }).click();
    await expect(page.getByText("Finding recorded.")).toBeVisible();

    await page
      .getByLabel("Exact items needed")
      .fill("Confirm the uploaded result statement.");
    await page.getByRole("button", { name: "Raise clarification" }).click();
    await expect(page.getByText(/Clarification raised/)).toBeVisible();

    await page.getByLabel("Eligibility outcome").selectOption("ELIGIBLE");
    await page
      .getByLabel("Recommendation", { exact: true })
      .selectOption("FAVOURABLE");
    await page.getByLabel("Rationale").fill("Evidence meets demo criteria.");
    await page.getByRole("button", { name: "Record recommendation" }).click();
    await expect(page.getByText("Recommendation recorded.")).toBeVisible();

    await noOverflow(page);
  });

  test("approver case exposes the decision package without reviewer mutation forms", async ({
    page,
  }) => {
    await signIn(page, "kasonde.a", "Seed-2026-Kasonde");
    await page.goto(`/admin/admissions/case/${applicationId}`);

    await expect(
      page.getByRole("heading", { name: "Decision", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Evidence meets demo criteria.")).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Release a decision" }),
    ).toBeVisible();

    await expect(
      page.getByRole("form", { name: "Record a review finding" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("form", { name: "Raise a clarification request" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("form", { name: "Record a recommendation" }),
    ).toHaveCount(0);
  });

  test("case history is a labelled staff timeline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "temwani.r", "Seed-2026-Temwani");
    await page.goto(`/admin/admissions/case/${applicationId}`);

    const history = page.getByRole("region", { name: "Case history" });
    await expect(history).toBeVisible();
    await expect(history.getByText("Staff only").first()).toBeVisible();
    await noOverflow(page);
  });
});
