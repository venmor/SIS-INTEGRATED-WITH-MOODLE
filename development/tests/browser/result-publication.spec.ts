import { test, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname))
    throw Error("isolated database required");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
async function actor(
  db: PrismaClient,
  role: string,
  capabilities: string[],
  scopeRef: string,
) {
  const person = await db.person.create({
    data: {
      displayName: "Fictional result reviewer",
      email: `${randomUUID()}@demo.invalid`,
      emailVerifiedAt: new Date(),
    },
  });
  const account = await db.account.create({
    data: { personId: person.id, username: randomUUID() },
  });
  const grant = await db.roleAssignment.create({
    data: {
      accountId: account.id,
      role,
      scopeType: role === "STUDENT" ? "STUDENT" : "PERIOD",
      scopeRef,
      capabilities,
      reason: "Isolated browser fixture",
      startsAt: new Date("2020-01-01"),
    },
  });
  const token = randomUUID();
  await db.session.create({
    data: {
      accountId: account.id,
      activeAssignmentId: grant.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { token, person, account };
}
async function cookie(page: Page, token: string) {
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([
      {
        name: "sid",
        value: token,
        url: process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100",
        httpOnly: true,
      },
    ]);
}
async function packageRow(
  db: PrismaClient,
  period: string,
  status = "APPROVED_FOR_RELEASE",
) {
  return db.resultPackage.create({
    data: {
      offeringRef: `TEST-${randomUUID().slice(0, 8)}`,
      periodCode: period,
      status,
      packageHash: "isolated-rendering-fixture",
      candidateListId: randomUUID(),
      declaration: "Fixture evidence",
      preparedByAccountId: randomUUID(),
    },
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
}

// Rendering fixtures deliberately insert official records. Actual publication
// transactions are covered by PostgreSQL API tests; these are not MFA proof.
test("student sees only own official history on mobile", async ({ page }) => {
  const db = database();
  try {
    const period = `B-${randomUUID().slice(0, 8)}`;
    const me = await actor(db, "STUDENT", ["study"], "SELF");
    const student = await db.student.create({
      data: { personId: me.person.id, studentNumber: `B-${randomUUID()}` },
    });
    const courseId = randomUUID();
    let previousReleaseId: string | undefined;
    let previousVersionId: string | undefined;
    for (const version of [1, 2]) {
      const pkg = await packageRow(db, period, "RELEASED");
      const release = await db.resultRelease.create({
        data: {
          packageId: pkg.id,
          offeringRef: pkg.offeringRef,
          periodCode: period,
          packageHash: pkg.packageHash,
          policySnapshot: {
            showMarks: true,
            reviewInstructions:
              "Contact examinations to request a result review.",
          },
          releasedByAccountId: randomUUID(),
          assignmentId: randomUUID(),
          declaration: "Fixture",
          previousReleaseId,
        },
      });
      const result = await db.officialResultVersion.create({
        data: {
          releaseId: release.id,
          studentId: student.id,
          studentRef: student.studentNumber,
          courseId,
          courseCode: "TEST101",
          courseTitle: "Fictional course",
          courseType: "HALF",
          periodCode: period,
          version,
          mark: version === 1 ? 60 : 80,
          outcome: "PASS",
          previousVersionId,
          calculationSnapshot: {},
        },
      });
      if (version === 2)
        await db.resultAcademicImpact.create({
          data: {
            resultId: result.id,
            domain: "PROGRESSION",
            sourceVersion: 2,
          },
        });
      previousReleaseId = release.id;
      previousVersionId = result.id;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await cookie(page, me.token);
    await page.goto("/student/results");
    await expect(
      page.getByRole("heading", { name: "Official results", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("80 / 100", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Academic impact review required", { exact: true }),
    ).toBeVisible();
    const summary = page.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Version 1: PASS/)).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: "test-results/results-mobile.png",
      fullPage: true,
    });
    const stranger = await actor(db, "STUDENT", ["study"], "SELF");
    await cookie(page, stranger.token);
    await page.goto("/student/results");
    await expect(
      page.getByText("No official results released", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("TEST101")).toHaveCount(0);
  } finally {
    await db.$disconnect();
  }
});

test("release review makes consequences clear and default policy blocks publication", async ({
  page,
}) => {
  const db = database();
  try {
    const period = `B-${randomUUID().slice(0, 8)}`;
    const officer = await actor(
      db,
      "EXAMINATIONS_OFFICER",
      ["validate-results", "release-results"],
      period,
    );
    const pkg = await packageRow(db, period);
    await db.boardDecision.create({
      data: {
        packageId: pkg.id,
        version: 1,
        to: "APPROVE_FOR_RELEASE",
        decidedByAccountId: randomUUID(),
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await cookie(page, officer.token);
    await page.goto(`/admin/assessment/packages/${pkg.id}/release`);
    await expect(
      page.getByRole("heading", {
        name: "Review official result release",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("checkbox").check();
    const button = page.getByRole("button", {
      name: "Release official results",
      exact: true,
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText(
        /Approved publication policy and candidate restrictions must be confirmed/,
      ),
    ).toBeVisible();
    expect(await db.resultRelease.count({ where: { packageId: pkg.id } })).toBe(
      0,
    );
    await noOverflow(page);
  } finally {
    await db.$disconnect();
  }
});

test("amendment UI retries an interrupted response with the original payload and key", async ({
  page,
}) => {
  const db = database();
  try {
    const period = `B-${randomUUID().slice(0, 8)}`;
    const officer = await actor(
      db,
      "EXAMINATIONS_OFFICER",
      ["validate-results", "release-results"],
      period,
    );
    const original = await packageRow(db, period, "RELEASED");
    const replacement = await packageRow(db, period);
    const released = await db.resultRelease.create({
      data: {
        packageId: original.id,
        offeringRef: original.offeringRef,
        periodCode: period,
        packageHash: original.packageHash,
        policySnapshot: {},
        releasedByAccountId: randomUUID(),
        assignmentId: randomUUID(),
        declaration: "Fixture",
      },
    });
    const bodies: unknown[] = [];
    // Transport fault injection tests UI recovery only; no domain receipt is claimed.
    await page.route("**/api/assessment/amendments", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill(
        bodies.length === 1
          ? { status: 200, contentType: "application/json", body: "{" }
          : {
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({ id: "isolated-ui-receipt" }),
            },
      );
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await cookie(page, officer.token);
    await page.goto("/admin/assessment/publications");
    await page.getByLabel("Current official release").selectOption(released.id);
    await page
      .getByLabel("Replacement approved package")
      .selectOption(replacement.id);
    await page
      .getByLabel("Verified correction reason")
      .fill("Verified evidence correction");
    await page.getByLabel("Review or evidence reference").fill("TEST-REVIEW");
    await page
      .getByRole("button", { name: "Request amendment", exact: true })
      .click();
    const retry = page.getByRole("button", {
      name: "Check using the same request reference",
      exact: true,
    });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(
      page.getByText(/Recorded. Reference: isolated-ui-receipt/),
    ).toBeVisible();
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    await noOverflow(page);
  } finally {
    await db.$disconnect();
  }
});
