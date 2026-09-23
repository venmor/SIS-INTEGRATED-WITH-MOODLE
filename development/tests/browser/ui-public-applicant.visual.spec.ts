import { test, expect } from "@playwright/test";
import { createApplicant } from "./fixtures";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectNoPageGradient(
  page: import("@playwright/test").Page,
) {
  const backgroundImages = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(backgroundImages.every((value) => value === "none")).toBe(true);
}

test("public discovery desktop visual evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/discover");

  await expect(
    page.getByRole("heading", { name: "Find a programme" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoPageGradient(page);

  await page.screenshot({
    path: "test-results/ui-discover-1440.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("public discovery mobile visual evidence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");

  await expect(
    page.getByRole("heading", { name: "Find a programme" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoPageGradient(page);

  await page.screenshot({
    path: "test-results/ui-discover-390.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("applicant empty home visual evidence", async ({ page }) => {
  const applicant = await createApplicant();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.goto("/applicant");

  await expect(
    page.getByRole("heading", { name: "Application home" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoPageGradient(page);

  await page.screenshot({
    path: "test-results/ui-applicant-home-empty-1440.png",
    fullPage: true,
    animations: "disabled",
  });
});
