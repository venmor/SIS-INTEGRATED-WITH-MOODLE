// Additive, fictional demo users for the Moodle access walkthrough.
//
// Creates sign-in-ready students (Person + Account + Credential + Student +
// ProgrammeAttempt + InstitutionalRegistration + CourseRegistration +
// STUDENT role assignment) and a Moodle administrator, plus the SYSTEM:MOODLE
// scope/capabilities the provisioning policy needs on a review database.
//
// Fail-closed by construction:
//  - refuses unless DEMO_MODE=true
//  - refuses unless the database name looks like an isolated
//    review/test/ci/browser/demo database
//  - additive only: existing accounts, credentials and registrations are
//    never deleted or overwritten
//  - fictional data only (demo.invalid contacts)
//
// Passwords follow the documented demo pattern `Seed-2026-<FirstName>`.
// This script prints them because it is a local demonstration fixture.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { hash } = require("argon2");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("refusing: DATABASE_URL is required.");
  process.exit(2);
}
let databaseName = "";
try {
  databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
} catch {
  console.error("refusing: DATABASE_URL is not a valid URL.");
  process.exit(2);
}
if (process.env.DEMO_MODE !== "true") {
  console.error("refusing: set DEMO_MODE=true (fictional demo data only).");
  process.exit(2);
}
if (!/(test|review|ci|browser|demo)/i.test(databaseName)) {
  console.error(
    `refusing: database "${databaseName}" is not an isolated review/test/demo target.`,
  );
  process.exit(2);
}

const PERIOD_CODE = "2026S1";

/** Fictional demo students: one row per student with the courses they take. */
const STUDENTS = [
  {
    username: "demo.chanda",
    displayName: "Chanda Mulenga",
    firstName: "Chanda",
    email: "demo.chanda@demo.invalid",
    phone: "+260970000101",
    studentNumber: "DEMO-2026-1001",
    programmeCode: "SWE",
    courseCodes: ["SWE111", "MTH111", "ENG111"],
  },
  {
    username: "demo.bwalya",
    displayName: "Bwalya Mwansa",
    firstName: "Bwalya",
    email: "demo.bwalya@demo.invalid",
    phone: "+260970000102",
    studentNumber: "DEMO-2026-1002",
    programmeCode: "SWE",
    courseCodes: ["SWE121", "SWE150", "MTH111"],
  },
  {
    username: "demo.mutale",
    displayName: "Mutale Banda",
    firstName: "Mutale",
    email: "demo.mutale@demo.invalid",
    phone: "+260970000103",
    studentNumber: "DEMO-2026-1003",
    programmeCode: "SWE",
    courseCodes: ["SWE111", "SWE121", "ENG111"],
  },
  {
    username: "demo.nasilele",
    displayName: "Nasilele Tembo",
    firstName: "Nasilele",
    email: "demo.nasilele@demo.invalid",
    phone: "+260970000104",
    studentNumber: "DEMO-2026-1004",
    programmeCode: "SWE",
    courseCodes: ["SWE121", "SWE150", "ENG111"],
  },
  {
    username: "demo.access",
    displayName: "Demo Access Student",
    firstName: "Access",
    email: "demo.access@demo.invalid",
    phone: "+260970000106",
    studentNumber: "DEMO-2026-1005",
    programmeCode: "SWE",
    courseCodes: ["SWE111", "MTH111", "ENG111"],
  },
  {
    username: "demo.live",
    displayName: "Demo Live Student",
    firstName: "Live",
    email: "demo.live@demo.invalid",
    phone: "+260970000107",
    studentNumber: "DEMO-2026-1006",
    programmeCode: "SWE",
    courseCodes: ["SWE111", "MTH111", "ENG111"],
  },
];

const MOODLE_ADMIN = {
  username: "demo.moodle",
  displayName: "Demo Moodle Administrator",
  firstName: "Moodle",
  email: "demo.moodle@demo.invalid",
  phone: "+260970000105",
};

const MOODLE_CAPABILITIES = [
  // The administration workspace's /integration/health gate requires
  // `sync-moodle`, and mapping/connection screens require `manage-mapping`.
  // Without both, a Moodle administrator sees "Workspace unavailable" even
  // though provisioning itself is allowed.
  ["sync-moodle", "Read Moodle connection health and sync status"],
  ["manage-mapping", "Manage Moodle course, user, role and group mappings"],
  ["moodle:provision", "Provision Moodle access for students and staff"],
  ["moodle:launch", "Launch Moodle SSO deep-link for entitled students"],
  ["moodle:grade-sync", "Sync Moodle grades back to SIS staging"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function passwordFor(firstName) {
  return `Seed-2026-${firstName}`;
}

/** Find or create the account, keeping an existing valid credential intact. */
async function ensureAccount(person, credentialSource) {
  let account = await db.account.findUnique({
    where: { username: credentialSource.username },
    include: { credentials: true },
  });
  if (!account) {
    account = await db.account.create({
      data: { personId: person.id, username: credentialSource.username },
      include: { credentials: true },
    });
  }
  const password = passwordFor(credentialSource.firstName);
  const active = account.credentials.filter(
    (c) => c.kind === "PASSWORD" && c.status === "ACTIVE",
  );
  if (active.length === 0) {
    await db.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(password),
        status: "ACTIVE",
      },
    });
    return { account, password, credentialCreated: true };
  }
  return { account, password, credentialCreated: false };
}

async function ensurePerson(spec) {
  const existingAccount = await db.account.findUnique({
    where: { username: spec.username },
    include: { person: true },
  });
  if (existingAccount) return existingAccount.person;
  const byEmail = spec.email
    ? await db.person.findFirst({ where: { email: spec.email } })
    : null;
  if (byEmail) return byEmail;
  return db.person.create({
    data: {
      displayName: spec.displayName,
      email: spec.email,
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
      phone: spec.phone,
      phoneVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
}

async function ensureStudentRole(account, student) {
  const existing = await db.roleAssignment.findFirst({
    where: {
      accountId: account.id,
      role: "STUDENT",
      scopeType: "STUDENT",
      scopeRef: student.studentNumber,
    },
  });
  if (existing) return existing;
  return db.roleAssignment.create({
    data: {
      accountId: account.id,
      role: "STUDENT",
      scopeType: "STUDENT",
      scopeRef: student.studentNumber,
      capabilities: ["study"],
      startsAt: new Date("2026-01-15T00:00:00Z"),
      appointmentRef: `REG-2026-${student.studentNumber}`,
      authoritySource: "Demo enrolment (fictional)",
      employmentType: null,
      reason: "Demo student enrolment",
    },
  });
}

async function ensureRegistration(student, programme, courses, period) {
  const applicationId = `demo-application-${student.studentNumber}`;
  let attempt = await db.programmeAttempt.findUnique({
    where: { applicationId },
  });
  if (!attempt) {
    const curriculum = await db.curriculumVersion.findFirst({
      where: { programmeId: programme.id, status: "PUBLISHED" },
      orderBy: { version: "desc" },
    });
    const offering = await db.programmeOffering.findFirst({
      where: { programmeId: programme.id },
      orderBy: { createdAt: "asc" },
    });
    if (!offering) {
      throw new Error(`No offering exists for programme ${programme.code}.`);
    }
    attempt = await db.programmeAttempt.create({
      data: {
        studentId: student.id,
        applicationId,
        offeringId: offering.id,
        intake: offering.intake,
        curriculumVersionId: curriculum?.id ?? null,
        status: "ACTIVE",
      },
    });
  }
  const receipt = `REG-2026-${student.studentNumber}`;
  let registration = await db.institutionalRegistration.findUnique({
    where: { attemptId_periodId: { attemptId: attempt.id, periodId: period.id } },
  });
  if (!registration) {
    registration = await db.institutionalRegistration.create({
      data: {
        attemptId: attempt.id,
        periodId: period.id,
        version: 1,
        status: "REGISTERED",
        snapshot: {
          demo: true,
          studentNumber: student.studentNumber,
          period: period.code,
          courses: courses.map((c) => c.code),
        },
        receipt,
        declarations: [{ id: "DEMO_FIXTURE", version: "DEMO-2026-v1" }],
      },
    });
  }
  for (const course of courses) {
    await db.courseRegistration.upsert({
      where: {
        registrationId_courseId: {
          registrationId: registration.id,
          courseId: course.id,
        },
      },
      update: { status: "ENROLLED" },
      create: {
        registrationId: registration.id,
        courseId: course.id,
        status: "ENROLLED",
      },
    });
  }
  return registration;
}

async function ensureMoodlePolicy() {
  const globalScope =
    (await db.scope.findUnique({ where: { name: "SYSTEM:GLOBAL" } })) ?? null;
  const scope =
    (await db.scope.findUnique({ where: { name: "SYSTEM:MOODLE" } })) ??
    (await db.scope.create({
      data: {
        name: "SYSTEM:MOODLE",
        description: "Moodle integration scope",
        parentScopeId: globalScope?.id ?? null,
      },
    }));
  for (const [name, description] of MOODLE_CAPABILITIES) {
    await db.capability.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, description, category: "MOODLE", isActive: true },
    });
  }
  const provisionCapability = await db.capability.findUniqueOrThrow({
    where: { name: "moodle:provision" },
  });
  const authority = await db.approverAuthority.findFirst({
    where: {
      approverRoleId: "MOODLE_ADMIN",
      targetScopeId: scope.id,
      capabilityId: provisionCapability.id,
    },
  });
  if (!authority) {
    await db.approverAuthority.create({
      data: {
        approverRoleId: "MOODLE_ADMIN",
        targetScopeId: scope.id,
        capabilityId: provisionCapability.id,
        isActive: true,
      },
    });
  }
  return scope;
}

async function ensureMoodleAdmin(scope) {
  const person = await ensurePerson(MOODLE_ADMIN);
  const { account, password } = await ensureAccount(person, MOODLE_ADMIN);
  const existing = await db.roleAssignment.findFirst({
    where: {
      accountId: account.id,
      role: "MOODLE_ADMIN",
      scopeType: "SYSTEM",
      scopeRef: "MOODLE",
    },
  });
  if (!existing) {
    await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: "MOODLE_ADMIN",
        scopeType: "SYSTEM",
        scopeRef: "MOODLE",
        scopeId: scope.id,
        capabilities: MOODLE_CAPABILITIES.map(([name]) => name),
        startsAt: new Date("2026-01-15T00:00:00Z"),
        appointmentRef: "ICT-2026-901",
        authoritySource: "ICT services (demo)",
        employmentType: "PERMANENT",
        reason: "Demo Moodle administrator",
      },
    });
  } else {
    // Re-running this seed must repair an assignment created before a
    // capability was added, otherwise the workspace stays inaccessible.
    const wanted = MOODLE_CAPABILITIES.map(([name]) => name);
    const merged = Array.from(
      new Set([...(existing.capabilities ?? []), ...wanted]),
    );
    const data = {};
    if (existing.scopeId !== scope.id) data.scopeId = scope.id;
    if (merged.length !== (existing.capabilities ?? []).length)
      data.capabilities = merged;
    if (Object.keys(data).length > 0) {
      await db.roleAssignment.update({ where: { id: existing.id }, data });
    }
  }
  return { username: MOODLE_ADMIN.username, password, role: "MOODLE_ADMIN" };
}

async function main() {
  await db.$connect();
  const period = await db.academicPeriod.findUnique({
    where: { code: PERIOD_CODE },
  });
  if (!period) {
    throw new Error(`Academic period ${PERIOD_CODE} is missing.`);
  }
  const scope = await ensureMoodlePolicy();

  const created = [];
  for (const spec of STUDENTS) {
    const programme = await db.programme.findUniqueOrThrow({
      where: { code: spec.programmeCode },
    });
    const courses = await db.course.findMany({
      where: { code: { in: spec.courseCodes } },
      orderBy: { code: "asc" },
    });
    const missing = spec.courseCodes.filter(
      (code) => !courses.some((c) => c.code === code),
    );
    if (missing.length > 0) {
      throw new Error(
        `Courses not found for ${spec.username}: ${missing.join(", ")}`,
      );
    }
    const person = await ensurePerson(spec);
    const { account, password, credentialCreated } = await ensureAccount(
      person,
      spec,
    );
    const existingStudent = await db.student.findUnique({
      where: { personId: person.id },
    });
    const student =
      existingStudent ??
      (await db.student.create({
        data: {
          personId: person.id,
          studentNumber: spec.studentNumber,
          status: "ACTIVE",
        },
      }));
    const role = await ensureStudentRole(account, student);
    const registration = await ensureRegistration(
      student,
      programme,
      courses,
      period,
    );
    created.push({
      username: spec.username,
      password,
      studentNumber: student.studentNumber,
      programme: programme.code,
      courses: courses.map((c) => c.code),
      studentId: student.id,
      registrationId: registration.id,
      courseRegistrationIds: (
        await db.courseRegistration.findMany({
          where: { registrationId: registration.id },
          orderBy: { courseId: "asc" },
        })
      ).map((r) => ({ courseId: r.courseId, courseRegistrationId: r.id })),
      roleAssignmentId: role.id,
      credentialCreated,
    });
  }

  const admin = await ensureMoodleAdmin(scope);

  console.log("Demo users ready (fictional data only):");
  console.log(
    JSON.stringify(
      {
        database: databaseName,
        period: period.code,
        moodleScopeId: scope.id,
        moodleAdmin: admin,
        students: created,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(`setup refused or failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
