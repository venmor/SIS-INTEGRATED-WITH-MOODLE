import { test, expect } from "@playwright/test";
import { createMoodleAdmin } from "./fixtures";

test("staff mapping, validation and Moodle workspaces use task panels and usable controls", async ({
  page,
}) => {
  const actor = await createMoodleAdmin();
  await page.goto("/sign-in?returnTo=%2Fadmin%2Fassessment%2Fmappings");
  await page.getByLabel("Username", { exact: true }).fill(actor.username);
  await page.getByLabel("Password", { exact: true }).fill(actor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const draft = page.getByRole("form", { name: "Draft grade mapping" });
  await expect(draft).toBeVisible();
  const field = page.getByLabel("Moodle activity ID", { exact: true });
  expect(
    await field.evaluate((node) => node.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(40);
  await expect(
    page.getByRole("region", { name: "Mapping registry" }),
  ).toBeVisible();
  await page.goto("/admin/assessment/findings");
  await expect(
    page.getByRole("region", { name: "Finding review" }),
  ).toBeVisible();
  await page.goto("/admin/moodle");
  await expect(
    page.getByRole("navigation", { name: "Moodle tasks" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Recorded course shells" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/assessment/mappings");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByLabel("Moodle activity ID", { exact: true }),
  ).toBeVisible();
});
