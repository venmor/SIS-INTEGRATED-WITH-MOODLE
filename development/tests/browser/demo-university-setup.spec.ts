import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const endpoint = "/api/institution-setup/demo-university";
const route = "/admin/setup/university";

async function signIn(page: Page, username: string, password: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(route)}`);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 20000,
  });
  await page.goto(route);
  await expect(
    page.getByRole("heading", {
      name: "University structure and calendar",
      exact: true,
    }),
  ).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("fictional setup: lost save resolves once, exact version reviewed and independently activated", async ({
  browser, baseURL,
}) => {
  const proposerContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const approverContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const proposer = await proposerContext.newPage();
  const approver = await approverContext.newPage();
  const name = `Chisomo browser rehearsal ${randomUUID().slice(0, 8)}`;
  const reason = `Isolated browser structure review ${randomUUID()}`;
  const requestIds: string[] = [];
  let storedVersionId = "";
  try {
    await signIn(proposer, "nalumino.setup", "Seed-2026-Setup");
    await expect(
      proposer.getByRole("heading", { name: "Prepare a draft", exact: true }),
    ).toBeVisible();
    await proposer.getByLabel("University name", { exact: true }).fill(name);
    await proposer
      .getByLabel("Reason for this version", { exact: true })
      .fill(reason);
    await noOverflow(proposer);
    let loseFirstResponse = true;
    await proposer.route(`**${endpoint}`, async (interception) => {
      if (interception.request().method() !== "POST") {
        await interception.continue();
        return;
      }
      requestIds.push(
        (interception.request().postDataJSON() as { clientRequestId: string })
          .clientRequestId,
      );
      if (loseFirstResponse) {
        loseFirstResponse = false;
        const response = await interception.fetch();
        expect(response.ok()).toBe(true);
        storedVersionId = (await response.json()).id as string;
        await interception.abort("connectionfailed");
      } else await interception.continue();
    });
    await proposer
      .getByRole("button", { name: "Save new draft", exact: true })
      .click();
    await expect(
      proposer.getByRole("alert").filter({ hasText: /uncertain/ }),
    ).toContainText("uncertain");
    await expect(
      proposer.getByLabel("University name", { exact: true }),
    ).toHaveValue(name);
    await expect(
      proposer.getByLabel("University name", { exact: true }),
    ).toBeDisabled();
    await proposer
      .getByRole("button", { name: "Retry saved draft", exact: true })
      .click();
    await expect(proposer.getByRole("status")).toContainText(
      "Draft saved as version",
      { timeout: 20000 },
    );
    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).toBe(requestIds[1]);
    const savedId = storedVersionId;
    await expect(
      proposer.getByLabel("Saved version", { exact: true }),
    ).toHaveValue(savedId);
    expect(savedId).not.toBe("");
    await expect(
      proposer.getByText(
        "You prepared this proposal. An independent person must approve it.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      proposer.getByRole("button", {
        name: "Approve and activate",
        exact: true,
      }),
    ).toHaveCount(0);
    await noOverflow(proposer);

    await signIn(approver, "chileshe.policy", "Seed-2026-Policy");
    await expect(
      approver.getByRole("heading", { name: "Prepare a draft", exact: true }),
    ).toHaveCount(0);
    await expect(
      approver.getByLabel("Saved version", { exact: true }),
    ).toHaveValue("");
    await approver
      .getByLabel("Saved version", { exact: true })
      .selectOption(savedId);
    await expect(
      approver.getByText(name, { exact: true }).first(),
    ).toBeVisible();
    await expect(approver.getByText(reason)).toBeVisible();
    await expect(approver.getByText(/Changes against/)).toBeVisible();
    const approveButton = approver.getByRole("button", {
      name: "Approve and activate",
      exact: true,
    });
    await expect(approveButton).toBeDisabled();
    const reviewed = approver.getByLabel(
      "I have reviewed this exact saved version and its changes.",
    );
    const fictional = approver.getByLabel(
      "I confirm activation is for the fictional rehearsal within my assigned authority.",
    );
    await expect(reviewed).not.toBeChecked();
    await expect(fictional).not.toBeChecked();
    await reviewed.check();
    await fictional.check();
    await approver
      .getByLabel("Confirm your password", { exact: true })
      .fill("Fictional-incorrect-password");
    await approveButton.click();
    await expect(
      approver
        .getByRole("alert")
        .filter({ hasText: /Password reconfirmation/ }),
    ).toBeVisible();
    await expect(
      approver.getByLabel("Confirm your password", { exact: true }),
    ).toHaveValue("");
    await approver
      .getByLabel("Confirm your password", { exact: true })
      .fill("Seed-2026-Policy");
    const activationReferences: string[] = [];
    let loseActivationResponse = true;
    await approver.route(
      `**${endpoint}/${savedId}/activate`,
      async (interception) => {
        activationReferences.push(
          interception.request().postDataJSON().clientRequestId as string,
        );
        if (loseActivationResponse) {
          loseActivationResponse = false;
          const response = await interception.fetch();
          expect(response.ok()).toBe(true);
          await interception.abort("connectionfailed");
        } else await interception.continue();
      },
    );
    await approveButton.click();
    await expect(
      approver.getByRole("alert").filter({ hasText: /uncertain/ }),
    ).toContainText("uncertain");
    await expect(
      approver.getByLabel("Saved version", { exact: true }),
    ).toBeDisabled();
    // A failed history check must not discard the unresolved command.
    await approver.route(`**${endpoint}`, async (interception) => {
      if (interception.request().method() === "GET")
        await interception.abort("connectionfailed");
      else await interception.continue();
    });
    await approver
      .getByRole("button", { name: "Check history", exact: true })
      .click();
    await expect(
      approver.getByRole("alert").filter({ hasText: /could not be checked/ }),
    ).toContainText("could not be checked");
    await approver.unroute(`**${endpoint}`);
    await approver
      .getByLabel("Confirm your password", { exact: true })
      .fill("Seed-2026-Policy");
    await approver
      .getByRole("button", { name: "Retry activation", exact: true })
      .click();
    await expect(approver.getByRole("status")).toContainText(
      "activated for the fictional rehearsal",
      { timeout: 20000 },
    );
    expect(activationReferences).toHaveLength(2);
    expect(activationReferences[0]).toBe(activationReferences[1]);
    await expect(
      approver.getByRole("heading", {
        name: "Fictional setup active",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      approver.getByText("This version is already active.", { exact: true }),
    ).toBeVisible();
    await expect(
      approver.getByLabel("Confirm your password", { exact: true }),
    ).toHaveCount(0);
    await noOverflow(approver);
    await approver.evaluate(() => window.scrollTo(0, 0));
    await approver.screenshot({
      path: test.info().outputPath("university-activated-mobile.png"),
      fullPage: false,
    });
  } finally {
    await proposerContext.close();
    await approverContext.close();
  }
});

test("setup proxy rejects unlisted routes and cross-origin mutation", async ({
  page,
}) => {
  await signIn(page, "nalumino.setup", "Seed-2026-Setup");
  const unlisted = await page.request.get(`${endpoint}/${randomUUID()}`);
  expect(unlisted.status()).toBe(404);
  const foreign = await page.request.post(endpoint, {
    headers: { origin: "https://foreign.demo.invalid" },
    data: {},
  });
  expect(foreign.status()).toBe(403);
});

test("older setup history remains browsable without changing unsaved entries", async ({
  page,
}) => {
  await signIn(page, "nalumino.setup", "Seed-2026-Setup");
  // Build enough immutable history through the real command API on this suite's
  // fresh synthetic database. Never assume an earlier developer's retained rows.
  await page.evaluate(async (url) => {
    const read = async () => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Setup history fixture could not be read");
      return response.json();
    };
    let report = await read();
    for (let index = 0; index < 21; index++) {
      const response = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientRequestId: crypto.randomUUID(),
          expectedVersion: report.latestVersion,
          expectedActivationId: report.activeActivationId,
          reason: `Fictional browser history fixture ${index + 1}`,
          profile: report.template }),
      });
      if (!response.ok) throw new Error(`Setup history fixture refused: ${response.status}`);
      report = await read();
    }
  }, endpoint);
  // Use the browser's authenticated same-origin fetch, as the editor does.
  // Playwright's separate API client omits production Secure cookies on HTTP.
  const newest = await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { ok: response.ok, data: await response.json() };
  }, endpoint);
  expect(newest.ok).toBe(true);
  const current = newest.data;
  expect(current.olderVersionCursor).toEqual(expect.any(Number));
  await page
    .getByLabel("University name", { exact: true })
    .fill("Unsubmitted history browsing example");
  await page
    .getByRole("button", { name: "Older versions", exact: true })
    .click();
  await expect(
    page.getByText("History page 2 · up to 20 versions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("University name", { exact: true })).toHaveValue(
    "Unsubmitted history browsing example",
  );
  const olderResponse = await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { ok: response.ok, data: await response.json() };
  }, `${endpoint}?beforeVersion=${current.olderVersionCursor}`);
  expect(olderResponse.ok).toBe(true);
  const older = olderResponse.data;
  const selector = page.getByRole("combobox", {
    name: "Saved version",
    exact: true,
  });
  await expect(
    selector.locator(`option[value="${older.versions[0].id}"]`),
  ).toHaveCount(1);
  expect(await selector.locator("option").count()).toBeLessThanOrEqual(22);
  await selector.selectOption(older.versions[0].id);
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`^Version ${older.versions[0].version} ·`),
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Newer versions", exact: true })
    .click();
  await expect(
    page.getByText("History page 1 · up to 20 versions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("University name", { exact: true })).toHaveValue(
    "Unsubmitted history browsing example",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("university-desktop.png"),
    fullPage: false,
  });
});

test("off-page setup validation reveals the exact retained field", async ({ page }) => {
  await signIn(page, "nalumino.setup", "Seed-2026-Setup");
  const initial = await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { ok: response.ok, data: await response.json() };
  }, endpoint);
  expect(initial.ok).toBe(true);
  expect(initial.data.template.units.length).toBeLessThan(11);
  const unitType = initial.data.template.unitTypes.find(
    (type: { code: string; kind: string }) => type.kind === "ACADEMIC",
  ).code;
  await page.getByRole("button", { name: "Use example structure", exact: true }).click();
  const invalidCode = "DEMO-INVALID SPACE";
  for (let entry = initial.data.template.units.length + 1; entry <= 11; entry++) {
    await page.getByRole("button", { name: "Add institution unit", exact: true }).click();
    await page.getByLabel(`Unit code ${entry}`, { exact: true }).fill(
      entry === 11 ? invalidCode : `DEMO-BROWSER-${entry}`,
    );
    await page.getByLabel(`Unit name ${entry}`, { exact: true }).fill(`Synthetic support unit ${entry}`);
    await page.getByLabel(`Unit type ${entry}`, { exact: true }).selectOption(unitType);
  }
  const reason = "Locate an invalid off-page unit code without losing the draft.";
  await page.getByLabel("Reason for this version", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Previous institution units page", exact: true }).click();
  await page.getByText("Institution units · 11", { exact: true }).click();
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().endsWith(endpoint),
  );
  await page.getByRole("button", { name: "Save new draft", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(400);
  expect((await response.json()).issue).toEqual({ collection: "units", index: 10, field: "code" });
  const error = page.getByRole("alert").filter({ hasText: "Institution units · entry 11 · Code" });
  await expect(error).toContainText("Your entries are kept.");
  await expect(error).toBeFocused();
  await expect(page.getByLabel("University name", { exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Save new draft", exact: true })).toBeEnabled();
  await error.getByRole("button", { name: "Show field", exact: true }).focus();
  await page.keyboard.press("Enter");
  const field = page.getByLabel("Unit code 11", { exact: true });
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(invalidCode);
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAttribute("aria-describedby", /-error$/);
  await expect(page.getByLabel("Reason for this version", { exact: true })).toHaveValue(reason);
  const collection = page.locator("details").filter({ has: field });
  await expect(collection).toHaveAttribute("open", "");
  await expect(collection).toContainText("Page 2 of 2");
  await noOverflow(page);
  const after = await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { ok: response.ok, data: await response.json() };
  }, endpoint);
  expect(after.ok).toBe(true);
  expect(after.data.latestVersion).toBe(initial.data.latestVersion);
  expect(after.data.activeActivationId).toBe(initial.data.activeActivationId);
});
