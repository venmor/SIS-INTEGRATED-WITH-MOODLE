import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { seedDemoUniversityAccounts } from "../prisma/seed/demo-university.mjs";
const { hash } = createRequire(import.meta.url)("argon2");

test("account preparation refuses expired or suspended actors and a shared person", async () => {
  const saved = Object.fromEntries(
    ["DEMO_MODE", "SIS_ENABLE_INSTITUTION_DEMO_SETUP", "DATABASE_URL"].map(
      (key) => [key, process.env[key]],
    ),
  );
  Object.assign(process.env, {
    DEMO_MODE: "true",
    SIS_ENABLE_INSTITUTION_DEMO_SETUP: "true",
    DATABASE_URL: "postgresql://demo:demo@127.0.0.1/sis_setup003_test",
  });
  const hashes = {
    "nalumino.setup": await hash("Seed-2026-Setup"),
    "chileshe.policy": await hash("Seed-2026-Policy"),
  };
  const live = (username) => ({
    username,
    status: "ACTIVE",
    personId: username,
    person: { status: "ACTIVE" },
    credentials: [
      { kind: "PASSWORD", status: "ACTIVE", secretHash: hashes[username] },
    ],
    roles: [
      {
        role: "DOMAIN_ADMIN",
        scopeType: "SYSTEM",
        scopeRef: "DEMO-UNIVERSITY",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2027-01-01"),
        capabilities: [
          username === "nalumino.setup"
            ? "institution-demo-setup-propose"
            : "institution-demo-setup-approve",
        ],
        revokedAt: null,
      },
    ],
  });
  try {
    for (const condition of [
      "expired",
      "suspended",
      "same-person",
      "credential",
    ]) {
      const db = {
        account: {
          findUnique: async ({ where }) => {
            const row = live(where.username);
            if (condition === "expired")
              row.roles[0].endsAt = new Date("2020-01-01");
            if (condition === "suspended") row.status = "SUSPENDED";
            if (condition === "same-person") row.personId = "shared-person";
            if (condition === "credential") row.credentials = [];
            return row;
          },
          create: () =>
            assert.fail("Existing actors must never be overwritten."),
        },
      };
      await assert.rejects(
        seedDemoUniversityAccounts(db),
        condition === "same-person"
          ? /independent people/
          : condition === "credential"
            ? /credential differs/
            : /active fictional appointment/,
      );
    }
  } finally {
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
