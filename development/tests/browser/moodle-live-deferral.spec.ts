import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CoursePlanView,
  DeferredMoodleSourceView,
  MoodleDeliveryQueueView,
  NotProvisionedResult,
  RegistrationStatusView,
} from "../../packages/contracts/src/index";

// Rendering evidence only: the real Next pages/components consume synthetic
// API projections. This harness does not prove authentication, authorization,
// backend mutation rules, or a connection to Moodle. Every command is mocked.
const webOrigin = "http://127.0.0.1:3168";
const apiOrigin = "http://127.0.0.1:3169";
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceId = "00000000-0000-4000-8000-000000000101";
const replayId = "00000000-0000-4000-8000-000000000102";
const caseId = "00000000-0000-4000-8000-000000000103";
const attemptId = "00000000-0000-4000-8000-000000000104";
const safeDetail =
  "Moodle access is being prepared. Your registration is complete; do not register again.";
let backend: NotProvisionedResult["backend"] = "live-test";
// Command-response cases start from a simulator-ready page, then mimic a
// backend change before its POST reaches the API. The response must still
// preserve inputs and report deferral. Other cases render current live gates.
let controlsReady = true;
let readinessKnown = true;
let registrationStatusUnavailable = false;
let largeSourceQueue = false;
let api: Server | undefined;
let web: ChildProcess | undefined;
let startupLog = "";
const unexpectedApiRequests: string[] = [];

function deferred(): NotProvisionedResult {
  return {
    outcome: "NOT_PROVISIONED",
    backend,
    reason: backend === "live-test"
      ? "LIVE_PREREQUISITES_UNAVAILABLE"
      : "LIVE_CONFIGURATION_REFUSED",
    detail: safeDetail,
  };
}

function readiness() {
  return controlsReady
    ? { outcome: "SIMULATOR_READY" as const, backend: "simulator" as const,
        detail: "Explicit simulator rendering fixture." }
    : deferred();
}

function sourcePreview(): DeferredMoodleSourceView[] {
  if (controlsReady) return [];
  // 101 fictional sources exist upstream, but the API contract returns only
  // the oldest 100 and a lookahead flag. The final source is never rendered.
  return Array.from({ length: largeSourceQueue ? 101 : 1 }, (_, index) => ({
    outboxId: `00000000-0000-4000-8000-${String(101 + index).padStart(12, "0")}`,
    eventType: "MoodleEnrolmentQueued",
    occurredAt: new Date(Date.UTC(2026, 9, 7, 8, index)).toISOString(),
    outcome: "NOT_PROVISIONED" as const,
    reason: deferred().reason,
    detail: safeDetail,
  })).slice(0, 100);
}

function projections(path: string): unknown {
  if (path === "/auth/me") return {
    account: { displayName: "Fictional integration officer" },
    activeWorkspace: {
      role: "INTEGRATION_SUPPORT", scopeType: "SYSTEM", scopeRef: "INTEGRATION",
    },
  };
  if (path === "/integration/health") return {
    provider: "MOODLE-UI-FIXTURE",
    backend: controlsReady ? "simulator" : backend,
    status: backend === "live-test" ? "HEALTHY" : "DISABLED",
    lastCheckedAt: "2026-10-07T08:00:00.000Z",
    writeReadiness: readinessKnown ? readiness() : undefined,
  };
  if (path === "/integration/deliveries") return {
    items: [{
      id: attemptId, outboxId: "historical-source", eventType: "HistoricalSimulatorDelivery",
      state: "DELIVERED", attempt: 1, nextRunAt: null, lastError: null,
      createdAt: "2026-10-06T08:00:00.000Z",
    }],
    deferredSources: sourcePreview(),
    deferredSourcesTruncated: largeSourceQueue,
    writeReadiness: readiness(),
  } satisfies MoodleDeliveryQueueView;
  if (path === "/integration/replays") return { items: [{
    id: replayId, scope: "MOODLE", status: "PENDING",
    evidence: { synthetic: true, sourceEvent: sourceId },
    createdAt: "2026-10-07T08:00:00.000Z",
  }] };
  if (path === "/integration/reconciliation/cases") return { items: [{
    id: caseId, kind: "MISSING_ENROLMENT", status: "OPEN", studentId: null,
    resolution: null, createdAt: "2026-10-07T08:00:00.000Z",
  }] };
  if (["/integration/mappings", "/integration/shells", "/integration/incidents",
    "/integration/dead-letters", "/integration/reconciliation/runs"].includes(path))
    return { items: [] };
  if (path === "/registration/contexts") return {
    source: "OWN_REGISTRATION_CONTEXTS", checkedAt: "2026-10-07T08:00:00.000Z",
    configuredPeriod: { code: "2026S1" },
    items: [{ attemptId: "00000000-0000-4000-8000-000000000105", period: "2026S1",
      attemptStatus: "ACTIVE", programmeCode: "SWE", programmeName: "Fictional Software Engineering",
      intake: "2026", periodName: null, startDate: null, endDate: null,
      configuredCurrent: true, registrationStatus: "REGISTERED" }],
    soleRegisteredContext: { attemptId: "00000000-0000-4000-8000-000000000105", period: "2026S1" }, nextCursor: null,
  };
  if (path === "/registration/plan") return {
    planId: "synthetic-plan", attemptId: "00000000-0000-4000-8000-000000000105", period: "2026S1",
    version: 1, status: "REGISTERED", items: [], available: [], validation: [],
    loadHalves: 2, notices: [],
  } satisfies CoursePlanView;
  if (path === "/registration/status") return {
    registration: {
      id: "synthetic-registration", receipt: "REG-UI-2026-001",
      attemptId: "00000000-0000-4000-8000-000000000105", period: "2026S1", version: 1,
      status: "REGISTERED", courses: [{
        code: "SWE111", title: "Fictional Software Engineering", credits: 2,
        courseType: "CORE", semester: "1",
      }], loadHalves: 2, clearance: "CLEARED", decidedAt: "2026-10-07T08:00:00.000Z",
    },
    amendments: [], moodle: { state: "NOT_PROVISIONED", detail: safeDetail },
  } satisfies RegistrationStatusView;
  return undefined;
}

async function stopWeb() {
  if (!web || web.exitCode !== null || web.signalCode !== null) return;
  const owned = web;
  await new Promise<void>((done) => {
    const force = setTimeout(() => owned.kill("SIGKILL"), 3000);
    owned.once("exit", () => { clearTimeout(force); done(); });
    owned.kill("SIGTERM");
  });
}

test.beforeAll(async () => {
  test.setTimeout(120000);
  // Refuse an occupied web port before spawning; never reuse or kill another
  // review server. The API listener likewise fails if its port is occupied.
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once("error", fail);
    probe.listen(3168, "127.0.0.1", () => probe.close(() => done()));
  });
  api = createServer((request, response) => {
    const path = new URL(request.url ?? "/", apiOrigin).pathname;
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && path === "/registration/status" && registrationStatusUnavailable) {
      response.writeHead(503).end(JSON.stringify({ message: "Registration status cannot be checked right now." }));
      return;
    }
    const body = request.method === "GET" ? projections(path) : undefined;
    if (body === undefined) {
      unexpectedApiRequests.push(`${request.method} ${path}`);
      response.writeHead(404).end(JSON.stringify({ message: "No synthetic fixture for this request." }));
      return;
    }
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((done, fail) => {
    api!.once("error", fail);
    api!.listen(3169, "127.0.0.1", done);
  });
  web = spawn(process.execPath, [
    resolve(workspace, "node_modules/next/dist/bin/next"), "dev", "--webpack",
    "--hostname", "127.0.0.1", "--port", "3168",
  ], {
    cwd: resolve(workspace, "apps/web"),
    // Only local, non-secret process configuration; no repository env loader
    // or credential/database/provider settings are inherited by this child.
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME,
      NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
      API_INTERNAL_URL: apiOrigin,
      SIS_NEXT_DIST_DIR: ".next-moodle-live-deferral-browser",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const output of [web.stdout, web.stderr])
    output?.on("data", (chunk: Buffer) => {
      startupLog = (startupLog + chunk.toString()).slice(-12000);
    });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (web.exitCode !== null) throw new Error(`Owned Next fixture exited: ${startupLog}`);
    try {
      if ((await fetch(`${webOrigin}/sign-in`, { signal: AbortSignal.timeout(3000) })).ok)
        return;
    } catch { /* The owned server is still starting. */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Owned Next fixture did not become ready: ${startupLog}`);
});

test.afterAll(async () => {
  await stopWeb();
  if (api) {
    api.closeAllConnections();
    await new Promise<void>((done) => api!.close(() => done()));
  }
});

test.beforeEach(async ({ page }) => {
  backend = "live-test";
  controlsReady = true;
  readinessKnown = true;
  registrationStatusUnavailable = false;
  largeSourceQueue = false;
  unexpectedApiRequests.length = 0;
  await page.context().addCookies([{ name: "sid", value: "synthetic-rendering-only", url: webOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
});

test.afterEach(() => {
  expect(unexpectedApiRequests, "Only enumerated synthetic GET projections may reach the fixture API").toEqual([]);
});

async function mockDeferredPost(page: Page, path: string) {
  const requests: Record<string, unknown>[] = [];
  await page.route(`${webOrigin}/api/integration${path}`, async (route) => {
    expect(route.request().method()).toBe("POST");
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(deferred()) });
  });
  return requests;
}

async function expectWaiting(page: Page) {
  await expect(page.getByRole("status", { name: "Waiting for Moodle", exact: true }).last()).toContainText(safeDetail);
  await expect(page.getByRole("status", { name: "Done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({
    hasText: /mapping was not updated|Reconciliation did not complete|replay was not|Delivery control did not change/i,
  })).toHaveCount(0);
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const mode of ["live-test", "live-test-disabled"] as const) {
  test(`deferred mapping draft retains identifiers (${mode})`, async ({ page }) => {
    backend = mode;
    const requests = await mockDeferredPost(page, "/mappings");
    await page.goto(`${webOrigin}/admin/moodle/mappings`);
    const form = page.getByRole("form", { name: "Draft Moodle mapping" });
    await form.getByLabel("Kind").selectOption("SHELL");
    await form.getByLabel("SIS type").fill("OFFERING");
    await form.getByLabel("SIS identifier").fill("FICTIONAL-SWE:2026S1");
    await form.getByLabel("Moodle identifier").fill("synthetic-shell-42");
    await form.getByRole("button", { name: "Draft mapping", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expectWaiting(page);
    await expect(form.getByLabel("Kind")).toHaveValue("SHELL");
    await expect(form.getByLabel("SIS type")).toHaveValue("OFFERING");
    await expect(form.getByLabel("SIS identifier")).toHaveValue("FICTIONAL-SWE:2026S1");
    await expect(form.getByLabel("Moodle identifier")).toHaveValue("synthetic-shell-42");
    expect(requests).toHaveLength(1);
    await noOverflow(page);
  });
}

test("disabled connection validation is never labelled Simulator", async ({ page }) => {
  backend = "live-test-disabled";
  await page.route(`${webOrigin}/api/integration/connection/validate`, (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      ok: false, backend, version: null, detail: "Live configuration is disabled.",
    }) }));
  await page.goto(`${webOrigin}/admin/moodle/mappings`);
  await page.getByRole("button", { name: "Test connection", exact: true }).click();
  const result = page.getByRole("status", { name: "Connection check", exact: true });
  await expect(result).toContainText(/disabled/i);
  await expect(result).not.toContainText("Simulator");
});

for (const action of ["test", "activate"] as const) {
  test(`deferred mapping ${action} retains its mapping reference`, async ({ page }) => {
    const requests = await mockDeferredPost(page, `/mappings/synthetic-mapping/${action}`);
    await page.goto(`${webOrigin}/admin/moodle/mappings`);
    const form = page.getByRole("form", {
      name: action === "test" ? "Test Moodle mapping" : "Activate Moodle mapping",
    });
    await form.getByLabel("Mapping ID", { exact: true }).fill("synthetic-mapping");
    await form.getByRole("button").click();
    await expectWaiting(page);
    await expect(form.getByLabel("Mapping ID", { exact: true })).toHaveValue("synthetic-mapping");
    expect(requests).toHaveLength(1);
  });
}

test("deferred reconciliation run records no completion message", async ({ page }) => {
  const requests = await mockDeferredPost(page, "/reconciliation/runs");
  await page.goto(`${webOrigin}/admin/integration/reconciliation`);
  await page.getByRole("button", { name: "Run reconciliation", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expectWaiting(page);
  await expect(page.getByText("Reconciliation run completed.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No reconciliation runs yet.", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
});

for (const action of ["REQUEUE", "SUSPEND_ACCESS", "ESCALATE", "MARK_RESOLVED"] as const) {
  test(`deferred ${action} resolution preserves case and evidence`, async ({ page }) => {
    backend = "live-test-disabled";
    const requests = await mockDeferredPost(page, `/reconciliation/cases/${caseId}/resolve`);
    await page.goto(`${webOrigin}/admin/integration/reconciliation`);
    const form = page.getByRole("form", { name: "Resolve reconciliation case" });
    await form.getByLabel("Case ID", { exact: true }).fill(caseId);
    await form.getByLabel("Resolution", { exact: true }).selectOption(action);
    await form.getByLabel("Evidence note", { exact: true }).fill("Fictional evidence awaiting governed live prerequisites.");
    await form.getByRole("button", { name: "Resolve case", exact: true }).click();
    await expectWaiting(page);
    await expect(form.getByLabel("Case ID", { exact: true })).toHaveValue(caseId);
    await expect(form.getByLabel("Resolution", { exact: true })).toHaveValue(action);
    await expect(form.getByLabel("Evidence note", { exact: true })).toHaveValue("Fictional evidence awaiting governed live prerequisites.");
    await expect(page.getByRole("listitem").filter({ hasText: caseId })).toContainText("OPEN");
    expect(requests).toHaveLength(1);
    expect(requests[0].action).toBe(action);
  });
}

test("deferred replay request retains reason and declaration", async ({ page }) => {
  const requests = await mockDeferredPost(page, "/replays");
  await page.goto(`${webOrigin}/admin/integration`);
  const form = page.getByRole("form", { name: "Request integration replay" });
  await form.getByLabel("Dead-letter attempt ID", { exact: true }).fill(attemptId);
  await form.getByLabel("Why is this replay safe?", { exact: true }).fill("Fictional preserved source event; prerequisites pending.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Request replay", exact: true }).click();
  await expectWaiting(page);
  await expect(form.getByLabel("Dead-letter attempt ID", { exact: true })).toHaveValue(attemptId);
  await expect(form.getByLabel("Why is this replay safe?", { exact: true })).toHaveValue("Fictional preserved source event; prerequisites pending.");
  await expect(form.getByRole("checkbox")).toBeChecked();
  expect(requests).toHaveLength(1);
  expect(requests[0].declaration).toBe(true);
});

for (const approve of [true, false]) {
  test(`deferred replay ${approve ? "approval" : "decline"} preserves decision note`, async ({ page }) => {
    backend = "live-test-disabled";
    const requests = await mockDeferredPost(page, `/replays/${replayId}/decide`);
    await page.goto(`${webOrigin}/admin/integration/replays/${replayId}`);
    const form = page.getByRole("form", { name: "Decide integration replay" });
    await form.getByLabel("Decision note (required to decline)", { exact: true }).fill("Fictional reviewed evidence; live execution stays deferred.");
    await form.getByRole("button", { name: approve ? "Approve replay" : "Decline replay", exact: true }).click();
    await expectWaiting(page);
    await expect(form.getByLabel("Decision note (required to decline)", { exact: true })).toHaveValue("Fictional reviewed evidence; live execution stays deferred.");
    await expect(page.getByRole("heading", { name: "Replay decision · PENDING", exact: true })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0].approve).toBe(approve);
  });
}

for (const paused of [true, false]) {
  test(`deferred delivery ${paused ? "pause" : "resume"} never reports a changed control`, async ({ page }) => {
    const requests = await mockDeferredPost(page, "/delivery/pause");
    await page.goto(`${webOrigin}/admin/integration`);
    await page.getByRole("button", { name: paused ? "Pause delivery" : "Resume delivery", exact: true }).click();
    await expectWaiting(page);
    await expect(page.getByText(paused ? "Delivery paused." : "Delivery resumed.", { exact: true })).toHaveCount(0);
    expect(requests).toHaveLength(1);
    expect(requests[0].paused).toBe(paused);
  });
}

for (const mode of ["live-test", "live-test-disabled"] as const) {
  test(`staff queue separates a deferred source from historical attempts (${mode})`, async ({ page }, info) => {
    backend = mode;
    controlsReady = false;
    await page.goto(`${webOrigin}/admin/integration`);
    const row = page.getByRole("listitem").filter({ hasText: sourceId });
    await expect(row).toContainText("MoodleEnrolmentQueued");
    await expect(row).toContainText(/waiting|prepared|deferred/i);
    await expect(row.getByRole("link")).toHaveCount(0);
    await expect(row.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "HistoricalSimulatorDelivery · DELIVERED", exact: true }))
      .toHaveAttribute("href", `/admin/integration/deliveries/${attemptId}`);
    await expect(page.locator(`a[href="/admin/integration/deliveries/${sourceId}"]`)).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath("deferred-source-mobile.png"), fullPage: true });
  });

  test(`confirmed student registration survives deferred Moodle access (${mode})`, async ({ page }, info) => {
    backend = mode;
    controlsReady = false;
    await page.goto(`${webOrigin}/student/register`);
    await expect(page.getByRole("status", { name: "Registration completed", exact: true }))
      .toContainText("REG-UI-2026-001");
    const access = page.getByRole("status", { name: "Moodle access is being prepared", exact: true });
    await expect(access).toContainText(/do not register again/i);
    await expect(page.getByRole("row").filter({ hasText: "SWE111" }))
      .toContainText("Fictional Software Engineering");
    await expect(page.getByRole("button", { name: /register|submit registration/i })).toHaveCount(0);
    await expect(page.getByText(/Moodle handoff: (Synced|Failed)/)).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath("confirmed-registration-deferred-mobile.png"), fullPage: true });
  });
}

test("healthy read-only identity does not promise live shell creation", async ({ page }) => {
  controlsReady = false;
  await page.goto(`${webOrigin}/admin/moodle`);
  await expect(page.getByRole("status", { name: "Connection HEALTHY", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Live writes disabled", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recorded simulator shells (0)", exact: true })).toBeVisible();
  await expect(page.getByText(/Shells provision from approved offerings/)).toHaveCount(0);
  await noOverflow(page);
});

for (const mode of ["live-test", "live-test-disabled"] as const) {
  test(`current ${mode} gate disables mapping, reconciliation and replay commands`, async ({ page }) => {
    backend = mode;
    controlsReady = false;
    await page.goto(`${webOrigin}/admin/moodle/mappings`);
    await expect(page.getByRole("status", { name: "Live writes disabled", exact: true })).toBeVisible();
    for (const name of ["Draft mapping", "Run synthetic test", "Activate mapping"])
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Test connection", exact: true })).toBeEnabled();
    await page.goto(`${webOrigin}/admin/integration/reconciliation`);
    for (const name of ["Run reconciliation", "Resolve case"])
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    await page.goto(`${webOrigin}/admin/integration`);
    await expect(page.getByRole("button", { name: "Request replay", exact: true })).toBeDisabled();
    // These controls own local safety records; live deferral does not prevent
    // an operator pausing delivery or logging an incident.
    await expect(page.getByRole("button", { name: "Pause delivery", exact: true })).toBeEnabled();
    await page.goto(`${webOrigin}/admin/integration/replays/${replayId}`);
    for (const name of ["Approve replay", "Decline replay"])
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  });
}

test("ordinary successful mapping response retains its existing confirmation", async ({ page }) => {
  await page.route(`${webOrigin}/api/integration/mappings`, (route) => route.fulfill({
    status: 201, contentType: "application/json",
    body: JSON.stringify({ id: "synthetic-success", status: "DRAFT" }),
  }));
  await page.goto(`${webOrigin}/admin/moodle/mappings`);
  const form = page.getByRole("form", { name: "Draft Moodle mapping" });
  await form.getByLabel("Kind").selectOption("SHELL");
  await form.getByLabel("SIS type").fill("OFFERING");
  await form.getByLabel("SIS identifier").fill("FICTIONAL-SWE:2026S1");
  await form.getByLabel("Moodle identifier").fill("synthetic-shell-42");
  await form.getByRole("button", { name: "Draft mapping", exact: true }).click();
  await expect(page.getByRole("status", { name: "Done", exact: true })).toContainText("Mapping drafted.");
  await expect(form.getByLabel("SIS identifier")).toHaveValue("");
});

test("missing write-readiness projection keeps history and disables commands", async ({ page }) => {
  readinessKnown = false;
  await page.goto(`${webOrigin}/admin/moodle/mappings`);
  await expect(page.getByRole("alert", { name: "Readiness unavailable", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draft mapping", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Test connection", exact: true })).toBeEnabled();
  await page.goto(`${webOrigin}/admin/integration/reconciliation`);
  await expect(page.getByRole("button", { name: "Run reconciliation", exact: true })).toBeDisabled();
  await expect(page.getByRole("listitem").filter({ hasText: caseId })).toContainText("OPEN");
  await page.goto(`${webOrigin}/admin/integration/replays/${replayId}`);
  await expect(page.getByRole("button", { name: "Approve replay", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Replay decision · PENDING", exact: true })).toBeVisible();
});

test("unavailable registration status never invites a second registration", async ({ page }) => {
  registrationStatusUnavailable = true;
  await page.goto(`${webOrigin}/student/register`);
  await expect(page.getByRole("alert", { name: "Registration status unavailable", exact: true }))
    .toContainText("Check your status before submitting again.");
  await expect(page.getByRole("status", { name: "Registration completed", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /register|submit registration/i })).toHaveCount(0);
});

test("truncated waiting queue pages ten sources without delivery actions", async ({ page }) => {
  controlsReady = false;
  largeSourceQueue = true;
  await page.goto(`${webOrigin}/admin/integration`);
  const list = page.getByRole("list", { name: "Waiting Moodle events", exact: true });
  const pages = page.getByRole("navigation", { name: "Waiting event pages", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("status", { name: "Waiting event range", exact: true })).toHaveText("1–10 of 100 shown");
  await expect(page.getByText("More waiting events are not shown.", { exact: true })).toBeVisible();
  await expect(pages.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await expect(list.getByRole("link")).toHaveCount(0);
  await expect(list.getByRole("button")).toHaveCount(0);
  await pages.getByRole("button", { name: "Next", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("status", { name: "Waiting event range", exact: true })).toHaveText("11–20 of 100 shown");
  await expect(list.getByText(/00000000-0000-4000-8000-000000000111/)).toBeVisible();
  await expect(list.getByText(new RegExp(sourceId))).toHaveCount(0);
  await pages.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(list.getByText(new RegExp(sourceId))).toBeVisible();
  await expect(page.getByRole("status", { name: "Waiting event range", exact: true })).toHaveText("1–10 of 100 shown");
  await expect(page.getByText(/00000000-0000-4000-8000-000000000201/)).toHaveCount(0);
  await noOverflow(page);
});
