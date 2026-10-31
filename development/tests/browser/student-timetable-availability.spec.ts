import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The real page/components read the existing API contract through a local
// synthetic fixture. This proves presentation/request forwarding, not live
// authentication, registration ownership or timetable publication.
const webOrigin = "http://127.0.0.1:3170";
const apiOrigin = "http://127.0.0.1:3171";
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const attemptId = "00000000-0000-4000-8000-000000000171";
const checkedAt = "2026-10-08T08:15:00.000Z";
const pendingNote =
  "The courses below are registered. Class times, rooms and meeting links are not published yet.";
let scenario:
  | "pending"
  | "empty"
  | "unregistered"
  | "error"
  | "foreign"
  | "unexpected-published"
  | "malformed"
  | "published"
  | "empty-published"
  | "unregistered-session"
  | "foreign-change"
  | "malformed-change"
  | "wrong-attempt"
  | "wrong-period"
  | "overnight"
  | "bad-publication" = "pending";
let api: Server | undefined;
let web: ChildProcess | undefined;
let startupLog = "";
const calls: string[] = [];
const unexpectedCalls: string[] = [];
let actorAvailable = true;
let inventoryMode: "empty" | "sole" | "multiple" | "unavailable" | "paged" = "empty";
let defaultUnregistered = false;
let homeRegistrationAvailable = true;

function courseGroups() {
  return [
    {
      semester: "S1",
      courses: Array.from({ length: 12 }, (_, index) => ({
        code: `CSC${String(index + 1).padStart(3, "0")}`,
        title: `Fictional computing course ${index + 1}`,
      })),
    },
    {
      semester: "S2",
      courses: Array.from({ length: 11 }, (_, index) => ({
        code: `MAT${String(index + 1).padStart(3, "0")}`,
        title: `Fictional mathematics course ${index + 1}`,
      })),
    },
  ];
}

function publishedSessions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date =
      index < 12
        ? ["2026-10-05", "2026-10-06", "2026-10-07"][Math.floor(index / 4)]
        : "2026-10-12";
    const hour = 6 + (index < 12 ? index % 4 : index - 12) * 2;
    const course = index < 12 ? index + 1 : index - 11;
    return {
      id: `fictional-session-${index + 1}`,
      courseCode: `CSC${String(course).padStart(3, "0")}`,
      courseTitle: `Fictional computing course ${course}`,
      sectionCode: "FICTIONAL-SECTION-A",
      campusCode: "FICTIONAL-CAMPUS",
      venueCode: "FICTIONAL-LT1",
      teacherName: "Fictional lecturer",
      deliveryMode: "IN_PERSON",
      activityType: "Teaching session",
      startAt: `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`,
      endAt: `${date}T${String(hour + 2).padStart(2, "0")}:00:00.000Z`,
    };
  });
}

async function stopWeb() {
  if (!web || web.exitCode !== null || web.signalCode !== null) return;
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

test.beforeAll(async () => {
  test.setTimeout(120000);
  // Refuse occupied ports; never reuse or stop another review server.
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once("error", fail);
    probe.listen(3170, "127.0.0.1", () => probe.close(() => done()));
  });
  api = createServer((request, response) => {
    const url = new URL(request.url ?? "/", apiOrigin);
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && url.pathname === "/records/me/home") {
      response.end(
        JSON.stringify({
          studentNumber: "2026-FICTIONAL",
          status: "ACTIVE",
          displayName: "Private fictional student name",
          programmeName: "Fictional computing programme",
          intake: "2026",
          campus: "Fictional campus",
          studyMode: "Full-time",
          period: "2026S1",
          registrationOpensAt: null,
          registrationClosesAt: null,
          onboardingRequiredTotal: 3,
          onboardingRequiredComplete: 2,
          pendingCorrections: 0,
        }),
      );
      return;
    }
    if (
      request.method === "GET" &&
      url.pathname === "/records/me/corrections"
    ) {
      response.end(JSON.stringify({ items: [] }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/status") {
      if (!homeRegistrationAvailable)
        response
          .writeHead(503)
          .end(
            JSON.stringify({
              message: "Registration status cannot be checked.",
            }),
          );
      else
        response.end(
          JSON.stringify({
            registration: null,
            amendments: [],
            moodle: {
              state: "NotAvailable",
              detail: "Formal registration is required.",
            },
          }),
        );
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/readiness") {
      response.writeHead(503).end(JSON.stringify({ message: "Readiness cannot be checked." }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/notifications/records/mine") {
      response.end(JSON.stringify({ items: [], nextCursor: null }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/registration/contexts") {
      if (inventoryMode === "unavailable") {
        response.writeHead(503).end(JSON.stringify({ message: "Study periods cannot be checked." }));
        return;
      }
      const item = (period: string) => ({ attemptId, period, programmeCode: "CSC", programmeName: "Computing", intake: "2026", periodName: null, startDate: null, endDate: null, configuredCurrent: false, attemptStatus: "ACTIVE", registrationStatus: "REGISTERED" });
      response.end(JSON.stringify({ source: "OWN_REGISTRATION_CONTEXTS", checkedAt, configuredPeriod: { code: "2026S1" },
        items: inventoryMode === "empty" ? [] : inventoryMode === "paged" && !url.searchParams.has("cursor") ? [] : inventoryMode === "sole" ? [item("DEMO-PUBLISHED")] : [item("DEMO-PUBLISHED"), item("DEMO-OTHER")],
        soleRegisteredContext: inventoryMode === "sole" ? { attemptId, period: "DEMO-PUBLISHED" } : null,
        nextCursor: inventoryMode === "paged" && !url.searchParams.has("cursor") ? "owned-signed-cursor" : null,
      }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/auth/me") {
      if (!actorAvailable) {
        response
          .writeHead(503)
          .end(JSON.stringify({ message: "Identity cannot be checked." }));
        return;
      }
      response.end(
        JSON.stringify({
          account: {
            accountId: request.headers.cookie?.includes("synthetic-other-actor")
              ? "00000000-0000-4000-8000-000000000182"
              : "00000000-0000-4000-8000-000000000181",
            displayName: "Private fictional student name",
          },
          activeWorkspace: { role: "STUDENT" },
        }),
      );
      return;
    }
    // The student workspace renders the learner's own Moodle access panel, so
    // this own-student read is part of the presentation surface. It is allowed
    // explicitly and stays empty: every other call still trips the assertion in
    // afterEach, which is what keeps the fixture proving where the page's facts
    // come from.
    if (request.method === "GET" && url.pathname === "/moodle/my-access") {
      response.end(JSON.stringify({ items: [] }));
      return;
    }
    if (
      request.method !== "GET" ||
      url.pathname !== "/registration/timetable"
    ) {
      unexpectedCalls.push(`${request.method} ${url.pathname}`);
      response
        .writeHead(404)
        .end(JSON.stringify({ message: "Unknown synthetic fixture request." }));
      return;
    }
    calls.push(url.pathname + url.search);
    if (scenario === "unregistered" || (defaultUnregistered && !url.searchParams.size)) {
      response.writeHead(404).end(
        JSON.stringify({
          code: "TIMETABLE_NOT_AVAILABLE",
          message: "Complete registration first.",
        }),
      );
      return;
    }
    if (scenario === "foreign") {
      response.writeHead(404).end(
        JSON.stringify({
          code: "NOT_FOUND",
          message: "Programme attempt not found.",
        }),
      );
      return;
    }
    if (scenario === "error") {
      response.writeHead(503).end(
        JSON.stringify({
          message: "The timetable service cannot be checked right now.",
        }),
      );
      return;
    }
    const published = [
      "published",
      "empty-published",
      "unregistered-session",
      "foreign-change",
      "malformed-change",
      "wrong-attempt",
      "wrong-period",
      "overnight",
      "bad-publication",
    ].includes(scenario);
    response.end(
      JSON.stringify({
        attemptId: scenario === "wrong-attempt" ? "another-attempt" : attemptId,
        period:
          scenario === "wrong-period"
            ? "another-period"
            : (url.searchParams.get("period") ?? "2026S1"),
        publicationStatus: published
          ? "FICTIONAL_PUBLISHED"
          : scenario === "unexpected-published"
            ? "PUBLISHED"
            : "AWAITING_PUBLICATION",
        checkedAt,
        note: published
          ? "This timetable is for a fictional university rehearsal."
          : pendingNote,
        groups:
          scenario === "empty"
            ? []
            : scenario === "malformed"
              ? null
              : courseGroups(),
        ...(published
          ? {
              publication: {
                id: "00000000-0000-4000-8000-000000000172",
                version: 2,
                previousVersion: 1,
                masterVersion: 4,
                contentDigest: "a".repeat(64),
                publishedAt:
                  scenario === "bad-publication"
                    ? "not-a-date"
                    : "2026-10-07T07:30:00.000Z",
              },
              sessions:
                scenario === "empty-published"
                  ? []
                  : scenario === "unregistered-session"
                    ? [
                        {
                          ...publishedSessions()[0],
                          courseCode: "LEAK101",
                          venueCode: "UNREGISTERED-ROOM",
                        },
                      ]
                    : scenario === "overnight"
                      ? [
                          {
                            ...publishedSessions()[0],
                            startAt: "2026-10-05T21:00:00.000Z",
                            endAt: "2026-10-05T23:00:00.000Z",
                          },
                        ]
                      : publishedSessions(),
              changes: [
                {
                  kind: "CHANGED",
                  sessionId: "fictional-session-1",
                  before: {
                    ...publishedSessions()[0],
                    courseCode:
                      scenario === "foreign-change" ? "LEAK101" : "CSC001",
                    venueCode: "PREVIOUS-LT2",
                  },
                  after:
                    scenario === "malformed-change"
                      ? null
                      : scenario === "overnight"
                        ? {
                            ...publishedSessions()[0],
                            startAt: "2026-10-05T21:00:00.000Z",
                            endAt: "2026-10-05T23:00:00.000Z",
                          }
                        : publishedSessions()[0],
                },
                {
                  kind: "REMOVED",
                  sessionId: "removed-session-1",
                  before: {
                    ...publishedSessions()[1],
                    id: "removed-session-1",
                    venueCode: "REMOVED-LT3",
                  },
                  after: null,
                },
              ],
            }
          : {}),
        // Unknown fields must never fabricate a published schedule in this page.
        ...(scenario === "unexpected-published"
          ? { sessions: [{ courseCode: "LEAK101", venueCode: "DEMO-HALL" }] }
          : {}),
      }),
    );
  });
  await new Promise<void>((done, fail) => {
    api!.once("error", fail);
    api!.listen(3171, "127.0.0.1", done);
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
      "3170",
    ],
    {
      cwd: resolve(workspace, "apps/web"),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        API_INTERNAL_URL: apiOrigin,
        SIS_NEXT_DIST_DIR: ".next-student-timetable-browser",
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
    if (web.exitCode !== null)
      throw new Error(`Owned Next fixture exited: ${startupLog}`);
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
      /* The owned server is starting. */
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Owned Next fixture did not start: ${startupLog}`);
});

test.afterAll(async () => {
  await stopWeb();
  if (api) {
    api.closeAllConnections();
    await new Promise<void>((done) => api!.close(() => done()));
  }
});

test.beforeEach(async ({ page }) => {
  scenario = "pending";
  actorAvailable = true;
  inventoryMode = "empty";
  defaultUnregistered = false;
  homeRegistrationAvailable = true;
  calls.length = 0;
  unexpectedCalls.length = 0;
  await page
    .context()
    .addCookies([
      { name: "sid", value: "synthetic-rendering-only", url: webOrigin },
    ]);
  await page.setViewportSize({ width: 390, height: 844 });
});

test.afterEach(() => {
  expect(
    unexpectedCalls,
    "Only the explicit own-student presentation GETs may reach the fixture",
  ).toEqual([]);
});

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function openConfirmedTimetable(page: Page) {
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(page).toHaveURL(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S1`,
  );
  // The streamed default-context redirect can expose the final HTML before
  // client hydration. Wait for its existing confirmed-read effect before
  // sending keyboard/filter actions; do not replace readiness with a sleep.
  await expect
    .poll(() => page.evaluate(() => Object.values(sessionStorage)), {
      timeout: 15000,
    })
    .toEqual([checkedAt]);
}

test("registered course list is bounded and keyboard traversable while publication is pending", async ({
  page,
}, info) => {
  await openConfirmedTimetable(page);
  await expect(
    page.getByRole("status", { name: "Timetable being prepared", exact: true }),
  ).toContainText(pendingNote);
  const list = page.getByRole("list", {
    name: "Registered courses",
    exact: true,
  });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(list).toContainText("CSC001");
  await expect(list).not.toContainText("MAT011");
  await page.getByRole("button", { name: "Next courses", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(list).toContainText("CSC011");
  await page.getByRole("button", { name: "Next courses", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list).toContainText("MAT011");
  await expect(
    page.getByRole("button", { name: "Next courses", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Previous courses", exact: true })
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("pending-timetable-mobile.png"),
    fullPage: true,
  });
});

test("explicit programme attempt and period reach the existing API and remain on refresh and sign-in", async ({
  page,
}) => {
  const query = `attemptId=${attemptId}&period=2026S2`;
  await page.goto(`${webOrigin}/student/timetable?${query}`);
  await expect(
    page.getByRole("heading", { name: "My timetable", exact: true }),
  ).toBeVisible();
  expect(calls).toContain(`/registration/timetable?${query}`);
  await expect(page.getByText("2026S2", { exact: true })).toBeVisible();
  const before = calls.length;
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect.poll(() => calls.length).toBeGreaterThan(before);
  expect(
    calls.every((call) => call === `/registration/timetable?${query}`),
  ).toBe(true);
  await page.context().clearCookies();
  await page.goto(`${webOrigin}/student/timetable?${query}`);
  await expect(page).toHaveURL(new RegExp("/sign-in\\?returnTo="));
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    `/student/timetable?${query}`,
  );
});

test("course-group and code/title filters reset paging without changing request scope", async ({
  page,
}) => {
  await page.goto(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
  );
  const list = page.getByRole("list", {
    name: "Registered courses",
    exact: true,
  });
  await page.getByRole("button", { name: "Next courses", exact: true }).click();
  const group = page.getByLabel("Course group", { exact: true });
  await group.focus();
  await page.keyboard.press("End");
  await expect(group).toHaveValue("S2");
  await expect(list).toContainText("MAT001");
  await expect(list).not.toContainText("CSC001");
  await expect(
    page.getByText("Showing 1–10 of 11 courses", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next courses", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  const search = page.getByRole("searchbox", {
    name: "Find a course",
    exact: true,
  });
  await search.fill("COMPUTING");
  await expect(
    page.getByText("No courses match these filters", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Registered courses", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(group).toHaveValue("");
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await search.fill("csc010");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Fictional computing course 10");
  await expect(search).toBeFocused();
  expect(
    calls.every(
      (call) =>
        call === `/registration/timetable?attemptId=${attemptId}&period=2026S2`,
    ),
  ).toBe(true);
  await noOverflow(page);
});

test("an empty registered source stays publication-pending without invented activities", async ({
  page,
}) => {
  scenario = "empty";
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(
    page.getByRole("status", { name: "Timetable being prepared", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No registered courses to display",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Complete registration first", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Check again", exact: true }),
  ).toBeEnabled();
  await noOverflow(page);
});

test("pre-registration absence offers registration without claiming published availability", async ({
  page,
}) => {
  scenario = "unregistered";
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(
    page.getByRole("status", {
      name: "Complete registration first",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review registration", exact: true }),
  ).toHaveAttribute("href", "/student/register");
  await expect(
    page.getByRole("heading", { name: "Registered courses", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
});

for (const state of [
  "error",
  "foreign",
  "unexpected-published",
  "malformed",
] as const) {
  test(`${state} is unavailable rather than false pending or published content`, async ({
    page,
  }) => {
    scenario = state;
    await page.goto(
      `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
    );
    await expect(
      page.getByRole("alert", {
        name: "Timetable status unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", {
        name: "Timetable being prepared",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Complete registration first", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("DEMO-HALL", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("list", { name: "Registered courses", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Check again", exact: true }),
    ).toBeEnabled();
    await noOverflow(page);
  });
}

test("ambiguous repeated context never silently defaults to a different programme attempt", async ({
  page,
}) => {
  await page.goto(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&attemptId=another-attempt&period=2026S2`,
  );
  await expect(
    page.getByRole("alert", {
      name: "Timetable status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  expect(calls).toEqual([]);
  await expect(
    page.getByRole("list", { name: "Registered courses", exact: true }),
  ).toHaveCount(0);
});

test("fictional published sessions use bounded weekly/list views and CAT times", async ({
  page,
}, info) => {
  scenario = "published";
  await page.goto(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
  );
  await expect(
    page.getByRole("status", {
      name: "Fictional timetable published",
      exact: true,
    }),
  ).toContainText(/fictional|rehearsal/i);
  await expect(
    page.getByText(/Official schedule|official timetable/i),
  ).toHaveCount(0);
  const list = page.getByRole("list", {
    name: "Published class sessions",
    exact: true,
  });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(list).toContainText("CSC001");
  await expect(list).toContainText(/08:00\s*[–-]\s*10:00 CAT/);
  await expect(list).toContainText("FICTIONAL-LT1");
  await page
    .getByRole("button", { name: "Next sessions", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("radio", { name: "By day", exact: true }).check();
  await expect(
    page.getByRole("region", { name: "Sessions by day", exact: true }),
  ).toContainText("Wednesday");
  await page
    .getByRole("button", { name: "Next teaching week", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Sessions by day", exact: true }),
  ).toContainText("Monday");
  await expect(
    page.getByRole("button", { name: "Next teaching week", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("listitem").filter({ hasText: "CSC001" }),
  ).toContainText("12 October");
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("published-timetable-mobile.png"),
    fullPage: true,
  });
});

test("published course filtering and detail disclosure use only projected session data", async ({
  page,
}) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await page.getByLabel("Course", { exact: true }).selectOption("CSC001");
  const list = page.getByRole("list", {
    name: "Published class sessions",
    exact: true,
  });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).not.toContainText("CSC002");
  await list.getByText("Session details", { exact: true }).click();
  await expect(list).toContainText("Fictional lecturer");
  await expect(list).toContainText("FICTIONAL-SECTION-A");
  await page.getByLabel("Teaching week", { exact: true }).selectOption("ALL");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("12 October");
  await noOverflow(page);
});

for (const state of ["unregistered-session", "bad-publication"] as const) {
  test(`${state} cannot render an authoritative-looking published timetable`, async ({
    page,
  }) => {
    scenario = state;
    await page.goto(`${webOrigin}/student/timetable`);
    await expect(
      page.getByRole("alert", {
        name: "Timetable status unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", {
        name: "Fictional timetable published",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("UNREGISTERED-ROOM", { exact: true }),
    ).toHaveCount(0);
  });
}

test("an empty published payload is refused rather than inventing publication entitlement", async ({
  page,
}) => {
  scenario = "empty-published";
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(
    page.getByRole("alert", {
      name: "Timetable status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", {
      name: "Fictional timetable published",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByText("Timetable being prepared", { exact: true }),
  ).toHaveCount(0);
});

test("day view filters by actual CAT dates and resets on a teaching-week change", async ({
  page,
}) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await page.getByRole("radio", { name: "By day", exact: true }).check();
  await page
    .getByLabel("Teaching day", { exact: true })
    .selectOption("2026-10-06");
  const days = page.getByRole("region", {
    name: "Sessions by day",
    exact: true,
  });
  await expect(days.getByRole("listitem")).toHaveCount(4);
  await expect(days).toContainText("Tuesday");
  await expect(days).not.toContainText("Monday");
  await page
    .getByRole("button", { name: "Next teaching week", exact: true })
    .click();
  await expect(page.getByLabel("Teaching day", { exact: true })).toHaveValue(
    "",
  );
  await expect(days).toContainText("Monday");
});

test("a partial rehearsal publication keeps other registered courses visible without fabricated sessions", async ({
  page,
}) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await expect(
    page.getByRole("status", {
      name: "Courses without published sessions",
      exact: true,
    }),
  ).toContainText("11");
  await page.getByText("Registered course list", { exact: true }).click();
  const roster = page.getByRole("list", {
    name: "Registered courses",
    exact: true,
  });
  await page.getByLabel("Course group", { exact: true }).selectOption("S2");
  await expect(roster).toContainText("MAT001");
  await page.getByRole("button", { name: "Next courses", exact: true }).click();
  await expect(roster).toContainText("MAT011");
  const sessions = page.getByRole("list", {
    name: "Published class sessions",
    exact: true,
  });
  await expect(sessions).not.toContainText("MAT011");
  await noOverflow(page);
});

test("own published activity changes remain historical and distinct from current sessions", async ({
  page,
}, info) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await expect(
    page.getByText("PREVIOUS-LT2", { exact: true }),
  ).not.toBeVisible();
  await page.getByText("Timetable changes", { exact: true }).click();
  const history = page.getByRole("list", {
    name: "Timetable changes",
    exact: true,
  });
  await expect(history).toContainText("Session changed");
  await expect(history).toContainText("Session removed");
  await expect(history).toContainText("Previous version 1");
  await expect(history).toContainText("Current version 2");
  await expect(history).toContainText("PREVIOUS-LT2");
  await expect(history).toContainText("REMOVED-LT3");
  const current = page.getByRole("list", {
    name: "Published class sessions",
    exact: true,
  });
  await expect(current).not.toContainText("PREVIOUS-LT2");
  await expect(current).not.toContainText("REMOVED-LT3");
  await noOverflow(page);
  await history.screenshot({
    path: info.outputPath("published-timetable-changes-mobile.png"),
  });
});

test("week view exposes dated navigation, bounded records and a list alternative", async ({
  page,
}, info) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const week = page.getByRole("radio", { name: "Week", exact: true });
  await week.focus();
  await page.keyboard.press("Space");
  const calendar = page.getByRole("region", {
    name: "Sessions by week",
    exact: true,
  });
  await expect(calendar).toContainText("Monday, 5 October 2026");
  await expect(calendar.getByRole("listitem")).toHaveCount(10);
  await expect(
    page.getByText("Africa/Lusaka (CAT)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next sessions", exact: true })
    .click();
  await expect(calendar.getByRole("listitem")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Next teaching week", exact: true })
    .click();
  await expect(calendar).toContainText("Monday, 12 October 2026");
  await expect(calendar.getByRole("listitem")).toHaveCount(2);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("published-timetable-week-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("radio", { name: "List", exact: true }).check();
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toBeVisible();
});

test("a registered course without sessions remains being prepared in the course filter", async ({
  page,
}) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  await page.getByLabel("Course", { exact: true }).selectOption("MAT011");
  await expect(
    page.getByRole("status", {
      name: "Selected course timetable being prepared",
      exact: true,
    }),
  ).toContainText("MAT011");
  await expect(
    page.getByRole("status", {
      name: "Selected course timetable being prepared",
      exact: true,
    }),
  ).toContainText("registration is unchanged");
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
});

for (const state of [
  "foreign-change",
  "malformed-change",
  "wrong-attempt",
  "wrong-period",
] as const) {
  test(`${state} fails closed without historical or current session disclosure`, async ({
    page,
  }) => {
    scenario = state;
    await page.goto(
      `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
    );
    await expect(
      page.getByRole("alert", {
        name: "Timetable status unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("PREVIOUS-LT2", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("list", { name: "Published class sessions", exact: true }),
    ).toHaveCount(0);
  });
}

test("CAT date rollover is visible for sessions ending on the next local date", async ({
  page,
}) => {
  scenario = "overnight";
  await page.goto(`${webOrigin}/student/timetable`);
  const current = page.getByRole("list", {
    name: "Published class sessions",
    exact: true,
  });
  await expect(current).toContainText("Monday, 5 October 2026");
  await expect(current).toContainText("Tuesday, 6 October 2026");
  await expect(current).toContainText(/23:00\s*[–-]\s*01:00 CAT/);
});

test("a failed refresh retains only the scoped last-confirmed date and removes stale timetable data", async ({
  page,
}, info) => {
  scenario = "published";
  await page.goto(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
  );
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Object.values(sessionStorage)))
    .toEqual([checkedAt]);
  scenario = "error";
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(
    page.getByRole("alert", {
      name: "Timetable status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", {
      name: "Last confirmed date, current timetable unavailable",
      exact: true,
    }),
  ).toContainText("8 October 2026 at 10:15 CAT");
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Timetable changes", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("FICTIONAL-LT1", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => Object.values(sessionStorage))).toEqual([
    checkedAt,
  ]);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("unavailable-last-confirmed-mobile.png"),
    fullPage: true,
  });
});

test("a different authenticated actor cannot see another actor's remembered date", async ({
  page,
}) => {
  scenario = "published";
  const address = `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`;
  await page.goto(address);
  await expect(
    page.getByRole("list", { name: "Published class sessions", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Object.values(sessionStorage)))
    .toEqual([checkedAt]);
  scenario = "error";
  await page
    .context()
    .addCookies([
      { name: "sid", value: "synthetic-other-actor", url: webOrigin },
    ]);
  await page.goto(address);
  await expect(
    page.getByRole("alert", {
      name: "Timetable status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", {
      name: "Last confirmed date, current timetable unavailable",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => Object.values(sessionStorage))).toEqual([
    checkedAt,
  ]);
});

for (const context of [
  `attemptId=another-attempt&period=2026S2`,
  `attemptId=${attemptId}&period=2026S3`,
] as const) {
  test(`a remembered date cannot cross request context ${context}`, async ({
    page,
  }) => {
    scenario = "published";
    await page.goto(
      `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
    );
    await expect
      .poll(() => page.evaluate(() => Object.values(sessionStorage)))
      .toEqual([checkedAt]);
    scenario = "error";
    await page.goto(`${webOrigin}/student/timetable?${context}`);
    await expect(
      page.getByRole("alert", {
        name: "Timetable status unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", {
        name: "Last confirmed date, current timetable unavailable",
        exact: true,
      }),
    ).toHaveCount(0);
  });
}

test("identity uncertainty cannot reveal a remembered date", async ({
  page,
}) => {
  scenario = "published";
  const address = `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`;
  await page.goto(address);
  await expect
    .poll(() => page.evaluate(() => Object.values(sessionStorage)))
    .toEqual([checkedAt]);
  scenario = "error";
  actorAvailable = false;
  await page.goto(address);
  await expect(
    page.getByRole("alert", {
      name: "Timetable status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", {
      name: "Last confirmed date, current timetable unavailable",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("a successful default request fixes its authoritative attempt and period for later refresh", async ({
  page,
}) => {
  scenario = "published";
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(page).toHaveURL(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S1`,
  );
  await expect
    .poll(() => page.evaluate(() => Object.values(sessionStorage)))
    .toEqual([checkedAt]);
  scenario = "error";
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(
    page.getByRole("status", {
      name: "Last confirmed date, current timetable unavailable",
      exact: true,
    }),
  ).toBeVisible();
});

test("generic timetable discovers the sole confirmed registered context and keeps academic links exact", async ({ page }) => {
  inventoryMode = "sole";
  defaultUnregistered = true;
  scenario = "published";
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(page).toHaveURL(`${webOrigin}/student/timetable?attemptId=${attemptId}&period=DEMO-PUBLISHED`);
  await expect(page.getByRole("list", { name: "Published class sessions", exact: true })).toBeVisible();
  // Both desktop and mobile menus preserve exact academic context.
  const links = await page.locator('a[href^="/student/readiness"]').evaluateAll(links => links.map(link => link.getAttribute("href")));
  expect(links.length).toBeGreaterThan(0);
  for (const href of links) {
    expect(href).toBe(`/student/readiness?attemptId=${attemptId}&period=DEMO-PUBLISHED`);
  }
  await noOverflow(page);
});

for (const mode of ["multiple", "paged"] as const) {
  test(`${mode} registered contexts require an explicit visible choice`, async ({ page }) => {
    inventoryMode = mode;
    defaultUnregistered = true;
    scenario = "published";
    await page.goto(`${webOrigin}/student/timetable`);
    await expect(page).toHaveURL(`${webOrigin}/student/timetable`);
    await expect(page.getByRole("status", { name: "Choose a study period", exact: true })).toBeVisible();
    await expect(page.getByText("Complete registration first", { exact: true })).toHaveCount(0);
    if (mode === "paged") {
      await expect(page.getByRole("button", { name: "Load more study periods", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Load more study periods", exact: true }).focus();
      await page.keyboard.press("Enter");
    }
    await page.getByLabel("Programme and period", { exact: true }).selectOption(`${attemptId}:DEMO-OTHER`);
    await page.getByRole("link", { name: "Open study period", exact: true }).click();
    await expect(page).toHaveURL(`${webOrigin}/student/timetable?attemptId=${attemptId}&period=DEMO-OTHER`);
    await expect(page.getByRole("list", { name: "Published class sessions", exact: true })).toBeVisible();
    await noOverflow(page);
  });
}

test("unavailable inventory never turns the generic default into proof of no registration", async ({ page }) => {
  inventoryMode = "unavailable";
  defaultUnregistered = true;
  await page.goto(`${webOrigin}/student/timetable`);
  await expect(page.getByRole("alert", { name: "Timetable status unavailable", exact: true })).toBeVisible();
  await expect(page.getByText("Complete registration first", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review registration", exact: true })).toHaveCount(0);
});

test("an explicit unregistered context never silently selects another registered period", async ({ page }) => {
  inventoryMode = "sole";
  scenario = "unregistered";
  const query = `attemptId=${attemptId}&period=2026S1`;
  await page.goto(`${webOrigin}/student/timetable?${query}`);
  await expect(page).toHaveURL(`${webOrigin}/student/timetable?${query}`);
  await expect(page.getByRole("link", { name: "Review registration", exact: true })).toHaveAttribute("href", `/student/register?${query}`);
  expect(calls.every(call => call === `/registration/timetable?${query}`)).toBe(true);
});

// These cases catch document-scrolling regressions, dropped academic context,
// fabricated dashboard completion and overview totals derived from one page.
test("student sidebar keeps the account stationary and academic links exact across desktop and mobile", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto(
    `${webOrigin}/student/timetable?attemptId=${attemptId}&period=2026S2`,
  );
  const sidebar = page.getByRole("complementary", {
    name: "Student workspace navigation",
    exact: true,
  });
  await expect(sidebar).toBeVisible();
  const account = sidebar.getByRole("link", {
    name: "My account",
    exact: true,
  });
  const rail = page.getByRole("region", {
    name: "Student navigation scroll area",
    exact: true,
  });
  const workspace = page.locator("#main-content");
  const before = await account.boundingBox();
  await workspace.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await rail.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await workspace.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await rail.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const after = await account.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 0);
  expect(after!.y + after!.height).toBeLessThanOrEqual(500);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await expect(account).toHaveAttribute("href", "/student/account");
  await page.screenshot({
    path: info.outputPath("student-sidebar-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByText("Portal sections", { exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const registration = sidebar
    .getByRole("navigation", { name: "Student navigation", exact: true })
    .getByRole("link", { name: "Registration", exact: true })
    .filter({ visible: true });
  await expect(registration).toHaveAttribute(
    "href",
    `/student/readiness?attemptId=${attemptId}&period=2026S2`,
  );
  await expect(
    sidebar
      .getByRole("link", { name: "My timetable", exact: true })
      .filter({ visible: true }),
  ).toHaveAttribute("aria-current", "page");
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("student-sidebar-mobile.png"),
    fullPage: true,
  });
});

test("timetable overview counts the selected source before pagination and preserves week day list interactions", async ({
  page,
}, info) => {
  scenario = "published";
  await openConfirmedTimetable(page);
  const overview = page.getByRole("region", {
    name: "Timetable overview",
    exact: true,
  });
  await expect(overview).toContainText("12 sessions");
  await expect(overview).toContainText("12 courses");
  await expect(overview).toContainText("3 dates");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("student-timetable-overview-initial-mobile.png"), fullPage: true });
  await page.getByRole("radio", { name: "Week", exact: true }).check();
  await expect(
    page.getByRole("region", { name: "Sessions by week", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1672, height: 1000 });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("student-timetable-week-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Next teaching week", exact: true })
    .click();
  await expect(overview).toContainText("2 sessions");
  await expect(overview).toContainText("2 courses");
  await expect(overview).toContainText("1 date");
  await page.getByRole("radio", { name: "By day", exact: true }).check();
  await page
    .getByLabel("Teaching day", { exact: true })
    .selectOption("2026-10-12");
  await expect(
    page.getByRole("region", { name: "Sessions by day", exact: true }),
  ).toContainText("12 October 2026");
  await page.getByRole("radio", { name: "List", exact: true }).check();
  await expect(
    page
      .getByRole("list", { name: "Published class sessions", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await page.getByLabel("Course", { exact: true }).selectOption("MAT001");
  await expect(overview).toContainText("0 sessions");
  await expect(
    page.getByRole("status", {
      name: "Selected course timetable being prepared",
      exact: true,
    }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("student-timetable-overview-mobile.png"),
    fullPage: true,
  });
});

test("student general information uses own record facts and keeps unknown registration distinct from active student status", async ({
  page,
}, info) => {
  homeRegistrationAvailable = false;
  await page.goto(`${webOrigin}/student`);
  const information = page.getByRole("region", {
    name: "General information",
    exact: true,
  });
  await expect(information).toContainText("2026-FICTIONAL");
  await expect(information).toContainText("Fictional computing programme");
  await expect(information).toContainText("Fictional campus");
  await expect(
    page.getByRole("heading", {
      name: "Registration status unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Registration completed", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("student-home-unknown-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1672, height: 1000 });
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("student-home-unknown-desktop.png"), fullPage: true });
});
