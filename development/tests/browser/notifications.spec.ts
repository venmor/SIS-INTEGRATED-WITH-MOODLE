import { expectWorkspaceLanding } from "./workspace-landing";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createStudent, sysadminSid } from "./fixtures";

const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";

async function apiPost(path: string, body: object, sid: string) {
  const res = await fetch(`${api}/notifications${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      cookie: sid,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Record<string, any>;
}

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function signIn(
  page: any,
  username: string,
  password: string,
  base: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expectWorkspaceLanding(page);
}

// Phase 8 slice 1: a mandatory notice created for the student appears
// in their notification centre, marks as read, and offers no mute
// control — mandatory notices cannot be disabled.
test("notifications: centre shows notice, read receipt, no mute on mandatory", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const stu = await createStudent();
  const gov = await sysadminSid();
  const dedupe = randomUUID();
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: versioned template + authoritative record
  // addressed to the student's account with an in-system delivery.
  const tpl = await apiPost(
    "/templates",
    {
      idempotencyKey: randomUUID(),
      event: "RESULT_RELEASED",
      title: "Official results released",
      body: "Your official results are available securely in the portal.",
      office: "Examinations",
      category: "RESULT",
      mandatory: true,
    },
    gov,
  );
  await apiPost(
    "/records",
    {
      idempotencyKey: randomUUID(),
      templateId: tpl.id as string,
      event: "RESULT_RELEASED",
      title: "Official results released",
      body: "Your official results are available securely in the portal.",
      actionPath: "/student/results",
      office: "Examinations",
      category: "RESULT",
      mandatory: true,
      recipientAccountId: stu.accountId,
      dedupeKey: dedupe,
      channels: ["IN_SYSTEM"],
    },
    gov,
  );

  // The student sees the notice, marks it read, and finds no mute
  // control on the mandatory record.
  await signIn(page, stu.username, stu.password, base);
  await page.goto("/notifications");
  await expect(
    page.locator("main").getByText("Official results released").first(),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText("Mandatory notice"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your official results are available securely in the portal.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator("main").getByText("Examinations", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View results", exact: true }),
  ).toHaveAttribute("href", "/student/results");
  await expect(
    page.locator("main").getByRole("button", { name: "Mute these notices" }),
  ).toHaveCount(0);
  const readButton = page
    .locator("main")
    .getByRole("button", { name: "Mark as read" });
  await readButton.focus();
  await expect(readButton).toBeFocused();
  await readButton.click();
  await expect(
    page.locator("main").getByText("READ", { exact: true }),
  ).toBeVisible();
  // A template writer cannot turn the recipient centre into an external
  // redirect, including protocol-relative destinations.
  await apiPost(
    "/records",
    {
      idempotencyKey: randomUUID(),
      templateId: tpl.id as string,
      event: "RESULT_RELEASED",
      title: "External action rejected",
      body: "Open your results through the student portal.",
      actionPath: "//example.invalid/results",
      office: "Examinations",
      category: "RESULT",
      mandatory: true,
      recipientAccountId: stu.accountId,
      dedupeKey: randomUUID(),
      channels: ["IN_SYSTEM"],
    },
    gov,
  );
  await page.reload();
  await expect(
    page.getByText("External action rejected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View results", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('a[href^="//"]')).toHaveCount(0);
  await noOverflow(page);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
