import { test, expect } from "@playwright/test";
import { createCoordinator } from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

// Phase 6 slice 0: coordinator creates a draft tutorial group through the
// workspace. Activation and allocation rules are proven in API tests.
test("teaching groups: coordinator creates a draft group", async ({
  page,
}) => {
  const coordinator = await createCoordinator();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(coordinator.username);
  await page.getByLabel("Password", { exact: true }).fill(coordinator.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/teaching/groups");
  await expect(
    page.getByRole("heading", { name: "Tutorial groups" }),
  ).toBeVisible();
  await page.getByLabel("Programme offering ID").fill(coordinator.offeringId);
  const groupName = `TG-BROWSER-${Date.now().toString(36)}`;
  await page.getByLabel("Group name").fill(groupName);
  await page.getByLabel("Capacity").fill("20");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByText("Tutorial group created")).toBeVisible();
  await expect(page.getByText(groupName)).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
