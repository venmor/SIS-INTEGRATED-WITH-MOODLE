import { test, expect, type Page } from "@playwright/test";

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
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(images.every((value) => value === "none")).toBe(true);
}

test("modernized public and preview surfaces keep the institutional visual rules", async ({
  page,
}) => {
  const routes = [
    "/discover",
    "/design-preview/student",
    "/design-preview/student/registration",
    "/design-preview/teaching",
    "/design-preview/teaching/course",
    "/design-preview/operations",
    "/design-preview/operations/reconciliation",
    "/design-preview/operations/event",
  ];

  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await assertNoOverflow(page);
    await assertNoPageGradient(page);
  }

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Operations" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Student home preview" }),
  ).toHaveCount(0);
});
