// Demo seed v0.2 — FICTIONAL persons only (TASK-PH1-001 + corrections).
// Scopes align with DEMO-ACADEMIC-2026-v1 (05/05): schools Computing / Health
// Sciences / Business, 2026, Africa/Lusaka. Offering/TG codes (SWE101-…) are
// seed-local under BSc Software Engineering until curriculum tables land.
// Contacts use reserved .invalid domains and fictional +260 numbers.
// Idempotent: stable natural keys (username / account+role+scope+startsAt).
// Passwords follow the documented demo pattern, argon2id-hashed into the
// Credential table — never stored or printed in plain text.
// Erasable TypeScript only (runs on Node 24 type stripping, no runner dep).

// Local-demo kill-switch: this seed must never run outside an explicit local
// reset (predictable fictional passwords). demo:reset sets the flag;
// any other invocation aborts before touching the database.
if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error(
    "refusing: set ALLOW_DEMO_SEED=true via `npm run demo:reset` (local demo only)",
  );
  process.exit(1);
}

import { createRequire } from "node:module";

// Both client and hasher ship as CommonJS — load via require for reliable
// ESM interop under Node type stripping (named ESM imports fail here).
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { hash } = require("argon2");

// Prisma 7 connects through a driver adapter (no built-in engine).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

interface SeedRole {
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: string;
  endsAt: string | null;
  appointmentRef: string | null;
  authoritySource: string | null;
  capabilities: string[];
  employmentType: string | null;
  reason: string;
}

interface SeedAccount {
  username: string;
  personName: string;
  email: string;
  phone: string;
  password: string;
  roles: SeedRole[];
}

const SEED: SeedAccount[] = [
  {
    username: "mutinta.l",
    personName: "Mutinta L.",
    email: "mutinta.l@demo.invalid",
    phone: "+260950000001",
    password: "Seed-2026-Mutinta",
    roles: [
      {
        role: "LEC",
        scopeType: "OFFERING",
        scopeRef: "SWE101-2026S1",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        appointmentRef: "HR-2026-014",
        authoritySource: "University Appointments",
        capabilities: ["teach", "stage-marks"],
        employmentType: "PERMANENT",
        reason: "Teaching assignment 2026S1",
      },
      {
        role: "DEAN",
        scopeType: "SCHOOL",
        scopeRef: "Computing",
        startsAt: "2026-02-01T00:00:00Z",
        endsAt: null,
        appointmentRef: "COUNCIL-2026-003",
        authoritySource: "University Council",
        capabilities: ["approve-school-decisions"],
        employmentType: "ACTING",
        reason: "Acting dean appointment",
      },
      {
        role: "TUT",
        scopeType: "TUTORIAL_GROUP",
        scopeRef: "SWE101-TG2-2025S2",
        startsAt: "2025-07-15T00:00:00Z",
        endsAt: "2025-12-31T23:59:59Z",
        appointmentRef: "HR-2025-089",
        authoritySource: "University Appointments",
        capabilities: ["mark-delegated-activities"],
        employmentType: "PERMANENT",
        reason: "Prior tutorial assignment (expired)",
      },
    ],
  },
  {
    username: "chanda.k",
    personName: "Chanda K.",
    email: "chanda.k@demo.invalid",
    phone: "+260950000002",
    password: "Seed-2026-Chanda",
    roles: [
      {
        role: "STU",
        scopeType: "PERSON",
        scopeRef: "self",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        appointmentRef: "REG-2026-011",
        authoritySource: "Registry enrolment",
        capabilities: ["self-view"],
        employmentType: null,
        reason: "Enrolment record",
      },
    ],
  },
  {
    username: "bwalya.m",
    personName: "Bwalya M.",
    email: "bwalya.m@demo.invalid",
    phone: "+260950000003",
    password: "Seed-2026-Bwalya",
    roles: [
      {
        role: "APP",
        scopeType: "APPLICATION",
        scopeRef: "BWL-2026-001",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        appointmentRef: "ADM-2026-001",
        authoritySource: "Admissions intake",
        capabilities: ["apply"],
        employmentType: null,
        reason: "Application submitted for review",
      },
    ],
  },
  {
    username: "mweene.t",
    personName: "Mweene T.",
    email: "mweene.t@demo.invalid",
    phone: "+260950000004",
    password: "Seed-2026-Mweene",
    roles: [
      {
        role: "SYSADMIN",
        scopeType: "SYSTEM",
        scopeRef: "GLOBAL",
        startsAt: "2026-01-01T00:00:00Z",
        endsAt: null,
        appointmentRef: "SYS-2026-001",
        authoritySource: "System establishment",
        capabilities: ["administer-identity"],
        employmentType: "PERMANENT",
        reason: "Initial identity administrator",
      },
    ],
  },
];

async function ensureAccount(
  entry: SeedAccount,
  granterId: string | null,
): Promise<void> {
  let account = await prisma.account.findUnique({
    where: { username: entry.username },
  });
  if (!account) {
    const person = await prisma.person.create({
      data: {
        displayName: entry.personName,
        email: entry.email,
        phone: entry.phone,
      },
    });
    account = await prisma.account.create({
      data: {
        personId: person.id,
        username: entry.username,
        status: "ACTIVE",
      },
    });
  }
  const activePassword = await prisma.credential.findFirst({
    where: { accountId: account.id, kind: "PASSWORD", status: "ACTIVE" },
  });
  if (!activePassword) {
    await prisma.credential.create({
      data: {
        accountId: account.id,
        kind: "PASSWORD",
        secretHash: await hash(entry.password),
        status: "ACTIVE",
      },
    });
  }
  for (const r of entry.roles) {
    const scopeRef = r.scopeRef === "self" ? account.personId : r.scopeRef;
    const existing = await prisma.roleAssignment.findFirst({
      where: {
        accountId: account.id,
        role: r.role,
        scopeType: r.scopeType,
        scopeRef,
        startsAt: new Date(r.startsAt),
      },
    });
    if (!existing) {
      await prisma.roleAssignment.create({
        data: {
          accountId: account.id,
          role: r.role,
          scopeType: r.scopeType,
          scopeRef,
          startsAt: new Date(r.startsAt),
          endsAt: r.endsAt ? new Date(r.endsAt) : null,
          grantedById: granterId,
          approverId: granterId,
          appointmentRef: r.appointmentRef,
          authoritySource: r.authoritySource,
          capabilities: r.capabilities,
          employmentType: r.employmentType,
          reason: r.reason,
        },
      });
    }
  }
}

// Quarterly review backfill (§12.12 journey: grants join the schedules).
// Idempotent: one pending schedule per assignment. Risk/cadence mirror the
// security.* demo configuration (GAP-010 institutional override pending).
async function ensureReviewSchedules(reviewerId: string): Promise<void> {
  const readConfig = async (key: string): Promise<unknown> => {
    const row = await prisma.configurationItem.findUnique({ where: { key } });
    if (!row) return null;
    const value = row.value as unknown;
    return typeof value === "string" ? JSON.parse(value) : value;
  };
  const fallbackRisks: Record<string, string> = {
    SYSADMIN: "high",
    DEAN: "high",
    LEC: "medium",
    TUT: "low",
    STU: "low",
    APP: "low",
  };
  const risks =
    ((await readConfig("security.roleRiskLevels")) as Record<
      string,
      string
    > | null) ?? fallbackRisks;
  const daysFor = async (risk: string): Promise<number> => {
    const days = (await readConfig(`security.reviewCadence.${risk}`)) as
      number | null;
    return typeof days === "number" && days > 0
      ? days
      : ({ high: 30, medium: 90, low: 180 }[risk] ?? 90);
  };
  const assignments = await prisma.roleAssignment.findMany({
    where: {
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      // Emergency access is temporary by construction: never scheduled.
      NOT: { scopeType: "BREAK_GLASS" },
    },
    select: { id: true, role: true },
  });
  for (const assignment of assignments) {
    const open = await prisma.reviewSchedule.findFirst({
      where: { assignmentId: assignment.id, status: "pending" },
    });
    if (open) continue;
    const risk = ["high", "medium", "low"].includes(risks[assignment.role])
      ? risks[assignment.role]
      : "medium";
    const days = await daysFor(risk);
    await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId,
        riskLevel: risk,
        cadence: risk === "high" ? "quarterly" : "annual",
        nextDueAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        status: "pending",
      },
    });
  }
}

// Public catalogue seed (TASK-PH2-001, DEMO-ACADEMIC-2026-v1: exactly the 3
// demo programmes, fictional). Idempotent: unique code / composite offering /
// programme+ruleKey+version. Closed/soon states ride intake availability so
// handbook §3.3 states are provable without extra programmes.
interface SeedRule {
  ruleKey: string;
  label: string;
  kind: "GRADE" | "BOOLEAN" | "TEXT";
  mandatory: boolean;
  minGrade: number | null;
  requiresVerification: boolean;
  evidence: string;
  routeCode: string | null;
}

interface SeedOffering {
  intake: string;
  studyMode: string;
  campus: string;
  availability: "OPEN" | "SOON" | "CLOSED" | "RETIRED";
  deadline: string | null;
  statusNote: string | null;
}

interface SeedProgramme {
  code: string;
  name: string;
  awardLevel: string;
  school: string;
  department: string | null;
  duration: string;
  overview: string;
  feeScheduleRef: string;
  offerings: SeedOffering[];
  rules: SeedRule[];
}

const ROUTES: Array<{ code: string; label: string }> = [
  { code: "ECZ", label: "Grade 12 / ECZ" },
  { code: "DIPLOMA", label: "Diploma" },
  { code: "DEGREE", label: "Bachelor's degree" },
  { code: "POSTGRAD", label: "Postgraduate" },
  { code: "INTL", label: "International qualification" },
];

const CATALOGUE: SeedProgramme[] = [
  {
    code: "SWE",
    name: "BSc Software Engineering",
    awardLevel: "Bachelor's degree",
    school: "Computing",
    department: "Software Engineering",
    duration: "4 years",
    overview:
      "Full-time undergraduate study in software design, construction and teamwork.",
    feeScheduleRef: "DEMO-ACADEMIC-2026-v1/fees/undergraduate",
    offerings: [
      {
        intake: "2026S1",
        studyMode: "Full-time",
        campus: "Main Campus",
        availability: "OPEN",
        deadline: "2026-09-30T23:59:00+02:00",
        statusNote: null,
      },
      {
        intake: "2026S2",
        studyMode: "Full-time",
        campus: "Main Campus",
        availability: "SOON",
        deadline: null,
        statusNote: "Applications open soon for this intake.",
      },
    ],
    rules: [
      {
        ruleKey: "math",
        label: "Mathematics",
        kind: "GRADE",
        mandatory: true,
        minGrade: 6,
        requiresVerification: false,
        evidence: "Grade 12 result statement",
        routeCode: "ECZ",
      },
      {
        ruleKey: "english",
        label: "English",
        kind: "GRADE",
        mandatory: true,
        minGrade: 6,
        requiresVerification: false,
        evidence: "Grade 12 result statement",
        routeCode: "ECZ",
      },
      {
        ruleKey: "ecz-statement",
        label: "Verified result statement",
        kind: "BOOLEAN",
        mandatory: true,
        minGrade: null,
        requiresVerification: true,
        evidence: "ECZ result statement",
        routeCode: null,
      },
      {
        ruleKey: "zaqa",
        label: "Equivalency assessment",
        kind: "BOOLEAN",
        mandatory: true,
        minGrade: null,
        requiresVerification: true,
        evidence: "ZAQA or other equivalency evidence",
        routeCode: "INTL",
      },
    ],
  },
  {
    code: "RAD",
    name: "BSc Radiography",
    awardLevel: "Bachelor's degree",
    school: "Health Sciences",
    department: "Radiography",
    duration: "4 years",
    overview:
      "Full-time undergraduate study in diagnostic imaging and patient care.",
    feeScheduleRef: "DEMO-ACADEMIC-2026-v1/fees/undergraduate",
    offerings: [
      {
        intake: "2026S1",
        studyMode: "Full-time",
        campus: "Main Campus",
        availability: "OPEN",
        deadline: "2026-09-30T23:59:00+02:00",
        statusNote: null,
      },
    ],
    rules: [
      {
        ruleKey: "math",
        label: "Mathematics",
        kind: "GRADE",
        mandatory: true,
        minGrade: 6,
        requiresVerification: false,
        evidence: "Grade 12 result statement",
        routeCode: "ECZ",
      },
      {
        ruleKey: "science",
        label: "Science subject",
        kind: "GRADE",
        mandatory: true,
        minGrade: 6,
        requiresVerification: false,
        evidence: "Grade 12 result statement",
        routeCode: "ECZ",
      },
      {
        ruleKey: "ecz-statement",
        label: "Verified result statement",
        kind: "BOOLEAN",
        mandatory: true,
        minGrade: null,
        requiresVerification: true,
        evidence: "ECZ result statement",
        routeCode: null,
      },
    ],
  },
  {
    code: "BBA",
    name: "Bachelor of Business Administration",
    awardLevel: "Bachelor's degree",
    school: "Business",
    department: "Business Administration",
    duration: "4 years",
    overview:
      "Full-time undergraduate study in management, finance and enterprise.",
    feeScheduleRef: "DEMO-ACADEMIC-2026-v1/fees/undergraduate",
    offerings: [
      {
        intake: "2026S1",
        studyMode: "Full-time",
        campus: "Main Campus",
        availability: "CLOSED",
        deadline: null,
        statusNote:
          "This programme is not accepting applications for the selected intake. The next planned intake is being confirmed.",
      },
    ],
    rules: [
      {
        ruleKey: "english",
        label: "English",
        kind: "GRADE",
        mandatory: true,
        minGrade: 6,
        requiresVerification: false,
        evidence: "Grade 12 result statement",
        routeCode: "ECZ",
      },
      {
        ruleKey: "ecz-statement",
        label: "Verified result statement",
        kind: "BOOLEAN",
        mandatory: true,
        minGrade: null,
        requiresVerification: true,
        evidence: "ECZ result statement",
        routeCode: null,
      },
    ],
  },
];

async function ensureCatalogue(): Promise<void> {
  for (const route of ROUTES) {
    const existing = await prisma.qualificationRoute.findUnique({
      where: { code: route.code },
    });
    if (!existing) {
      await prisma.qualificationRoute.create({ data: route });
    }
  }
  for (const entry of CATALOGUE) {
    let programme = await prisma.programme.findUnique({
      where: { code: entry.code },
    });
    if (!programme) {
      programme = await prisma.programme.create({
        data: {
          code: entry.code,
          name: entry.name,
          awardLevel: entry.awardLevel,
          school: entry.school,
          department: entry.department,
          duration: entry.duration,
          overview: entry.overview,
          feeScheduleRef: entry.feeScheduleRef,
          publishedVersion: "DEMO-ACADEMIC-2026-v1",
          effectiveDate: new Date("2026-01-01T00:00:00Z"),
          owningOffice: "Admissions",
        },
      });
    }
    for (const offering of entry.offerings) {
      const existing = await prisma.programmeOffering.findUnique({
        where: {
          programmeId_intake_studyMode_campus: {
            programmeId: programme.id,
            intake: offering.intake,
            studyMode: offering.studyMode,
            campus: offering.campus,
          },
        },
      });
      if (!existing) {
        await prisma.programmeOffering.create({
          data: {
            programmeId: programme.id,
            intake: offering.intake,
            studyMode: offering.studyMode,
            campus: offering.campus,
            availability: offering.availability,
            deadline: offering.deadline ? new Date(offering.deadline) : null,
            statusNote: offering.statusNote,
          },
        });
      } else {
        // Demo correction path: availability/deadline/note follow the seed
        // on re-run so stale demo states never persist (additive only).
        const deadline = offering.deadline ? new Date(offering.deadline) : null;
        if (
          existing.availability !== offering.availability ||
          existing.statusNote !== offering.statusNote ||
          (existing.deadline?.getTime() ?? null) !==
            (deadline?.getTime() ?? null)
        ) {
          await prisma.programmeOffering.update({
            where: { id: existing.id },
            data: {
              availability: offering.availability,
              deadline,
              statusNote: offering.statusNote,
            },
          });
        }
      }
    }
    for (const rule of entry.rules) {
      const route = rule.routeCode
        ? await prisma.qualificationRoute.findUnique({
            where: { code: rule.routeCode },
          })
        : null;
      const existing = await prisma.requirementRule.findUnique({
        where: {
          programmeId_ruleKey_version: {
            programmeId: programme.id,
            ruleKey: rule.ruleKey,
            version: 1,
          },
        },
      });
      if (!existing) {
        await prisma.requirementRule.create({
          data: {
            programmeId: programme.id,
            routeId: route ? route.id : null,
            ruleKey: rule.ruleKey,
            label: rule.label,
            kind: rule.kind,
            mandatory: rule.mandatory,
            minGrade: rule.minGrade,
            requiresVerification: rule.requiresVerification,
            evidence: rule.evidence,
            version: 1,
          },
        });
      }
    }
  }
}

async function main(): Promise<void> {
  // Identity administrator first so later grants reference a granter/approver.
  const admin = SEED.find((s) => s.username === "mweene.t") as SeedAccount;
  await ensureAccount(admin, null);
  const granter = await prisma.account.findUniqueOrThrow({
    where: { username: admin.username },
  });
  for (const entry of SEED.filter((s) => s.username !== admin.username)) {
    await ensureAccount(entry, granter.id);
  }
  await ensureReviewSchedules(granter.id);
  await ensureCatalogue();
  // Explicit fictional verified-contact fixture; never infer verification for real users.
  if (process.env.DEMO_MODE === "true") {
    const applicant = await prisma.account.findUnique({
      where: { username: "bwalya.m" },
    });
    if (applicant)
      await prisma.person.update({
        where: { id: applicant.personId },
        data: { emailVerifiedAt: new Date("2026-09-19T00:00:00Z") },
      });
  }
  const counts = {
    persons: await prisma.person.count(),
    accounts: await prisma.account.count(),
    roles: await prisma.roleAssignment.count(),
    credentials: await prisma.credential.count(),
    programmes: await prisma.programme.count(),
    offerings: await prisma.programmeOffering.count(),
    rules: await prisma.requirementRule.count(),
  };
  console.log(
    `seed v0.2 complete: ${counts.persons} persons, ${counts.accounts} accounts, ${counts.roles} role assignments, ${counts.credentials} credentials, ${counts.programmes} programmes, ${counts.offerings} offerings, ${counts.rules} requirement rules`,
  );
}

await main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
