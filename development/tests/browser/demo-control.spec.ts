import { test, expect } from "@playwright/test";

test.describe("Demo Control Centre", () => {
  test("shows fictional environment boundary and three presenter stories", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(
      page.getByText("Demonstration environment · fictional records"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Control Centre" })).toBeVisible();

    const stories = page.getByRole("article");
    await expect(stories).toHaveCount(3);
    for (const card of await stories.all()) {
      await expect(card.getByText(/Persona:/)).toBeVisible();
      await expect(card.getByText(/Starting route:/)).toBeVisible();
      await expect(card.getByText(/Objective:/)).toBeVisible();
      await expect(card.getByText(/Fallback:/)).toBeVisible();
    }

    await expect(page.getByText("npm run demo:reset")).toBeVisible();
    await expect(page.getByText("npm run demo:doctor")).toBeVisible();
    await expect(page.getByText(/clean browser profile/i)).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("seed-2026-");
    expect(body).not.toMatch(/password\s*:/);
    expect(body).not.toMatch(/token\s*:/);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("story details label the unfinished result journey as a Phase 7 preview", async ({
    page,
  }) => {
    await page.goto("/demo/stories");
    await expect(
      page.getByText("Design preview · No live records or actions."),
    ).toBeVisible();
    await expect(page.getByText(/Phase 7 preview/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Integration recovery/ })).toHaveAttribute(
      "href",
      "/admin/integration",
    );
  });
});
