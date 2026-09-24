import { test, expect, type Page } from "@playwright/test";
import {
  createFinanceApprover,
  createFinanceOfficer,
  createIntegrationSupport,
  createLecturerWorkspaceUser,
  createMoodleAdmin,
  createRecordsOfficer,
  createStudent,
  createSystemAdmin,
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

test.describe.serial("role-aware workspace navigation", () => {
  test("student navigation keeps the whole student journey together", async ({
    page,
  }) => {
    const student = await createStudent();
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, student.username, student.password);

    const nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Student home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Courses" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Readiness" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Registration" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Finance" })).toBeVisible();

    await expect(nav.getByRole("link", { name: "Admissions" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.goto("/student/courses");
    await expect(
      page.getByRole("navigation", { name: "Workspace navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("finance officer and approver navigation expose only finance", async ({
    page,
  }) => {
    const officer = await createFinanceOfficer();
    await signIn(page, officer.username, officer.password);

    let nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(
      nav.getByRole("link", { name: "Finance workspace" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Admissions" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Integration" })).toHaveCount(0);

    await page.context().clearCookies();
    const approver = await createFinanceApprover();
    await signIn(page, approver.username, approver.password);
    nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(
      nav.getByRole("link", { name: "Finance workspace" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Admissions" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Integration" })).toHaveCount(0);
  });

  test("Moodle and integration roles expose only their operational workspace", async ({
    page,
  }) => {
    const moodle = await createMoodleAdmin();
    await signIn(page, moodle.username, moodle.password);
    let nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav.getByRole("link", { name: "Moodle" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Integration" })).toHaveCount(0);

    await page.context().clearCookies();
    const support = await createIntegrationSupport();
    await signIn(page, support.username, support.password);
    nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav.getByRole("link", { name: "Integration" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
  });

  test("admissions navigation remains role-scoped", async ({ page }) => {
    await signIn(page, "temwani.r", "Seed-2026-Temwani");

    const nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav.getByRole("link", { name: "Admissions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Finance workspace" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
  });
});


test("recognized IAM roles without a Phase-6 operational screen get an honest landing state", async ({
  page,
}) => {
  const lecturer = await createLecturerWorkspaceUser();
  await signIn(page, lecturer.username, lecturer.password);

  await expect(
    page.getByText("No dedicated live workspace for this role"),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Workspace navigation" }),
  ).toHaveCount(0);
  await expect(page.getByText(/does not expose an authoritative operational screen/i)).toBeVisible();
});


test("records and system administration navigation remain scope-correct", async ({
  page,
}) => {
  const records = await createRecordsOfficer();
  await signIn(page, records.username, records.password);

  let nav = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(
    nav.getByRole("link", { name: "Identity review" }),
  ).toHaveAttribute("href", "/admin/records/duplicates");
  await expect(nav.getByRole("link", { name: "Finance workspace" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Access reviews" })).toHaveCount(0);

  await page.context().clearCookies();
  const admin = await createSystemAdmin();
  await signIn(page, admin.username, admin.password);
  nav = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(nav.getByRole("link", { name: "Access reviews" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Role assignments" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Audit trail" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Admissions" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Moodle" })).toHaveCount(0);
});
