import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  createAdmissionsOfficer,
  createApplicant,
  createSyntheticAdmissionsCases,
} from "./fixtures";

async function submitApplication(page: any, applicant: any) {
  await page.goto("/discover");
  await page
    .getByRole("link", { name: /BSc Software Engineering/ })
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
  const applicationUrl = page.url();
  await page.getByRole("link", { name: /Personal details/ }).click();
  await page.getByLabel("Given name (required)").fill("Fictional");
  await page.getByLabel("Family name (required)").fill("Review");
  await page.getByLabel("Date of birth").fill("2000-01-01");
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await page.getByLabel("Reminder channel").selectOption("PORTAL");
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await page.getByRole("link", { name: /Qualifications and results/ }).click();
  await page
    .getByLabel("Qualification route", { exact: false })
    .selectOption("ECZ");
  await page.getByLabel("Awarding institution").fill("Fictional ECZ");
  await page.getByLabel("Award title").fill("Grade 12");
  await page.getByLabel("Completion year").fill("2025");
  await page.getByLabel("Qualification status").selectOption("COMPLETED");
  await page.getByRole("button", { name: "Add subject result" }).click();
  await page.getByLabel("Subject 1").selectOption("Mathematics");
  await page.getByLabel("Grade 1").selectOption("4");
  await page.getByRole("button", { name: "Add subject result" }).click();
  await page.getByLabel("Subject 2").selectOption("English");
  await page.getByLabel("Grade 2").selectOption("4");
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await page.getByRole("link", { name: /Supporting documents/ }).click();
  await page
    .getByLabel("Choose file")
    .setInputFiles(
      path.resolve("packages/test-fixtures/documents/fictional-result.pdf"),
    );
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await expect(
    page.getByText(/fictional-result.pdf · Checking file safety/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check file safety", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Preview fictional-result.pdf" }),
  ).toBeVisible();
  await page.goto(`${applicationUrl}/review`);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(2).check();
  await page
    .getByRole("button", { name: "Continue to submission confirmation" })
    .click();
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application submitted successfully" }),
  ).toBeVisible();
  // Capture our own reference so the officer claims this application, never
  // a stale case from an earlier run sharing the browser database.
  const referenceText =
    (await page.getByText(/Reference: APP-/).textContent()) ?? "";
  const reference = referenceText.replace("Reference:", "").trim();
  return { applicationUrl, reference };
}

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("staff queue: officer claims a case, records a finding, raises clarification", async ({
  page,
}) => {
  const applicant = await createApplicant();
  const officer = await createAdmissionsOfficer();
  await page.setViewportSize({ width: 390, height: 844 });
  const submitted = await submitApplication(page, applicant);

  // Sign out the applicant, sign in as the seeded demonstration officer.
  await page.goto("/applicant");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Wait for the sign-in round-trip: the form replaces to home on success.
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: "Student Information System" }),
  ).toBeVisible();
  // Officer landing offers the queue directly.
  await expect(
    page.getByRole("link", { name: "Admissions queue" }),
  ).toBeVisible();

  await page.goto("/admin/admissions/queue");
  await expect(
    page.getByRole("heading", { name: "Admissions queue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Claimable pool" }).click();
  // The shared synthetic intake has many older cases; find this exact case
  // through the scoped server search instead of assuming it is on page one.
  await page.getByLabel("Case reference").fill(submitted.reference);
  await page.getByRole("button", { name: "Apply filters" }).click();
  const claimButton = page.getByRole("button", {
    name: `Claim case ${submitted.reference}`,
    exact: true,
  });
  await expect(claimButton).toBeVisible();
  const caseRef =
    (await claimButton.getAttribute("aria-label")) ?? "claimed case";
  await claimButton.click();
  await expect(page.getByText(/claimed\./)).toBeVisible();
  await page.getByRole("button", { name: "My cases", exact: true }).click();
  const claimedRef = caseRef.replace("Claim case ", "");
  await expect(
    page.getByRole("link", { name: `Open case ${claimedRef}` }),
  ).toBeVisible();
  await noOverflow(page);

  // Open the case comparison workspace (our own case, never pool-first).
  await page
    .getByRole("link", { name: `Open case ${claimedRef}`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Review case/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evidence review" }),
  ).toBeVisible();
  await expect(page.getByText("fictional-result.pdf")).toBeVisible();
  await noOverflow(page);

  // Empty finding submit shows a persistent error summary.
  await page.getByRole("button", { name: "Record finding" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Subject").fill("Checklist complete");
  await page.getByLabel("Detail").fill("All required evidence present.");
  await page.getByRole("button", { name: "Record finding" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Finding recorded.")).toBeVisible();
  await expect(page.getByText("Checklist complete")).toBeVisible();
  await noOverflow(page);

  // Raise a scoped clarification.
  await page
    .getByLabel("Exact items needed")
    .fill("Provide a complete result statement.");
  await page.getByRole("button", { name: "Raise clarification" }).click();
  await expect(page.getByText(/Clarification raised/)).toBeVisible();
  await noOverflow(page);

  // Record a recommendation package (slice 4): eligibility outcome plus
  // rationale, then supersede visibility via the active package display.
  await page.getByLabel("Eligibility outcome").selectOption("ELIGIBLE");
  await page
    .getByRole("form", { name: "Record a recommendation" })
    .getByLabel("Recommendation", { exact: true })
    .selectOption("FAVOURABLE");
  await page.getByLabel("Rationale").fill("Meets the demo minimum.");
  await page.getByRole("button", { name: "Record recommendation" }).click();
  await expect(page.getByText("Recommendation recorded.")).toBeVisible();
  await expect(page.getByText("Meets the demo minimum.")).toBeVisible();
  await noOverflow(page);

  // Staff case history lists every event with visibility markers.
  await expect(
    page.getByRole("heading", { name: "Case history" }),
  ).toBeVisible();
  await expect(page.getByText("Staff only").first()).toBeVisible();
  await noOverflow(page);

  // Release a decision as the separate approver (slice 5): sign out the
  // officer, sign in as the seeded approver, open the same case directly,
  // and release a conditional offer.
  const caseId = submitted.applicationUrl.split("/").pop() as string;
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill("kasonde.a");
  await page.getByLabel("Password", { exact: true }).fill("Seed-2026-Kasonde");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await page.goto(`/admin/admissions/case/${caseId}`);
  await expect(
    page.getByRole("heading", { name: "Release decision" }),
  ).toBeVisible();
  await page
    .getByLabel("Decision outcome")
    .selectOption("ADMIT_WITH_CONDITIONS");
  await page
    .getByLabel("Authorized message")
    .fill("Offered a place with conditions.");
  await page
    .getByLabel("Offer response deadline (CAT date)")
    .fill("2027-01-15");
  await page
    .getByLabel("Text", { exact: true })
    .first()
    .fill("Provide certified documents.");
  await page
    .getByLabel(/I confirm that I have reviewed the stated evidence/)
    .check();
  await page.getByRole("button", { name: "Release decision" }).click();
  await expect(page.getByText("Decision released.")).toBeVisible();
  await noOverflow(page);
  // Queue filters narrow the list without losing context.
  await page.goto("/admin/admissions/queue");
  await expect(
    page.getByRole("form", { name: "Filter the queue" }),
  ).toBeVisible();
  await page.getByLabel("Only cases needing action").check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  const queueSummary = page
    .getByRole("status")
    .filter({ hasText: "on this page" })
    .first();
  await expect(queueSummary).toContainText("on this page");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(queueSummary).toContainText("on this page");
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("staff queue: paginates in scope and preserves navigation in the URL", async ({
  page,
}) => {
  const officer = await createAdmissionsOfficer();
  await createSyntheticAdmissionsCases(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/admissions/queue?scope=pool&take=1");
  await expect(
    page.getByRole("heading", { name: "Admissions queue" }),
  ).toBeVisible();
  const next = page.getByRole("button", { name: "Next page", exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page).toHaveURL(/cursor=/);
  await expect(
    page
      .locator('[role="status"]')
      .filter({ hasText: "claimable case" })
      .first(),
  ).toContainText("on this page");

  const previous = page.getByRole("button", {
    name: "Previous page",
    exact: true,
  });
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(page).toHaveURL(/take=1/);
  await page.getByLabel("Order").selectOption("newest");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/sort=newest/);
  await expect(page).not.toHaveURL(/cursor=/);
  await page.reload();
  await expect(page.getByLabel("Order")).toHaveValue("newest");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/cursor=/);
  await page.getByLabel("Order").selectOption("oldest");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(page).not.toHaveURL(/sort=/);
  await noOverflow(page);
});

test("staff queue: an invalid saved page link can restart with its filters", async ({
  page,
}) => {
  const officer = await createAdmissionsOfficer();
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto(
    "/admin/admissions/queue?scope=pool&state=Submitted&actionNeeded=true&take=1&cursor=invalid",
  );
  await expect(
    page.getByRole("heading", { name: "Admissions queue" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Restart from first page" }).click();
  await expect(page).toHaveURL(/scope=pool/);
  await expect(page).toHaveURL(/actionNeeded=true/);
  await expect(page).toHaveURL(/take=1/);
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(
    page.getByRole("button", { name: "Claimable pool" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("staff queue: exact reference search stays scoped and survives reload", async ({
  page,
}) => {
  const officer = await createAdmissionsOfficer();
  const [reference] = await createSyntheticAdmissionsCases(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto("/admin/admissions/queue?scope=pool");
  await page.getByLabel("Case reference").fill(` ${reference.toUpperCase()} `);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toBeVisible();
  await expect(
    page.locator('section[aria-label="Admissions cases"] ul > li'),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/reference=/);
  await page.reload();
  await expect(page.getByLabel("Case reference")).toHaveValue(
    reference.toUpperCase(),
  );
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toBeVisible();
  await noOverflow(page);

  await page.getByLabel("Case reference").fill("APP-NOT-FOUND");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No matching case")).toBeVisible();
  await expect(
    page.getByText(/Cases outside this queue are not shown/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/reference=/);
  await expect(page.getByLabel("State")).toHaveValue("Submitted");
  await expect(page.getByText("No filters applied")).toBeVisible();
  await noOverflow(page);
});

test("staff queue: comparable cases become labelled mobile records and failed refresh marks old data", async ({
  page,
}) => {
  const officer = await createAdmissionsOfficer();
  const [reference] = await createSyntheticAdmissionsCases(1);
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  await page.goto(`/admin/admissions/queue?scope=pool&reference=${reference}`);
  await expect(
    page.getByText("Admissions officer workspace", { exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: /Admissions cases/ });
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Case" })).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Status" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 900, height: 844 });
  await expect(table).toBeHidden();
  await noOverflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table).toBeHidden();
  await expect(page.getByText(reference, { exact: true }).last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toBeVisible();
  await noOverflow(page);

  await page.route("**/api/review/queue?*", (route) => route.abort());
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await expect(
    page.getByText(/previously loaded cases may be out of date/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toBeDisabled();
  await page.unroute("**/api/review/queue?*");
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await expect(
    page.getByText(/previously loaded cases may be out of date/i),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toBeEnabled();

  await page.route("**/api/review/queue?*", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "Forbidden" }),
    }),
  );
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await expect(
    page.getByText(/queue was cleared because this workspace/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Claim case ${reference}` }),
  ).toHaveCount(0);
  await expect(
    page.locator('section[aria-label="Admissions cases"] ul > li'),
  ).toHaveCount(0);
});

test("staff queue: preview two claimed cases without deciding them", async ({
  page,
}) => {
  const officer = await createAdmissionsOfficer();
  const references = await createSyntheticAdmissionsCases(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  for (const reference of references) {
    await page.goto(
      `/admin/admissions/queue?scope=pool&reference=${reference}`,
    );
    await page.getByRole("button", { name: `Claim case ${reference}` }).click();
    await expect(page.getByText(`Case ${reference} claimed.`)).toBeVisible();
  }
  await page.goto("/admin/admissions/queue?scope=mine");
  for (const reference of references) {
    await page
      .getByRole("checkbox", {
        name: `Select case ${reference} for preparation`,
      })
      .check();
  }
  await expect(page.getByText("2 cases selected")).toBeVisible();
  await page.getByRole("button", { name: "Preview selected cases" }).click();
  const preview = page.getByRole("region", { name: "Preparation preview" });
  await expect(preview.getByText(references[0])).toBeVisible();
  await expect(preview.getByText(references[1])).toBeVisible();
  await expect(preview.getByText(/not document verification/i)).toBeVisible();
  await noOverflow(page);
  await page.route("**/api/review/queue/preparation", (route) => route.abort());
  await page.getByRole("button", { name: "Preview selected cases" }).click();
  await expect(page.getByText("Preview unavailable")).toBeVisible();
  await expect(page.getByText("2 cases selected")).toBeVisible();
  await page.unroute("**/api/review/queue/preparation");
  await page.getByRole("button", { name: "Preview selected cases" }).click();
  await expect(preview.getByText(references[0])).toBeVisible();
  await page.getByRole("button", { name: "Claimable pool" }).click();
  await expect(page.getByText("0 cases selected")).toHaveCount(0);
  await expect(preview).toHaveCount(0);
});
