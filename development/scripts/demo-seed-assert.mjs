import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DEMO_PERIOD,
  DEMO_SCENARIOS,
} from "../prisma/seed/demo-scenarios.ts";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { verify } = require("argon2");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for demo seed assertions.");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const failures = [];
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label, detail) => {
  failures.push(`${label}: ${detail}`);
  console.error(`FAIL ${label}: ${detail}`);
};
const check = (condition, label, detail) =>
  condition ? pass(label) : fail(label, detail);

try {
  await db.$queryRaw`SELECT 1`;
  pass("database reachable");

  const account = async (username) =>
    db.account.findUnique({
      where: { username },
      include: { roles: true },
    });

  for (const [username, password] of [
    ["bwalya.m", "Seed-2026-Bwalya"],
    ["phiri.n", "Seed-2026-Phiri"],
    ["lombe.a", "Seed-2026-Lombe"],
    ["mwila.t", "Seed-2026-Mwila"],
    ["mumba.s", "Seed-2026-Mumba"],
    ["kunda.b", "Seed-2026-Kunda"],
    ["kabwe.f", "Seed-2026-Kabwe"],
    ["mulenga.g", "Seed-2026-Mulenga"],
    ["temwani.r", "Seed-2026-Temwani"],
    ["kasonde.a", "Seed-2026-Kasonde"],
  ]) {
    const row = await db.account.findUnique({
      where: { username },
      include: {
        credentials: {
          where: { kind: "PASSWORD", status: "ACTIVE" },
          take: 1,
        },
      },
    });
    const credential = row?.credentials[0];
    const valid =
      !!credential &&
      (await verify(credential.secretHash, password).catch(() => false));
    check(
      !!row &&
        row.status === "ACTIVE" &&
        row.lockedUntil == null &&
        valid,
      `demo sign-in ${username}`,
      "expected ACTIVE unlocked account with the published fictional password",
    );
  }

  for (const [label, username, role] of [
    ["finance officer", DEMO_SCENARIOS.finance.officerUsername, "FINANCE_OFFICER"],
    ["finance approver", DEMO_SCENARIOS.finance.approverUsername, "FINANCE_APPROVER"],
    ["Moodle administrator", DEMO_SCENARIOS.integration.moodleAdminUsername, "MOODLE_ADMIN"],
    ["integration support", DEMO_SCENARIOS.integration.supportUsername, "INTEGRATION_SUPPORT"],
  ]) {
    const row = await account(username);
    check(
      !!row?.roles.some((a) => a.role === role && a.revokedAt == null),
      label,
      `expected active ${role} assignment for ${username}`,
    );
  }

  const draft = await db.application.findUnique({
    where: { reference: DEMO_SCENARIOS.applicants.draft.applicationReference },
  });
  check(
    !!draft && ["Created", "Draft"].includes(draft.state),
    "known applicant draft",
    "draft application reference/state missing",
  );

  const submitted = await db.application.findUnique({
    where: { reference: DEMO_SCENARIOS.applicants.submitted.applicationReference },
    include: { submission: true },
  });
  check(
    submitted?.state === "Submitted" && !!submitted.submission,
    "submitted application awaiting review",
    "submitted application or submission snapshot missing",
  );

  const offer = await db.application.findUnique({
    where: { reference: DEMO_SCENARIOS.applicants.offer.applicationReference },
    include: { decision: true, offerResponse: true },
  });
  check(
    !!offer?.decision?.releasedAt && !offer.offerResponse,
    "released offer awaiting response",
    "released undecided offer fixture missing",
  );

  const period = await db.academicPeriod.findUnique({
    where: { code: DEMO_PERIOD },
  });
  check(!!period, "demo academic period", `${DEMO_PERIOD} missing`);

  const cleared = await db.student.findUnique({
    where: { studentNumber: DEMO_SCENARIOS.students.cleared.studentNumber },
    include: {
      attempts: true,
      holds: { where: { status: "ACTIVE" } },
      clearances: true,
      financeAccount: {
        include: {
          paymentTransactions: true,
          allocations: true,
        },
      },
    },
  });
  const clearedAttempt = cleared?.attempts[0];
  const clearedRegistration = clearedAttempt
    ? await db.institutionalRegistration.findFirst({
        where: { attemptId: clearedAttempt.id, status: "REGISTERED" },
      })
    : null;
  check(
    !!clearedRegistration,
    "registered student",
    "cleared demo student has no registered institutional registration",
  );
  check(
    !!cleared?.clearances.some(
      (c) => c.periodId === period?.id && c.status === "CLEARED",
    ) &&
      !!cleared.financeAccount?.paymentTransactions.some(
        (tx) => tx.status === "POSTED",
      ) &&
      (cleared.financeAccount?.allocations.length ?? 0) > 0,
    "successful payment and clearance",
    "cleared demo student lacks posted payment/allocation/CLEARED status",
  );

  const held = await db.student.findUnique({
    where: { studentNumber: DEMO_SCENARIOS.students.held.studentNumber },
    include: {
      attempts: true,
      holds: { where: { status: "ACTIVE" } },
    },
  });
  const heldAttempt = held?.attempts[0];
  const heldRegistration = heldAttempt
    ? await db.institutionalRegistration.findFirst({
        where: { attemptId: heldAttempt.id, status: "REGISTERED" },
      })
    : null;
  check(
    !!heldRegistration &&
      !!held?.holds.some((h) => h.holdType === "FINANCIAL_CLEARANCE"),
    "student with financial hold",
    "held student registration/active financial hold missing",
  );

  const deliveryRows = await db.integrationDeliveryAttempt.findMany({
    include: { outbox: true },
  });
  const delayed = deliveryRows.find(
    (row) =>
      row.state === "PENDING" &&
      row.nextRunAt != null &&
      row.outbox.payload?.demoMarker ===
        DEMO_SCENARIOS.integration.delayedMarker,
  );
  check(
    !!delayed,
    "Moodle delayed delivery",
    "future pending Moodle delivery missing",
  );

  const dead = deliveryRows.find(
    (row) =>
      row.state === "DEAD_LETTER" &&
      row.outbox.payload?.demoMarker ===
        DEMO_SCENARIOS.integration.deadLetterMarker,
  );
  const replay = dead
    ? await db.replayDecision.findFirst({
        where: { attemptId: dead.id, status: "PENDING" },
      })
    : null;
  check(
    !!dead && !!replay,
    "dead-letter and replay scenario",
    "dead-letter attempt or pending replay decision missing",
  );

  const mismatch = await db.reconciliationCase.findFirst({
    where: {
      kind: DEMO_SCENARIOS.integration.reconciliationKind,
      status: "OPEN",
    },
  });
  check(
    !!mismatch,
    "reconciliation mismatch",
    "open ENROLMENT_MISMATCH case missing",
  );

  const group = await db.tutorialGroup.findFirst({
    where: { name: DEMO_SCENARIOS.teaching.groupName, status: "ACTIVE" },
    include: { assignments: true },
  });
  check(
    !!group &&
      group.assignments.some((a) => a.status === "ACTIVE"),
    "teaching/tutorial-group assignment",
    "active demo tutorial group with active teaching assignment missing",
  );
} finally {
  await db.$disconnect();
}

if (failures.length > 0) {
  console.error("\nDemo scenario contract failed:");
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log("\nDemo scenario contract passed.");
