import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { user, key } from './helpers/phase6.js';
import request from 'supertest';
/**
 * TASK-PH8-002 cross-domain audit timeline e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: applicant own timeline (applicantVisible-only),
 * foreign applicant 404, officer full view, approver read-only view,
 * tutor denial, package staff view (decisions + versions + audit rows),
 * student package 404, unknown kind 400, unknown id 404, invalid
 * query 400. Domain writes are seeded directly: the endpoint's job is
 * gating + joining, and the writes are proven by Phase 2/7 suites.
 */
describe('Phase 8 cross-domain audit timeline', () => {
  let app: INestApplication;
  let db: PrismaService;
  let applicantCookie: string;
  let applicantAccountId: string;
  let applicant2Cookie: string;
  let applicant2AccountId: string;
  let officerCookie: string;
  let approverCookie: string;
  let tutorCookie: string;
  let lecturerCookie: string;
  let studentCookie: string;
  let applicationId: string;
  let packageId: string;

  const get = (path: string, cookie: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', cookie);

  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error(
        'Use an isolated test/review database for admissions tests.',
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DocumentScanner)
      .useValue({
        scan: async () => ({
          status: 'AwaitingQualityCheck',
          scanner: 'TEST-ADAPTER',
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    const applicant = await user(db, 'APP', ['apply'], 'SYSTEM', 'GLOBAL');
    applicantCookie = applicant.cookie;
    applicantAccountId = applicant.accountId;
    const applicant2 = await user(db, 'APP', ['apply'], 'SYSTEM', 'GLOBAL');
    applicant2Cookie = applicant2.cookie;
    applicant2AccountId = applicant2.accountId;
    officerCookie = (
      await user(db, 'ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    approverCookie = (
      await user(db, 'ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    tutorCookie = (
      await user(db, 'TUT', ['mark-delegated-activities'], 'TUTORIAL_GROUP', 'TG-1')
    ).cookie;
    lecturerCookie = (
      await user(db, 'LEC', ['stage-marks'], 'OFFERING', 'SWE-2026S1')
    ).cookie;
    studentCookie = (await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')).cookie;

    const programme = await db.programme.upsert({
      where: { code: 'SWE' },
      update: {},
      create: {
        code: 'SWE',
        name: 'Fictional Software Engineering',
        awardLevel: 'BSc',
        school: 'Computing',
        duration: '4 years',
        overview: 'Isolated test programme',
        feeScheduleRef: 'FIN-DEMO-v1',
        publishedVersion: '1',
        effectiveDate: new Date('2026-01-01'),
        owningOffice: 'Registry',
      },
    });
    const offering = await db.programmeOffering.upsert({
      where: {
        programmeId_intake_studyMode_campus: {
          programmeId: programme.id,
          intake: '2026S1',
          studyMode: 'FULLTIME',
          campus: 'MAIN',
        },
      },
      update: { availability: 'OPEN' },
      create: {
        programmeId: programme.id,
        intake: '2026S1',
        studyMode: 'FULLTIME',
        campus: 'MAIN',
        availability: 'OPEN',
      },
    });
    // Applicant-owned application with one visible + one staff-only
    // status event and one audit row (white-box seed; writes proven
    // by Phase 2 suites).
    const application = await db.application.create({
      data: {
        accountId: applicantAccountId,
        offeringId: offering.id,
        reference: `APP-TEST-${key().slice(0, 8).toUpperCase()}`,
        state: 'Submitted',
        policyVersion: 'APPLICATION-DEMO-v1',
        requirementVersion: '1',
      },
    });
    applicationId = application.id;
    await db.applicationStatusEvent.createMany({
      data: [
        {
          applicationId,
          code: 'SUBMITTED',
          label: 'Application submitted',
          actorRole: 'APP',
          applicantVisible: true,
        },
        {
          applicationId,
          code: 'OFFICER_NOTE',
          label: 'Internal review note',
          actorRole: 'ADMISSIONS_OFFICER',
          applicantVisible: false,
        },
      ],
    });
    await db.auditEvent.create({
      data: {
        action: 'ApplicationSubmitted',
        actorAccountId: applicantAccountId,
        activeRole: 'APP',
        scope: `APPLICATION:${applicationId}`,
        targetRef: applicationId,
        outcome: 'ALLOW',
        correlationId: key(),
        idempotencyRef: key(),
        policyVersion: 'APPLICATION-DEMO-v1',
        purpose: 'Applicant self-service',
        metadata: {},
      },
    });
    // Staff-only result package with a decision, an official row and
    // an audit row (white-box seed; writes proven by Phase 7 suites).
    const pkg = await db.resultPackage.create({
      data: {
        offeringRef: 'SWE-2026S1',
        periodCode: '2026S1',
        version: 1,
        status: 'APPROVED_FOR_RELEASE',
        packageHash: 'fictional-hash',
        trace: {},
        candidateListId: key(),
        declaration: 'fictional declaration',
        preparedByAccountId: applicant2AccountId,
      },
    });
    packageId = pkg.id;
    await db.boardDecision.create({
      data: {
        packageId,
        version: 1,
        to: 'APPROVE_FOR_RELEASE',
        reason: 'Board minute 12.',
        conditions: [],
        decidedByAccountId: applicant2AccountId,
      },
    });
    await db.officialCourseResult.create({
      data: {
        offeringRef: 'SWE-2026S1',
        periodCode: '2026S1',
        studentRef: 'STU-2026-0001',
        total: 68.8,
        outcome: 'PASS',
        trace: {},
        packageId,
        version: 2,
        status: 'RELEASED',
        publishedAt: new Date(),
      },
    });
    await db.auditEvent.create({
      data: {
        action: 'BoardDecisionRecorded',
        actorAccountId: applicant2AccountId,
        activeRole: 'EXAMINATIONS_OFFICER',
        scope: `ASSESSMENT:${packageId}`,
        targetRef: packageId,
        outcome: 'ALLOW',
        correlationId: key(),
        idempotencyRef: key(),
        policyVersion: 'ASSESSMENT-DEMO-v1',
        purpose: 'Assessment governance',
        metadata: {},
      },
    });
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  it('applicant-own: applicant sees own timeline, staff rows filtered', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}`,
      applicantCookie,
    ).expect(200);
    const items = (res.body as { items: Array<{ applicantVisible?: boolean; source: string }> }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.applicantVisible !== false)).toBe(true);
    expect(items.map((i) => i.source)).toContain('STATUS_EVENT');
    expect(items.map((i) => i.source)).toContain('AUDIT');
  });

  it('applicant-foreign: another applicant gets a neutral 404', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}`,
      applicant2Cookie,
    );
    expect(res.status).toBe(404);
  });

  it('officer-full: admissions officer sees staff rows too', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}`,
      officerCookie,
    ).expect(200);
    const items = (res.body as { items: Array<{ code?: string; applicantVisible?: boolean }> }).items;
    expect(items.some((i) => i.applicantVisible === false)).toBe(true);
  });

  it('approver-readonly: approver sees the full staff view', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}`,
      approverCookie,
    ).expect(200);
    const items = (res.body as { items: Array<unknown> }).items;
    expect(items.length).toBeGreaterThan(0);
  });

  it('tutor-denied: unrelated roles get a neutral 404', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}`,
      tutorCookie,
    );
    expect(res.status).toBe(404);
  });

  it('package-staff: lecturer sees decisions, versions and audit rows', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/result-package/${packageId}`,
      lecturerCookie,
    ).expect(200);
    const items = (res.body as { items: Array<{ source: string }> }).items;
    const sources = items.map((i) => i.source);
    expect(sources).toContain('BOARD_DECISION');
    expect(sources).toContain('OFFICIAL_RESULT');
    expect(sources).toContain('AUDIT');
  });

  it('package-student: students get a neutral 404 on packages', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/result-package/${packageId}`,
      studentCookie,
    );
    expect(res.status).toBe(404);
  });

  it('unknown-kind: invented kinds refuse without disclosure', async () => {
    const res = await get('/auth/audit/timeline/entity/starship/123', officerCookie);
    expect(res.status).toBe(400);
  });

  it('unknown-id: missing entities are neutral 404s', async () => {
    const missing = await get(
      `/auth/audit/timeline/entity/application/${key()}`,
      officerCookie,
    );
    expect(missing.status).toBe(404);
    const missingPkg = await get(
      `/auth/audit/timeline/entity/result-package/${key()}`,
      lecturerCookie,
    );
    expect(missingPkg.status).toBe(404);
  });

  it('invalid-query: bad pagination is a 400', async () => {
    const res = await get(
      `/auth/audit/timeline/entity/application/${applicationId}?take=abc`,
      officerCookie,
    );
    expect(res.status).toBe(400);
  });
});
