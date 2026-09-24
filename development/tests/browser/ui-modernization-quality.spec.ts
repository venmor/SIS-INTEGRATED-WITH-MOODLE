import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  createApplicant,
  createCoordinator,
  createFinanceOfficer,
  createIntegrationSupport,
  createMoodleAdmin,
  createStudent,
} from "./fixtures";

async function assertNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function assertNoPageGradient(page: Page) {
  const images = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => ({
        backgroundImage: getComputedStyle(node).backgroundImage,
        backdropFilter: getComputedStyle(node).backdropFilter,
      })),
  );
  expect(
    images.every(
      (value) =>
        value.backgroundImage === "none" &&
        (value.backdropFilter === "none" || value.backdropFilter === ""),
    ),
  ).toBe(true);
}

async function assertRouteAtRequiredWidths(page: Page, route: string) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await assertNoOverflow(page);
    await assertNoPageGradient(page);
  }
}

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  maxTabs = 60,
) {
  for (let count = 0; count < maxTabs; count += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) {
      return;
    }
  }
  throw new Error("Target was not reachable by keyboard tab order.");
}

async function expectVisibleFocus(target: Locator) {
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    focus.outline !== "none" ||
      (focus.boxShadow !== "none" && focus.boxShadow !== ""),
  ).toBe(true);
}

test("public, demo and preview route matrix keeps institutional visual rules", async ({
  page,
}) => {
  const routes = [
    "/discover",
    "/demo",
    "/demo/evidence",
    "/design-preview",
    "/design-preview/student",
    "/design-preview/student/registration",
    "/design-preview/teaching",
    "/design-preview/teaching/course",
    "/design-preview/operations",
    "/design-preview/operations/reconciliation",
    "/design-preview/operations/event",
    "/design-preview/assessment",
    "/design-preview/assessment/staging",
    "/design-preview/assessment/release",
    "/design-preview/student/results",
    "/design-preview/student-depth",
    "/design-preview/teaching-depth",
    "/design-preview/finance-depth",
    "/design-preview/support",
    "/design-preview/quality",
    "/design-preview/graduation",
    "/design-preview/reporting",
    "/design-preview/integrations",
  ];

  for (const route of routes) await assertRouteAtRequiredWidths(page, route);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Operations" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Student home preview" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Assessment preview/i }),
  ).toHaveCount(0);
});

test.describe.serial("authenticated route matrix", () => {
  test("representative live workspaces stay responsive at required widths", async ({
    page,
  }) => {
    const applicant = await createApplicant();
    await signIn(page, applicant.username, applicant.password);
    await assertRouteAtRequiredWidths(page, "/applications");

    await page.context().clearCookies();
    await signIn(page, "temwani.r", "Seed-2026-Temwani");
    await assertRouteAtRequiredWidths(page, "/admin/admissions/queue");

    await page.context().clearCookies();
    const student = await createStudent();
    await signIn(page, student.username, student.password);
    await assertRouteAtRequiredWidths(page, "/student");

    await page.context().clearCookies();
    const finance = await createFinanceOfficer();
    await signIn(page, finance.username, finance.password);
    await assertRouteAtRequiredWidths(page, "/admin/finance");

    await page.context().clearCookies();
    const coordinator = await createCoordinator();
    await signIn(page, coordinator.username, coordinator.password);
    await assertRouteAtRequiredWidths(page, "/admin/teaching/groups");

    await page.context().clearCookies();
    const moodle = await createMoodleAdmin();
    await signIn(page, moodle.username, moodle.password);
    await assertRouteAtRequiredWidths(page, "/admin/moodle");

    await page.context().clearCookies();
    const support = await createIntegrationSupport();
    await signIn(page, support.username, support.password);
    await assertRouteAtRequiredWidths(page, "/admin/integration");
  });
});

test("keyboard focus reaches visible navigation on demo and preview surfaces", async ({
  page,
}) => {
  for (const route of ["/demo", "/design-preview"]) {
    await page.goto(route);
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        tag: el.tagName,
        outline: style.outlineStyle,
        visible: Boolean(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      };
    });
    expect(focused?.visible).toBe(true);
    expect(["A", "BUTTON"]).toContain(focused?.tag);
    expect(focused?.outline).not.toBe("none");
  }
});


test("keyboard reaches live student form controls with visible focus", async ({
  page,
}) => {
  const student = await createStudent();
  await signIn(page, student.username, student.password);
  await page.goto("/student/courses");

  const firstCourse = page.getByLabel("SWE111 — Programming Fundamentals");
  await tabUntilFocused(page, firstCourse);
  await expectVisibleFocus(firstCourse);
  await page.keyboard.press("Space");
  await expect(firstCourse).toBeChecked();

  const save = page.getByRole("button", { name: "Save course plan" });
  await tabUntilFocused(page, save);
  await expectVisibleFocus(save);
});

test("keyboard reaches the live Moodle connection check", async ({ page }) => {
  const moodle = await createMoodleAdmin();
  await signIn(page, moodle.username, moodle.password);
  await page.goto("/admin/moodle/mappings");

  const check = page.getByRole("button", { name: "Test connection" });
  await tabUntilFocused(page, check);
  await expectVisibleFocus(check);
});
