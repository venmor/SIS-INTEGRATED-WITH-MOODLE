import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  createApplicant,
  createIntegrationSupport,
  createStudent,
  ensureAxeOffering,
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

async function signIn(page: any, username: string, password: string, base: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${base}/`, { timeout: 20000 });
}

// Phase 8 slice 5: automated axe scans (WCAG 2A/AA) fail on serious
// or critical violations. Every journey keeps the repo hygiene:
// 390px, empty localStorage, cookies cleared.
async function expectNoSerious(page: any) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    bad.map(
      (v) =>
        `${v.id}: ${v.help} @ ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
  ).toEqual([]);
}

async function hygienic(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
}

// Handbook §10: every field keeps a persistent visible label —
// placeholders never replace labels. Accepts explicit <label for>,
// wrapping labels, and aria naming (mirroring accessible-name
// computation). Fails with the offending markup otherwise.
async function expectLabeledInputs(page: any) {
  const unlabeled = await page.evaluate(() => {
    const bad: string[] = [];
    const controls = document.querySelectorAll("input, select, textarea");
    for (const el of controls) {
      const input = el as HTMLInputElement;
      if (input.type === "hidden") continue;
      const explicit = input.id
        ? document.querySelector(`label[for="${input.id}"]`)
        : null;
      const wrapped = input.closest("label");
      const named =
        input.getAttribute("aria-label") ||
        input.getAttribute("aria-labelledby");
      if (!explicit && !wrapped && !named)
        bad.push(input.outerHTML.slice(0, 160));
    }
    return bad;
  });
  expect(unlabeled).toEqual([]);
}

test("axe: sign-in page has no serious violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Sign in" }),
  ).toBeVisible();
  await expectNoSerious(page);
  await expectLabeledInputs(page);
  await hygienic(page);
});

test("axe: applicant workspace has no serious violations", async ({ page }) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  await ensureAxeOffering();
  const applicant = await createApplicant();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  // The catalogue fetch caches per URL for 5 minutes by design: search
  // for the seeded programme so this run fetches a distinct query key.
  await page
    .getByRole("searchbox", { name: /programme name, subject/ })
    .fill("Fictional Axe Test Programme");
  await page.getByRole("button", { name: /Search programmes/ }).click();
  await page
    .getByRole("link", { name: /Fictional Axe Test Programme/ })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Start application", exact: true })
    .click();
  await expect(page).toHaveURL(/sign-in/);
  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start an application" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application overview" }),
  ).toBeVisible();
  await expectNoSerious(page);
  await expectLabeledInputs(page);
  await hygienic(page);
  void base;
});

test("axe: notifications centre has no serious violations", async ({ page }) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const stu = await createStudent();
  const gov = await sysadminSid();
  const dedupe = randomUUID();
  await page.setViewportSize({ width: 390, height: 844 });
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
      office: "Examinations",
      category: "RESULT",
      mandatory: true,
      recipientAccountId: stu.accountId,
      dedupeKey: dedupe,
      channels: ["IN_SYSTEM"],
    },
    gov,
  );
  await signIn(page, stu.username, stu.password, base);
  await page.goto("/notifications");
  await expect(
    page.locator("main").getByText("Official results released").first(),
  ).toBeVisible();
  await expectNoSerious(page);
  await expectLabeledInputs(page);
  await hygienic(page);
});

test("axe: ops queue has no serious violations", async ({ page }) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const support = await createIntegrationSupport();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, support.username, support.password, base);
  await page.goto("/admin/ops");
  await expect(
    page.getByRole("heading", { name: "Operations queue" }),
  ).toBeVisible();
  await expectNoSerious(page);
  await expectLabeledInputs(page);
  await hygienic(page);
});

async function activeInMain(page: any) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return !!el?.closest?.("#main-content");
  });
}

// Handbook §10: the skip link resolves on every journey page and
// lands keyboard focus inside the main landmark.
test("focus: skip link lands inside main content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "Find a programme" }),
  ).toBeVisible();
  // Real keyboard path: the link is offscreen until focused by design.
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await activeInMain(page)).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

// Handbook §10: focus moves after a route change. Uses a next/link
// navigation (client-side): shared @sis/ui cards render plain <a>
// links, which full-load by design — those keep standard MPA
// top-of-document focus instead.
test("focus: route change moves focus to main content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "Find a programme" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  // RouteFocus moves focus after paint: poll instead of asserting once.
  await page.waitForFunction(() => {
    const el = document.activeElement as HTMLElement | null;
    return !!el?.closest?.("#main-content");
  });
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

// Handbook §10: forms work at 200% zoom (≈640 CSS px) and on narrow
// screens without horizontal scrolling. Touch targets meet the 24px
// minimum on primary actions.
for (const width of [640, 320]) {
  test(`zoom: sign-in and catalogue reflow at ${width}px without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/sign-in");
    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    await expectNoSerious(page);
    const signInBox = await page
      .getByRole("button", { name: "Sign in", exact: true })
      .boundingBox();
    expect(signInBox?.width).toBeGreaterThanOrEqual(24);
    expect(signInBox?.height).toBeGreaterThanOrEqual(24);
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { name: "Find a programme" }),
    ).toBeVisible();
    await expectNoSerious(page);
    await hygienic(page);
  });
}

// Handbook §10: on slow connections the interface distinguishes
// pending from resolved and keeps entered values.
test("slow connection: sign-in shows pending state then completes", async ({
  page,
}) => {
  const base = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const applicant = await createApplicant();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/auth/sign-in", async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(applicant.username);
  await page.getByLabel("Password", { exact: true }).fill(applicant.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const pending = page.getByRole("button", { name: "Signing in…" });
  await expect(pending).toBeVisible();
  await expect(pending).toBeDisabled();
  await expect(page).toHaveURL(`${base}/`, { timeout: 20000 });
  await hygienic(page);
});

// Handbook §10: a failed submission focuses its error summary.
test("focus: failed sign-in focuses the error summary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill("nobody.fictional");
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-0!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const summary = page.getByRole("alert", { name: "We could not sign you in." });
  await expect(summary).toBeVisible();
  expect(
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.getAttribute("role") === "alert";
    }),
  ).toBe(true);
  await page.context().clearCookies();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
