import { test, expect } from "@playwright/test";
import { createLecturer, ensureTimelinePackage } from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function signIn(
  page: any,
  username: string,
  password: string,
  base: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${base}/`, { timeout: 20000 });
}

// Phase 8 slice 2: the board-package History section joins audit rows,
// board decisions and official versions the lecturer may already read —
// newest first, no new disclosure.
test("entity timeline: package history joins decisions, versions, audit rows", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const lecturer = await createLecturer();
  const packageId = await ensureTimelinePackage();
  await page.setViewportSize({ width: 390, height: 844 });

  await signIn(page, lecturer.username, lecturer.password, base);
  await page.goto(`/admin/assessment/packages/${packageId}`);
  await expect(
    page.getByRole("heading", { name: "History" }),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText(/Board decision APPROVE_FOR_RELEASE/),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText(/Official result v2/),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText(/BoardDecisionRecorded/),
  ).toBeVisible();
  await noOverflow(page);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
