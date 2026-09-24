import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { hash } = require("argon2");

/** Only isolated test databases: submitted records are deliberately retained. */
export async function createApplicant() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser applicant",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "APP",
        scopeType: "APPLICATION",
        scopeRef: account.id,
        capabilities: ["apply"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** A converted student: person + account + credential + STUDENT workspace +
 * student row with one ADMITTED attempt on the first OPEN SWE offering.
 * Only isolated test databases. */
export async function createStudent() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.student.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser student",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "STUDENT",
        scopeType: "STUDENT",
        scopeRef: "STU-2026-0001",
        capabilities: ["study"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: "SWE" }, availability: "OPEN" },
      include: { programme: true },
    });
    const curriculum = await db.curriculumVersion.findFirstOrThrow({
      where: { programmeId: offering.programmeId, status: "PUBLISHED" },
      orderBy: { version: "desc" },
    });
    const count = await db.student.count();
    // High range avoids the conversion sequence (starts at 0001).
    const student = await db.student.create({
      data: {
        personId: person.id,
        studentNumber: `STU-2026-${String(9000 + count + 1).padStart(4, "0")}`,
        status: "ACTIVE",
      },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: student.id,
        applicationId: randomUUID(),
        offeringId: offering.id,
        intake: offering.intake,
        curriculumVersionId: curriculum.id,
        status: "ADMITTED",
      },
    });
    return {
      username,
      password,
      studentNumber: student.studentNumber,
      attemptId: attempt.id,
    };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 5 slice 1: assess charges for the fixture student's registered
 * period through the real API (finance-officer session minted directly,
 * same pattern as the role fixtures above). Returns the invoice reference. */
export async function assessStudentCharges(studentNumber: string) {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const api =
    process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3101";
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser finance officer",
        email: `browser.finance.${randomUUID()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: `browser.fin.${randomUUID()}` },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "FINANCE_OFFICER",
        scopeType: "FINANCE",
        scopeRef: "GLOBAL",
        capabilities: ["assess-charges"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    const { createHash } = await import("node:crypto");
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const student = await db.student.findUniqueOrThrow({
      where: { studentNumber },
      include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const res = await fetch(`${api}/finance/assess`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        cookie: `sid=${token}`,
      },
      body: JSON.stringify({
        attemptId: student.attempts[0].id,
        idempotencyKey: randomUUID(),
      }),
    });
    if (!res.ok)
      throw new Error(`assess failed: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { reference: string };
    return body.reference;
  } finally {
    await db.$disconnect();
  }
}

/** Records Officer fixture for identity-review workspace coverage. */
export async function createRecordsOfficer() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.records.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser records officer",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "RECORDS_OFFICER",
        scopeType: "INTAKE",
        scopeRef: "2026",
        capabilities: ["convert-student"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** SYSADMIN fixture for access-review, grant and audit workspace coverage. */
export async function createSystemAdmin() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.sysadmin.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser system administrator",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "SYSADMIN",
        scopeType: "SYSTEM",
        scopeRef: "GLOBAL",
        capabilities: ["administer-identity"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** IAM-only lecturer fixture: recognized role without a dedicated Phase-6 live screen. */
export async function createLecturerWorkspaceUser() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.lecturer.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser lecturer",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "LEC",
        scopeType: "OFFERING",
        scopeRef: "SWE101-2026S1",
        capabilities: ["teach"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 5 slice 6: finance officer fixture (all officer capabilities). */
export async function createFinanceOfficer() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.fin.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser finance officer",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "FINANCE_OFFICER",
        scopeType: "FINANCE",
        scopeRef: "GLOBAL",
        capabilities: [
          "assess-charges",
          "reconcile-case",
          "record-sponsorship",
        ],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 5 slice 6: finance approver fixture (decision authority only). */
export async function createFinanceApprover() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.fin.approver.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser finance approver",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "FINANCE_APPROVER",
        scopeType: "FINANCE",
        scopeRef: "GLOBAL",
        capabilities: ["approve-adjustment"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 5 slice 6: open reconciliation case fixture for queue triage. */
export async function seedReconCase() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const kase = await db.financeReconciliationCase.create({
      data: {
        kind: "UNMATCHED",
        status: "OPEN",
        providerRef: `SIM-BROWSER-${randomUUID().slice(0, 8)}`,
        detail: {
          amountMinor: 50000,
          currency: "ZMW",
          safeNote:
            "We received a payment we cannot match yet. Do not pay again until Finance updates this case.",
        },
      },
    });
    return kase.id;
  } finally {
    await db.$disconnect();
  }
}

/** Phase 6 slice 0: programme coordinator fixture + open SWE offering id. */
export async function createCoordinator() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.coord.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser coordinator",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "COORDINATOR",
        scopeType: "PROGRAMME",
        scopeRef: "SWE",
        capabilities: ["manage-tutorial-groups", "assign-teaching"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: "SWE" }, availability: "OPEN" },
    });
    return { username, password, offeringId: offering.id };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 6 slice 1: Moodle administrator fixture. */
export async function createMoodleAdmin() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.mdl.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser Moodle administrator",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "MOODLE_ADMIN",
        scopeType: "SYSTEM",
        scopeRef: "MOODLE",
        capabilities: ["sync-moodle", "manage-mapping"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: "SWE" }, availability: "OPEN" },
    });
    return { username, password, offeringId: offering.id };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 6 slice 4: integration support officer fixture. */
export async function createIntegrationSupport() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.int.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional browser integration support",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "INTEGRATION_SUPPORT",
        scopeType: "SYSTEM",
        scopeRef: "INTEGRATION",
        capabilities: ["replay-event", "manage-incident"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    return { username, password };
  } finally {
    await db.$disconnect();
  }
}

/** Phase 6 slice 6: fully registered student with a queued enrolment
 * event, built through real domain rows (the UI plan/submit journey is
 * covered by the portal spec). Returns UI credentials. */
export async function createCheckpointStudent() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const username = `browser.check.${randomUUID()}`;
  const password = "Fictional-browser-2026!";
  try {
    const person = await db.person.create({
      data: {
        displayName: "Fictional checkpoint student",
        email: `${username}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username },
    });
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "STUDENT",
        scopeType: "STUDENT",
        scopeRef: "self",
        capabilities: ["study"],
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    void assignment;
    const count = await db.student.count();
    const student = await db.student.create({
      data: {
        personId: person.id,
        studentNumber: `STU-2026-${String(8000 + count + 1).padStart(4, "0")}`,
        status: "ACTIVE",
      },
    });
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: "SWE" }, availability: "OPEN" },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: student.id,
        applicationId: randomUUID(),
        offeringId: offering.id,
        intake: offering.intake,
        status: "ACTIVE",
      },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: "2026S1" },
    });
    const courses = await db.course.findMany({
      where: { code: { in: ["SWE111", "MTH111"] } },
    });
    const registration = await db.institutionalRegistration.create({
      data: {
        attemptId: attempt.id,
        periodId: period.id,
        version: 1,
        status: "REGISTERED",
        snapshot: { fixture: true },
        receipt: `REG-2026-${String(9000 + count + 1).padStart(4, "0")}`,
      },
    });
    for (const course of courses) {
      await db.courseRegistration.create({
        data: {
          registrationId: registration.id,
          courseId: course.id,
          status: "ENROLLED",
        },
      });
    }
    const eventId = randomUUID();
    const key = randomUUID();
    await db.outboxEvent.create({
      data: {
        id: eventId,
        aggregate: "InstitutionalRegistration",
        aggregateId: registration.id,
        type: "MoodleEnrolmentQueued",
        payload: {
          eventId,
          eventType: "zm.sis.registration.course-enrolled.v1",
          correlationId: key,
          idempotencyKey: key,
          payloadVersion: 1,
          deliveryStatus: "QUEUED",
          retryPolicy: "MOODLE-DEMO-v1",
          registrationId: registration.id,
          attemptId: attempt.id,
          period: "2026S1",
          courses: ["SWE111", "MTH111"],
        },
      },
    });
    return { username, password, studentNumber: student.studentNumber };
  } finally {
    await db.$disconnect();
  }
}

async function mintSid(
  role: string,
  capabilities: string[],
  scopeType: string,
  scopeRef: string,
  label: string,
): Promise<string> {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const person = await db.person.create({
      data: {
        displayName: `Fictional checkpoint ${label}`,
        email: `browser.${label}.${randomUUID()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: `browser.${label}.${randomUUID()}` },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType,
        scopeRef,
        capabilities,
        reason: "Isolated browser fixture",
        startsAt: new Date("2020-01-01"),
      },
    });
    const { createHash } = await import("node:crypto");
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return `sid=${token}`;
  } finally {
    await db.$disconnect();
  }
}

/** Phase 6 slice 6: privileged session cookies for API driving. */
export const moodleAdminSid = () =>
  mintSid("MOODLE_ADMIN", ["sync-moodle", "manage-mapping"], "SYSTEM", "MOODLE", "mdladmin");

export const supportSid = () =>
  mintSid(
    "INTEGRATION_SUPPORT",
    ["replay-event", "manage-incident"],
    "SYSTEM",
    "INTEGRATION",
    "intsupport",
  );

/** Phase 6 slice 6: release deferred retries so worker ticks converge. */
export async function releaseDueAttempts() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await db.integrationDeliveryAttempt.updateMany({
      data: { nextRunAt: new Date("2020-01-01T00:00:00Z") },
    });
  } finally {
    await db.$disconnect();
  }
}
