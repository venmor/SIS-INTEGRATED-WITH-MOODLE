import { test, expect } from "@playwright/test";

const previewRoutes = [
  ["/design-preview/student-depth", "Preview — planned v1.x"],
  ["/design-preview/teaching-depth", "Preview — planned v1.x"],
  ["/design-preview/finance-depth", "Preview — planned v1.x"],
  ["/design-preview/support", "Preview — planned v1.x"],
  ["/design-preview/quality", "Preview — planned v1.x"],
  ["/design-preview/graduation", "Operational completion target — v2.0"],
  ["/design-preview/reporting", "Operational completion target — v2.0"],
  ["/design-preview/integrations", "Operational completion target — v2.0"],
] as const;

test.describe("approved V2 workspace previews", () => {
  for (const [route, maturity] of previewRoutes) {
    test(`${route} stays visibly preview-only with queue, detail and recovery state`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      await expect(page.getByText("Design preview", { exact: true })).toBeVisible();
      await expect(page.getByText(maturity, { exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Work queue" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Record detail" })).toBeVisible();
      await expect(page.getByRole("region", { name: "State and recovery" })).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.getByRole("button")).toHaveCount(0);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
  }

  test("support preview keeps restricted notes outside the general case view", async ({
    page,
  }) => {
    await page.goto("/design-preview/support");
    await expect(page.getByText(/restricted support notes/i)).toBeVisible();
    await expect(page.getByText(/need-to-know/i)).toBeVisible();
  });

  test("reporting preview states suppression and signatory controls", async ({ page }) => {
    await page.goto("/design-preview/reporting");
    await expect(page.getByText(/privacy suppression/i)).toBeVisible();
    await expect(page.getByText(/authorised signatory/i)).toBeVisible();
  });

  test("graduation preview preserves source integrity", async ({ page }) => {
    await page.goto("/design-preview/graduation");
    await expect(page.getByText(/source records remain authoritative/i)).toBeVisible();
  });

  test("finance preview shows approval boundaries for refunds and reversals", async ({
    page,
  }) => {
    await page.goto("/design-preview/finance-depth");
    await expect(page.getByText(/second approver/i)).toBeVisible();
    await expect(page.getByText(/reversal/i)).toBeVisible();
  });

  test("integration preview never renders credential values", async ({ page }) => {
    await page.goto("/design-preview/integrations");
    await expect(page.getByText(/credential rotation/i)).toBeVisible();
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toMatch(/token\s*:/);
    expect(body).not.toMatch(/secret\s*:/);
  });

  test("preview index declares maturity without presenting future modules as live", async ({
    page,
  }) => {
    await page.goto("/design-preview");
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    await expect(page.getByText("Preview — planned v1.x", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Operational completion target — v2.0", { exact: true }).first(),
    ).toBeVisible();
  });
});
