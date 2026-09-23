import { test, expect, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.describe.serial("student and teaching experience previews", () => {
  test("design preview is explicit and isolated from live navigation", async ({
    page,
  }) => {
    await page.goto("/design-preview");

    await expect(
      page.getByRole("status", { name: "Design preview" }),
    ).toContainText("No live records or actions.");
    await expect(
      page.getByRole("link", { name: "Student home preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Teaching workspace preview" }),
    ).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Student home preview" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Teaching workspace preview" }),
    ).toHaveCount(0);
  });

  test("student home preview is task-first and separates SIS from Moodle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/student");

    await expect(
      page.getByText("Student portal · January 2027 · 202700123"),
    ).toBeVisible();

    const headings = await page.locator("main h2").allTextContents();
    expect(headings.slice(0, 4)).toEqual([
      "Registration",
      "Required action",
      "Holds",
      "Current period",
    ]);

    await expect(
      page.getByText("Registration in progress").first(),
    ).toBeVisible();
    await expect(page.getByText("SIS registration")).toBeVisible();
    await expect(page.getByText("Moodle learning access")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("registration preview explains readiness by owner and state", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/student/registration");

    await expect(
      page.getByRole("heading", { name: "Registration readiness" }),
    ).toBeVisible();
    await expect(page.getByText("Student record")).toBeVisible();
    await expect(page.getByText("Financial clearance")).toBeVisible();
    await expect(page.getByText("Awaiting institution")).toBeVisible();
    await expect(page.getByText("Course package")).toBeVisible();
    await expect(page.getByText("Action required")).toBeVisible();

    await expect(page.getByRole("button")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("teaching preview is a work queue, not an analytics dashboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/teaching");

    await expect(
      page.getByText(
        "Teaching workspace · School of Natural Sciences · January 2027",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Urgent actions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current courses" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "CSC 4792 — Data Mining and Warehousing",
      }),
    ).toBeVisible();
    const courseRecord = page
      .getByRole("heading", {
        name: "CSC 4792 — Data Mining and Warehousing",
      })
      .locator("..");
    await expect(courseRecord.getByText("4 TG groups")).toBeVisible();
    await expect(page.getByText("Dashboard")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("course preview keeps SIS class list and Moodle synchronization distinct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/teaching/course");

    await expect(
      page.getByText("CSC 4792 · January 2027 · Lecturer · Course-wide"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Class list status" }),
    ).toBeVisible();
    await expect(page.getByText("SIS registered students")).toBeVisible();
    await expect(page.getByText("118", { exact: true }).first()).toBeVisible();

    const sync = page.getByRole("region", { name: "Moodle synchronization" });
    await expect(sync).toContainText("Moodle enrolled students");
    await expect(sync).toContainText("117");
    await expect(sync).toContainText("1 learner pending sync");

    await expect(page.getByText("Registration lost")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
