import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const route = "/admin/timetabling/publications";
const endpoint = "/api/timetabling/demo-master";
async function signIn(
  page: Page,
  username: string,
  password: string,
  target = route,
) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(target)}`);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 20000,
  });
  await page.goto(target);
}
async function api(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const response = await fetch(path, {
        cache: "no-store",
        ...(body
          ? {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, body },
  );
}
async function confirm(page: Page, reason: string) {
  await page
    .getByRole("textbox", { name: "Reason for publication", exact: true })
    .fill(reason);
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel(
      "I reviewed this exact master, current findings and changes.",
    ),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel(
      "I approve publication for the fictional rehearsal within my assigned authority.",
    ),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Confirm your password", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Confirm your password", { exact: true })
    .fill("Seed-2026-Timetable");
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("coordinator can discover independent publication review without publishing their own master", async ({
  page,
}) => {
  await signIn(page, "nasilele.master", "Seed-2026-Master");
  await expect(
    page.getByRole("heading", { name: "Timetable publication", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current source checks", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve and publish", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Academic period", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Latest proposals", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Current source checks", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check publication state", exact: true }),
  ).toBeEnabled();
  await noOverflow(page);
  await page.screenshot({
    path: test.info().outputPath("staff-publication-desktop.png"),
    fullPage: false,
  });
});

test("genuine registrations lead through independent publication, uncertain recovery and a replaced student timetable", async ({
  browser, baseURL,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () =>
      browser.newContext({
        baseURL,
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      }),
    ),
  );
  const [planner, reviewer, student] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  try {
    await signIn(planner, "nasilele.master", "Seed-2026-Master");
    const catalogue = await api(planner, `${endpoint}/catalogue`);
    const period = catalogue.data.periods.find(
      (item: { code: string }) => item.code === "DEMO-2026-PUBLICATION",
    );
    expect(period).toBeTruthy();
    const history = await api(
      planner,
      `${endpoint}/draft-history?periodId=${period.id}`,
    );
    const source = history.data.items.find(
      (item: { sessions: unknown[] }) => item.sessions.length === 12,
    );
    expect(source.status).toBe("CONFLICT_FREE_FOR_REVIEW");
    expect(source.sessions).toHaveLength(12);
    const sessions = source.sessions.map((session: Record<string, unknown>) =>
      Object.fromEntries(
        [
          "id",
          "sectionId",
          "venueId",
          "teacherAssignmentId",
          "registrationIds",
          "startAt",
          "endAt",
          "plannedSeats",
          "requiresStepFreeAccess",
        ].map((key) => [key, session[key]]),
      ),
    );
    expect(
      sessions.every(
        (session: { registrationIds: string[] }) =>
          session.registrationIds.length > 0,
      ),
    ).toBe(true);
    const command = {
      periodId: period.id,
      ruleDraftId: source.ruleDraftId,
      sessions,
      expectedVersion: history.data.items[0].version,
      clientRequestId: randomUUID(),
    };
    const saved = await api(planner, endpoint, command);
    expect(saved.status).toBe(201);
    expect(saved.data.status).toBe("CONFLICT_FREE_FOR_REVIEW");
    await planner.reload();
    await planner
      .getByRole("combobox", { name: "Master proposal", exact: true })
      .selectOption(saved.data.id);
    await expect(
      planner.getByText(
        "You prepared this master. Another person must approve it.",
        { exact: true },
      ),
    ).toBeVisible();
    await noOverflow(planner);

    await signIn(reviewer, "tembo.timetable", "Seed-2026-Timetable");
    await expect(
      reviewer.getByRole("link", { name: "University structure", exact: true }),
    ).toHaveCount(0);
    await expect(
      reviewer.getByRole("link", {
        name: "Timetable publication Student Information System",
        exact: true,
      }),
    ).toBeVisible();
    await reviewer
      .getByRole("combobox", { name: "Master proposal", exact: true })
      .selectOption(saved.data.id);
    const button = reviewer.getByRole("button", {
      name: "Approve and publish",
      exact: true,
    });
    await expect(button).toBeDisabled();
    await expect(
      reviewer.getByLabel(
        "I reviewed this exact master, current findings and changes.",
      ),
    ).not.toBeChecked();
    await expect(
      reviewer.getByLabel(
        "I approve publication for the fictional rehearsal within my assigned authority.",
      ),
    ).not.toBeChecked();
    await reviewer
      .getByRole("button", { name: "Next sessions", exact: true })
      .click();
    await expect(reviewer.getByLabel("Saved session pages")).toContainText(
      "Page 2 of 2",
    );
    await confirm(
      reviewer,
      "Reviewed genuine synthetic enrolments and all dated teaching sessions.",
    );
    const references: string[] = [];
    let lose = true;
    await reviewer.route(
      `**${endpoint}/${saved.data.id}/publish`,
      async (interception) => {
        references.push(
          interception.request().postDataJSON().clientRequestId as string,
        );
        if (lose) {
          lose = false;
          const response = await interception.fetch();
          expect(response.ok()).toBe(true);
          await interception.abort("connectionfailed");
        } else
          await interception.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              message: "Simulated later authority refusal.",
            }),
          });
      },
    );
    await reviewer
      .getByLabel("Confirm your password", { exact: true })
      .press("Tab");
    await expect(button).toBeFocused();
    await reviewer.keyboard.press("Enter");
    await expect(
      reviewer.locator("#main-content").getByRole("alert"),
    ).toContainText("uncertain");
    await expect(
      reviewer.getByRole("combobox", { name: "Master proposal", exact: true }),
    ).toBeDisabled();
    await reviewer
      .getByLabel("Confirm your password", { exact: true })
      .fill("Seed-2026-Timetable");
    await reviewer
      .getByRole("button", { name: "Retry publication", exact: true })
      .click();
    expect(references).toHaveLength(2);
    expect(references[0]).toBe(references[1]);
    await expect(
      reviewer.locator("#main-content").getByRole("alert"),
    ).toContainText("later authority refusal");
    await expect(
      reviewer.getByRole("combobox", { name: "Master proposal", exact: true }),
    ).toBeDisabled();
    await expect(
      reviewer.getByRole("textbox", {
        name: "Reason for publication",
        exact: true,
      }),
    ).toBeDisabled();
    const recovery = await reviewer.evaluate(
      () =>
        Object.entries(sessionStorage).find(([key]) =>
          key.startsWith("sis:timetable-publication:v1:"),
        )?.[1],
    );
    expect(recovery).toContain(references[0]);
    expect(recovery).not.toContain("Seed-2026-Timetable");
    reviewer.once("dialog", (dialog) => dialog.accept());
    await reviewer.reload();
    await expect(
      reviewer.getByText(/Saved publication reference restored/),
    ).toBeVisible();
    await expect(
      reviewer.getByRole("combobox", { name: "Master proposal", exact: true }),
    ).toBeDisabled();
    await expect(
      reviewer.getByLabel("Confirm your password", { exact: true }),
    ).toHaveValue("");
    reviewer.once("dialog", (dialog) => dialog.dismiss());
    await reviewer
      .getByRole("link", { name: "Switch workspace", exact: true })
      .click();
    await expect(reviewer).toHaveURL(new RegExp(`${route}$`));
    await reviewer
      .getByRole("button", { name: "Check publication state", exact: true })
      .click();
    await expect(
      reviewer.getByText(/^Publication receipt confirmed/),
    ).toBeVisible();
    await expect(
      reviewer.getByRole("combobox", { name: "Master proposal", exact: true }),
    ).toBeEnabled();
    await expect(
      reviewer.getByText(
        "This master is the current published fictional timetable.",
        { exact: true },
      ),
    ).toBeVisible();
    await noOverflow(reviewer);
    await reviewer.screenshot({
      path: test.info().outputPath("staff-publication-mobile.png"),
      fullPage: false,
    });
    await reviewer.unroute(`**${endpoint}/${saved.data.id}/publish`);

    await signIn(
      student,
      "chanda.time",
      "Seed-2026-Student",
      "/student/timetable?period=DEMO-2026-PUBLICATION",
    );
    await student.waitForURL(
      (url) =>
        url.pathname === "/student/timetable" &&
        url.searchParams.has("attemptId") &&
        url.searchParams.get("period") === "DEMO-2026-PUBLICATION",
    );
    const first = await api(
      student,
      "/api/registration/timetable?period=DEMO-2026-PUBLICATION",
    );
    expect(first.status).toBe(200);
    expect(first.data.publicationStatus).toBe("FICTIONAL_PUBLISHED");
    expect(first.data.sessions).toHaveLength(12);
    const classSessions = student.getByRole("list", {
      name: "Published class sessions",
    });
    await expect(
      classSessions.getByText("SWE111", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      classSessions.getByText("MTH111", { exact: true }).first(),
    ).toBeVisible();
    await expect(classSessions).toContainText("Programming Fundamentals");
    await expect(classSessions).toContainText("Discrete Mathematics");
    await noOverflow(student);
    await student.screenshot({
      path: test.info().outputPath("student-published-mobile.png"),
      fullPage: false,
    });

    const revisedSessions = sessions
      .slice(0, -1)
      .map((session: Record<string, unknown>, index: number) =>
        index === 0
          ? {
              ...session,
              startAt: new Date(
                Date.parse(session.startAt as string) + 10 * 60 * 1000,
              ).toISOString(),
              endAt: new Date(
                Date.parse(session.endAt as string) + 10 * 60 * 1000,
              ).toISOString(),
            }
          : session,
      );
    const revised = await api(planner, endpoint, {
      ...command,
      sessions: revisedSessions,
      expectedVersion: saved.data.version,
      clientRequestId: randomUUID(),
    });
    expect(revised.status).toBe(201);
    expect(revised.data.status).toBe("CONFLICT_FREE_FOR_REVIEW");
    await reviewer.reload();
    await reviewer
      .getByRole("combobox", { name: "Master proposal", exact: true })
      .selectOption(revised.data.id);
    await reviewer.getByText("Activity changes (2)", { exact: true }).click();
    await expect(reviewer.getByText(/^Before:/).first()).toBeVisible();
    await expect(reviewer.getByText(/^After:/).first()).toBeVisible();
    await expect(reviewer.getByText(/^Cancelled ·/).first()).toBeVisible();
    await confirm(
      reviewer,
      "Reviewed the changed time and cancelled occurrence against current enrolments.",
    );
    await reviewer.route(
      `**${endpoint}/${revised.data.id}/publication-review*`,
      (interception) =>
        interception.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Simulated source refresh outage." }),
        }),
    );
    await reviewer
      .getByRole("button", { name: "Check publication state", exact: true })
      .click();
    await expect(
      reviewer.locator("#main-content").getByRole("alert"),
    ).toContainText("source refresh outage");
    await expect(
      reviewer.getByRole("button", {
        name: "Approve and publish",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(reviewer.getByText(/Source checks unavailable/)).toBeVisible();
    await reviewer.unroute(
      `**${endpoint}/${revised.data.id}/publication-review*`,
    );
    await reviewer
      .getByRole("button", { name: "Check publication state", exact: true })
      .click();
    await expect(
      reviewer.getByLabel(
        "I reviewed this exact master, current findings and changes.",
      ),
    ).not.toBeChecked();
    await expect(
      reviewer.getByLabel("Confirm your password", { exact: true }),
    ).toHaveValue("");
    await confirm(
      reviewer,
      "Reviewed the changed time and cancelled occurrence against current enrolments.",
    );
    await reviewer
      .getByLabel("Confirm your password", { exact: true })
      .press("Tab");
    await expect(
      reviewer.getByRole("button", {
        name: "Approve and publish",
        exact: true,
      }),
    ).toBeFocused();
    await reviewer.keyboard.press("Enter");
    await expect(
      reviewer.getByText(/^Publication receipt confirmed/),
    ).toBeVisible();
    await student.reload();
    const latest = await api(
      student,
      "/api/registration/timetable?period=DEMO-2026-PUBLICATION",
    );
    expect(latest.data.sessions).toHaveLength(11);
    expect(latest.data.publication.version).toBe(
      first.data.publication.version + 1,
    );
    await student.getByText("Timetable changes", { exact: true }).click();
    await expect(student.getByText(/cancelled/i).first()).toBeVisible();
    await noOverflow(student);
    await student.screenshot({
      path: test.info().outputPath("student-replacement-mobile.png"),
      fullPage: false,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
