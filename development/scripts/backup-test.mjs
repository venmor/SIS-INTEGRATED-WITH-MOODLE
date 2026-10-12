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
  // Slice PH8-006: full Phase 3–8 coverage (was: slices 0–2 only).
  // Every model in prisma/schema.prisma is listed; the drill fails
  // on any table the restore drops.
  "ApplicationDecisionRevision",
  "SupportTicketMessage",
  "ReviewRecommendation",
  "ApplicationOfferResponse",
  "OnboardingTask",
  "Student",
  "IdentityMatchCandidate",
  "ProgrammeAttempt",
  "CurriculumVersion",
  "AcademicPeriod",
  "StudentCorrectionRequest",
  "Hold",
  "FinanceClearance",
  "FinanceAccount",
  "FinanceInvoice",
  "FinanceChargeLine",
  "FinancePaymentRequest",
  "FinancePaymentTransaction",
  "FinancePaymentReversal",
  "FinanceCallback",
  "FinanceReconciliationCase",
  "FinanceAllocation",
  "FinanceAllocationReversal",
  "FinanceAdjustment",
  "TutorialGroup",
  "TGAllocation",
  "MoodleConnection",
  "MoodleMapping",
  "IntegrationDeliveryAttempt",
  "SimShell",
  "SimStudentEnrolment",
  "SimStaffRole",
  "ReconciliationRun",
  "ReconciliationCase",
  "ReplayDecision",
  "IntegrationIncident",
  "MoodleMaintenance",
  "SimGroupMember",
  "MappingCheck",
  "TeachingAssignment",
  "FinanceArrangement",
  "FinanceSponsorship",
  "Course",
  "CoursePrerequisite",
  "CurriculumCourse",
  "CoursePlan",
  "CoursePlanItem",
  "InstitutionalRegistration",
  "CourseRegistration",
  "RegistrationAmendment",
  "WaitlistEntry",
  "AssessmentPlan",
  "AssessmentComponent",
  "GradeActivityMapping",
  "GradeBatch",
  "GradeLine",
  "GradeFinding",
  "AssessmentCandidateList",
  "ModerationCase",
  "OfficialCARecord",
  "ResultPackage",
  "BoardDecision",
  "OfficialCourseResult",
  "ResultAmendmentCase",
  "AcademicImpactTask",
  "NotificationTemplate",
  "NotificationRecord",
  "NotificationDelivery",
  "OpsIncident",
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
        'SELECT COUNT(*) FROM (SELECT "applicationId" FROM "ApplicationStatusEvent" UNION ALL SELECT "applicationId" FROM "ApplicationClarification" UNION ALL SELECT "applicationId" FROM "ApplicationCorrectionRequest" UNION ALL SELECT "applicationId" FROM "ApplicationDecision" UNION ALL SELECT "applicationId" FROM "ApplicationWithdrawal" UNION ALL SELECT "applicationId" FROM "ApplicationDocument" UNION ALL SELECT "applicationId" FROM "ReviewRecommendation" UNION ALL SELECT "applicationId" FROM "ApplicationOfferResponse" UNION ALL SELECT "applicationId" FROM "OnboardingTask") c LEFT JOIN "Application" a ON a.id = c."applicationId" WHERE a.id IS NULL;',
      ),
    ),
    // Slice PH8-006: cross-domain orphans. Same value-join style as
    // above — plain String FKs without Prisma relations still join on
    // id equality, which is exactly what a restore must preserve.
    revisionsWithoutDecision: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ApplicationDecisionRevision" r LEFT JOIN "ApplicationDecision" d ON d.id = r."decisionId" WHERE d.id IS NULL;',
      ),
    ),
    messagesWithoutTicket: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SupportTicketMessage" m LEFT JOIN "SupportTicket" t ON t.id = m."ticketId" WHERE t.id IS NULL;',
      ),
    ),
    applicantNotificationsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ApplicantNotification" n LEFT JOIN "Account" a ON a.id = n."accountId" WHERE a.id IS NULL;',
      ),
    ),
    studentsWithoutPerson: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "Student" s LEFT JOIN "Person" p ON p.id = s."personId" WHERE p.id IS NULL;',
      ),
    ),
    attemptsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ProgrammeAttempt" a LEFT JOIN "Student" s ON s.id = a."studentId" WHERE s.id IS NULL;',
      ),
    ),
    attemptsWithoutOffering: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ProgrammeAttempt" a LEFT JOIN "ProgrammeOffering" o ON o.id = a."offeringId" WHERE o.id IS NULL;',
      ),
    ),
    attemptsWithoutApplication: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ProgrammeAttempt" a LEFT JOIN "Application" b ON b.id = a."applicationId" WHERE b.id IS NULL;',
      ),
    ),
    matchCandidatesWithoutApplication: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "IdentityMatchCandidate" c LEFT JOIN "Application" a ON a.id = c."applicationId" WHERE a.id IS NULL;',
      ),
    ),
    matchCandidatesWithoutPersons: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "IdentityMatchCandidate" c LEFT JOIN "Person" p ON p.id = c."personId" LEFT JOIN "Person" q ON q.id = c."candidatePersonId" WHERE p.id IS NULL OR q.id IS NULL;',
      ),
    ),
    correctionsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "StudentCorrectionRequest" c LEFT JOIN "Student" s ON s.id = c."studentId" WHERE s.id IS NULL;',
      ),
    ),
    holdsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "Hold" h LEFT JOIN "Student" s ON s.id = h."studentId" WHERE s.id IS NULL;',
      ),
    ),
    clearanceWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceClearance" c LEFT JOIN "Student" s ON s.id = c."studentId" WHERE s.id IS NULL;',
      ),
    ),
    accountsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAccount" a LEFT JOIN "Student" s ON s.id = a."studentId" WHERE s.id IS NULL;',
      ),
    ),
    invoicesWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceInvoice" i LEFT JOIN "FinanceAccount" a ON a.id = i."accountId" WHERE a.id IS NULL;',
      ),
    ),
    invoicesWithoutPeriod: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceInvoice" i LEFT JOIN "AcademicPeriod" p ON p.id = i."periodId" WHERE p.id IS NULL;',
      ),
    ),
    chargesWithoutInvoice: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceChargeLine" l LEFT JOIN "FinanceInvoice" i ON i.id = l."invoiceId" WHERE i.id IS NULL;',
      ),
    ),
    requestsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinancePaymentRequest" r LEFT JOIN "FinanceAccount" a ON a.id = r."accountId" WHERE a.id IS NULL;',
      ),
    ),
    requestsWithoutInvoice: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinancePaymentRequest" r LEFT JOIN "FinanceInvoice" i ON i.id = r."invoiceId" WHERE i.id IS NULL;',
      ),
    ),
    transactionsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinancePaymentTransaction" t LEFT JOIN "FinanceAccount" a ON a.id = t."accountId" WHERE a.id IS NULL;',
      ),
    ),
    transactionsWithoutRequest: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinancePaymentTransaction" t LEFT JOIN "FinancePaymentRequest" r ON r.id = t."requestId" WHERE t."requestId" IS NOT NULL AND r.id IS NULL;',
      ),
    ),
    reversalsWithoutTransactions: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinancePaymentReversal" r LEFT JOIN "FinancePaymentTransaction" o ON o.id = r."originalTransactionId" LEFT JOIN "FinancePaymentTransaction" e ON e.id = r."reversalTransactionId" WHERE o.id IS NULL OR e.id IS NULL;',
      ),
    ),
    allocationsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAllocation" a LEFT JOIN "FinanceAccount" f ON f.id = a."accountId" WHERE f.id IS NULL;',
      ),
    ),
    allocationsWithoutTransaction: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAllocation" a LEFT JOIN "FinancePaymentTransaction" t ON t.id = a."paymentTransactionId" WHERE t.id IS NULL;',
      ),
    ),
    allocationsWithoutChargeLine: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAllocation" a LEFT JOIN "FinanceChargeLine" l ON l.id = a."chargeLineId" WHERE l.id IS NULL;',
      ),
    ),
    allocationReversalsWithoutAllocation: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAllocationReversal" r LEFT JOIN "FinanceAllocation" a ON a.id = r."allocationId" WHERE a.id IS NULL;',
      ),
    ),
    adjustmentsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAdjustment" a LEFT JOIN "FinanceAccount" f ON f.id = a."accountId" WHERE f.id IS NULL;',
      ),
    ),
    adjustmentsWithoutPeriod: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceAdjustment" a LEFT JOIN "AcademicPeriod" p ON p.id = a."periodId" WHERE p.id IS NULL;',
      ),
    ),
    arrangementsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceArrangement" a LEFT JOIN "FinanceAccount" f ON f.id = a."accountId" WHERE f.id IS NULL;',
      ),
    ),
    arrangementsWithoutPeriod: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceArrangement" a LEFT JOIN "AcademicPeriod" p ON p.id = a."periodId" WHERE p.id IS NULL;',
      ),
    ),
    sponsorshipsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceSponsorship" s LEFT JOIN "FinanceAccount" f ON f.id = s."accountId" WHERE f.id IS NULL;',
      ),
    ),
    sponsorshipsWithoutPeriod: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceSponsorship" s LEFT JOIN "AcademicPeriod" p ON p.id = s."periodId" WHERE p.id IS NULL;',
      ),
    ),
    reconCasesWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "FinanceReconciliationCase" c LEFT JOIN "FinanceAccount" a ON a.id = c."accountId" WHERE c."accountId" IS NOT NULL AND a.id IS NULL;',
      ),
    ),
    tgWithoutOffering: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "TutorialGroup" g LEFT JOIN "ProgrammeOffering" o ON o.id = g."offeringId" WHERE o.id IS NULL;',
      ),
    ),
    tgAllocationsWithoutGroup: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "TGAllocation" a LEFT JOIN "TutorialGroup" g ON g.id = a."groupId" WHERE g.id IS NULL;',
      ),
    ),
    tgAllocationsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "TGAllocation" a LEFT JOIN "Student" s ON s.id = a."studentId" WHERE s.id IS NULL;',
      ),
    ),
    assignmentsWithoutAccount: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "TeachingAssignment" t LEFT JOIN "Account" a ON a.id = t."accountId" WHERE a.id IS NULL;',
      ),
    ),
    checksWithoutMapping: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "MappingCheck" c LEFT JOIN "MoodleMapping" m ON m.id = c."mappingId" WHERE m.id IS NULL;',
      ),
    ),
    deliveryAttemptsWithoutOutbox: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "IntegrationDeliveryAttempt" d LEFT JOIN "OutboxEvent" o ON o.id = d."outboxId" WHERE o.id IS NULL;',
      ),
    ),
    simEnrolmentsWithoutShell: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SimStudentEnrolment" e LEFT JOIN "SimShell" s ON s.id = e."shellId" WHERE s.id IS NULL;',
      ),
    ),
    simEnrolmentsWithoutStudent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SimStudentEnrolment" e LEFT JOIN "Student" s ON s.id = e."studentId" WHERE s.id IS NULL;',
      ),
    ),
    simStaffWithoutShell: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SimStaffRole" r LEFT JOIN "SimShell" s ON s.id = r."shellId" WHERE s.id IS NULL;',
      ),
    ),
    simMembersWithoutShell: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SimGroupMember" m LEFT JOIN "SimShell" s ON s.id = m."shellId" WHERE s.id IS NULL;',
      ),
    ),
    simMembersWithoutGroup: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "SimGroupMember" m LEFT JOIN "TutorialGroup" g ON g.id = m."groupId" WHERE g.id IS NULL;',
      ),
    ),
    reconCasesWithoutRun: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ReconciliationCase" c LEFT JOIN "ReconciliationRun" r ON r.id = c."runId" WHERE c."runId" IS NOT NULL AND r.id IS NULL;',
      ),
    ),
    replaysWithoutRequester: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ReplayDecision" d LEFT JOIN "Account" a ON a.id = d."requesterAccountId" WHERE a.id IS NULL;',
      ),
    ),
    maintenanceWithoutCreator: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "MoodleMaintenance" m LEFT JOIN "Account" a ON a.id = m."creatorAccountId" WHERE a.id IS NULL;',
      ),
    ),
    prereqsWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CoursePrerequisite" p LEFT JOIN "Course" c ON c.id = p."courseId" WHERE c.id IS NULL;',
      ),
    ),
    prereqsWithoutRequired: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CoursePrerequisite" p LEFT JOIN "Course" c ON c.id = p."requiresCourseId" WHERE c.id IS NULL;',
      ),
    ),
    curriculumCoursesWithoutCurriculum: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CurriculumCourse" c LEFT JOIN "CurriculumVersion" v ON v.id = c."curriculumId" WHERE v.id IS NULL;',
      ),
    ),
    curriculumCoursesWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CurriculumCourse" c LEFT JOIN "Course" k ON k.id = c."courseId" WHERE k.id IS NULL;',
      ),
    ),
    curriculaWithoutProgramme: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CurriculumVersion" v LEFT JOIN "Programme" p ON p.id = v."programmeId" WHERE p.id IS NULL;',
      ),
    ),
    plansWithoutAttempt: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CoursePlan" p LEFT JOIN "ProgrammeAttempt" a ON a.id = p."attemptId" WHERE a.id IS NULL;',
      ),
    ),
    planItemsWithoutPlan: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CoursePlanItem" i LEFT JOIN "CoursePlan" p ON p.id = i."planId" WHERE p.id IS NULL;',
      ),
    ),
    planItemsWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CoursePlanItem" i LEFT JOIN "Course" c ON c.id = i."courseId" WHERE c.id IS NULL;',
      ),
    ),
    registrationsWithoutAttempt: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "InstitutionalRegistration" r LEFT JOIN "ProgrammeAttempt" a ON a.id = r."attemptId" WHERE a.id IS NULL;',
      ),
    ),
    rosterWithoutRegistration: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CourseRegistration" r LEFT JOIN "InstitutionalRegistration" i ON i.id = r."registrationId" WHERE i.id IS NULL;',
      ),
    ),
    rosterWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "CourseRegistration" r LEFT JOIN "Course" c ON c.id = r."courseId" WHERE c.id IS NULL;',
      ),
    ),
    amendmentsWithoutRegistration: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "RegistrationAmendment" a LEFT JOIN "InstitutionalRegistration" r ON r.id = a."registrationId" WHERE r.id IS NULL;',
      ),
    ),
    amendmentsWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "RegistrationAmendment" a LEFT JOIN "Course" c ON c.id = a."courseId" WHERE c.id IS NULL;',
      ),
    ),
    waitlistWithoutCourse: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "WaitlistEntry" w LEFT JOIN "Course" c ON c.id = w."courseId" WHERE c.id IS NULL;',
      ),
    ),
    waitlistWithoutAttempt: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "WaitlistEntry" w LEFT JOIN "ProgrammeAttempt" a ON a.id = w."attemptId" WHERE a.id IS NULL;',
      ),
    ),
    componentsWithoutPlan: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "AssessmentComponent" c LEFT JOIN "AssessmentPlan" p ON p.id = c."planId" WHERE p.id IS NULL;',
      ),
    ),
    activityMappingsWithoutComponent: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "GradeActivityMapping" m LEFT JOIN "AssessmentComponent" c ON c.id = m."componentId" WHERE c.id IS NULL;',
      ),
    ),
    batchesWithoutMapping: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "GradeBatch" b LEFT JOIN "GradeActivityMapping" m ON m.id = b."mappingId" WHERE m.id IS NULL;',
      ),
    ),
    linesWithoutBatch: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "GradeLine" l LEFT JOIN "GradeBatch" b ON b.id = l."batchId" WHERE b.id IS NULL;',
      ),
    ),
    findingsWithoutBatch: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "GradeFinding" f LEFT JOIN "GradeBatch" b ON b.id = f."batchId" WHERE b.id IS NULL;',
      ),
    ),
    moderationWithoutBatch: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ModerationCase" c LEFT JOIN "GradeBatch" b ON b.id = c."batchId" WHERE b.id IS NULL;',
      ),
    ),
    caRowsWithoutCase: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "OfficialCARecord" r LEFT JOIN "ModerationCase" c ON c.id = r."caseId" WHERE c.id IS NULL;',
      ),
    ),
    decisionsWithoutPackage: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "BoardDecision" d LEFT JOIN "ResultPackage" p ON p.id = d."packageId" WHERE p.id IS NULL;',
      ),
    ),
    officialResultsWithoutPackage: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "OfficialCourseResult" r LEFT JOIN "ResultPackage" p ON p.id = r."packageId" WHERE p.id IS NULL;',
      ),
    ),
    amendmentCasesWithoutPackage: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "ResultAmendmentCase" c LEFT JOIN "ResultPackage" p ON p.id = c."packageId" WHERE p.id IS NULL;',
      ),
    ),
    impactTasksWithoutCase: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "AcademicImpactTask" t LEFT JOIN "ResultAmendmentCase" c ON c.id = t."amendmentCaseId" WHERE c.id IS NULL;',
      ),
    ),
    recordsWithoutTemplate: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "NotificationRecord" r LEFT JOIN "NotificationTemplate" t ON t.id = r."templateId" WHERE t.id IS NULL;',
      ),
    ),
    deliveriesWithoutRecord: Number(
      psql(
        scratchUrl(),
        'SELECT COUNT(*) FROM "NotificationDelivery" d LEFT JOIN "NotificationRecord" r ON r.id = d."recordId" WHERE r.id IS NULL;',
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
  // Slice PH8-006: byte integrity beyond counts — a restore that
  // corrupts document bytes while preserving row counts must still
  // fail the gate. Hash aggregate over ordered row hashes.
  const sourceDocHash = psql(
    DATABASE_URL,
    'SELECT COALESCE(md5(string_agg("sha256", \',\' ORDER BY "id")), \'empty\') FROM "ApplicationDocument";',
  );
  const restoredDocHash = psql(
    scratchUrl(),
    'SELECT COALESCE(md5(string_agg("sha256", \',\' ORDER BY "id")), \'empty\') FROM "ApplicationDocument";',
  );
  result.contentIntegrity = {
    documents: {
      source: sourceDocHash,
      restored: restoredDocHash,
      ok: sourceDocHash === restoredDocHash,
    },
  };
  if (sourceDocHash !== restoredDocHash) {
    result.match = false;
    console.error(
      "backup:test FAILED — document content hash differs after restore",
    );
  }
  // Slice PH8-006: fail-closed on schema drift — a future migration
  // adding a table must extend TABLES above instead of silently
  // escaping the drill (the exact staleness this slice just fixed).
  // Unknown tables fail; TABLES entries missing from the database
  // already fail earlier when their count query throws.
  const dbTables = psql(
    scratchUrl(),
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations') ORDER BY 1;`,
  )
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  result.drift = {
    unknown: dbTables.filter((t) => !TABLES.includes(t)),
  };
  if (result.drift.unknown.length > 0) {
    result.match = false;
    console.error(
      `backup:test FAILED — tables outside coverage: ${result.drift.unknown.join(", ")}`,
    );
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
