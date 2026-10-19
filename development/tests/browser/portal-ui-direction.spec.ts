import { expectWorkspaceLanding } from "./workspace-landing";
import { test, expect } from "@playwright/test";
import { createStudent } from "./fixtures";

async function signIn(
  page: import("@playwright/test").Page,
  username: string,
  password: string,
) {
  await page.goto("/sign-in");
  await page.getByRole('button', { name: 'Student', exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expectWorkspaceLanding(page);
}

test("recovery retains the username after a failed request and provides the public return routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recovery");
  await expect(
    page.getByRole("navigation", { name: "Public navigation" }),
  ).toBeVisible();
  const task = page.getByRole("region", { name: "Account recovery" });
  await expect(task).toBeVisible();
  await page.route("**/api/auth/recovery/request", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Recovery is unavailable. Try again shortly.",
      }),
    }),
  );
  await task.getByLabel("Username", { exact: true }).fill("kept.username");
  await task.getByRole("button", { name: "Send recovery request" }).click();
  await expect(task.getByLabel("Username", { exact: true })).toHaveValue(
    "kept.username",
  );
  await expect(task.locator("#username-error")).toHaveText(
    "Recovery is unavailable. Try again shortly.",
  );
  await expect(
    task.getByRole("link", {
      name: "Recovery is unavailable. Try again shortly.",
    }),
  ).toHaveAttribute("href", "#username");
  await expect(task.getByLabel("Username", { exact: true })).toHaveAttribute(
    "aria-describedby",
    /username-error/,
  );
  await expect(
    task.getByRole("alert", { name: "We could not take your request." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/recovery/reset");
  await expect(
    page.getByRole("navigation", { name: "Public navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request a fresh link" }),
  ).toBeVisible();
});

test("student course-change tasks have labelled touch controls and comparable histories without losing entered data", async ({
  page,
}) => {
  const student = await createStudent();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, student.username, student.password);
  await page.goto("/student/changes");
  const form = page.getByRole("form", { name: "Request a course addition" });
  const input = form.getByLabel("Course code", { exact: true });
  const dimensions = await input.boundingBox();
  expect(dimensions?.height).toBeGreaterThanOrEqual(44);
  await input.fill("SWE999");
  await form
    .getByLabel("Reason", { exact: true })
    .fill("Please review this course addition.");
  await page.route("**/api/registration/changes", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        message: "This course is unavailable. Choose another course.",
      }),
    }),
  );
  await form.getByRole("button", { name: "Request addition" }).click();
  await expect(input).toHaveValue("SWE999");
  await expect(form.getByLabel("Reason", { exact: true })).toHaveValue(
    "Please review this course addition.",
  );
  await expect(
    page.getByText("This course is unavailable. Choose another course."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "This course is unavailable. Choose another course.",
    }),
  ).toHaveAttribute("href", "#add-code");
  await expect(
    page.getByRole("heading", { name: "Change history" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Change history", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
