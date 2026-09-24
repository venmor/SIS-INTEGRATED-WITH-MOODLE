import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { test, expect, type Page } from "@playwright/test";
import {
  createCoordinator,
  createIntegrationSupport,
  createMoodleAdmin,
} from "./fixtures";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", {
    timeout: 20000,
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function seedOperationalEvidence() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const outbox = await db.outboxEvent.create({
      data: {
        aggregate: "InstitutionalRegistration",
        aggregateId: randomUUID(),
        type: "MoodleEnrolmentQueued",
        payload: {
          eventType: "zm.sis.registration.course-enrolled.v1",
          source: "SIS",
          destination: "Moodle simulator",
          studentNumber: "STU-DEMO-OPS",
        },
      },
    });
    const attempt = await db.integrationDeliveryAttempt.create({
      data: {
        outboxId: outbox.id,
        state: "DEAD_LETTER",
        attempt: 3,
        lastError: "Fictional Moodle timeout after the retry budget.",
      },
    });
    const replay = await db.replayDecision.create({
      data: {
        scope: "attempt",
        attemptId: attempt.id,
        evidence: {
          sourceTruth: "SIS registration remains registered",
          destinationState: "Delivery exhausted",
          attempt: 3,
        },
        declaration:
          "I confirm that I reviewed the frozen evidence and request a governed replay.",
        status: "PENDING",
        requesterAccountId: randomUUID(),
      },
    });
    await db.integrationIncident.create({
      data: {
        title: "Fictional Moodle delivery delay",
        severity: "MEDIUM",
        status: "OPEN",
        detail: { note: "Demo evidence only." },
      },
    });
    await db.moodleMaintenance.create({
      data: {
        reason: "Fictional scheduled Moodle maintenance",
        startsAt: new Date(Date.now() + 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "SCHEDULED",
        creatorAccountId: randomUUID(),
      },
    });
    return { attemptId: attempt.id, replayId: replay.id };
  } finally {
    await db.$disconnect();
  }
}

test.describe.serial("Phase 6 operations presentation", () => {
  test("integration support prioritizes attention, health, delivery and incident evidence", async ({
    page,
  }) => {
    await seedOperationalEvidence();
    const support = await createIntegrationSupport();
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, support.username, support.password);
    await page.goto("/admin/integration");

    const main = page.locator("#main-content");
    const headings = await main.locator("h2").allTextContents();
    expect(headings.slice(0, 4)).toEqual([
      "Needs attention",
      "Health and freshness",
      "Deliveries and reconciliation",
      "Recent incident evidence",
    ]);
    await expect(
      page.getByRole("region", { name: "Needs attention" }),
    ).toContainText(/dead letter|replay|incident/i);
    await expect(
      page.getByRole("region", { name: "Health and freshness" }),
    ).toContainText("Moodle simulator");
    await expect(
      page.getByRole("region", { name: "Deliveries and reconciliation" }),
    ).toContainText("Moodle simulator destination evidence");
    await noOverflow(page);
  });

  test("delivery detail separates SIS truth, Moodle state, attempt history and safe action", async ({
    page,
  }) => {
    const evidence = await seedOperationalEvidence();
    const support = await createIntegrationSupport();
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, support.username, support.password);
    await page.goto(`/admin/integration/deliveries/${evidence.attemptId}`);

    await expect(
      page.getByRole("region", { name: "SIS source truth" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Moodle destination state" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Attempt history" }),
    ).toContainText("3");
    await expect(
      page.getByRole("region", { name: "Safe action" }),
    ).toContainText(/replay|source record|SIS/i);
    await noOverflow(page);
  });

  test("replay decision explains idempotency and second-officer consequence", async ({
    page,
  }) => {
    const evidence = await seedOperationalEvidence();
    const support = await createIntegrationSupport();
    await signIn(page, support.username, support.password);
    await page.goto(`/admin/integration/replays/${evidence.replayId}`);

    const consequence = page.getByRole("region", { name: "Replay consequence" });
    await expect(consequence).toContainText(/idempotent|idempotency/i);
    await expect(consequence).toContainText(/second officer|four-eyes/i);
    await expect(consequence).toContainText(/SIS source|source record/i);
  });

  test("Moodle operations show hierarchy and maintenance impact", async ({
    page,
  }) => {
    await seedOperationalEvidence();
    const admin = await createMoodleAdmin();
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, admin.username, admin.password);
    await page.goto("/admin/moodle");

    const headings = await page.locator("#main-content h2").allTextContents();
    await expect(
      page.getByRole("region", { name: "Health and freshness" }),
    ).toContainText("Moodle simulator");
    expect(headings.slice(0, 4)).toEqual([
      "Needs attention",
      "Health and freshness",
      "Deliveries and reconciliation",
      "Recent incident evidence",
    ]);

    await page.goto("/admin/moodle/maintenance");
    const impact = page.getByRole("region", { name: "Maintenance impact" });
    await expect(impact).toContainText(/Moodle/i);
    await expect(impact).toContainText(/SIS registration/i);
    await noOverflow(page);
  });

  test("teaching groups make coordinator scope and SIS authority explicit", async ({
    page,
  }) => {
    const coordinator = await createCoordinator();
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, coordinator.username, coordinator.password);
    await page.goto("/admin/teaching/groups");

    await expect(page.getByText("Teaching workspace", { exact: true })).toBeVisible();
    const context = page.getByRole("status", {
      name: /Active workspace: COORDINATOR workspace/,
    });
    await expect(context).toContainText("PROGRAMME:SWE");
    const authority = page.getByRole("region", {
      name: "Tutorial group authority",
    });
    await expect(authority).toContainText(/SIS/i);
    await expect(authority).toContainText(/Moodle/i);
    await noOverflow(page);
  });
});


test("reconciliation names the active Moodle backend instead of hard-coding live or simulator state", async ({
  page,
}) => {
  const support = await createIntegrationSupport();
  await signIn(page, support.username, support.password);
  await page.goto("/admin/integration/reconciliation");

  await expect(
    page.getByRole("region", { name: "Reconciliation authority" }),
  ).toContainText("Moodle simulator is destination evidence");
});


test("reconciliation return path follows the active operations role", async ({
  page,
}) => {
  const support = await createIntegrationSupport();
  await signIn(page, support.username, support.password);
  await page.goto("/admin/integration/reconciliation");
  await expect(
    page.getByRole("link", { name: "Integration support", exact: true }),
  ).toHaveAttribute("href", "/admin/integration");
  await expect(
    page.getByRole("link", { name: "Moodle administration", exact: true }),
  ).toHaveCount(0);

  await page.context().clearCookies();
  const moodle = await createMoodleAdmin();
  await signIn(page, moodle.username, moodle.password);
  await page.goto("/admin/integration/reconciliation");
  await expect(
    page.getByRole("link", { name: "Moodle administration", exact: true }),
  ).toHaveAttribute("href", "/admin/moodle");
  await expect(
    page.getByRole("link", { name: "Integration support", exact: true }),
  ).toHaveCount(0);
});


test("Moodle operational pages distinguish access denial from service recovery", async ({
  page,
}) => {
  const coordinator = await createCoordinator();
  await signIn(page, coordinator.username, coordinator.password);

  await page.goto("/admin/moodle");
  await expect(page.getByText("Moodle access unavailable")).toBeVisible();

  await page.goto("/admin/moodle/mappings");
  await expect(page.getByText("Mapping access unavailable")).toBeVisible();

  await page.goto("/admin/moodle/maintenance");
  await expect(page.getByText("Maintenance access unavailable")).toBeVisible();
  await expect(
    page.getByRole("form", { name: /maintenance/i }),
  ).toHaveCount(0);
});
