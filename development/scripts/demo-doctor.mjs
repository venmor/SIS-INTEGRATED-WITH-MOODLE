import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnv } from "./env.mjs";
import {
  DEMO_SCENARIOS,
} from "../prisma/seed/demo-scenarios.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ root, requireFile: false });

const results = [];
function record(ok, label, recovery) {
  results.push({ ok, label, recovery });
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}
function required(name, predicate = (value) => Boolean(value)) {
  const value = process.env[name];
  const ok = predicate(value);
  record(ok, `environment ${name}`, ok ? "" : `Set ${name} in development/.env.`);
  return ok;
}

const demoMode = required("DEMO_MODE", (value) => value === "true");
const databasePresent = required("DATABASE_URL");
required("API_INTERNAL_URL");
required("APPLICATION_SCANNER", (value) => value === "demo-fixtures");
required("FIN_SIM_SECRET");

if (databasePresent) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    record(
      local,
      "database target is local",
      local
        ? ""
        : "Point DATABASE_URL at the local demonstration database before using demo commands.",
    );
  } catch {
    record(false, "DATABASE_URL parses", "Correct DATABASE_URL in development/.env.");
  }
}

if (!demoMode) {
  console.error("Demo doctor will not treat non-demo configuration as ready.");
}

if (databasePresent) {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await db.$queryRaw`SELECT 1`;
    record(true, "database reachable", "");

    const expectedRoles = [
      [DEMO_SCENARIOS.finance.officerUsername, "FINANCE_OFFICER"],
      [DEMO_SCENARIOS.finance.approverUsername, "FINANCE_APPROVER"],
      [DEMO_SCENARIOS.integration.moodleAdminUsername, "MOODLE_ADMIN"],
      [DEMO_SCENARIOS.integration.supportUsername, "INTEGRATION_SUPPORT"],
      [DEMO_SCENARIOS.teaching.coordinatorUsername, "COORDINATOR"],
    ];
    for (const [username, role] of expectedRoles) {
      const account = await db.account.findUnique({
        where: { username },
        include: { roles: true },
      });
      record(
        Boolean(account?.roles.some((row) => row.role === role && row.revokedAt == null)),
        `persona ${username} (${role})`,
        "Run npm run demo:reset.",
      );
    }

    const [draft, submitted, offer, cleared, held, replay, mismatch, group] =
      await Promise.all([
        db.application.findUnique({
          where: {
            reference: DEMO_SCENARIOS.applicants.draft.applicationReference,
          },
        }),
        db.application.findUnique({
          where: {
            reference:
              DEMO_SCENARIOS.applicants.submitted.applicationReference,
          },
          include: { submission: true },
        }),
        db.application.findUnique({
          where: {
            reference: DEMO_SCENARIOS.applicants.offer.applicationReference,
          },
          include: { decision: true, offerResponse: true },
        }),
        db.student.findUnique({
          where: { studentNumber: DEMO_SCENARIOS.students.cleared.studentNumber },
          include: { clearances: true },
        }),
        db.student.findUnique({
          where: { studentNumber: DEMO_SCENARIOS.students.held.studentNumber },
          include: { holds: { where: { status: "ACTIVE" } } },
        }),
        db.replayDecision.findFirst({ where: { status: "PENDING" } }),
        db.reconciliationCase.findFirst({
          where: {
            kind: DEMO_SCENARIOS.integration.reconciliationKind,
            status: "OPEN",
          },
        }),
        db.tutorialGroup.findFirst({
          where: {
            name: DEMO_SCENARIOS.teaching.groupName,
            status: "ACTIVE",
          },
          include: { assignments: true },
        }),
      ]);

    record(
      Boolean(draft && ["Created", "Draft"].includes(draft.state)),
      "story record: applicant draft",
      "Run npm run demo:reset.",
    );
    record(
      Boolean(submitted?.submission && submitted.state === "Submitted"),
      "story record: submitted review case",
      "Run npm run demo:reset.",
    );
    record(
      Boolean(offer?.decision?.releasedAt && !offer.offerResponse),
      "story record: released offer",
      "Run npm run demo:reset.",
    );
    record(
      Boolean(cleared?.clearances.some((row) => row.status === "CLEARED")),
      "story record: cleared registered student",
      "Run npm run demo:reset.",
    );
    record(
      Boolean(held?.holds.some((row) => row.holdType === "FINANCIAL_CLEARANCE")),
      "story record: finance hold",
      "Run npm run demo:reset.",
    );
    record(Boolean(replay), "story record: pending replay", "Run npm run demo:reset.");
    record(
      Boolean(mismatch),
      "story record: reconciliation mismatch",
      "Run npm run demo:reset.",
    );
    record(
      Boolean(group?.assignments.some((row) => row.status === "ACTIVE")),
      "story record: active tutorial group assignment",
      "Run npm run demo:reset.",
    );
  } catch (error) {
    record(
      false,
      "database checks",
      "Run npm run db:start, then npm run demo:reset. " +
        (error instanceof Error ? error.message : "Database check failed."),
    );
  } finally {
    await db.$disconnect();
  }
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error("\nDemo readiness failed.");
  for (const item of failed) {
    if (item.recovery) console.error(`- ${item.label}: ${item.recovery}`);
  }
  process.exit(1);
}
console.log("\nDemo readiness passed. Fictional Phase-6 story pack is ready.");
