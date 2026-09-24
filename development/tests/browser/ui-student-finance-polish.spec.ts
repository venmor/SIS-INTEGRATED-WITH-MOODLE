import { test, expect, type Page } from "@playwright/test";
import {
  assessStudentCharges,
  createCoordinator,
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

async function expectRouteAtRequiredWidths(page: Page, route: string) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await expect(page.locator("#main-content")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
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

  // Finance assessment is valid only after a submitted registration.
  await page.goto("/student/courses");
  await page.getByLabel("SWE111 — Programming Fundamentals").check();
  await page.getByLabel("MTH111 — Discrete Mathematics").check();
  await page.getByLabel("ENG111 — Communication Skills").check();
  await page.getByRole("button", { name: "Save course plan" }).click();
  await expect(page.getByText("Draft saved as version 1.")).toBeVisible();

  await page.goto("/student/register");
  await page
    .getByLabel("My course selection is accurate to my knowledge.")
    .check();
  await page
    .getByLabel("I understand the registration rules for this period.")
    .check();
  await page
    .getByLabel("I understand my fee obligations are handled separately.")
    .check();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Registration completed.")).toBeVisible();

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


test("all live student routes stay usable at the required presentation widths", async ({
  page,
}) => {
  const student = await createStudent();
  await signIn(page, student.username, student.password);

  for (const route of [
    "/student",
    "/student/courses",
    "/student/readiness",
    "/student/register",
    "/student/changes",
    "/student/finance",
    "/student/finance/pay",
    "/student/finance/arrange",
  ]) {
    await expectRouteAtRequiredWidths(page, route);
  }
});

test("finance operational routes stay usable at the required presentation widths", async ({
  page,
}) => {
  const officer = await createFinanceOfficer();
  await signIn(page, officer.username, officer.password);

  for (const route of [
    "/admin/finance",
    "/admin/finance/cases",
    "/admin/finance/adjustments",
    "/admin/finance/arrangements",
    "/admin/finance/sponsorships",
    "/admin/finance/cashier",
  ]) {
    await expectRouteAtRequiredWidths(page, route);
  }
});


test("cashier controls stay hidden outside the active Finance Officer workspace", async ({
  page,
}) => {
  const coordinator = await createCoordinator();
  await signIn(page, coordinator.username, coordinator.password);
  await page.goto("/admin/finance/cashier");

  await expect(
    page.getByRole("heading", { name: "Cashier intake", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Cashier access unavailable")).toBeVisible();
  await expect(page.getByRole("form", { name: "Record cash intake" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record intake" })).toHaveCount(0);
});
