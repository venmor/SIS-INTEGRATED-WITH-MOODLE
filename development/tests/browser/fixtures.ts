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
