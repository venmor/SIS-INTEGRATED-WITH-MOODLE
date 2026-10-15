import { test, expect } from "@playwright/test";
import { createMoodleAdmin } from "./fixtures";

test("staff sidebar and workspace scroll independently while the account remains visible", async ({
  page,
}) => {
  const actor = await createMoodleAdmin();
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/sign-in?returnTo=%2Fadmin%2Fassessment%2Fmappings");
  await page.getByLabel("Username", { exact: true }).fill(actor.username);
  await page.getByLabel("Password", { exact: true }).fill(actor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", {name:"Grade mappings", level:1})).toBeVisible();
  const workspace = page.locator("#main-content");
  await expect(workspace).toBeVisible();
  expect(await workspace.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
    "auto",
  );
  const sidebar = page.getByRole("complementary", {
    name: "Staff workspace navigation",
  });
  const account = sidebar.getByRole("link", {
    name: "Switch account",
    exact: true,
  });
  const rail = page.getByRole("region", {
    name: "Workspace navigation scroll area",
  });
  await expect(rail).toBeVisible();
  expect(await rail.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  const before = await account.boundingBox();
  await workspace.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await workspace.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await rail.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await rail.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const after = await account.boundingBox();
  expect(after?.y).toBeCloseTo(before!.y, 0);
  expect(after!.y + after!.height).toBeLessThanOrEqual(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.goto("/admin/assessment/findings");
  await expect(
    page.getByRole("heading", { name: "Validation queue", level: 1 }),
  ).toBeVisible();
  expect(await workspace.evaluate((el) => el.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
