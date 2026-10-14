import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createLecturer } from "./fixtures";

test("assessment panels retain real drafting, reset, scoped filtering and mobile controls", async ({
  page,
}) => {
  const actor = await createLecturer(`SWE-UI-${randomUUID()}`);
  await page.goto("/sign-in?returnTo=%2Fadmin%2Fassessment%2Fplans");
  await page.getByLabel("Username", { exact: true }).fill(actor.username);
  await page.getByLabel("Password", { exact: true }).fill(actor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Assessment plans",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Search loaded plans", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Offering reference").fill(actor.offeringRef);
  await page.getByLabel("Period code").fill(actor.periodCode);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Offering reference")).toHaveValue("");
  await expect(page.getByLabel("Component 1 max mark")).toHaveValue("20");
  await page.getByLabel("Offering reference").fill(actor.offeringRef);
  await page.getByLabel("Period code").fill(actor.periodCode);
  await page.getByRole("button", { name: "Draft plan", exact: true }).click();
  await expect(page.getByText(/Plan drafted \(v1\)/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(1);
  await page
    .getByLabel("Search loaded plans", { exact: true })
    .fill("NO-MATCH-XYZ");
  await expect(
    page.getByText("No plans match these filters.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Search loaded plans", { exact: true })
    .fill(actor.offeringRef);
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(1);
  await page.getByText("Filter", { exact: true }).click();
  await page.getByLabel("Plan state", { exact: true }).selectOption("APPROVED");
  await expect(
    page.getByText("No plans match these filters.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Plan state", { exact: true }).selectOption("DRAFT");
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByLabel("Component 1 code")).toBeVisible();
});

test("technical workspace shows assessment records without academic create actions", async ({
  page,
}) => {
  const { createMoodleAdmin } = await import("./fixtures");
  const actor = await createMoodleAdmin();
  await page.goto("/sign-in?returnTo=%2Fadmin%2Fassessment%2Fplans");
  await page.getByLabel("Username", { exact: true }).fill(actor.username);
  await page.getByLabel("Password", { exact: true }).fill(actor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Draft plan", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Switch to an appointed lecturer workspace to draft a plan.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/admin/assessment/batches");
  await expect(
    page.getByRole("button", { name: "Stage batch", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Switch to an appointed lecturer workspace to stage marks.",
      { exact: true },
    ),
  ).toBeVisible();
});
