import { expect, test } from "@playwright/test";

test("System Administrator sees a read-only setup readiness report on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill("mweene.t");
  await page.getByLabel("Password", { exact: true }).fill("Seed-2026-Mweene");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    new URL(
      "/",
      process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100",
    ).toString(),
    { timeout: 20000 },
  );

  await page.goto("/admin/grants");
  await page.getByText("Workspace sections").click();
  const setupLink = page.getByRole("link", { name: "Setup readiness" });
  await expect(setupLink).toBeVisible({ timeout: 5000 });
  await setupLink.click();
  await expect(
    page.getByRole("heading", { name: "Institution setup readiness" }),
  ).toBeVisible();
  await expect(page.getByText("Institution structure")).toBeVisible();
  await expect(page.getByText("Teaching delivery")).toBeVisible();
  await expect(
    page.getByText("Course registrations needing section mapping"),
  ).toBeVisible();
  await expect(page.getByText("Programme catalogue")).toBeVisible();
  await expect(page.getByText("Setup authority")).toBeVisible();
  await expect(page.getByText("GAP-V2-001").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /publish|approve|edit/i }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
