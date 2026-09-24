import { test, expect } from "@playwright/test";
import { createIntegrationSupport, createMoodleAdmin } from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

// Phase 6 slice 1: Moodle administrator drafts a shell mapping through
// the registry. Synthetic tests and activation are proven in API tests.
test("moodle mappings: administrator drafts a shell mapping", async ({
  page,
}) => {
  const admin = await createMoodleAdmin();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(admin.username);
  await page.getByLabel("Password", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/moodle/mappings");
  await expect(
    page.getByRole("heading", { name: "Moodle mappings" }),
  ).toBeVisible();
  await expect(page.getByLabel("Kind")).toBeVisible();
  await page.getByLabel("Kind").selectOption("SHELL");
  await page.getByLabel("SIS type").fill("OFFERING");
  await page
    .getByLabel("SIS identifier")
    .fill(`${admin.offeringId}:2026S1`);
  await page.getByLabel("Moodle identifier").fill("SIM-SH-SWE-2026S1");
  await page.getByRole("button", { name: "Draft mapping" }).click();
  await expect(page.getByText("Mapping drafted.")).toBeVisible();
  await expect(
    page.getByText("SIM-SH-SWE-2026S1").first(),
  ).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

// Phase 6 slice 4: the two operations workspaces show health, shells,
// delivery queue and maintenance on live data.
test("operations workspaces: health, shells, queue, maintenance", async ({
  page,
}) => {
  const admin = await createMoodleAdmin();
  const support = await createIntegrationSupport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(admin.username);
  await page.getByLabel("Password", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  // Moodle administration: health + shells + mappings link.
  await page.goto("/admin/moodle");
  await expect(
    page.getByRole("heading", { name: "Moodle administration" }),
  ).toBeVisible();
  await expect(page.getByText("Connection HEALTHY")).toBeVisible();
  await expect(page.getByText("Course shells")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mappings" }),
  ).toBeVisible();

  // Maintenance scheduling with reason and window.
  await page.goto("/admin/moodle/maintenance");
  await expect(
    page.getByRole("heading", { name: "Moodle maintenance" }),
  ).toBeVisible();
  await page.getByLabel("Reason").fill("Browser demo window.");
  await page.getByLabel("Starts at").fill("2030-01-01T10:00");
  await page.getByLabel("Ends at").fill("2030-01-01T11:00");
  await page.getByRole("button", { name: "Schedule maintenance" }).click();
  await expect(
    page.getByText("Browser demo window.").first(),
  ).toBeVisible();

  // Integration support is a separate workspace with its own queue.
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(support.username);
  await page.getByLabel("Password", { exact: true }).fill(support.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await page.goto("/admin/integration");
  await expect(
    page.getByRole("heading", { name: "Integration support" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Deliveries and reconciliation" }),
  ).toBeVisible();

  // Incidents open and close with recovery evidence (support-only).
  await page.getByLabel("Title").fill("Browser flap observed.");
  await page.getByLabel("Severity").selectOption("MEDIUM");
  await page.getByRole("button", { name: "Open incident" }).click();
  await expect(
    page.getByText("Browser flap observed.").first(),
  ).toBeVisible();
  const openIncident = page
    .locator("li", { hasText: "Browser flap observed." })
    .filter({ hasText: "OPEN" })
    .first();
  await expect(openIncident).toBeVisible();
  const incidentId =
    (await openIncident
      .textContent()
      .then((text) => text?.match(/[0-9a-f-]{36}/)?.[0] ?? "")) ?? "";
  await page.getByLabel("Incident ID").fill(incidentId);
  await page
    .getByLabel("Recovery evidence")
    .fill("Three clean deliveries observed after the flap; counts match.");
  await page.getByRole("button", { name: "Close incident" }).click();
  const closedIncident = page
    .locator("li", { hasText: "Browser flap observed." })
    .filter({ hasText: "CLOSED" })
    .first();
  await expect(closedIncident).toBeVisible();
});
