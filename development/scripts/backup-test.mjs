// backup:test — prove backup usability (Phase 1 slice 5 DoD, §12.14:
// "Restore testing proves backup usability"). Local-dev only, fictional data.
// Flow: record per-table counts → pg_dump to a temp file → restore into a
// scratch database → compare counts → print a JSON reconciliation log → drop
// the scratch database. Exits non-zero on any mismatch (CI/dev gate).
// Never prints connection values (secret-safe logging).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ root, requireFile: true });

const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("DATABASE_URL is missing");
const SCRATCH_DB = process.env.BACKUP_TEST_DB ?? "sis_backup_test";

const TABLES = [
  "Person",
  "Account",
  "Credential",
  "RoleAssignment",
  "Session",
  "RecoveryToken",
  "AuditEvent",
  "IdempotencyKey",
  "OutboxEvent",
  "ConfigurationItem",
  "ConfigurationVersion",
  "ReviewSchedule",
  "BreakGlassRequest",
  "ExpiryWarning",
  "ExpiryDaemonState",
];

function psql(url, sql) {
  return execFileSync("psql", [url, "-tAc", sql], { encoding: "utf8" }).trim();
}

function scratchUrl() {
  const url = new URL(DATABASE_URL);
  url.pathname = `/${SCRATCH_DB}`;
  return url.toString();
}

function secretEnv() {
  // pg tools read PGPASSWORD; derive it without ever logging the URL.
  try {
    const password = new URL(DATABASE_URL).password;
    return password
      ? { ...process.env, PGPASSWORD: password }
      : { ...process.env };
  } catch {
    return { ...process.env };
  }
}

const workdir = mkdtempSync(join(tmpdir(), "sis-backup-test-"));
const dumpFile = join(workdir, "sis-backup.sql");
const result = {
  tables: {},
  match: true,
  dumpFile: "<temp>",
  scratchDb: SCRATCH_DB,
};
try {
  const before = {};
  for (const table of TABLES) {
    before[table] = Number(
      psql(DATABASE_URL, `SELECT COUNT(*) FROM "${table}";`),
    );
  }
  execFileSync("pg_dump", [DATABASE_URL, "--no-owner", "--file", dumpFile], {
    stdio: "ignore",
    env: secretEnv(),
  });
  execFileSync(
    "psql",
    [DATABASE_URL, "-c", `DROP DATABASE IF EXISTS "${SCRATCH_DB}";`],
    { stdio: "ignore" },
  );
  execFileSync(
    "psql",
    [DATABASE_URL, "-c", `CREATE DATABASE "${SCRATCH_DB}";`],
    { stdio: "ignore" },
  );
  execFileSync("psql", [scratchUrl(), "-f", dumpFile], { stdio: "ignore" });
  for (const table of TABLES) {
    const expected = before[table];
    const actual = Number(
      psql(scratchUrl(), `SELECT COUNT(*) FROM "${table}";`),
    );
    const ok = expected === actual;
    result.tables[table] = { expected, actual, ok };
    if (!ok) result.match = false;
  }
  // Business reconciliation beyond counts: no dangling references in the
  // restored copy (referential breaks are silent data corruption that
  // count-equality alone would bless).
  const orphans = {
    assignmentsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "RoleAssignment" ra LEFT JOIN "Account" a ON a.id = ra."accountId" WHERE a.id IS NULL;',
      ),
    ),
    sessionsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "Session" s LEFT JOIN "Account" a ON a.id = s."accountId" WHERE a.id IS NULL;',
      ),
    ),
    warningsWithoutAssignment: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ExpiryWarning" w LEFT JOIN "RoleAssignment" ra ON ra.id = w."assignmentId" WHERE ra.id IS NULL;',
      ),
    ),
    schedulesWithoutAssignment: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ReviewSchedule" rs LEFT JOIN "RoleAssignment" ra ON ra.id = rs."assignmentId" WHERE ra.id IS NULL;',
      ),
    ),
  };
  result.orphans = orphans;
  for (const [name, count] of Object.entries(orphans)) {
    if (count !== 0) {
      result.match = false;
      console.error(`backup:test FAILED — orphan rows: ${name}=${count}`);
    }
  }
} finally {
  try {
    execFileSync(
      "psql",
      [DATABASE_URL, "-c", `DROP DATABASE IF EXISTS "${SCRATCH_DB}";`],
      { stdio: "ignore" },
    );
  } catch {
    // Best effort: a leftover scratch DB never blocks the verdict below.
  }
  rmSync(workdir, { recursive: true, force: true });
}

console.log(JSON.stringify(result, null, 2));
// CI evidence artifact: the reconciliation log survives on disk outside the
// scratch dir (which is removed below with the dump). Path printed so
// release evidence can collect it.
const artifact = join(tmpdir(), `sis-backup-reconciliation-${Date.now()}.json`);
// Secret-bearing dump content (credential hashes, token hashes): owner-only.
writeFileSync(artifact, JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(`reconciliation artifact: ${artifact}`);
if (!result.match) {
  console.error("backup:test FAILED — restored counts differ");
  process.exit(1);
}
console.log("backup:test complete — restored counts reconcile");
