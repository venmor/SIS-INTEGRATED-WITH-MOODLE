import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CoursePlanView,
  ReadinessView,
  RegistrationReceiptView,
  StudentResultsView,
} from "@sis/contracts";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const webOrigin = "http://127.0.0.1:3184";
const apiOrigin = "http://127.0.0.1:3185";
const attemptId = "00000000-0000-4000-8000-000000000184";
const context = `?attemptId=${attemptId}&period=DEMO-2026`;
let api: Server | undefined;
let web: ChildProcess | undefined;
let startupLog = "";
let mode:
  | "normal"
  | "registered"
  | "blocked"
  | "status-error"
  | "results-error"
  | "results-empty"
  | "save-error"
  | "expired-plan"
  | "expired-status"
  | "registered-hold"
  | "readiness-incomplete"
  | "readiness-expired"
  | "readiness-error"
  | "readiness-mismatched"
  | "submit-uncertain" = "normal";
let submitted: Record<string, unknown>[] = [];
let savedCodes: string[] = ["CSC001", "CSC002"];
const courses = Array.from({ length: 14 }, (_, index) => ({
  courseId: `fictional-course-${index + 1}`,
  code: `CSC${String(index + 1).padStart(3, "0")}`,
  title: `Fictional computing course ${index + 1}`,
  credits: 3,
  courseType: "HALF",
  semester: "S1",
  required: index < 12,
  capacity: 40,
  seatsRemaining: 20,
  prerequisites: [],
}));
function plan(): CoursePlanView {
  return {
    planId: "fictional-plan",
    attemptId,
    period: "DEMO-2026",
    version: 2,
    status: "DRAFT",
    items: courses.filter((course) => savedCodes.includes(course.code)),
    available: courses,
    validation:
      mode === "blocked"
        ? [
            {
              courseId: courses[0].courseId,
              code: "CSC001",
              result: "BLOCK",
              resultCode: "PREREQUISITE",
              explanation:
                "Complete the required prerequisite before registering CSC001.",
            },
          ]
        : [],
    loadHalves: savedCodes.length,
    notices: [],
  };
}
const receipt: RegistrationReceiptView = {
  id: "fictional-registration",
  receipt: "REG-FICTIONAL-184",
  attemptId,
  period: "DEMO-2026",
  version: 2,
  status: "REGISTERED",
  courses: courses.slice(0, 2),
  loadHalves: 2,
  clearance: "CLEARED",
  decidedAt: "2026-10-16T08:15:00.000Z",
};
function readiness(): ReadinessView {
  const completed = [
    "registered",
    "registered-hold",
    "readiness-mismatched",
  ].includes(mode);
  return {
    attemptId,
    period: "DEMO-2026",
    overall: completed ? "REGISTERED" : "AWAITING_STUDENT_INPUT",
    assessedAt: "2026-10-16T09:00:00.000Z",
    pendingRegulations: [],
    registration: completed
      ? {
          ...receipt,
          attemptId:
            mode === "readiness-mismatched"
              ? "00000000-0000-4000-8000-000000000999"
              : attemptId,
        }
      : null,
    conditions: [
      {
        key: "record-active",
        label: "Student record active",
        status: "READY",
        owner: "Registry",
        detail: "The student record is active.",
        next: "No action needed.",
      },
      {
        key: "programme-intake",
        label: "Programme and intake",
        status: "READY",
        owner: "Registry",
        detail: "Fictional computing programme · 2026.",
        next: "No action needed.",
      },
      {
        key: "period-open",
        label: "Registration period open",
        status: completed ? "NOT_APPLICABLE" : "READY",
        owner: "Registry",
        detail: completed
          ? "Registration is already complete for this period."
          : "This period is open.",
        next: completed
          ? "View your receipt or timetable. Later changes follow the course-change process."
          : "No action needed.",
      },
      {
        key: "progression",
        label: "Progression available",
        status: "READY",
        owner: "Admissions",
        detail: "First registration; no prior outcomes.",
        next: "No action needed.",
      },
      {
        key: "clearance",
        label: "Financial clearance",
        status: "READY",
        owner: "Finance",
        detail: "Clearance has been confirmed for this period.",
        next: "No action needed.",
      },
      {
        key: "programme-conditions",
        label: "Programme conditions",
        status: "READY",
        owner: "Admissions",
        detail: "No outstanding programme conditions.",
        next: "No action needed.",
      },
      {
        key: "holds-clear",
        label: "No blocking holds",
        status: mode === "registered-hold" ? "BLOCKED" : "READY",
        owner: "Registry",
        detail:
          mode === "registered-hold"
            ? "A current hold applies to later course changes."
            : "No active holds.",
        next:
          mode === "registered-hold"
            ? "Contact Registry about the current hold."
            : "No action needed.",
      },
      {
        key: "selection-complete",
        label: "Course selection complete",
        status: completed
          ? "COMPLETE"
          : mode === "readiness-incomplete"
            ? "ACTION_REQUIRED"
            : "READY",
        owner: "Student",
        detail: completed
          ? `Courses are recorded on receipt ${receipt.receipt}.`
          : mode === "readiness-incomplete"
            ? "CSC001: Complete the required prerequisite before registration."
            : "2 courses saved, version 2. Current course and load checks pass.",
        next: completed
          ? "View your registration receipt."
          : mode === "readiness-incomplete"
            ? "Open your course plan and resolve the listed checks."
            : "Review your saved courses and accept the declarations.",
      },
      {
        key: "declarations",
        label: "Registration declarations accepted",
        status: completed ? "COMPLETE" : "ACTION_REQUIRED",
        owner: "Student",
        detail: completed
          ? "Accepted declarations are preserved with the completed registration."
          : "Declarations are accepted with formal submission, separately from saving the course plan.",
        next: completed
          ? "No new declaration is needed to view this registration."
          : "Review and accept declarations when submitting.",
      },
    ],
  };
}
function results(): StudentResultsView {
  return {
    notices: [],
    items: Array.from({ length: 13 }, (_, index) => ({
      courseCode: `RES${String(index + 1).padStart(3, "0")}`,
      courseTitle: `Fictional released course ${index + 1}`,
      courseType: index === 0 ? "EXTENDED" : "HALF",
      periodCode: index < 11 ? "2026S1" : "2025S2",
      mark: index === 0 ? null : 60,
      outcome: index === 0 ? "IN_PROGRESS" : "PASSED",
      version: 2,
      publishedAt: `2026-10-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      progressionReadiness: index === 0 ? "REVIEW_REQUIRED" : "NOT_EVALUATED",
      reviewInstructions:
        "Contact the examinations office under the published review process.",
      history: [
        {
          version: 2,
          mark: index === 0 ? null : 60,
          outcome: index === 0 ? "IN_PROGRESS" : "PASSED",
          publishedAt: "2026-10-13T08:00:00.000Z",
        },
        {
          version: 1,
          mark: null,
          outcome: "DEFERRED",
          publishedAt: "2026-10-01T08:00:00.000Z",
        },
      ],
    })),
  };
}

test.beforeAll(async () => {
  test.setTimeout(120000);
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once("error", fail);
    probe.listen(3184, "127.0.0.1", () => probe.close(() => done()));
  });
  api = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    const url = new URL(request.url ?? "/", apiOrigin);
    const send = (data: unknown) => response.end(JSON.stringify(data));
    if (url.pathname === "/auth/me")
      return send({
        account: { displayName: "Fictional study student" },
        activeWorkspace: { role: "STUDENT" },
      });
    if (url.pathname === "/registration/contexts")
      return send({
        source: "OWN_REGISTRATION_CONTEXTS",
        checkedAt: "2026-10-16T08:00:00.000Z",
        configuredPeriod: { code: "DEMO-2026" },
        items: [],
        soleRegisteredContext: null,
        nextCursor: null,
      });
    if (url.pathname === "/registration/readiness") {
      if (mode === "readiness-expired")
        return response
          .writeHead(401)
          .end(JSON.stringify({ message: "Session expired." }));
      if (mode === "readiness-error")
        return response.writeHead(503).end(
          JSON.stringify({
            message: "Readiness cannot be checked right now.",
          }),
        );
      return send(readiness());
    }
    if (url.pathname === "/registration/plan") {
      if (mode === "expired-plan")
        return response
          .writeHead(401)
          .end(JSON.stringify({ message: "Session expired." }));
      if (request.method === "POST") {
        if (mode === "save-error")
          return response.writeHead(503).end(
            JSON.stringify({
              message:
                "The saved result could not be confirmed. Check the current plan before retrying.",
            }),
          );
        let body = "";
        for await (const chunk of request) body += chunk;
        savedCodes = (JSON.parse(body) as { courseCodes: string[] })
          .courseCodes;
      }
      return send(plan());
    }
    if (url.pathname === "/registration/status") {
      if (mode === "expired-status")
        return response
          .writeHead(401)
          .end(JSON.stringify({ message: "Session expired." }));
      if (mode === "status-error")
        return response
          .writeHead(503)
          .end(JSON.stringify({ message: "Status cannot be checked." }));
      return send({
        registration: mode === "registered" ? receipt : null,
        amendments: [],
        moodle: {
          state: "NOT_PROVISIONED",
          detail:
            "Registration remains valid while learning access is prepared.",
        },
      });
    }
    if (url.pathname === "/registration/submit") {
      let body = "";
      for await (const chunk of request) body += chunk;
      submitted.push(JSON.parse(body));
      if (mode === "submit-uncertain" && submitted.length === 1)
        return response.writeHead(503).end(
          JSON.stringify({
            message: "Registration confirmation is unavailable.",
          }),
        );
      return send(receipt);
    }
    if (url.pathname === "/assessment/me/results") {
      if (mode === "results-error") return response.writeHead(503).end("{}");
      return send(
        mode === "results-empty" ? { items: [], notices: [] } : results(),
      );
    }
    response
      .writeHead(404)
      .end(JSON.stringify({ message: "Unknown fixture request." }));
  });
  await new Promise<void>((done, fail) => {
    api!.once("error", fail);
    api!.listen(3185, "127.0.0.1", done);
  });
  web = spawn(
    process.execPath,
    [
      resolve(workspace, "node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3184",
    ],
    {
      cwd: resolve(workspace, "apps/web"),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        API_INTERNAL_URL: apiOrigin,
        SIS_NEXT_DIST_DIR: ".next-study-workflows-browser",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const output of [web.stdout, web.stderr])
    output?.on("data", (chunk: Buffer) => {
      startupLog = (startupLog + chunk.toString()).slice(-12000);
    });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (web.exitCode !== null) throw new Error(startupLog);
    try {
      if (
        (
          await fetch(`${webOrigin}/sign-in`, {
            signal: AbortSignal.timeout(3000),
          })
        ).ok
      )
        return;
    } catch {
      /* Owned server starting. */
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Owned Next fixture did not start: ${startupLog}`);
});
test.afterAll(async () => {
  if (web && web.exitCode === null && web.signalCode === null) {
    const owned = web;
    await new Promise<void>((done) => {
      const force = setTimeout(() => owned.kill("SIGKILL"), 3000);
      owned.once("exit", () => {
        clearTimeout(force);
        done();
      });
      owned.kill("SIGTERM");
    });
  }
  if (api) {
    api.closeAllConnections();
    await new Promise<void>((done) => api!.close(() => done()));
  }
});
test.beforeEach(async ({ page }) => {
  mode = "normal";
  submitted = [];
  savedCodes = ["CSC001", "CSC002"];
  await page
    .context()
    .addCookies([
      { name: "sid", value: "synthetic-rendering-only", url: webOrigin },
    ]);
});
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach("owned-next.log", {
      body: startupLog,
      contentType: "text/plain",
    });
  }
});

test("readiness preserves completed registration, resolved context and current checks after a later hold", async ({
  page,
}) => {
  mode = "registered-hold";
  await page.goto(`${webOrigin}/student/readiness`);
  await expect(
    page.getByRole("status", { name: "Registration completed", exact: true }),
  ).toBeVisible();
  const record = page.getByRole("region", { name: "Registration receipt" });
  await expect(record).toContainText("REG-FICTIONAL-184");
  await expect(record).toContainText("16 October 2026");
  await expect(
    record
      .getByText("Registered courses", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toHaveText("2");
  await expect(
    page.getByRole("link", { name: "View timetable", exact: true }),
  ).toHaveAttribute("href", `/student/timetable${context}`);
  await expect(
    page.getByRole("link", { name: "View registration receipt", exact: true }),
  ).toHaveAttribute("href", `/student/register${context}`);
  await expect(
    page
      .getByRole("navigation", { name: "Registration steps" })
      .getByRole("link", { name: "Choose courses" }),
  ).toHaveAttribute("href", `/student/courses${context}`);
  const checks = page.getByRole("list", { name: "Registration conditions" });
  await expect(checks).not.toBeVisible();
  await page
    .getByText("Current checks and next steps", { exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(checks.getByRole("listitem")).toHaveCount(9);
  await expect(checks).toContainText(
    "Contact Registry about the current hold.",
  );
  await expect(checks.getByText("Complete", { exact: true })).toHaveCount(2);
  await expect(
    checks.getByText("Not applicable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Registration completed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Plan your courses", exact: true }),
  ).toHaveCount(0);
  expect(submitted).toEqual([]);
});

test("readiness keeps all nine incomplete checks actionable and uses resolved default context", async ({
  page,
}) => {
  mode = "readiness-incomplete";
  await page.goto(`${webOrigin}/student/readiness`);
  await expect(
    page.getByRole("alert", { name: "Action needed" }),
  ).toBeVisible();
  const checks = page.getByRole("list", { name: "Registration conditions" });
  await expect(checks).toBeVisible();
  await expect(checks.getByRole("listitem")).toHaveCount(9);
  const selection = checks.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      name: "Course selection complete",
      exact: true,
    }),
  });
  await expect(selection).toContainText(
    "Open your course plan and resolve the listed checks.",
  );
  await selection.getByText("Check details", { exact: true }).click();
  await expect(selection).toContainText(
    "CSC001: Complete the required prerequisite",
  );
  await expect(
    page.getByRole("link", { name: "Plan your courses", exact: true }),
  ).toHaveAttribute("href", `/student/courses${context}`);
  await expect(
    page.getByRole("link", { name: "Review registration", exact: true }),
  ).toHaveAttribute("href", `/student/register${context}`);
  await expect(
    page.getByRole("region", { name: "Registration receipt" }),
  ).toHaveCount(0);
  expect(submitted).toEqual([]);
});

test("readiness does not show a foreign receipt as completed", async ({
  page,
}) => {
  mode = "readiness-mismatched";
  await page.goto(`${webOrigin}/student/readiness${context}`);
  await expect(
    page.getByRole("status", { name: "Registration completed", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("alert", {
      name: "Registration details unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Registration receipt" }),
  ).toHaveCount(0);
});

test("readiness redirects an expired upstream session with its exact academic return context", async ({
  page,
}) => {
  mode = "readiness-expired";
  await page.goto(`${webOrigin}/student/readiness${context}`);
  await expect(page).toHaveURL(
    `${webOrigin}/sign-in?returnTo=${encodeURIComponent(`/student/readiness${context}`)}`,
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to the SIS" }),
  ).toBeVisible();
});

test("readiness service unavailability never claims completed registration", async ({
  page,
}) => {
  mode = "readiness-error";
  await page.goto(`${webOrigin}/student/readiness${context}`);
  await expect(
    page.getByText("Readiness cannot be checked right now."),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Registration completed", exact: true }),
  ).toHaveCount(0);
});

test("readiness completed and incomplete states reflow with mobile axe and desktop evidence", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  for (const state of ["registered-hold", "readiness-incomplete"] as const) {
    mode = state;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${webOrigin}/student/readiness${context}`);
    if (state === "registered-hold") {
      await page.screenshot({
        path: testInfo.outputPath("readiness-completed-collapsed-mobile.png"),
        fullPage: true,
      });
      await page
        .getByText("Current checks and next steps", { exact: true })
        .click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`readiness-${state}-mobile.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: testInfo.outputPath(`readiness-${state}-desktop.png`),
      fullPage: true,
    });
  }
});

test("course summary distinguishes unsaved choices from saved load and retains choices across pages", async ({
  page,
}) => {
  await page.goto(`${webOrigin}/student/courses${context}`);
  const summary = page.getByRole("region", { name: "Course plan summary" });
  await expect(summary).toContainText("Last saved load");
  await page.getByRole("button", { name: "Next required courses" }).click();
  await page.getByRole("checkbox", { name: "CSC012" }).check();
  await expect(summary).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Previous required courses" }).click();
  await expect(page.getByRole("checkbox", { name: "CSC001" })).toBeChecked();
  await page.getByLabel("Search required courses").fill("CSC012");
  await expect(page.getByRole("checkbox", { name: "CSC012" })).toBeChecked();
  await page.getByRole("button", { name: "Save course plan" }).click();
  await expect(summary).toContainText("Matches saved draft");
  await expect(summary).toContainText("3 half-course equivalents");
  await expect(
    page.getByRole("link", { name: "Review registration", exact: true }),
  ).toHaveAttribute("href", `/student/register${context}`);
});

test("registration blocks on saved validation and links directly back to the plan", async ({
  page,
}) => {
  mode = "blocked";
  await page.goto(`${webOrigin}/student/register${context}`);
  const checks = page.getByRole("region", { name: "Before you submit" });
  await expect(checks).toContainText("Complete the required prerequisite");
  await expect(
    checks.getByRole("link", { name: "Edit course plan" }),
  ).toHaveAttribute("href", `/student/courses${context}`);
  await expect(
    page.getByRole("button", { name: "Submit registration", exact: true }),
  ).toHaveCount(0);
});

test("fresh and revisited registration show the same structured authoritative receipt", async ({
  page,
}) => {
  await page.goto(`${webOrigin}/student/register${context}`);
  await expect(
    page.getByRole("button", { name: "Submit registration", exact: true }),
  ).toBeDisabled();
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  const record = page.getByRole("region", { name: "Registration receipt" });
  await expect(record).toContainText("REG-FICTIONAL-184");
  await expect(record).toContainText("16 October 2026");
  await expect(record).toContainText("Registered courses");
  await expect(
    record
      .getByText("Registered courses", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toHaveText("2");
  await expect(
    record.getByRole("link", { name: "View timetable" }),
  ).toHaveAttribute("href", `/student/timetable${context}`);
  expect(submitted).toHaveLength(1);
  mode = "registered";
  await page.reload();
  await expect(record).toContainText("REG-FICTIONAL-184");
  await expect(page.getByText("Moodle access is being prepared")).toBeVisible();
});

test("unavailable registration status does not offer a new submission", async ({
  page,
}) => {
  mode = "status-error";
  await page.goto(`${webOrigin}/student/register${context}`);
  await expect(page.getByText("Registration status unavailable")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit registration", exact: true }),
  ).toHaveCount(0);
});

for (const scenario of [
  { route: "courses", mode: "expired-plan" },
  { route: "register", mode: "expired-plan" },
  { route: "register", mode: "expired-status" },
] as const) {
  test(`${scenario.route} preserves intended study context when ${scenario.mode} requires sign-in`, async ({
    page,
  }) => {
    mode = scenario.mode;
    await page.goto(`${webOrigin}/student/${scenario.route}${context}`);
    await expect(page).toHaveURL(
      `${webOrigin}/sign-in?returnTo=${encodeURIComponent(`/student/${scenario.route}${context}`)}`,
    );
    await expect(
      page.getByRole("heading", { name: "Sign in to the SIS" }),
    ).toBeVisible();
    expect(submitted).toEqual([]);
  });
}

test("a failed plan save retains current choices and the last confirmed load", async ({
  page,
}) => {
  mode = "save-error";
  await page.goto(`${webOrigin}/student/courses${context}`);
  await page.getByRole("checkbox", { name: "CSC003" }).check();
  await page.getByRole("button", { name: "Save course plan" }).click();
  await expect(page.getByText("The plan was not saved")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "CSC003" })).toBeChecked();
  const summary = page.getByRole("region", { name: "Course plan summary" });
  await expect(summary).toContainText("Unsaved changes");
  await expect(summary).toContainText("2 half-course equivalents");
});

test("uncertain registration checks status before replaying exactly the same command", async ({
  page,
}) => {
  mode = "submit-uncertain";
  await page.goto(`${webOrigin}/student/register${context}`);
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await expect(
    page.getByText("Registration confirmation pending"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry same submission" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Submit registration", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check registration status" }).click();
  await page.getByRole("button", { name: "Retry same submission" }).click();
  await expect(
    page.getByRole("region", { name: "Registration receipt" }),
  ).toContainText("REG-FICTIONAL-184");
  expect(submitted).toHaveLength(2);
  expect(submitted[1]).toEqual(submitted[0]);
});

test("results search, period and sort traverse a bounded authorised inventory with expandable history", async ({
  page,
}) => {
  await page.goto(`${webOrigin}/student/results`);
  await expect(page.getByRole("article")).toHaveCount(10);
  await expect(page.getByRole("article").first()).toContainText("RES013");
  await expect(
    page.getByText("Showing 1–10 of 13 results", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next results" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await page
    .getByLabel("Academic period", { exact: true })
    .selectOption("2026S1");
  await expect(
    page.getByText("Showing 1–10 of 11 results", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search official results").fill("RES001");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("IN PROGRESS");
  await expect(
    page.getByText("Not displayed under the release policy"),
  ).toBeVisible();
  await expect(page.getByText("Academic impact review required")).toBeVisible();
  const history = page.getByText("Published version history", { exact: true });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Version 1: DEFERRED/)).toBeVisible();
  await page.getByLabel("Search official results").fill("");
  await page.getByLabel("Academic period", { exact: true }).selectOption("");
  await page.getByLabel("Sort official results").selectOption("code");
  await expect(page.getByRole("article").first()).toContainText("RES001");
  await page.getByLabel("Search official results").fill("no match");
  await expect(page.getByText("No results match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear result filters" }).click();
  await expect(page.getByRole("article")).toHaveCount(10);
});

test("results preserve unavailable and unreleased distinctions", async ({
  page,
}) => {
  mode = "results-empty";
  await page.goto(`${webOrigin}/student/results`);
  await expect(page.getByText("No official results released")).toBeVisible();
  await expect(page.getByLabel("Search official results")).toHaveCount(0);
  mode = "results-error";
  await page.reload();
  await expect(page.getByText("Results unavailable")).toBeVisible();
  await expect(page.getByText("No official results released")).toHaveCount(0);
});

test("study workflows remain accessible without horizontal workflow scrolling on mobile", async ({
  page,
}, testInfo) => {
  // Three routes include axe, full-page and viewport captures at two sizes.
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["courses", "register", "results"]) {
    await page.goto(
      `${webOrigin}/student/${path}${path === "results" ? "" : context}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const caption of await page.locator("main table caption").all()) {
      // A block-layout table must not leave its caption in a tiny anonymous column.
      expect((await caption.boundingBox())?.width).toBeGreaterThan(200);
    }
    const audit = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${path}-mobile.png`),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`${path}-mobile-viewport.png`),
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: testInfo.outputPath(`${path}-desktop.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
