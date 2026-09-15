// Demo seed v0.1 — FICTIONAL persons only (TASK-PH1-001). Idempotent: safe to
// re-run; every record is keyed by a stable natural key (username /
// account+role+scope+startsAt). Passwords follow the documented demo pattern
// and are argon2id-hashed here — never stored or printed in plain text.
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
  reason: string;
}

interface SeedAccount {
  username: string;
  personName: string;
  password: string;
  roles: SeedRole[];
}

const SEED: SeedAccount[] = [
  {
    username: "mutinta.l",
    personName: "Mutinta L.",
    password: "Seed-2026-Mutinta",
    roles: [
      {
        role: "LEC",
        scopeType: "OFFERING",
        scopeRef: "CSE101-2026S1",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        reason: "Teaching assignment 2026S1",
      },
      {
        role: "DEAN",
        scopeType: "SCHOOL",
        scopeRef: "SNS",
        startsAt: "2026-02-01T00:00:00Z",
        endsAt: null,
        reason: "Acting dean appointment",
      },
      {
        role: "TUT",
        scopeType: "TUTORIAL_GROUP",
        scopeRef: "CSE101-TG2-2025S2",
        startsAt: "2025-07-15T00:00:00Z",
        endsAt: "2025-12-31T23:59:59Z",
        reason: "Prior tutorial assignment (expired)",
      },
    ],
  },
  {
    username: "chanda.k",
    personName: "Chanda K.",
    password: "Seed-2026-Chanda",
    roles: [
      {
        role: "STU",
        scopeType: "PERSON",
        scopeRef: "self",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        reason: "Enrolment record",
      },
    ],
  },
  {
    username: "bwalya.m",
    personName: "Bwalya M.",
    password: "Seed-2026-Bwalya",
    roles: [
      {
        role: "APP",
        scopeType: "APPLICATION",
        scopeRef: "BWL-2026-001",
        startsAt: "2026-01-15T00:00:00Z",
        endsAt: null,
        reason: "Application submitted for review",
      },
    ],
  },
  {
    username: "mweene.t",
    personName: "Mweene T.",
    password: "Seed-2026-Mweene",
    roles: [
      {
        role: "SYSADMIN",
        scopeType: "SYSTEM",
        scopeRef: "GLOBAL",
        startsAt: "2026-01-01T00:00:00Z",
        endsAt: null,
        reason: "Initial identity administrator",
      },
    ],
  },
];

async function ensureAccount(entry: SeedAccount, granterId: string | null): Promise<void> {
  const passwordHash = await hash(entry.password);
  let account = await prisma.account.findUnique({
    where: { username: entry.username },
  });
  if (!account) {
    const person = await prisma.person.create({
      data: { displayName: entry.personName },
    });
    account = await prisma.account.create({
      data: {
        personId: person.id,
        username: entry.username,
        passwordHash,
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
          reason: r.reason,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  // Identity administrator first so later grants reference a granter.
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
  };
  console.log(`seed v0.1 complete: ${counts.persons} persons, ${counts.accounts} accounts, ${counts.roles} role assignments`);
}

await main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
