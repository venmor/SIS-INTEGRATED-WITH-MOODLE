import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CoursePlanView } from "@sis/contracts";

// Actual Next review components and proxy, backed by a loopback fixture.
// No database, provider, credentials or official registration are touched.
const webOrigin = "http://127.0.0.1:3180";
const apiOrigin = "http://127.0.0.1:3181";
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const attemptId = "00000000-0000-4000-8000-000000000191";
const period = "DEMO-2026-REGISTRATION";
const context = `attemptId=${attemptId}&period=${period}`;
let api: Server | undefined;
let web: ChildProcess | undefined;
let startupLog = "";
let scenario: "empty" | "blocked" | "approval" | "load" | "valid" = "valid";
let manyCourses = false;
let registered = false;
let statusUnavailable = false;
let submissionFailure = false;
const submits: Array<{ query: string; body: Record<string, unknown> }> = [];
const calls: string[] = [];

function plan(): CoursePlanView {
  const items = ["SWE111", "MTH111"].map((code, index) => ({
    courseId: `00000000-0000-4000-8000-00000000019${index + 2}`,
    code,
    title: code === "SWE111" ? "Programming Fundamentals" : "Discrete Mathematics",
    credits: 15,
    courseType: "half",
    semester: "S1",
    required: true,
    capacity: 40,
    seatsRemaining: null,
    prerequisites: [],
  }));
  return {
    planId: scenario === "empty" ? null : "00000000-0000-4000-8000-000000000194",
    attemptId,
    period,
    version: scenario === "empty" ? 0 : 3,
    status: scenario === "empty" ? "NONE" : "DRAFT",
    items: scenario === "empty" ? [] : items,
    available: manyCourses ? [...items, ...Array.from({ length: 24 }, (_, index) => ({ ...items[0], courseId: `00000000-0000-4000-8000-${String(index+300).padStart(12, "0")}`, code: `CSC${100 + index}`, title: `Computing subject ${index+1}`, credits: index % 2 ? 30 : 15 }))] : scenario === "empty" ? items : [],
    validation: scenario === "blocked"
      ? [
          { courseId: items[0].courseId, code: "SWE121", result: "BLOCK", resultCode: "PREREQ_UNMET", explanation: "Requires SWE111 (no completed result on record)." },
          { courseId: items[1].courseId, code: "BUS112", result: "BLOCK", resultCode: "CAPACITY_FULL", explanation: "This course is full. Choose an alternative or contact the registry." },
        ]
      : scenario === "approval"
        ? [{ courseId: items[0].courseId, code: "SWE111", result: "APPROVAL_REQUIRED", resultCode: "ACADEMIC_REVIEW", explanation: "An academic decision is required before registration." }]
        : [],
    loadHalves: scenario === "empty" ? 0 : scenario === "load" ? 8 : 2,
    notices: [],
  };
}

function receipt() {
  return {
    id: "00000000-0000-4000-8000-000000000195",
    receipt: "REG-2026-FIXTURE",
    attemptId,
    period,
    version: 1,
    status: "REGISTERED",
    courses: plan().items,
    loadHalves: 2,
    clearance: "CLEARED",
    decidedAt: "2026-10-12T09:00:00.000Z",
  };
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
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once("error", fail);
    probe.listen(3180, "127.0.0.1", () => probe.close(() => done()));
  });
  api = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", apiOrigin);
    calls.push(`${request.method} ${url.pathname}${url.search}`);
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && url.pathname === "/auth/me") {
      response.end(JSON.stringify({ account: { accountId: "00000000-0000-4000-8000-000000000196" }, activeWorkspace: { role: "STUDENT" } }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/plan") {
      response.end(JSON.stringify(plan()));
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/readiness") {
      response.end(JSON.stringify({ attemptId, period, overall: "AWAITING_STUDENT_INPUT", assessedAt: "2026-10-12T09:00:00.000Z", pendingRegulations: [], conditions: [
        { key: "selection", label: "Course selection", status: "BLOCKED", owner: "Student", next: "Save your course selection.", detail: "No saved course plan is available." },
        { key: "clearance", label: "Financial clearance", status: "READY", owner: "Student Finance", next: "No action needed.", detail: "Clearance has been confirmed for this period." },
      ] }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/catalogue/programmes") {
      response.end(JSON.stringify({ items: [], total: 0, skip: 0, take: 10 }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/catalogue/routes") {
      response.end(JSON.stringify({ routes: [] }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/status") {
      if (statusUnavailable) {
        response.writeHead(503).end(JSON.stringify({ message: "The current registration cannot be checked." }));
        return;
      }
      response.end(JSON.stringify({ registration: registered ? receipt() : null, amendments: [], moodle: { state: "NOT_PROVISIONED", detail: "Registration remains valid while Moodle access is prepared." } }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/registration/submit") {
      let raw = "";
      for await (const chunk of request) raw += String(chunk);
      submits.push({ query: url.search, body: JSON.parse(raw) });
      if (submissionFailure) {
        response.writeHead(503).end(JSON.stringify({ message: "The result cannot be confirmed." }));
        return;
      }
      registered = true;
      response.end(JSON.stringify(receipt()));
      return;
    }
    response.writeHead(404).end(JSON.stringify({ message: "Unknown fixture request." }));
  });
  await new Promise<void>((done, fail) => { api!.once("error", fail); api!.listen(3181, "127.0.0.1", done); });
  web = spawn(process.execPath, [resolve(workspace, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3180"], {
    cwd: resolve(workspace, "apps/web"),
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1", API_INTERNAL_URL: apiOrigin, SIS_NEXT_DIST_DIR: ".next-registration-review-browser" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const output of [web.stdout, web.stderr]) output?.on("data", (chunk: Buffer) => { startupLog = (startupLog + chunk.toString()).slice(-12000); });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (web.exitCode !== null) throw new Error(`Owned Next fixture exited: ${startupLog}`);
    try { if ((await fetch(`${webOrigin}/sign-in`, { signal: AbortSignal.timeout(3000) })).ok) return; } catch { /* Owned server is starting. */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Owned Next fixture did not start: ${startupLog}`);
});
test.afterAll(async () => {
  await stopWeb();
  if (api) { api.closeAllConnections(); await new Promise<void>((done) => api!.close(() => done())); }
});
test.beforeEach(async ({ page }) => {
  scenario = "valid"; manyCourses = false; registered = false; statusUnavailable = false; submissionFailure = false;
  submits.length = 0; calls.length = 0;
  await page.context().addCookies([{ name: "sid", value: "synthetic-rendering-only", url: webOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
});
async function openReview(page: Page) {
  await page.goto(`${webOrigin}/student/register?${context}`);
  await expect(page.getByRole("heading", { name: "Review registration", exact: true })).toBeVisible();
}
async function declarations(page: Page) {
  const group = page.getByRole("group", { name: "Registration declarations (all required)" });
  for (const checkbox of await group.getByRole("checkbox").all()) await checkbox.check();
}

test("an unsaved empty plan names the next step and never offers formal submission", async ({ page }) => {
  scenario = "empty";
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Choose your courses first" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan your courses", exact: true })).toHaveAttribute("href", `/student/courses?${context}`);
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("all known course blocks remain visible with an edit route and no submit", async ({ page }) => {
  scenario = "blocked";
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Fix your course plan" })).toBeVisible();
  await expect(page.getByText(/Requires SWE111/)).toBeVisible();
  await expect(page.getByText(/This course is full/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit course plan", exact: true })).toHaveAttribute("href", `/student/courses?${context}`);
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("an academic approval requirement prevents submission without inventing an override", async ({ page }) => {
  scenario = "approval";
  await openReview(page);
  await expect(page.getByText("An academic decision is required before registration.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("an excessive saved load explains the configured limit before declarations", async ({ page }) => {
  scenario = "load";
  await openReview(page);
  await expect(page.getByRole("region", { name: "Planned courses" })).toContainText("8 half-course equivalents");
  await expect(page.getByRole("region", { name: "Before you submit" })).toContainText("choose 2 to 6 half-course equivalents");
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("valid review waits for every declaration and submits its exact context and reviewed version", async ({ page }) => {
  await openReview(page);
  const submit = page.getByRole("button", { name: "Submit registration", exact: true });
  await expect(submit).toBeDisabled();
  await declarations(page);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/REG-2026-FIXTURE/)).toBeVisible();
  expect(submits).toHaveLength(1);
  expect(new URLSearchParams(submits[0].query).get("attemptId")).toBe(attemptId);
  expect(new URLSearchParams(submits[0].query).get("period")).toBe(period);
  expect(submits[0].body.version).toBe(3);
  expect(submits[0].body.declarations).toEqual(["PLAN_ACCURATE", "RULES_UNDERSTOOD", "FINANCE_UNDERSTOOD"]);
  await expect(page.getByRole("link", { name: "View timetable", exact: true })).toHaveAttribute("href", `/student/timetable?${context}`);
});

test("failed status lookup never enables a new formal submission", async ({ page }) => {
  statusUnavailable = true;
  await openReview(page);
  await expect(page.getByRole("alert", { name: "Registration status unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("uncertain completion checks status and reuses the original command after a checked null result", async ({ page }) => {
  submissionFailure = true;
  await openReview(page);
  await declarations(page);
  await page.getByRole("button", { name: "Submit registration", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Registration confirmation pending" })).toBeVisible();
  expect(submits).toHaveLength(1);
  const original = submits[0];
  await expect(page.getByRole("button", { name: "Submit registration", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Check registration status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry same submission", exact: true })).toBeVisible();
  submissionFailure = false;
  await page.getByRole("button", { name: "Retry same submission", exact: true }).click();
  await expect(page.getByText(/REG-2026-FIXTURE/)).toBeVisible();
  expect(submits).toEqual([original, original]);
});

test("a lost successful response resolves from status without another submit", async ({ page }) => {
  await openReview(page);
  await declarations(page);
  await page.route("**/api/registration/submit?*", async (route) => { await route.fetch(); await route.abort("failed"); });
  await page.getByRole("button", { name: "Submit registration", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Registration confirmation pending" })).toBeVisible();
  await page.getByRole("button", { name: "Check registration status", exact: true }).click();
  await expect(page.getByText(/REG-2026-FIXTURE/)).toBeVisible();
  expect(submits).toHaveLength(1);
});

test("an uncertain submission survives reload with its original idempotency key", async ({ page }) => {
  submissionFailure = true;
  await openReview(page);
  await declarations(page);
  await page.getByRole("button", { name: "Submit registration", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Registration confirmation pending" })).toBeVisible();
  const original = submits[0];
  page.on("dialog", dialog => void dialog.accept());
  await page.reload();
  await expect(page.getByRole("alert", { name: "Registration confirmation pending" })).toBeVisible();
  await page.getByRole("button", { name: "Check registration status", exact: true }).click();
  submissionFailure = false;
  await page.getByRole("button", { name: "Retry same submission", exact: true }).click();
  await expect(page.getByText(/REG-2026-FIXTURE/)).toBeVisible();
  expect(submits).toEqual([original, original]);
});


test("course inventory search sorting and paging preserve selections", async ({ page }) => {
  manyCourses = true;
  await page.goto(`${webOrigin}/student/courses?${context}`);
  const section = page.getByRole("region", { name: "Required courses", exact: true });
  await expect(section.getByRole("status")).toHaveText("Showing 1–10 of 26");
  await section.getByRole("button", { name: "Next required courses" }).click();
  await section.getByRole("checkbox", { name: "CSC110 — Computing subject 11", exact: true }).check();
  await section.getByRole("searchbox", { name: "Search required courses" }).fill("CSC110");
  await expect(section.getByRole("checkbox", { name: "CSC110 — Computing subject 11", exact: true })).toBeChecked();
  await expect(section.getByRole("status")).toHaveText("Showing 1–1 of 1");
  await section.getByRole("searchbox", { name: "Search required courses" }).fill("");
  await section.getByRole("combobox", { name: "Sort required courses" }).selectOption("title");
  await section.getByRole("searchbox", { name: "Search required courses" }).fill("CSC110");
  await expect(section.getByRole("checkbox", { name: "CSC110 — Computing subject 11", exact: true })).toBeChecked();
  const summary = page.getByRole("region", { name: "Course plan summary" });
  await expect(summary).toContainText("3 courses");
  await expect(summary).toContainText("Unsaved changes");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(submits).toEqual([]);
});

test("registration location steps retain exact context without claiming prior completion", async ({ page }) => {
  await openReview(page);
  const steps = page.getByRole("navigation", { name: "Registration steps" });
  await expect(steps.getByRole("link", { name: "Review and submit" })).toHaveAttribute("aria-current", "step");
  await expect(steps.getByRole("link", { name: "Choose courses" })).toHaveAttribute("href", `/student/courses?${context}`);
  await expect(page.getByRole("table")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("entry and readiness layouts reflow with keyboard-accessible detail and real next actions", async ({ page }, testInfo) => {
  // Six page loads include cold Next compilation and two viewport sizes.
  test.setTimeout(120000);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${webOrigin}/sign-in`);
    await expect(page.getByRole("heading", { name: "Sign in to the SIS" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Account sign-in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore programmes", exact: true })).toHaveAttribute("href", "/discover");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`sign-in-${width}.png`), fullPage: true });
    await page.goto(`${webOrigin}/discover`);
    await expect(page.getByRole("list", { name: "Application journey" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`discover-${width}.png`), fullPage: true });
    await page.goto(`${webOrigin}/student/readiness?${context}`);
    await expect(page.getByRole("heading", { name: "Course selection", exact: true })).toBeVisible();
    await expect(page.getByText("Save your course selection.")).toBeVisible();
    await expect(page.getByText("No saved course plan is available.")).not.toBeVisible();
    const detail = page.locator("summary").filter({ hasText: "Check details" }).first();
    await detail.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("No saved course plan is available.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan your courses", exact: true })).toHaveAttribute("href", `/student/courses?${context}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`readiness-${width}.png`), fullPage: true });
  }
  expect(submits).toEqual([]);
});
