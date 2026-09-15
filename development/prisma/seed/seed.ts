// Demo seed v0.2 — FICTIONAL persons only (TASK-PH1-001 + corrections).
// Scopes align with DEMO-ACADEMIC-2026-v1 (05/05): schools Computing / Health
// Sciences / Business, 2026, Africa/Lusaka. Offering/TG codes (SWE101-…) are
// seed-local under BSc Software Engineering until curriculum tables land.
// Contacts use reserved .invalid domains and fictional +260 numbers.
// Idempotent: stable natural keys (username / account+role+scope+startsAt).
// Passwords follow the documented demo pattern, argon2id-hashed into the
// Credential table — never stored or printed in plain text.
// Erasable TypeScript only (runs on Node 24 type stripping, no runner dep).

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

async function ensureAccount(entry: SeedAccount, granterId: string | null): Promise<void> {
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
  const counts = {
    persons: await prisma.person.count(),
    accounts: await prisma.account.count(),
    roles: await prisma.roleAssignment.count(),
    credentials: await prisma.credential.count(),
  };
  console.log(
    `seed v0.2 complete: ${counts.persons} persons, ${counts.accounts} accounts, ${counts.roles} role assignments, ${counts.credentials} credentials`,
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
