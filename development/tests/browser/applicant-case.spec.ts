import { test, expect } from "@playwright/test";
import path from "node:path";
import { createRequire } from "node:module";
import { createApplicant } from "./fixtures";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function db() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

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
  await page.getByLabel("Family name (required)").fill("Case");
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

test("slice-6 case pages: timeline, decision, tickets, corrections, withdraw", async ({
  page,
}) => {
  const applicant = await createApplicant();
  await page.setViewportSize({ width: 390, height: 844 });
  const applicationUrl = await submitApplication(page, applicant);
  const applicationId = applicationUrl.split("/").pop() as string;

  // Status timeline.
  await page.goto(`${applicationUrl}/status`);
  await expect(
    page.getByRole("heading", { name: "Application received" }),
  ).toBeVisible();
  await expect(page.getByText("Application received").first()).toBeVisible();
  await noOverflow(page);

  // Decision: neutral pending state, no outcome leaked.
  await page.goto(`${applicationUrl}/decision`);
  await expect(
    page.getByRole("heading", { name: "Admission decision" }),
  ).toBeVisible();
  await expect(page.getByText("No decision yet")).toBeVisible();
  await expect(page.getByText(/offer/i)).toHaveCount(0);
  await noOverflow(page);

  // Seed one clarification + one decision directly (simulation endpoints are
  // SYSADMIN-only and absent from the web proxy by design).
  const prisma = db();
  try {
    await prisma.applicationClarification.create({
      data: {
        applicationId,
        question: "Provide a complete result statement.",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        askedBy: "ADMISSIONS (browser fixture)",
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Clarification respond journey, keyboard-first.
  await page.goto(`${applicationUrl}/clarifications`);
  await expect(
    page.getByRole("heading", { name: "Clarification requests" }),
  ).toBeVisible();
  // Empty submit shows a persistent error summary (role=alert).
  await page
    .getByRole("button", { name: "Submit response", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Write a response before submitting",
  );
  const responseBox = page.getByLabel("Your response (only this item)");
  await responseBox.focus();
  await expect(responseBox).toBeFocused();
  await responseBox.fill("Replacement uploaded via browser.");
  await page.keyboard.press("Enter");
  // Enter in a textarea does not submit; use the button explicitly.
  await page
    .getByRole("button", { name: "Submit response", exact: true })
    .click();
  await expect(page.getByText("Response received")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Information received")).toBeVisible();
  await noOverflow(page);

  // Correction request journey + error persistence.
  await page.goto(`${applicationUrl}/corrections`);
  await expect(
    page.getByRole("heading", { name: "Correction requests" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Category").fill("contact");
  await page.getByLabel("Item to correct").fill("address");
  await page.getByLabel("Reason").fill("Moved house (browser).");
  await page
    .getByRole("button", { name: "Request correction", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Correction requested")).toBeVisible();
  await noOverflow(page);

  // Tickets: create + reply, labels + focus visible.
  await page.goto(`${applicationUrl}/tickets`);
  await expect(
    page.getByRole("heading", { name: "Support tickets" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open ticket", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Subject").fill("Upload question");
  await page.getByLabel("Message").fill("Which file goes where?");
  await page
    .getByRole("button", { name: "Open ticket", exact: true })
    .click();
  await expect(page.getByText("Ticket opened")).toBeVisible();
  const replyBox = page.getByLabel("Reply").first();
  await replyBox.fill("Extra detail from browser.");
  await replyBox.evaluate((el: HTMLElement) =>
    el.closest("form")?.requestSubmit(),
  );
  await expect(page.getByText("Reply sent")).toBeVisible();
  await noOverflow(page);

  // Decision view after release (seeded): deliberate open shows outcome.
  const prisma2 = db();
  try {
    await prisma2.applicationDecision.create({
      data: {
        applicationId,
        outcome: "OFFERED",
        message: "Offered a place with conditions (browser fixture).",
        conditions: ["Provide certified documents."],
        releasedAt: new Date(),
      },
    });
  } finally {
    await prisma2.$disconnect();
  }
  await page.goto(`${applicationUrl}/decision`);
  await expect(
    page.getByRole("heading", { name: "admission offer", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Provide certified documents."),
  ).toBeVisible();
  await noOverflow(page);

  // Notifications inbox lists case events.
  await page.goto("/applicant/notifications");
  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();
  await noOverflow(page);

  // Withdraw: confirm gate first, then receipt. Uses a fresh application so
  // the assertions above keep a submitted state for screenshots.
  await page.goto(`${applicationUrl}/withdraw`);
  await expect(
    page.getByRole("heading", { name: "Withdraw application" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit withdrawal request", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Confirm the withdrawal",
  );
  await page.getByLabel(/does not request a refund/).check();
  await page
    .getByRole("button", { name: "Submit withdrawal request", exact: true })
    .click();
  await expect(page.getByText("Withdrawal requested")).toBeVisible();
  await expect(page.getByText(/Receipt:/)).toBeVisible();
  await page.goto(`${applicationUrl}/status`);
  await expect(
    page.getByRole("heading", { name: "Application withdrawn" }),
  ).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
