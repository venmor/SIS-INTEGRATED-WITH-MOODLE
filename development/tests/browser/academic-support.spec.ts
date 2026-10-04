import { test, expect } from "@playwright/test";
import { createAcademicSupportScenario, createStudent } from "./fixtures";

async function signIn(
  page: import("@playwright/test").Page,
  username: string,
  password: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
}

test("academic help stays unavailable without a configured adviser and receiver", async ({
  page,
}) => {
  const student = await createStudent();
  await signIn(page, student.username, student.password);
  await page.goto("/student/support");
  await expect(page.getByText("Academic adviser not ready")).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Request academic support" }),
  ).toHaveCount(0);
});

test("student sends a real academic request and exchanges secure replies with the appointed adviser", async ({
  page,
  browser,
}) => {
  const scenario = await createAcademicSupportScenario();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, scenario.student.username, scenario.student.password);
  await page.goto("/student/support");
  await expect(
    page.getByRole("heading", { name: "Requests and support" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fictional browser academic adviser" }),
  ).toBeVisible();
  const form = page.getByRole("form", { name: "Request academic support" });
  await form
    .getByLabel("Brief explanation (optional)")
    .fill("I need help planning my courses.");
  await form.getByLabel(/I understand this academic request goes to/).check();
  await form.getByRole("button", { name: "Send academic request" }).click();
  await expect(page).toHaveURL(/\/student\/support\/[a-f0-9-]+$/);
  await expect(
    page.getByText("I need help planning my courses."),
  ).toBeVisible();
  const studentCaseUrl = page.url();

  const adviserContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const adviser = await adviserContext.newPage();
  try {
    await signIn(adviser, scenario.adviser.username, scenario.adviser.password);
    await adviser.goto("/admin/support");
    await expect(
      adviser.getByRole("heading", { name: "Assigned support requests" }),
    ).toBeVisible();
    await expect(
      adviser.getByRole("complementary", {
        name: "Staff workspace navigation",
      }),
    ).toBeVisible();
    await expect(
      adviser
        .getByRole("navigation", { name: "Workspace sections" })
        .getByRole("link", { name: "Assigned support requests" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      adviser
        .getByRole("region", { name: "Assigned workload" })
        .getByRole("link", { name: /Needs reply/ }),
    ).toBeVisible();
    expect(
      await adviser
        .getByRole("form", { name: "Filter assigned requests" })
        .evaluate(
          (element) =>
            Number.parseFloat(getComputedStyle(element).paddingTop) > 0,
        ),
    ).toBe(true);
    await adviser
      .getByRole("combobox", { name: "Show requests" })
      .selectOption("NEEDS_REPLY");
    await adviser.getByRole("button", { name: "Apply filters" }).click();
    await expect(adviser).toHaveURL(/status=NEEDS_REPLY/);
    const rowText = await adviser
      .getByRole("link", { name: "Open request and reply →" })
      .first()
      .locator("..")
      .textContent();
    const reference = rowText?.match(/SUP-[A-F0-9]{8}/)?.[0];
    expect(reference).toBeTruthy();
    expect(
      await adviser
        .getByRole("link", { name: "Open request and reply →" })
        .first()
        .locator("..")
        .evaluate((element) => getComputedStyle(element).listStyleType),
    ).toBe("none");
    await adviser
      .getByRole("searchbox", { name: "Case reference" })
      .fill(reference!);
    await adviser.getByRole("button", { name: "Apply filters" }).click();
    await expect(adviser).toHaveURL(new RegExp(`reference=${reference}`));
    await expect(
      adviser.getByRole("link", { name: "Open request and reply →" }),
    ).toHaveCount(1);
    await adviser
      .getByRole("link", { name: "Open request and reply →" })
      .first()
      .click();
    await expect(
      adviser.getByText("I need help planning my courses."),
    ).toBeVisible();
    await adviser
      .getByLabel("Message")
      .fill(
        "I can help you review the available courses. Which day works for you?",
      );
    await adviser.getByRole("button", { name: "Send reply" }).click();
    await expect(
      adviser.getByText("Reply saved in the secure portal."),
    ).toBeVisible();
  } finally {
    await adviserContext.close();
  }

  await page.goto(studentCaseUrl);
  await expect(
    page.getByText(/I can help you review the available courses/),
  ).toBeVisible();
  await page.getByLabel("Message").fill("Tuesday afternoon works.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(
    page.getByText("Reply saved in the secure portal."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("student and adviser agree and verify a dated academic follow-up", async ({
  page,
  browser,
}) => {
  const scenario = await createAcademicSupportScenario();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, scenario.student.username, scenario.student.password);
  await page.goto("/student/support");
  const request = page.getByRole("form", { name: "Request academic support" });
  await request
    .getByLabel("Brief explanation (optional)")
    .fill("I need to review my course plan.");
  await request
    .getByLabel(/I understand this academic request goes to/)
    .check();
  await request.getByRole("button", { name: "Send academic request" }).click();
  await expect(page).toHaveURL(/\/student\/support\/[a-f0-9-]+$/);
  const studentCaseUrl = page.url();
  const requestId = studentCaseUrl.split("/").at(-1)!;
  const adviserContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const adviser = await adviserContext.newPage();
  try {
    await signIn(adviser, scenario.adviser.username, scenario.adviser.password);
    await adviser.goto(`/admin/support/${requestId}`);
    const followUp = adviser.getByRole("form", {
      name: "Propose academic follow-up",
    });
    await expect(followUp).toBeVisible();
    await followUp
      .getByLabel("Action title")
      .fill("Review your registered courses");
    await followUp
      .getByLabel("What the student should do")
      .fill("Open My courses and note any questions for your adviser.");
    await followUp.getByLabel("Open in SIS").selectOption("COURSES");
    await followUp
      .getByLabel("Follow-up due date")
      .fill(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
    await followUp.getByRole("button", { name: "Propose follow-up" }).click();
    await expect(
      adviser.getByText("Follow-up saved in the student portal.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.goto(studentCaseUrl);
    await expect(
      page.getByText("Review your registered courses"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open task" })).toHaveAttribute(
      "href",
      "/student/courses",
    );
    await page.getByRole("button", { name: "Agree to follow-up" }).click();
    await expect(page.getByText("Follow-up agreed.")).toBeVisible();
    await page.getByRole("button", { name: "I completed this" }).click();
    await expect(
      page.getByText("Completion sent to your adviser for confirmation."),
    ).toBeVisible();
    await adviser.goto("/admin/support/follow-ups?view=NEEDS_CONFIRMATION");
    await expect(
      adviser.getByRole("heading", { name: "Academic follow-ups" }),
    ).toBeVisible();
    await expect(
      adviser.getByText("Review your registered courses"),
    ).toBeVisible();
    expect(
      await adviser.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await adviser.getByRole("link", { name: "Open follow-up →" }).click();
    await expect(adviser).toHaveURL(new RegExp(`/admin/support/${requestId}$`));
    await adviser.reload();
    await adviser.getByRole("button", { name: "Confirm completion" }).click();
    await expect(adviser.getByText("Completion confirmed.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Complete", { exact: true })).toBeVisible();
    const closure = adviser.getByRole("form", {
      name: "Complete academic-support case",
    });
    await closure
      .getByLabel("Closure reason")
      .selectOption("AGREED_ACTION_COMPLETED");
    await closure.getByRole("button", { name: "Complete case" }).click();
    await expect(
      adviser.getByText("Academic-support case completed.", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("This academic-support follow-up is complete."),
    ).toBeVisible();
    await expect(
      page.getByText("Agreed action completed", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("form", { name: /reply/i })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await adviserContext.close();
  }
});
