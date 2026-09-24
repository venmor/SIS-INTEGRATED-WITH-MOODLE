import { test, expect, type Page } from "@playwright/test";
import {
  assessStudentCharges,
  createFinanceOfficer,
  createStudent,
} from "./fixtures";

async function signIn(
  page: Page,
  username: string,
  password: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", {
    timeout: 20000,
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("student portal prioritizes action, registration, finance and courses", async ({
  page,
}) => {
  const student = await createStudent();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, student.username, student.password);
  await page.goto("/student");

  await expect(
    page.getByRole("heading", { name: "Student home", exact: true }),
  ).toBeVisible();

  const headings = await page.locator("#main-content h2").allTextContents();
  expect(headings.slice(0, 4)).toEqual([
    "Required action",
    "Registration",
    "Finance",
    "Courses and changes",
  ]);
  await expectNoHorizontalOverflow(page);

  await page.goto("/student/readiness");
  const conditions = page.getByRole("list", { name: "Readiness conditions" });
  await expect(conditions).toBeVisible();
  const financial = conditions.getByRole("listitem").filter({
    hasText: "Financial clearance",
  });
  await expect(financial).toContainText("Owner");
  await expect(financial).toContainText("Next step");
  await expectNoHorizontalOverflow(page);

  await assessStudentCharges(student.studentNumber);
  await page.goto("/student/finance");
  const summary = page.getByRole("region", { name: "Finance summary" });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Outstanding");
  await expect(summary).toContainText("Clearance");
  await expectNoHorizontalOverflow(page);
});

test("finance officer home is a professional work queue", async ({ page }) => {
  const officer = await createFinanceOfficer();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, officer.username, officer.password);
  await page.goto("/admin/finance");

  const queue = page.getByRole("region", { name: "Finance work queue" });
  await expect(queue).toBeVisible();
  await expect(
    queue.getByRole("link", { name: "Reconciliation queue" }),
  ).toBeVisible();
  await expect(
    queue.getByRole("link", { name: "Adjustments and refunds" }),
  ).toBeVisible();
  await expect(
    queue.getByRole("link", { name: "Payment arrangements" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
