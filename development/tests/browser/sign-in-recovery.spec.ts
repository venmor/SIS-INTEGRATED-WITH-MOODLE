import { test, expect } from "@playwright/test";

test("sign-in presents a service outage separately from invalid credentials", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "We could not reach the sign-in service. Check your connection and try again.",
      }),
    });
  });

  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("bwalya.m");
  await page.getByLabel("Password").fill("Seed-2026-Bwalya");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByText(
      /We could not reach the sign-in service.*credentials were not rejected/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/username or password.*incorrect/i),
  ).toHaveCount(0);
});
