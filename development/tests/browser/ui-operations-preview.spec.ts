import { test, expect, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.describe.serial("operations experience preview", () => {
  test("operations preview is queue-first and keeps authority explicit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/operations");

    await expect(
      page.getByText("Integration Support workspace · Production environment"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Needs attention" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Integration health" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reconciliation cases" }),
    ).toBeVisible();
    const needsAttention = page.getByRole("region", { name: "Needs attention" });
    await expect(needsAttention.getByText("Moodle enrolment sync")).toBeVisible();
    await expect(page.getByText("Dashboard")).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("Moodle reconciliation shows both systems without changing SIS authority", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/operations/reconciliation");

    await expect(
      page.getByRole("heading", { name: "Reconciliation case" }),
    ).toBeVisible();
    await expect(page.getByText("SIS source")).toBeVisible();
    await expect(page.getByText("Registered · CSC 4792")).toBeVisible();
    await expect(page.getByText("Moodle destination")).toBeVisible();
    await expect(page.getByText("Enrolment missing")).toBeVisible();
    await expect(
      page.getByText("SIS registration remains authoritative."),
    ).toBeVisible();

    await expect(page.getByText("Activate SIS registration")).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("event preview explains safe retry without exposing a live retry control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview/operations/event");

    await expect(
      page.getByRole("heading", { name: "Event delivery" }),
    ).toBeVisible();
    await expect(page.getByText("RegistrationCompleted")).toBeVisible();
    await expect(
      page.getByText("Delivery failed · destination timeout"),
    ).toBeVisible();
    await expect(page.getByText("Idempotency reference")).toBeVisible();
    await expect(
      page.getByText(
        "Resend the same event after confirming destination state.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Mark resolved only after confirmed delivery or reconciliation.",
      ),
    ).toBeVisible();

    await expect(page.getByRole("button")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
