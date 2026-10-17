import { expectWorkspaceLanding } from "./workspace-landing";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createIntegrationSupport,
  createStudent,
  resetNotificationDueDates,
  sysadminSid,
} from "./fixtures";

const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";

async function apiPost(path: string, body: object, sid: string, prefix = "/notifications") {
  const res = await fetch(`${api}${prefix}${path}`, {
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

// Phase 8 slice 3: an armed notification failure dead-letters through
// the worker, convergently opens an ops incident, and the support
// operator drives it to CLOSED with recovery evidence.
test("ops queue: dead-letter opens incident, ack, resolve, close", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const support = await createIntegrationSupport();
  const stu = await createStudent();
  const gov = await sysadminSid();
  // Worker incident titles retain the event: correlate this fixture delivery
  // without assuming that other tests left the shared queue empty.
  const event = `SUPPORT_REPLY_${randomUUID()}`;
  const incidentTitle = `Notification delivery dead-lettered (${event})`;
  await page.setViewportSize({ width: 390, height: 844 });

  // Setup through the API: template + optional record with an armed
  // SIM failure, then worker ticks to dead-letter (auto-opens).
  const tpl = await apiPost(
    "/templates",
    {
      idempotencyKey: randomUUID(),
      event,
      title: "Support update",
      body: "Your adviser sent a support message.",
      office: "Welfare",
      category: "SUPPORT",
      mandatory: false,
    },
    gov,
  );
  await apiPost(
    "/records",
    {
      idempotencyKey: randomUUID(),
      templateId: tpl.id as string,
      event,
      title: "Support update",
      body: "Your adviser sent a support message.",
      office: "Welfare",
      category: "SUPPORT",
      mandatory: false,
      recipientAccountId: stu.accountId,
      dedupeKey: randomUUID(),
      channels: ["SMS_SIM"],
      simulateFailure: true,
    },
    gov,
  );
  for (let i = 0; i < 3; i++) {
    await resetNotificationDueDates();
    await apiPost("/worker/run", { idempotencyKey: randomUUID() }, gov);
  }

  // The support operator sees the incident, acknowledges it, resolves
  // with evidence, and closes it.
  await signIn(page, support.username, support.password, base);
  await page.goto("/admin/ops");
  await expect(
    page.getByRole("heading", { name: "Operations queue" }),
  ).toBeVisible();
  const incident = page.locator("main li").filter({ hasText: incidentTitle });
  await expect(incident).toHaveCount(1);
  await expect(incident).toBeVisible();
  const ackButton = incident.getByRole("button", { name: "Acknowledge incident" });
  await ackButton.focus();
  await expect(ackButton).toBeFocused();
  await ackButton.click();
  await expect(incident.getByText("ACKNOWLEDGED", { exact: true })).toBeVisible();
  await incident
    .getByLabel("Root cause")
    .fill("Simulator provider timed out under retry storm.");
  await incident
    .getByLabel(/Recovery evidence/)
    .fill("Provider recovered; deliveries drained and reconciled against the outbox.");
  const resolveButton = incident.getByRole("button", { name: "Resolve incident" });
  await resolveButton.focus();
  await expect(resolveButton).toBeFocused();
  await resolveButton.click();
  await expect(incident.getByText("RESOLVED", { exact: true })).toBeVisible();
  const closeButton = incident.getByRole("button", { name: "Close incident" });
  await closeButton.focus();
  await expect(closeButton).toBeFocused();
  await closeButton.click();
  await expect(incident.getByText("CLOSED", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
