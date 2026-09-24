import { test, expect } from "@playwright/test";
import { assessStudentCharges, createStudent } from "./fixtures";

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("student portal: home, contact update, correction request", async ({
  page,
}) => {
  const student = await createStudent();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(student.username);
  await page.getByLabel("Password", { exact: true }).fill(student.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });

  // Student workspace offers the student portal.
  await expect(
    page.getByRole("link", { name: "Student portal" }),
  ).toBeVisible();
  await page.goto("/student");
  await expect(
    page.getByRole("heading", { name: "Welcome to the student portal" }),
  ).toBeVisible();
  await expect(page.getByText(student.studentNumber)).toBeVisible();
  await expect(page.getByText("BSc Software Engineering")).toBeVisible();
  await noOverflow(page);

  // Contact update with labels and focus intact.
  await page.getByLabel("Email address").fill("new-address@demo.invalid");
  await page.getByRole("button", { name: "Save contact details" }).click();
  await expect(page.getByText("Contact details saved.")).toBeVisible();
  await noOverflow(page);

  // Correction request journey with persistent errors.
  await page.getByLabel("Requested value").fill("Fictional Browser Scholar");
  await page.getByLabel("Reason").fill("Legal name order.");
  await page.getByRole("button", { name: "Request correction" }).click();
  await expect(page.getByText("Correction requested.")).toBeVisible();
  await expect(page.getByText("Fictional Browser Scholar")).toBeVisible();
  await noOverflow(page);

  // Registration readiness explains every condition with owner and next.
  await page.goto("/student/readiness");
  await expect(
    page.getByRole("heading", { name: "Registration readiness" }),
  ).toBeVisible();
  await expect(page.getByText("Financial clearance")).toBeVisible();
  await expect(page.getByText("No blocking holds")).toBeVisible();
  await noOverflow(page);

  // Course planning: catalogue with reasons, draft save, validation.
  await page.goto("/student/courses");
  await expect(
    page.getByRole("heading", { name: "Plan your courses" }),
  ).toBeVisible();
  await expect(page.getByText("SWE111 — Programming Fundamentals")).toBeVisible();
  await page.getByLabel("SWE111 — Programming Fundamentals").check();
  await page.getByLabel("MTH111 — Discrete Mathematics").check();
  await page.getByRole("button", { name: "Save course plan" }).click();
  await expect(page.getByText("Draft saved as version 1.")).toBeVisible();
  await expect(page.getByText("Planned load: 2 half-course equivalents.")).toBeVisible();
  await noOverflow(page);

  // Formal registration: review, declarations, submit, receipt.
  // The saved draft holds two courses; add the third first.
  await page.getByLabel("ENG111 — Communication Skills").check();
  await page.getByRole("button", { name: "Save course plan" }).click();
  await expect(page.getByText("Draft saved as version 2.")).toBeVisible();
  await page.goto("/student/register");
  await expect(
    page.getByRole("heading", { name: "Review registration" }),
  ).toBeVisible();
  await page.getByLabel("My course selection is accurate to my knowledge.").check();
  await page.getByLabel("I understand the registration rules for this period.").check();
  await page.getByLabel("I understand my fee obligations are handled separately.").check();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Registration completed.")).toBeVisible();
  await expect(page.getByText(/Receipt: REG-/)).toBeVisible();
  await noOverflow(page);

  // Moodle handoff is queued: registration stays valid while sync pends.
  await page.goto("/student/register");
  await expect(page.getByText(/Moodle handoff: Queued/)).toBeVisible();
  await noOverflow(page);

  // Course changes: request an addition, join a waitlist, see history.
  await page.goto("/student/changes");
  await expect(
    page.getByRole("heading", { name: "Course changes" }),
  ).toBeVisible();
  const addForm = page.getByRole("form", { name: "Request a course addition" });
  await addForm.getByLabel("Course code").fill("BUS111");
  await addForm.getByLabel("Reason").fill("Business basics interest.");
  await addForm.getByRole("button", { name: "Request addition" }).click();
  await expect(page.getByText("Addition requested.")).toBeVisible();
  const waitForm = page.getByRole("form", { name: "Join a course waitlist" });
  await waitForm.getByLabel("Course code").fill("BUS112");
  await waitForm.getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.getByText("Waitlist place requested.")).toBeVisible();
  await expect(page.getByText("BUS111")).toBeVisible();
  await expect(page.getByText("BUS112")).toBeVisible();
  await noOverflow(page);

  // Finance invoice: assessed through the real API, read in the portal.
  const reference = await assessStudentCharges(student.studentNumber);
  await page.goto("/student/finance");
  await expect(
    page.getByRole("heading", { name: "Finance and clearance" }),
  ).toBeVisible();
  await expect(
    page.getByText(`Official reference ${reference}`),
  ).toBeVisible();
  // Invoice line renders in both table and mobile-card forms.
  const invoiceCard = page.locator("section", {
    has: page.getByRole("heading", { name: "Invoice for 2026S1" }),
  });
  await expect(
    invoiceCard.getByText("SWE111 — Programming Fundamentals", {
      exact: true,
    }),
  ).toHaveCount(2);
  await expect(page.getByText(/Due /)).toBeVisible();
  await expect(page.getByText(/Total: /)).toBeVisible();
  await expect(page.getByText("Clearance is being prepared")).toBeVisible();
  await expect(page.getByText(/Outstanding:/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Statement" }).first(),
  ).toBeVisible();
  await noOverflow(page);

  // Payment initiation: reviewed amount, explicit method, uncertain state.
  await page.goto("/student/finance/pay");
  await expect(
    page.getByRole("heading", { name: "Make a payment", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mobile money (simulated)").check();
  await page.getByRole("button", { name: "Start simulated payment" }).click();
  await expect(page.getByText("Do not pay again yet.")).toBeVisible();
  await expect(page.getByText(/Reference: PAY-/)).toBeVisible();
  await noOverflow(page);

  // Simulator dispatch confirms through the signed callback path; the
  // receipt appears on the finance home.
  const dispatch = await page.request.post("/api/finance/simulator/dispatch", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {
      requestReference: await page
        .getByText(/Reference: PAY-/)
        .textContent()
        .then((text) => text?.match(/PAY-\d{4}-\d{4}/)?.[0] ?? ""),
      idempotencyKey: crypto.randomUUID(),
    },
  });
  expect(dispatch.ok()).toBe(true);
  await page.goto("/student/finance");
  await expect(page.getByRole("heading", { name: "Receipts" })).toBeVisible();
  await expect(page.getByText(/Receipt PAY-/)).toBeVisible();
  await expect(
    page.getByText("Financial clearance complete"),
  ).toBeVisible();
  await expect(
    page.getByText("Registration is not blocked by finance."),
  ).toBeVisible();
  await noOverflow(page);

  // Reversal checkpoint: governed recalculation re-blocks with a reason.
  const payRef =
    (await page.getByText(/Receipt PAY-/).textContent().then(
      (text) => text?.match(/PAY-\d{4}-\d{4}/)?.[0] ?? "",
    )) ?? "";
  const reversal = await page.request.post(
    "/api/finance/simulator/dispatch",
    {
      headers: { origin: "http://127.0.0.1:3100" },
      data: {
        requestReference: payRef,
        outcome: "REVERSAL",
        idempotencyKey: crypto.randomUUID(),
      },
    },
  );
  expect(reversal.ok()).toBe(true);
  await page.goto("/student/finance");
  await expect(
    page.getByText("Registration is currently blocked"),
  ).toBeVisible();
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
