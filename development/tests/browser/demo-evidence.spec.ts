import { test, expect } from "@playwright/test";

test.describe("Demo evidence and fallback pack", () => {
  test("exposes release, audit, recovery and accessibility evidence without secrets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo/evidence");

    await expect(
      page.getByRole("heading", { name: "Presentation evidence" }),
    ).toBeVisible();
    await expect(page.getByText(/Release identifier/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Audit log/i })).toHaveAttribute(
      "href",
      "/admin/audit",
    );
    await expect(
      page.getByRole("link", { name: /Access reviews/i }),
    ).toHaveAttribute("href", "/admin/reviews");
    await expect(
      page.getByRole("link", { name: /Integration recovery/i }),
    ).toHaveAttribute("href", "/admin/integration");
    await expect(page.getByText(/authorization denial/i)).toBeVisible();
    await expect(page.getByText(/390px and 1440px/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Known limitations" })).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toMatch(/password\s*:/);
    expect(body).not.toMatch(/api[_ -]?token\s*:/);
    expect(body).not.toMatch(/fin_sim_secret\s*=/);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("demo navigation exposes the evidence pack", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("link", { name: "Evidence" })).toHaveAttribute(
      "href",
      "/demo/evidence",
    );
  });
});
