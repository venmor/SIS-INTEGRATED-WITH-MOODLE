import { test, expect } from "@playwright/test";
import {
  createCheckpointStudent,
  moodleAdminSid,
  releaseDueAttempts,
  supportSid,
} from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

const ORIGIN = "http://127.0.0.1:3100";

// Phase 6 slice 6 demonstration checkpoint: confirmed registration,
// forced outage, dead letter, approved replay, reconciliation with no
// duplicate enrolment. API-driven with UI state assertions at each leg.
test("integration checkpoint: outage, replay, reconciliation", async ({
  page,
}) => {
  const student = await createCheckpointStudent();
  const adminCookie = await moodleAdminSid();
  const supportA = await supportSid();
  const supportB = await supportSid();

  async function api(
    method: string,
    path: string,
    cookie: string,
    body?: unknown,
  ) {
    const res = await page.request.fetch(`${ORIGIN}${path}`, {
      method,
      headers: { origin: ORIGIN, cookie },
      data: body,
    });
    return { status: res.status(), body: (await res.json().catch(() => ({}))) as any };
  }

  // Queued handoff visible to the student; registration stays valid.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(student.username);
  await page.getByLabel("Password", { exact: true }).fill(student.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(ORIGIN + "/", { timeout: 20000 });
  await page.goto("/student/register");
  await expect(page.getByText(/Moodle handoff: Queued/)).toBeVisible();
  await noOverflow(page);

  // Force the outage; worker ticks fail retryably, never touching SIS.
  await api("POST", "/api/integration/simulator/mode", adminCookie, {
    mode: "OUTAGE",
  });
  for (let i = 0; i < 5; i++) {
    await api("POST", "/api/integration/worker/run", adminCookie, {});
    await releaseDueAttempts();
  }
  const dead = await api("GET", "/api/integration/dead-letters", supportA);
  expect(dead.status).toBe(200);
  expect((dead.body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  const attemptId = (
    dead.body as { items: Array<{ id: string }> }
  ).items[0].id;

  // Approved replay by a second officer, then recovery and delivery.
  const requested = await api("POST", "/api/integration/replays", supportA, {
    attemptId,
    reason: "Outage over; retry once.",
    declaration: true,
    idempotencyKey: crypto.randomUUID(),
  });
  expect(requested.status).toBe(201);
  const replayId = (requested.body as { id: string }).id;
  const decided = await api(
    "POST",
    `/api/integration/replays/${replayId}/decide`,
    supportB,
    {
      approve: true,
      note: "Evidence reviewed.",
      idempotencyKey: crypto.randomUUID(),
    },
  );
  expect(decided.status).toBe(201);
  await api("POST", "/api/integration/simulator/mode", adminCookie, {
    mode: "SUCCESS",
  });
  await api("POST", "/api/integration/worker/run", adminCookie, {});
  await page.goto("/student/register");
  await expect(page.getByText(/Moodle handoff: Synced/)).toBeVisible();
  await noOverflow(page);

  // Reconciliation closes clean with no duplicate enrolment.
  const run = await api(
    "POST",
    "/api/integration/reconciliation/runs",
    adminCookie,
    {},
  );
  expect(run.status).toBe(201);
  expect((run.body as { cases: number }).cases).toBe(0);
  await page.goto("/admin/integration/reconciliation");
  await expect(
    page.getByRole("heading", { name: "Reconciliation" }),
  ).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
