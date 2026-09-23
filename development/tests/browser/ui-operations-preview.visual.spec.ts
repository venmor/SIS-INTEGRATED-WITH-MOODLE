import { test, expect, type Page } from "@playwright/test";

async function assertPreview(page: Page) {
  await expect(
    page.getByRole("status", { name: "Design preview" }),
  ).toContainText("No live records or actions.");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const images = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(images.every((value) => value === "none")).toBe(true);

  await expect(page.getByRole("button")).toHaveCount(0);
}

test("operations preview visual evidence", async ({ page }) => {
  for (const [route, width, height, file] of [
    [
      "/design-preview/operations",
      1440,
      1000,
      "ui-preview-operations-1440.png",
    ],
    [
      "/design-preview/operations",
      390,
      844,
      "ui-preview-operations-390.png",
    ],
    [
      "/design-preview/operations/reconciliation",
      1440,
      1000,
      "ui-preview-reconciliation-1440.png",
    ],
    [
      "/design-preview/operations/reconciliation",
      390,
      844,
      "ui-preview-reconciliation-390.png",
    ],
    [
      "/design-preview/operations/event",
      1440,
      1000,
      "ui-preview-event-1440.png",
    ],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(route);
    await assertPreview(page);
    await page.screenshot({
      path: `test-results/${file}`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
