// Additive, owner-authorized fictional SIS counterpart to the separately provisioned Moodle sample.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { isDemonstrationDatabaseTarget } from "../packages/config/src/demo-environment.ts";

const namespace = "sis-demo-2026";
const marker = "MOODLE-SIS-DEMO-v1";
const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2027-12-31T23:59:59Z");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const actors = [
  "chanda.mulenga",
  "bwalya.mwansa",
  "mutale.banda",
  "nasilele.tembo",
];
export const catalogue = [
  ["intro-physics", "DEE-PHY", "Introduction to Physics", "First Year"],
  ["cell-biology", "DEE-BIO", "Cell Biology and Genetics", "First Year"],
  ["intro-chemistry", "DEE-CHE", "Introduction to Chemistry", "First Year"],
  [
    "electrical-principles",
    "DEE-ELEC",
    "Principles of Electrical and Electronic Engineering",
    "General Engineering",
  ],
  [
    "engineering-communication",
    "DEE-COM",
    "Engineering Communication",
    "General Engineering",
  ],
  [
    "intro-it",
    "DEE-IT",
    "Introduction to Information Technology",
    "General Engineering",
  ],
  [
    "engineering-maths-1",
    "DEE-MAT1",
    "Engineering Mathematics I",
    "General Engineering",
  ],
  [
    "engineering-drawing-1",
    "DEE-DRW1",
    "Engineering Drawing I",
    "General Engineering",
  ],
  ["signals-systems", "DEE-SIG", "Signals and Systems", "Third Year"],
  ["digital-electronics", "DEE-DIG", "Digital Electronics", "Third Year"],
  ["computer-engineering", "DEE-COMP", "Computer Engineering", "Third Year"],
  [
    "engineering-maths-2",
    "DEE-MAT2",
    "Engineering Mathematics II",
    "Third Year",
  ],
];
export const blocks = [
  {
    period: "2026S1",
    sourceYearLabel: "First Year",
    codes: catalogue.slice(0, 3).map((c) => c[1]),
  },
  {
    period: "DEMO-EE-GENERAL",
    sourceYearLabel: "General Engineering",
    codes: catalogue.slice(3, 8).map((c) => c[1]),
  },
  {
    period: "DEMO-EE-ADVANCED",
    sourceYearLabel: "Third Year",
    codes: catalogue.slice(8).map((c) => c[1]),
  },
];
export function stableId(label) {
  const b = createHash("sha256")
    .update(`${namespace}:sis:${label}`)
    .digest()
    .subarray(0, 16);
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function assertTarget(env) {
  if (
    env.SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP !== "true" ||
    !isDemonstrationDatabaseTarget(env)
  )
    throw new Error(
      "Explicit fictional bootstrap opt-in and pinned demonstration database required.",
    );
}
export function validateInputs(manifest, credentials) {
  const usernames = actors.map((name) => `sis.demo.${name}`);
  if (
    manifest?.namespace !== namespace ||
    manifest?.peopleProvenance !== "GENERATED" ||
    manifest?.catalogueVersion !== "1.0.0" ||
    !Array.isArray(manifest.users) ||
    manifest.users.length !== 4 ||
    !Array.isArray(manifest.courses) ||
    manifest.courses.length !== 12 ||
    !Array.isArray(manifest.enrolments) ||
    manifest.enrolments.length !== 48
  )
    throw new Error(
      "Expected the exact generated Moodle demonstration manifest.",
    );
  for (const name of actors) {
    const expectedId = `${namespace}:person:${name}`;
    const matches = manifest.users.filter(
      (u) => u.username === `sis.demo.${name}` && u.idnumber === expectedId,
    );
    if (
      matches.length !== 1 ||
      !matches[0].firstname ||
      !matches[0].lastname ||
      matches[0].email !== `${name}@example.invalid`
    )
      throw new Error("Generated demonstration identity differs.");
    for (const [slug] of catalogue) {
      const role = name === "nasilele.tembo" ? "teacher" : "student";
      if (
        manifest.enrolments.filter(
          (e) =>
            e.user === expectedId &&
            e.course === `${namespace}:course:${slug}:2026` &&
            e.role === role,
        ).length !== 1
      )
        throw new Error("Generated demonstration enrolment inventory differs.");
    }
  }
  for (const [slug, , title] of catalogue)
    if (
      manifest.courses.filter(
        (c) =>
          c.idnumber === `${namespace}:course:${slug}:2026` &&
          c.fullname === title &&
          c.shortname === `SIS-${slug.toUpperCase()}-2026`,
      ).length !== 1
    )
      throw new Error(
        "Public catalogue differs from the bounded demonstration.",
      );
  if (
    !credentials ||
    typeof credentials !== "object" ||
    Array.isArray(credentials) ||
    Object.keys(credentials).length !== usernames.length ||
    Object.keys(credentials).some(
      (username) => !usernames.includes(username),
    ) ||
    usernames.some(
      (username) =>
        !Object.hasOwn(credentials, username) ||
        typeof credentials[username] !== "string" ||
        credentials[username].length < 12,
    )
  )
    throw new Error(
      "Expected exactly four generated demonstration credentials.",
    );
  return usernames;
}
export function foundationPeriod(existing, now = new Date()) {
  return existing?.code === "2026S1" &&
    existing.status === "OPEN" &&
    existing.registrationOpen instanceof Date &&
    existing.registrationClose instanceof Date &&
    existing.registrationOpen <= now &&
    now < existing.registrationClose
    ? "2026S1"
    : "DEMO-EE-FOUNDATION";
}
export function readIgnoredJson(file, secret = false) {
  const path = resolve(file);
  const stat = statSync(path);
  if (
    !stat.isFile() ||
    stat.size > 1024 * 1024 ||
    (secret && stat.mode & 0o077)
  )
    throw new Error(
      "Input must be a bounded file; credentials require owner-only permissions.",
    );
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", path], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    throw new Error("Runtime input files must be explicitly git-ignored.");
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("Runtime input is not valid JSON.");
  }
}
function comparable(value) {
  return value instanceof Date
    ? value.toISOString()
    : Array.isArray(value)
      ? JSON.stringify(value)
      : value;
}
export function assertSame(old, data) {
  for (const [key, value] of Object.entries(data))
    if (comparable(old[key]) !== comparable(value))
      throw new Error(
        "Existing demonstration object differs; no overwrite permitted.",
      );
}
async function ensure(model, where, data) {
  const old = await model.findUnique({ where });
  if (old) {
    assertSame(old, data);
    return old;
  }
  return model.create({ data });
}
export async function prepare(db, manifest, credentials, passwords) {
  validateInputs(manifest, credentials);
  const now = new Date();
  if (now < start || now >= end)
    throw new Error("The fictional bootstrap authority window is not active.");
  return db.$transaction(
    async (tx) => {
      const programme = await ensure(
        tx.programme,
        { code: "DEMO-EE" },
        {
          id: stableId("programme"),
          code: "DEMO-EE",
          name: "Bachelor of Engineering (Electrical and Electronic Engineering)",
          awardLevel: "Undergraduate",
          school: "Engineering",
          department: "Electrical and Electronic Engineering",
          duration:
            "3 demonstration study blocks",
          overview:
            "Public UNZA course titles; generated identities and internal demo codes. Credits, loads, capacity and study blocks are fictional, not UNZA policy.",
          feeScheduleRef: "DEMO-NO-FEE",
          publishedVersion: marker,
          effectiveDate: start,
          owningOffice: "Owner-authorized generated demonstration",
        },
      );
      const offering = await ensure(
        tx.programmeOffering,
        {
          programmeId_intake_studyMode_campus: {
            programmeId: programme.id,
            intake: "2026",
            studyMode: "DEMO",
            campus: "DEMO",
          },
        },
        {
          id: stableId("offering"),
          programmeId: programme.id,
          intake: "2026",
          studyMode: "DEMO",
          campus: "DEMO",
          availability: "OPEN",
          deadline: end,
          statusNote:
            "Synthetic demonstration intake, not a public admissions offer.",
        },
      );
      const curriculum = await ensure(
        tx.curriculumVersion,
        { programmeId_version: { programmeId: programme.id, version: 1 } },
        {
          id: stableId("curriculum"),
          programmeId: programme.id,
          version: 1,
          status: "PUBLISHED",
          effectiveFrom: start,
        },
      );
      for (const [slug, code, title, sourceYearLabel] of catalogue) {
        const course = await ensure(
          tx.course,
          { code },
          {
            id: stableId(`course:${slug}`),
            code,
            title,
            credits: 15,
            courseType: "half",
            semester: sourceYearLabel,
            capacity: 50,
          },
        );
        await ensure(
          tx.curriculumCourse,
          {
            curriculumId_courseId: {
              curriculumId: curriculum.id,
              courseId: course.id,
            },
          },
          {
            id: stableId(`curriculum-course:${slug}`),
            curriculumId: curriculum.id,
            courseId: course.id,
            required: true,
            semester: sourceYearLabel,
          },
        );
        if (
          await tx.coursePrerequisite.count({ where: { courseId: course.id } })
        )
          throw new Error(
            "Unexpected prerequisite on generated demonstration course.",
          );
      }
      const periods = [];
      const baseline = await tx.academicPeriod.findUnique({
        where: { code: "2026S1" },
      });
      const initialPeriod = foundationPeriod(baseline, now);
      for (const template of blocks) {
        const block =
          template.period === "2026S1"
            ? { ...template, period: initialPeriod }
            : template;
        // Reuse only a currently usable baseline; never create or change shared2026S1.
        if (block.period === "2026S1") {
          periods.push({
            ...block,
            registrationOpen: baseline.registrationOpen,
            registrationClose: baseline.registrationClose,
          });
        } else {
          const period = await ensure(
            tx.academicPeriod,
            { code: block.period },
            {
              id: stableId(`period:${block.period}`),
              code: block.period,
              registrationOpen: start,
              registrationClose: end,
              addDropClose: end,
              status: "OPEN",
            },
          );
          periods.push({
            ...block,
            registrationOpen: period.registrationOpen,
            registrationClose: period.registrationClose,
          });
        }
      }
      const students = [];
      for (const [index, name] of actors.entries()) {
        const user = manifest.users.find(
          (u) => u.username === `sis.demo.${name}`,
        );
        const accountId = stableId(`account:${name}`);
        const person = await ensure(
          tx.person,
          { id: stableId(`person:${name}`) },
          {
            id: stableId(`person:${name}`),
            displayName: `${user.firstname} ${user.lastname}`,
            email: user.email,
            status: "ACTIVE",
            duplicateOfPersonId: null,
          },
        );
        const account = await ensure(
          tx.account,
          { username: user.username },
          {
            id: accountId,
            personId: person.id,
            username: user.username,
            status: "ACTIVE",
          },
        );
        if (account.lockedUntil && account.lockedUntil > now)
          throw new Error(
            "Generated account is locked; use recovery rather than overwrite.",
          );
        const active = await tx.credential.findMany({
          where: {
            accountId,
            kind: "PASSWORD",
            status: "ACTIVE",
            supersededAt: null,
          },
        });
        const password = credentials[user.username];
        if (active.length) {
          if (
            active.length !== 1 ||
            active[0].id !== stableId(`credential:${name}`) ||
            !(await passwords.verify(active[0].secretHash, password))
          )
            throw new Error(
              "Existing credential differs; no password replacement permitted.",
            );
        } else {
          if (await tx.credential.count({ where: { accountId } }))
            throw new Error(
              "Existing credential history requires recovery, not bootstrap.",
            );
          await tx.credential.create({
            data: {
              id: stableId(`credential:${name}`),
              accountId,
              kind: "PASSWORD",
              secretHash: await passwords.hash(password),
              status: "ACTIVE",
            },
          });
        }
        let student;
        if (index < 3)
          student = await ensure(
            tx.student,
            { personId: person.id },
            {
              id: stableId(`student:${name}`),
              personId: person.id,
              studentNumber: `DEMO-EE-2026-00${index + 1}`,
              status: "ACTIVE",
            },
          );
        const role = index < 3 ? "STUDENT" : "LEC";
        const scopeRef = student?.id ?? "DEMO-EE-2026";
        const roleData = {
          id: stableId(`role:${name}`),
          accountId,
          role,
          scopeType: student ? "STUDENT" : "OFFERING",
          scopeRef,
          capabilities: student ? ["study"] : ["teach", "stage-marks"],
          startsAt: start,
          endsAt: end,
          appointmentRef: marker,
          authoritySource: "Owner-authorized generated demonstration",
          reason: "Generated SIS/Moodle demonstration only",
          revokedAt: null,
        };
        const roles = await tx.roleAssignment.findMany({
          where: { accountId },
        });
        if (roles.some((r) => r.id !== roleData.id))
          throw new Error(
            "Unexpected existing actor privileges; no privilege overwrite permitted.",
          );
        await ensure(tx.roleAssignment, { id: roleData.id }, roleData);
        if (student) {
          const attempt = await ensure(
            tx.programmeAttempt,
            { id: stableId(`attempt:${name}`) },
            {
              id: stableId(`attempt:${name}`),
              studentId: student.id,
              applicationId: stableId(`pre-admitted:${name}`),
              offeringId: offering.id,
              intake: "2026",
              curriculumVersionId: curriculum.id,
            },
          );
          if (!["ADMITTED", "ACTIVE"].includes(attempt.status))
            throw new Error("Unexpected demonstration attempt state.");
          students.push({
            username: user.username,
            attemptId: attempt.id,
            blocks: periods,
          });
        } else {
          await ensure(
            tx.teachingAssignment,
            { id: stableId("teaching") },
            {
              id: stableId("teaching"),
              accountId,
              role: "LEC",
              offeringId: offering.id,
              groupId: null,
              capabilities: ["teach", "stage-marks"],
              effectiveFrom: start,
              effectiveTo: end,
              status: "ACTIVE",
            },
          );
        }
      }
      await tx.auditEvent.create({
        data: {
          action: "GeneratedMoodleSisDemoPrepared",
          activeRole: "DEMO_BOOTSTRAP",
          scope: marker,
          targetRef: programme.id,
          outcome: "ALLOW",
          correlationId: randomUUID(),
          purpose: "Owner-authorized generated demonstration bootstrap",
          metadata: {
            version: marker,
            users: 4,
            courses: 12,
            formalRegistrationsInserted: 0,
          },
        },
      });
      return {
        version: marker,
        programmeCode: programme.code,
        students,
        teacher: {
          username: "sis.demo.nasilele.tembo",
          role: "LEC",
          scopeType: "OFFERING",
          scopeRef: "DEMO-EE-2026",
          programmeOfferingId: offering.id,
        },
        automaticMoodleDelivery: false,
        formalRegistrationsInserted: 0,
      };
    },
    { maxWait: 30000, timeout: 120000 },
  );
}
async function main() {
  assertTarget(process.env);
  const args = process.argv.slice(2);
  if (
    args.length !== 4 ||
    args[0] !== "--manifest-file" ||
    args[2] !== "--credentials-file"
  )
    throw new Error(
      "Provide --manifest-file and --credentials-file explicitly.",
    );
  const manifest = readIgnoredJson(args[1]);
  const credentials = readIgnoredJson(args[3], true);
  validateInputs(manifest, credentials);
  const [{ PrismaClient }, { PrismaPg }, passwords] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
    import("argon2"),
  ]);
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await db.$connect();
    console.log(
      JSON.stringify(
        await prepare(db, manifest, credentials, passwords),
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(() => {
    console.error(
      "Generated SIS demonstration bootstrap refused or failed. No credentials were printed. Review inputs and target without replacing existing records.",
    );
    process.exitCode = 1;
  });
