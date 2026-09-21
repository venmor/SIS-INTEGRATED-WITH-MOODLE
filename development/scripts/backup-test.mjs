// backup:test — prove backup usability (Phase 1 slice 5 DoD, §12.14:
// "Restore testing proves backup usability"). Local-dev only, fictional data.
// Flow: record per-table counts → pg_dump to a temp file → restore into a
// scratch database → compare counts → print a JSON reconciliation log → drop
// the scratch database. Exits non-zero on any mismatch (CI/dev gate).
// Never prints connection values (secret-safe logging).
import { randomUUID } from "node:crypto";
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
try {
  const parsed = new URL(DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error();
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
}
const SCRATCH_DB =
  process.env.BACKUP_TEST_DB ??
  `sis_backup_test_${randomUUID().replaceAll("-", "")}`;

if (
  !/^[a-z][a-z0-9_]{0,62}$/.test(SCRATCH_DB) ||
  new URL(DATABASE_URL).pathname.slice(1) === SCRATCH_DB
)
  throw new Error("Unsafe scratch database name");
let scratchCreated = false;

const TABLES = [
  "Application",
  "ApplicationRevision",
  "ApplicationDocument",
  "ApplicationSubmission",
  "ApplicationCommand",
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
  "QualificationRoute",
  "Programme",
  "ProgrammeOffering",
  "RequirementRule",
  "GuidanceSession",
  "ApplicationStatusEvent",
  "ApplicationClarification",
  "ApplicationCorrectionRequest",
  "ApplicationDecision",
  "SupportTicket",
  "SupportTicketMessage",
  "ApplicationWithdrawal",
  "ApplicantNotification",
  "ReviewAssignment",
  "ReviewFinding",
];

function connectionEnv(connection) {
  const url = new URL(connection);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    ...(url.searchParams.has("sslmode")
      ? { PGSSLMODE: url.searchParams.get("sslmode") }
      : {}),
  };
}
function runPg(tool, connection, args) {
  try {
    return execFileSync(tool, args, {
      encoding: "utf8",
      env: connectionEnv(connection),
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    // Never attach child-process errors: command arguments/environment may hold
    // secrets in other callers. This boundary emits only the operation name.
    throw new Error(
      `Backup verification failed in ${tool}; check connectivity, permissions and PostgreSQL tool versions.`,
    );
  }
}
function psql(connection, sql) {
  return runPg("psql", connection, [
    "--no-password",
    "-v",
    "ON_ERROR_STOP=1",
    "-tAc",
    sql,
  ]).trim();
}
function scratchUrl() {
  const url = new URL(DATABASE_URL);
  url.pathname = `/${SCRATCH_DB}`;
  return url.toString();
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
  runPg("pg_dump", DATABASE_URL, [
    "--no-password",
    "--no-owner",
    "--file",
    dumpFile,
  ]);
  psql(DATABASE_URL, `CREATE DATABASE "${SCRATCH_DB}";`);
  scratchCreated = true;
  runPg("psql", scratchUrl(), [
    "--no-password",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    dumpFile,
  ]);
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
    offeringsWithoutProgramme: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ProgrammeOffering" o LEFT JOIN "Programme" p ON p.id = o."programmeId" WHERE p.id IS NULL;',
      ),
    ),
    rulesWithoutProgramme: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "RequirementRule" r LEFT JOIN "Programme" p ON p.id = r."programmeId" WHERE p.id IS NULL;',
      ),
    ),
    rulesWithoutRoute: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "RequirementRule" r LEFT JOIN "QualificationRoute" q ON q.id = r."routeId" WHERE r."routeId" IS NOT NULL AND q.id IS NULL;',
      ),
    ),
    findingsWithoutApplication: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ReviewFinding" f LEFT JOIN "Application" a ON a.id = f."applicationId" WHERE a.id IS NULL;',
      ),
    ),
    assignmentsWithoutApplication: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ReviewAssignment" ra LEFT JOIN "Application" a ON a.id = ra."applicationId" WHERE a.id IS NULL;',
      ),
    ),
    caseRowsWithoutApplication: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM (SELECT "applicationId" FROM "ApplicationStatusEvent" UNION ALL SELECT "applicationId" FROM "ApplicationClarification" UNION ALL SELECT "applicationId" FROM "ApplicationCorrectionRequest" UNION ALL SELECT "applicationId" FROM "ApplicationDecision" UNION ALL SELECT "applicationId" FROM "ApplicationWithdrawal" UNION ALL SELECT "applicationId" FROM "ApplicationDocument") c LEFT JOIN "Application" a ON a.id = c."applicationId" WHERE a.id IS NULL;',
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
    if (scratchCreated) psql(DATABASE_URL, `DROP DATABASE "${SCRATCH_DB}";`);
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
