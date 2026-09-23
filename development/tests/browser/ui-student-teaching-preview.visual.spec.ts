import { test, expect, type Page } from "@playwright/test";

async function assertPreviewFrame(page: Page) {
  await expect(
    page.getByRole("status", { name: "Design preview" }),
  ).toContainText("No live records or actions.");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const backgroundImages = await page.evaluate(() =>
    [document.body, document.querySelector("main")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => getComputedStyle(node).backgroundImage),
  );
  expect(backgroundImages.every((value) => value === "none")).toBe(true);

  await expect(page.getByRole("button")).toHaveCount(0);
}

async function capture(
  page: Page,
  route: string,
  width: number,
  height: number,
  name: string,
) {
  await page.setViewportSize({ width, height });
  await page.goto(route);
  await assertPreviewFrame(page);
  await page.screenshot({
    path: `test-results/${name}`,
    fullPage: true,
    animations: "disabled",
  });
}

test("student and teaching preview visual evidence", async ({ page }) => {
  await capture(
    page,
    "/design-preview/student",
    1440,
    1000,
    "ui-preview-student-home-1440.png",
  );
  await capture(
    page,
    "/design-preview/student",
    390,
    844,
    "ui-preview-student-home-390.png",
  );
  await capture(
    page,
    "/design-preview/student/registration",
    390,
    844,
    "ui-preview-registration-390.png",
  );
  await capture(
    page,
    "/design-preview/teaching",
    1440,
    1000,
    "ui-preview-teaching-home-1440.png",
  );
  await capture(
    page,
    "/design-preview/teaching",
    390,
    844,
    "ui-preview-teaching-home-390.png",
  );
  await capture(
    page,
    "/design-preview/teaching/course",
    1440,
    1000,
    "ui-preview-course-1440.png",
  );
  await capture(
    page,
    "/design-preview/teaching/course",
    390,
    844,
    "ui-preview-course-390.png",
  );
});
