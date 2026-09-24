import { test, expect, type Page } from "@playwright/test";
import { createMoodleAdmin } from "./fixtures";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
}

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

  test("live connection validation recovers from a temporary outage without duplicate writes", async ({
    page,
  }) => {
    const admin = await createMoodleAdmin();
    await signIn(page, admin.username, admin.password);

    const calls: string[] = [];
    await page.route("**/api/integration/connection/validate", async (route) => {
      calls.push(route.request().url());
      if (calls.length === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Moodle service temporarily unavailable. Retry the connection check.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          backend: "live",
          ok: true,
          version: "4.5",
          detail: "Connected to Demo Moodle. Live writes are disabled.",
        }),
      });
    });

    await page.goto("/admin/moodle/mappings");
    const check = page.getByRole("button", { name: "Test connection" });

    await check.click();
    await expect(
      page.getByText("Moodle service temporarily unavailable. Retry the connection check."),
    ).toBeVisible();
    await expect(check).toBeEnabled();

    await check.click();
    await expect(
      page.getByText(/Live: Connected to Demo Moodle\. Live writes are disabled\./),
    ).toBeVisible();

    expect(calls).toHaveLength(2);
    expect(
      calls.every((url) => url.endsWith("/api/integration/connection/validate")),
    ).toBe(true);
  });
});
