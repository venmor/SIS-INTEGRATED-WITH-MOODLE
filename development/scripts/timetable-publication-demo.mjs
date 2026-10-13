import { isDemonstrationApiTarget } from "../packages/config/src/demo-environment.ts";
// Add a pre-admitted fictional sample; registration/master save use real APIs.
// Never reset a database, edit an existing approval or auto-publish a timetable.
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
class DemoScenarioError extends Error {}
const require = createRequire(import.meta.url);

export function assertPublicationDemoTarget(env) {
  const apiValue = env.TIMETABLE_DEMO_API_URL ?? "http://127.0.0.1:3155";
  if (
    env.DEMO_MODE !== "true" ||
    env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS !== "true" ||
    !isDemonstrationApiTarget(env, apiValue)
  )
    throw new DemoScenarioError(
      "Use explicit fictional switches and an isolated review/test or explicitly pinned cloud demonstration database and API.",
    );
  const api = new URL(apiValue);
  return { api };
}
function stableUuid(value) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const code = "DEMO-2026-PUBLICATION";

async function prepare(db) {
  const { hash, verify } = require("argon2");
  async function account(
    username,
    password,
    role,
    scopeType,
    scopeRef,
    capability,
  ) {
    const old = await db.account.findUnique({
      where: { username },
      include: { person: true, credentials: true, roles: true },
    });
    if (old) {
      const credentials = old.credentials.filter(
        (item) =>
          item.kind === "PASSWORD" &&
          item.status === "ACTIVE" &&
          !item.supersededAt,
      );
      const now = new Date();
      if (
        old.status !== "ACTIVE" ||
        old.person.status !== "ACTIVE" ||
        (old.lockedUntil && old.lockedUntil > now) ||
        credentials.length !== 1 ||
        !(await verify(credentials[0].secretHash, password)) ||
        !old.roles.some(
          (item) =>
            item.role === role &&
            item.scopeType === scopeType &&
            item.scopeRef === scopeRef &&
            item.capabilities.includes(capability) &&
            !item.revokedAt &&
            item.startsAt <= now &&
            (!item.endsAt || item.endsAt > now),
        )
      )
        throw new DemoScenarioError(
          "Existing fictional actor differs; review without replacing credentials or privileges.",
        );
      return old;
    }
    return db.account.create({
      data: {
        username,
        person: {
          create: {
            displayName: `${username} (fictional)`,
            email: `${username}@demo.invalid`,
          },
        },
        credentials: {
          create: { kind: "PASSWORD", secretHash: await hash(password) },
        },
        roles: {
          create: {
            role,
            scopeType,
            scopeRef,
            capabilities: [capability],
            startsAt: new Date("2026-01-01T00:00:00Z"),
            endsAt: new Date("2027-01-01T00:00:00Z"),
            appointmentRef: "DEMO-TIME-PUBLISH-2026.1",
            authoritySource: "User-authorized fictional university rehearsal",
            reason: "Fictional timetable publication sample only",
          },
        },
      },
      include: { person: true },
    });
  }
  const planner = await account(
    "nasilele.master",
    "Seed-2026-Master",
    "TIMETABLE_COORDINATOR",
    "SYSTEM",
    "DEMO-UNIVERSITY",
    "timetable-demo-master-draft",
  );
  await account(
    "nasilele.scheduler",
    "Seed-2026-Scheduler",
    "DOMAIN_ADMIN",
    "CAMPUS",
    "DEMO-MAIN",
    "timetable-demo-rules-draft",
  );
  const reviewer = await account(
    "tembo.timetable",
    "Seed-2026-Timetable",
    "DOMAIN_ADMIN",
    "SYSTEM",
    "DEMO-UNIVERSITY",
    "timetable-demo-master-publish",
  );
  if (planner.personId === reviewer.personId)
    throw new DemoScenarioError("Independent timetable people are required.");
  const learner = await account(
    "chanda.time",
    "Seed-2026-Student",
    "STUDENT",
    "PERSON",
    "SELF",
    "study",
  );
  const programme = await db.programme.findUniqueOrThrow({
    where: { code: "SWE" },
  });
  const curriculum = await db.curriculumVersion.findUniqueOrThrow({
    where: { programmeId_version: { programmeId: programme.id, version: 1 } },
    include: { courses: { include: { course: true } } },
  });
  if (
    curriculum.status !== "PUBLISHED" ||
    !["SWE111", "MTH111"].every((value) =>
      curriculum.courses.some((item) => item.course.code === value),
    )
  )
    throw new DemoScenarioError(
      "The assigned published sample curriculum must contain both courses.",
    );
  const admissions = await db.programmeOffering.findFirstOrThrow({
    where: { programmeId: programme.id },
    orderBy: { createdAt: "asc" },
  });
  const student = await db.student.upsert({
    where: { personId: learner.personId },
    update: {},
    create: { personId: learner.personId, studentNumber: "DEMO-TIME-0001" },
  });
  if (student.status !== "ACTIVE")
    throw new DemoScenarioError(
      "Review the inactive sample student without overriding it.",
    );
  const attempt = await db.programmeAttempt.upsert({
    where: { applicationId: stableUuid("DEMO-TIME-ADMITTED-CHANDA") },
    update: {},
    create: {
      applicationId: stableUuid("DEMO-TIME-ADMITTED-CHANDA"),
      studentId: student.id,
      offeringId: admissions.id,
      curriculumVersionId: curriculum.id,
      intake: admissions.intake,
    },
  });
  if (
    attempt.studentId !== student.id ||
    attempt.curriculumVersionId !== curriculum.id ||
    attempt.status === "WITHDRAWN"
  )
    throw new DemoScenarioError(
      "Review changed sample attempt without moving curricula or overriding withdrawal.",
    );
  const period = await db.academicPeriod.upsert({
    where: { code },
    update: {},
    create: {
      code,
      status: "OPEN",
      registrationOpen: new Date("2026-01-01T00:00:00Z"),
      registrationClose: new Date("2026-12-31T21:59:00Z"),
      addDropClose: new Date("2026-12-31T21:59:00Z"),
    },
  });
  if (
    period.status !== "OPEN" ||
    !period.registrationOpen ||
    !period.registrationClose ||
    period.registrationOpen > new Date() ||
    period.registrationClose < new Date()
  )
    throw new DemoScenarioError(
      "Review the configured sample period without extending its window automatically.",
    );
  const campus = await db.institutionUnit.findUniqueOrThrow({
    where: { code: "DEMO-MAIN" },
  });
  const teacher = await db.account.findUniqueOrThrow({
    where: { username: "mutinta.l" },
    include: { person: true },
  });
  if (teacher.status !== "ACTIVE" || teacher.person.status !== "ACTIVE")
    throw new DemoScenarioError("An active fictional teacher is required.");
  for (const courseCode of ["SWE111", "MTH111"]) {
    const course = curriculum.courses.find(
      (item) => item.course.code === courseCode,
    ).course;
    const version = await db.courseVersion.upsert({
      where: { courseId_version: { courseId: course.id, version: 1 } },
      update: {},
      create: {
        courseId: course.id,
        version: 1,
        title: course.title,
        credits: course.credits,
      },
    });
    const offering = await db.courseDeliveryOffering.upsert({
      where: {
        courseVersionId_periodId_deliveryUnitId_campusUnitId_deliveryMode: {
          courseVersionId: version.id,
          periodId: period.id,
          deliveryUnitId: campus.id,
          campusUnitId: campus.id,
          deliveryMode: "IN_PERSON",
        },
      },
      update: {},
      create: {
        courseVersionId: version.id,
        periodId: period.id,
        deliveryUnitId: campus.id,
        campusUnitId: campus.id,
        deliveryMode: "IN_PERSON",
        capacity: 40,
      },
    });
    const section = await db.teachingSection.upsert({
      where: {
        offeringId_code: { offeringId: offering.id, code: "DEMO-PUBLISH-A" },
      },
      update: {},
      create: {
        offeringId: offering.id,
        code: "DEMO-PUBLISH-A",
        capacity: 40,
        deliveryMode: "IN_PERSON",
      },
    });
    const old = await db.roleAssignment.findFirst({
      where: {
        accountId: teacher.id,
        role: "LEC",
        scopeType: "SECTION",
        scopeRef: section.id,
      },
    });
    if (!old)
      await db.roleAssignment.create({
        data: {
          accountId: teacher.id,
          role: "LEC",
          scopeType: "SECTION",
          scopeRef: section.id,
          capabilities: ["teach"],
          startsAt: new Date("2026-01-01T00:00:00Z"),
          endsAt: new Date("2027-01-01T00:00:00Z"),
          appointmentRef: "DEMO-TIME-PUBLISH-2026.1",
          authoritySource: "User-authorized fictional sample",
          reason: "Fictional publication scenario teacher",
        },
      });
    else if (
      old.revokedAt ||
      old.startsAt > new Date() ||
      (old.endsAt && old.endsAt <= new Date())
    )
      throw new DemoScenarioError(
        "Review the inactive sample teacher appointment without renewing it automatically.",
      );
  }
  return { periodId: period.id, attemptId: attempt.id };
}

async function draft(api, source) {
  async function session(username, password) {
    const response = await fetch(new URL("/auth/sign-in", api), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new DemoScenarioError(
        `Fictional sign-in returned ${response.status}; respect its retry budget.`,
      );
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    if (!cookie)
      throw new DemoScenarioError("The sample actor session is unavailable.");
    return async (path, body) => {
      const response = await fetch(new URL(path, api), {
        method: body ? "POST" : "GET",
        headers: {
          cookie,
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(25000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new DemoScenarioError(
          `Fictional workflow ${path.split("?")[0]} refused (${response.status}, ${typeof data.code === "string" ? data.code : "check source state"}).`,
        );
      return data;
    };
  }
  const learner = await session("chanda.time", "Seed-2026-Student");
  const query = `?attemptId=${source.attemptId}&period=${code}`;
  let plan = await learner(`/registration/plan${query}`);
  if (plan.status !== "SUBMITTED") {
    const saved = await learner(`/registration/plan${query}`, {
      idempotencyKey: randomUUID(),
      version: Math.max(1, plan.version),
      courseCodes: ["SWE111", "MTH111"],
    });
    plan = await learner(`/registration/plan${query}`);
    await learner(`/registration/submit${query}`, {
      idempotencyKey: randomUUID(),
      version: saved.version ?? plan.version,
      declarations: ["PLAN_ACCURATE", "RULES_UNDERSTOOD", "FINANCE_UNDERSTOOD"],
    });
  }
  const scheduler = await session("nasilele.scheduler", "Seed-2026-Scheduler");
  const rules = await scheduler("/timetabling/demo-rules");
  const found = rules.versions?.find(
    (item) => item.periodId === source.periodId,
  );
  if (!found)
    await scheduler("/timetabling/demo-rules", {
      clientRequestId: stableUuid(`publication-rule:${source.periodId}`),
      expectedVersion: rules.versions?.[0]?.version ?? 0,
      periodId: source.periodId,
      teachingStartDate: "2026-10-12",
      teachingEndDate: "2026-12-18",
      dailyStartTime: "08:00",
      dailyEndTime: "18:00",
      allowedWeekdays: [1, 2, 3, 4, 5],
      maxSessionMinutes: 120,
      roomTurnaroundMinutes: 10,
      maxOccurrences: 100,
      travel: [],
    });
  const planner = await session("nasilele.master", "Seed-2026-Master");
  const catalogue = await planner("/timetabling/demo-master/catalogue");
  const rule = catalogue.rules.find(
    (item) =>
      item.periodId === source.periodId && item.campusCode === "DEMO-MAIN",
  );
  const room = catalogue.venues.find(
    (item) =>
      item.campusCode === "DEMO-MAIN" && item.code.endsWith("· DEMO-R1"),
  );
  if (!rule || !room)
    throw new DemoScenarioError(
      "Complete rule and room are required for the publication sample.",
    );
  const sessions = [];
  for (const [index, courseCode] of ["SWE111", "MTH111"].entries()) {
    const section = catalogue.sections.find(
      (item) =>
        item.periodId === source.periodId && item.courseCode === courseCode,
    );
    const teacher = catalogue.teachers.find(
      (item) => item.sectionId === section?.id,
    );
    const registrations = catalogue.registrations
      .filter(
        (item) =>
          item.periodId === source.periodId && item.courseCode === courseCode,
      )
      .map((item) => item.id)
      .sort();
    if (!section || !teacher || registrations.length === 0)
      throw new DemoScenarioError(
        "The sample needs genuine course registration, section and active teacher links.",
      );
    for (let occurrence = 0; occurrence < 6; occurrence++) {
      const day = [12, 13, 14, 15, 16, 19][occurrence];
      const time = index ? "09:30" : "08:00";
      const end = index ? "10:30" : "09:00";
      sessions.push({
        id: stableUuid(
          `publication-session-v1:${source.periodId}:${section.id}:${occurrence}`,
        ),
        sectionId: section.id,
        venueId: room.id,
        teacherAssignmentId: teacher.id,
        registrationIds: registrations,
        startAt: `2026-10-${day}T${time}:00+02:00`,
        endAt: `2026-10-${day}T${end}:00+02:00`,
        plannedSeats: 20,
        requiresStepFreeAccess: false,
      });
    }
  }
  sessions.sort((a, b) => a.id.localeCompare(b.id));
  const history = await planner("/timetabling/demo-master");
  const content = { periodId: source.periodId, ruleDraftId: rule.id, sessions };
  const saved = await planner("/timetabling/demo-master", {
    ...content,
    clientRequestId: stableUuid(JSON.stringify(content)),
    expectedVersion: Math.max(
      0,
      ...history
        .filter((item) => item.periodId === source.periodId)
        .map((item) => item.version),
    ),
  });
  if (saved.status !== "CONFLICT_FREE_FOR_REVIEW")
    throw new DemoScenarioError(
      "The real source validator blocked the sample; review findings without bypassing them.",
    );
  return saved;
}

async function main() {
  const { api } = assertPublicationDemoTarget(process.env);
  const { PrismaClient } = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const source = await prepare(db);
    const saved = process.argv.includes("--prepare-only")
      ? null
      : await draft(api, source);
    console.log(
      JSON.stringify({
        mode: "FICTIONAL_REHEARSAL",
        period: code,
        attemptId: source.attemptId,
        masterDraftId: saved?.id ?? null,
        status: saved?.status ?? "SOURCE_READY",
        sessions: saved ? 12 : 0,
        publication: "Independent UI approval required",
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  main().catch((error) => {
    if (error instanceof DemoScenarioError) console.error(error.message);
    console.error(
      "Fictional timetable sample stopped; review the isolated source/configuration or API response. No approval was bypassed.",
    );
    process.exitCode = 1;
  });
