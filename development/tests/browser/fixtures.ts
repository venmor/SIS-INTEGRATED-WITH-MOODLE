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
