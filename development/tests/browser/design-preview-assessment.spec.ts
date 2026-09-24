import { test, expect } from "@playwright/test";

test.describe("Phase 7 assessment and results previews", () => {
  test("assessment queue separates provisional Moodle marks from official SIS results", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/assessment");
    await expect(
      page.getByText("Design preview", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Provisional Moodle marks are not official SIS results/i),
    ).toBeVisible();
    const queue = page.getByRole("region", { name: "Validation queue" });
    await expect(queue).toContainText("Missing");
    await expect(queue).toContainText("Out of range");
    await expect(queue).toContainText("Unmapped");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("lecturer staging stays inside assigned scope", async ({ page }) => {
    await page.goto("/design-preview/assessment/staging");
    await expect(page.getByText(/Assigned scope.*SWE111/i)).toBeVisible();
    await expect(page.getByText(/correct.*assigned scope/i)).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Staging consequence" }),
    ).toContainText(/stage.*examination validation/i);
  });

  test("examination validation and result release remain separate authorities", async ({
    page,
  }) => {
    await page.goto("/design-preview/assessment/release");
    const validation = page.getByRole("region", {
      name: "Examination validation",
    });
    const release = page.getByRole("region", { name: "Official result release" });
    await expect(validation).toContainText(/Examination/i);
    await expect(release).toContainText(/Registry|Results/i);
    await expect(page.getByText(/separate authorit/i)).toBeVisible();
  });

  test("student preview exposes only published official results and no sysadmin edit action", async ({
    page,
  }) => {
    await page.goto("/design-preview/student/results");
    await expect(
      page.getByRole("region", { name: "Published official results" }),
    ).toBeVisible();
    await expect(page.getByText(/Provisional Moodle mark/i)).toHaveCount(0);
    await expect(page.getByText(/system administrators do not edit results/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /edit result/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /release result/i })).toHaveCount(0);
  });
});
