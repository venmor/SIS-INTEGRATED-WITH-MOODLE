import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import type { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { MasterPreviewService } from '../src/timetabling/master-preview.service.js';
import { TimetablePublicationService } from '../src/timetabling/publication.service.js';
import { RegistrationService } from '../src/registration/registration.service.js';
import { DemoTimetableRulesService } from '../src/timetabling/demo-rules.service.js';
import { FinanceService } from '../src/finance/finance.service.js';
import { IntegrationService } from '../src/integration/integration.service.js';

describe('independent fictional timetable publication', () => {
  let app: INestApplication,
    db: PrismaService,
    master: MasterPreviewService,
    publication: TimetablePublicationService,
    registration: RegistrationService;
  const password = 'Synthetic-timetable-proof-2026';
  const oldDemo = process.env.DEMO_MODE,
    oldGate = process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS;
  async function actor(
    role: string,
    capability: string,
    personId?: string,
    scopeRef = 'DEMO-UNIVERSITY',
  ) {
    const person = personId
      ? { id: personId }
      : await db.person.create({
          data: { displayName: 'Fictional timetable actor' },
        });
    const account = await db.account.create({
      data: {
        personId: person.id,
        username: randomUUID(),
        credentials: {
          create: { kind: 'PASSWORD', secretHash: await hash(password) },
        },
      },
    });
    const appointment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType: role === 'STUDENT' ? 'PERSON' : 'SYSTEM',
        scopeRef: role === 'STUDENT' ? person.id : scopeRef,
        capabilities: capability ? [capability] : [],
        startsAt: new Date('2020-01-01'),
        reason: 'Fictional isolated publication test',
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: appointment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return {
      auth: {
        accountId: account.id,
        assignmentId: appointment.id,
        activeRole: role,
        scope: `${appointment.scopeType}:${appointment.scopeRef}`,
      },
      cookie: `sid=${token}`,
      personId: person.id,
      accountId: account.id,
      assignmentId: appointment.id,
    };
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (url.hostname !== '127.0.0.1' || !url.pathname.includes('setup003_test'))
      throw new Error('Use the dedicated isolated setup003_test database.');
    process.env.DEMO_MODE = 'true';
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
    master = app.get(MasterPreviewService);
    publication = app.get(TimetablePublicationService);
    registration = app.get(RegistrationService);
  });
  afterAll(async () => {
    if (app) await app.close();
    if (oldDemo === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = oldDemo;
    if (oldGate === undefined)
      delete process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS;
    else process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = oldGate;
  });
  async function scenario() {
    const tag = randomUUID().slice(0, 8).toUpperCase();
    const proposer = await actor(
      'TIMETABLE_COORDINATOR',
      'timetable-demo-master-draft',
    );
    const approver = await actor(
      'DOMAIN_ADMIN',
      'timetable-demo-master-publish',
    );
    const student = await actor('STUDENT', 'study');
    const current = await db.curriculumVersion.findFirstOrThrow({
      where: {
        status: 'PUBLISHED',
        courses: { some: { course: { code: 'SWE111' } } },
      },
      include: { courses: { include: { course: true } } },
    });
    const courses = ['SWE111', 'MTH111'].map(
      (code) => current.courses.find((row) => row.course.code === code)!.course,
    );
    const programmeOffering = await db.programmeOffering.findFirstOrThrow({
      where: { programmeId: current.programmeId },
    });
    const application = await db.application.create({
      data: {
        accountId: student.accountId,
        offeringId: programmeOffering.id,
        reference: `TIME-TEST-${tag}`,
        policyVersion: 'FICTIONAL-TEST',
        requirementVersion: 'FICTIONAL-TEST',
      },
    });
    const record = await db.student.create({
      data: { personId: student.personId, studentNumber: `TIME-${tag}` },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: record.id,
        offeringId: programmeOffering.id,
        applicationId: application.id,
        curriculumVersionId: current.id,
        intake: programmeOffering.intake,
        status: 'ACTIVE',
      },
    });
    const period = await db.academicPeriod.create({
      data: { code: `DEMO-PUBLISH-${tag}`, status: 'OPEN' },
    });
    const sourceRegistration = await db.institutionalRegistration.create({
      data: {
        attemptId: attempt.id,
        periodId: period.id,
        receipt: `SYNTHETIC-TIME-${tag}`,
        snapshot: {
          fictionalFixture: true,
          courseCodes: courses.map((course) => course.code),
        },
        roster: { create: courses.map((course) => ({ courseId: course.id })) },
      },
      include: { roster: true },
    });
    const campus = await db.institutionUnit.create({
      data: {
        code: `DEMO-TIME-${tag}`,
        versions: {
          create: {
            version: 1,
            name: 'Fictional test campus',
            unitType: 'CAMPUS',
            unitKind: 'CAMPUS',
            status: 'DRAFT',
          },
        },
      },
    });
    const building = await db.teachingBuilding.create({
      data: {
        campusUnitId: campus.id,
        code: 'TEST',
        name: 'Fictional teaching building',
      },
    });
    const venue = await db.teachingVenue.create({
      data: {
        buildingId: building.id,
        code: 'T1',
        name: 'Fictional teaching room',
        teachingCapacity: 50,
        stepFreeAccess: true,
      },
    });
    const rule = await db.timetableDemoRuleDraft.create({
      data: {
        campusUnitId: campus.id,
        periodId: period.id,
        version: 1,
        roomTurnaroundMinutes: 5,
        maxOccurrences: 100,
        campusTravelMinutes: [],
        teachingStartDate: new Date('2026-10-01'),
        teachingEndDate: new Date('2026-12-31'),
        dailyStartTime: '07:00',
        dailyEndTime: '18:00',
        allowedWeekdays: [1, 2, 3, 4, 5],
        maxSessionMinutes: 120,
        createdByAccountId: proposer.accountId,
        clientRequestId: randomUUID(),
        contentDigest: 'a'.repeat(64),
      },
    });
    const sessions = [];
    for (const [index, course] of courses.entries()) {
      const version = await db.courseVersion.create({
        data: {
          courseId: course.id,
          version: 100000 + Math.floor(Math.random() * 1000000),
          title: course.title,
          credits: course.credits,
        },
      });
      const offering = await db.courseDeliveryOffering.create({
        data: {
          courseVersionId: version.id,
          periodId: period.id,
          deliveryUnitId: campus.id,
          campusUnitId: campus.id,
          deliveryMode: 'IN_PERSON',
          capacity: 50,
        },
      });
      const section = await db.teachingSection.create({
        data: {
          offeringId: offering.id,
          code: 'A',
          capacity: 50,
          deliveryMode: 'IN_PERSON',
        },
      });
      const teacher = await db.roleAssignment.create({
        data: {
          accountId: proposer.accountId,
          role: 'LEC',
          scopeType: 'SECTION',
          scopeRef: section.id,
          capabilities: ['teach'],
          startsAt: new Date('2020-01-01'),
          reason: 'Fictional published schedule teacher',
        },
      });
      sessions.push({
        id: randomUUID(),
        sectionId: section.id,
        venueId: venue.id,
        teacherAssignmentId: teacher.id,
        registrationIds: [
          sourceRegistration.roster.find((row) => row.courseId === course.id)!
            .id,
        ],
        startAt: `2026-10-12T${index ? '10' : '08'}:00:00+02:00`,
        endAt: `2026-10-12T${index ? '11' : '09'}:00:00+02:00`,
        plannedSeats: 20,
        requiresStepFreeAccess: true,
      });
    }
    const command = {
      clientRequestId: randomUUID(),
      expectedVersion: 0,
      periodId: period.id,
      ruleDraftId: rule.id,
      sessions,
    };
    const saved = await master.create(proposer.auth, command);
    const review = await publication.review(approver.auth, saved.id);
    const decision = {
      clientRequestId: randomUUID(),
      contentDigest: review.draft.contentDigest,
      expectedPublicationId: null,
      reviewed: true,
      fictionalOnly: true,
      password,
      reason: 'Reviewed fictional timetable and explicit roster',
    };
    return {
      proposer,
      approver,
      student,
      period,
      attempt,
      record,
      sourceRegistration,
      rule,
      venue,
      command,
      saved,
      decision,
    };
  }
  it('publishes exact conflict-free sources, audits one outcome and exposes only current own courses', async () => {
    const f = await scenario();
    expect(f.saved.status).toBe('CONFLICT_FREE_FOR_REVIEW');
    const report = await publication.review(f.approver.auth, f.saved.id);
    expect(report.currentReady).toBe(true);
    expect(report.canPublish).toBe(true);
    expect(report.impact.changes).toHaveLength(2);
    expect(report.sources).toMatchObject({
      matchesReviewedSources: true,
      rule: {
        id: f.rule.id,
        version: 1,
        teachingStartDate: '2026-10-01',
        teachingEndDate: '2026-12-31',
        dailyStartTime: '07:00',
        dailyEndTime: '18:00',
        allowedWeekdays: [1, 2, 3, 4, 5],
        maxSessionMinutes: 120,
        roomTurnaroundMinutes: 5,
      },
      sessionVersions: expect.arrayContaining(
        f.command.sessions.map((session) =>
          expect.objectContaining({
            sessionId: session.id,
            sectionId: session.sectionId,
            teacherAssignmentId: session.teacherAssignmentId,
            venueId: session.venueId,
          }),
        ),
      ),
    });
    expect(report.sources.currentFingerprint).toBe(
      report.sources.sourceFingerprint,
    );
    expect(JSON.stringify(report.sources)).not.toContain(
      f.sourceRegistration.roster[0].id,
    );
    const result = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    expect(result.status).toBe('FICTIONAL_PUBLISHED');
    expect(result.isCurrent).toBe(true);
    const response = await registration.timetable(
      f.student.auth,
      f.attempt.id,
      f.period.code,
    );
    expect(response.publicationStatus).toBe('FICTIONAL_PUBLISHED');
    expect(response.sessions).toHaveLength(2);
    expect(response.publication?.id).toBe(result.publicationId);
    await db.courseRegistration.update({
      where: { id: f.sourceRegistration.roster[0].id },
      data: { status: 'DROPPED' },
    });
    expect(
      (
        await registration.timetable(
          f.student.auth,
          f.attempt.id,
          f.period.code,
        )
      ).sessions,
    ).toHaveLength(1);
    const stranger = await actor('STUDENT', 'study');
    await expect(
      registration.timetable(stranger.auth, f.attempt.id, f.period.code),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await db.auditEvent.count({
        where: {
          action: 'DemoTimetablePublished',
          targetRef: result.publicationId,
          outcome: 'ALLOW',
        },
      }),
    ).toBe(1);
    const outbox = await db.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: result.publicationId,
        type: 'DemoTimetablePublished',
      },
    });
    expect(outbox.payload).toMatchObject({ externalDelivery: 'NONE' });
    expect(JSON.stringify(outbox.payload)).not.toContain(password);
    await expect(
      db.timetableDemoPublication.update({
        where: { id: result.publicationId },
        data: { reason: 'Overwrite history test' },
      }),
    ).rejects.toThrow(/append-only/);
    const projection = await db.timetableStudentSession.findFirstOrThrow({
      where: { publicationId: result.publicationId },
    });
    await expect(
      db.timetableStudentSession.delete({ where: { id: projection.id } }),
    ).rejects.toThrow(/append-only/);
  });
  it('requires explicit authority, CSRF and fresh active password; no optional proof or broad admin bypass', async () => {
    const f = await scenario();
    await request(app.getHttpServer())
      .post(`/timetabling/demo-master/${f.saved.id}/publish`)
      .set('Cookie', f.approver.cookie)
      .send(f.decision)
      .expect(403);
    await expect(
      publication.publish(f.approver.auth, f.saved.id, {
        ...f.decision,
        password: 'wrong',
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      publication.publish(f.proposer.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    const admin = await actor('SYS_ADMIN', 'timetable-demo-master-publish');
    await expect(
      publication.publish(admin.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    const outsider = await actor(
      'DOMAIN_ADMIN',
      'timetable-demo-master-publish',
      undefined,
      'OTHER',
    );
    await expect(
      publication.review(outsider.auth, f.saved.id),
    ).rejects.toMatchObject({ status: 403 });
    await db.credential.updateMany({
      where: { accountId: f.approver.accountId },
      data: { status: 'SUPERSEDED', supersededAt: new Date() },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await db.timetableDemoPublication.count({
        where: { periodId: f.period.id },
      }),
    ).toBe(0);
  });
  it('enforces independence by person and original proposer live appointment', async () => {
    const f = await scenario();
    const same = await actor(
      'DOMAIN_ADMIN',
      'timetable-demo-master-publish',
      f.proposer.personId,
    );
    await expect(
      publication.publish(same.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    await db.roleAssignment.update({
      where: { id: f.proposer.assignmentId },
      data: { revokedAt: new Date() },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await publication.review(f.approver.auth, f.saved.id)).currentIssues.map(
        (row) => row.code,
      ),
    ).toContain('PROPOSER_APPOINTMENT_INACTIVE');
  });
  it('retains exact source version facts and blocks legacy proposals without that proof', async () => {
    const f = await scenario();
    const original = await db.timetableDemoMasterDraft.findUniqueOrThrow({
      where: { id: f.saved.id },
    });
    const report = await publication.review(f.approver.auth, f.saved.id);
    expect(original.sourceContext).toMatchObject({
      rule: { id: f.rule.id, version: 1 },
      units: report.sources.savedUnits,
    });
    expect(report.sources.savedUnits).toEqual(report.sources.units);
    await expect(
      db.timetableDemoMasterDraft.update({
        where: { id: original.id },
        data: { sourceContext: { changed: true } },
      }),
    ).rejects.toThrow(/append-only/);
    const currentVersion = await db.institutionUnitVersion.create({
      data: {
        unitId: report.sources.units[0].id,
        version: 2,
        name: 'Fictional renamed campus',
        unitType: 'CAMPUS',
        unitKind: 'CAMPUS',
        status: 'DRAFT',
      },
    });
    const changed = await publication.review(f.approver.auth, f.saved.id);
    expect(changed.sources.matchesReviewedSources).toBe(false);
    expect(changed.sources.savedUnits).toEqual(report.sources.savedUnits);
    expect(changed.sources.units[0].versionId).toBe(currentVersion.id);
    expect(changed.currentIssues.map((row) => row.code)).toContain(
      'SOURCE_CHANGED',
    );
    const { sourceContext: _legacyHasNoSnapshot, ...legacyData } = original;
    const legacy = await db.timetableDemoMasterDraft.create({
      data: {
        ...legacyData,
        id: randomUUID(),
        clientRequestId: randomUUID(),
        version: original.version + 1,
        sessions: original.sessions as Prisma.InputJsonValue,
        issues: original.issues as Prisma.InputJsonValue,
      },
    });
    const legacyReport = await publication.review(f.approver.auth, legacy.id);
    expect(legacyReport.currentIssues.map((row) => row.code)).toContain(
      'SOURCE_VERSION_PROOF_MISSING',
    );
    await expect(
      publication.publish(f.approver.auth, legacy.id, {
        ...f.decision,
        clientRequestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects changed benign resources, dropped source roster, newer rules and superseded masters', async () => {
    const f = await scenario();
    await db.teachingVenue.update({
      where: { id: f.venue.id },
      data: { teachingCapacity: 55 },
    });
    expect(
      (await publication.review(f.approver.auth, f.saved.id)).currentIssues.map(
        (row) => row.code,
      ),
    ).toContain('SOURCE_CHANGED');
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 409 });
    const next = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: f.saved.version,
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 409 });
    const review = await publication.review(f.approver.auth, next.id);
    await db.courseRegistration.update({
      where: { id: f.sourceRegistration.roster[0].id },
      data: { status: 'DROPPED' },
    });
    await expect(
      publication.publish(f.approver.auth, next.id, {
        ...f.decision,
        clientRequestId: randomUUID(),
        contentDigest: review.draft.contentDigest,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await db.courseRegistration.update({
      where: { id: f.sourceRegistration.roster[0].id },
      data: { status: 'ENROLLED' },
    });
    await db.timetableDemoRuleDraft.create({
      data: {
        ...f.rule,
        id: randomUUID(),
        version: 2,
        clientRequestId: randomUUID(),
        campusTravelMinutes: f.rule
          .campusTravelMinutes as Prisma.InputJsonValue,
        allowedWeekdays: f.rule.allowedWeekdays as Prisma.InputJsonValue,
      },
    });
    expect(
      (await publication.review(f.approver.auth, next.id)).currentIssues.map(
        (row) => row.code,
      ),
    ).toContain('RULE_SUPERSEDED');
  });
  it('blocks revoked teacher capabilities and inactive source people, even with a live section role', async () => {
    const f = await scenario();
    await db.roleAssignment.update({
      where: { id: f.command.sessions[0].teacherAssignmentId },
      data: { capabilities: [] },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      master.create(f.proposer.auth, {
        ...f.command,
        clientRequestId: randomUUID(),
        expectedVersion: f.saved.version,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await db.roleAssignment.update({
      where: { id: f.command.sessions[0].teacherAssignmentId },
      data: { capabilities: ['teach'] },
    });
    await db.person.update({
      where: { id: f.proposer.personId },
      data: { status: 'INACTIVE' },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects a teacher whose appointment ends before a scheduled occurrence and inactive campus source versions', async () => {
    const f = await scenario();
    await db.roleAssignment.update({
      where: { id: f.command.sessions[0].teacherAssignmentId },
      data: { endsAt: new Date('2026-10-11T23:00:00Z') },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 409 });
    await db.roleAssignment.update({
      where: { id: f.command.sessions[0].teacherAssignmentId },
      data: { endsAt: null },
    });
    const section = await db.teachingSection.findUniqueOrThrow({
      where: { id: f.command.sessions[0].sectionId },
      include: { offering: true },
    });
    await db.institutionUnitVersion.create({
      data: {
        unitId: section.offering.campusUnitId,
        version: 2,
        name: 'Fictional suspended campus',
        unitType: 'CAMPUS',
        unitKind: 'CAMPUS',
        status: 'SUSPENDED',
      },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await publication.review(f.approver.auth, f.saved.id)).currentReady,
    ).toBe(false);
  });
  it('rechecks natural approval expiry after projections and rolls back all release effects', async () => {
    const f = await scenario();
    await db.roleAssignment.update({
      where: { id: f.approver.assignmentId },
      data: { endsAt: new Date(Date.now() + 2500) },
    });
    await db.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION time007_test_projection_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(3); RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER time007_test_projection_delay BEFORE INSERT ON "TimetableStudentSession" FOR EACH STATEMENT EXECUTE FUNCTION time007_test_projection_delay()`,
    );
    try {
      await expect(
        publication.publish(f.approver.auth, f.saved.id, f.decision),
      ).rejects.toMatchObject({ status: 403 });
      expect(
        await db.timetableDemoPublication.count({
          where: { periodId: f.period.id },
        }),
      ).toBe(0);
      expect(
        await db.timetableStudentSession.count({
          where: { periodId: f.period.id },
        }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER time007_test_projection_delay ON "TimetableStudentSession"',
      );
      await db.$executeRawUnsafe(
        'DROP FUNCTION time007_test_projection_delay()',
      );
    }
  });
  it('denies a historical receipt when approval authority expires during replay lookup', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.roleAssignment.update({
      where: { id: f.approver.assignmentId },
      data: { endsAt: new Date(Date.now() + 2500) },
    });
    const delayed = db.$extends({
      query: {
        timetableDemoPublication: {
          async findUnique({ args, query }) {
            const result = await query(args);
            if (args.where.approvedByAccountId_clientRequestId)
              await new Promise((resolve) => setTimeout(resolve, 3000));
            return result;
          },
        },
      },
    });
    const delayedPublication = new TimetablePublicationService(
      delayed as unknown as PrismaService,
    );
    await expect(
      delayedPublication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await db.timetableDemoPublication.count({
        where: { periodId: f.period.id },
      }),
    ).toBe(1);
  });
  it('rechecks approval expiry after the final owner-event write and rolls back success', async () => {
    const f = await scenario();
    await db.roleAssignment.update({
      where: { id: f.approver.assignmentId },
      data: { endsAt: new Date(Date.now() + 2500) },
    });
    await db.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION time007_test_final_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."type"='DemoTimetablePublished' THEN PERFORM pg_sleep(3); END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER time007_test_final_delay BEFORE INSERT ON "OutboxEvent" FOR EACH ROW EXECUTE FUNCTION time007_test_final_delay()`,
    );
    try {
      await expect(
        publication.publish(f.approver.auth, f.saved.id, f.decision),
      ).rejects.toMatchObject({ status: 403 });
      expect(
        await db.timetableDemoPublication.count({
          where: { periodId: f.period.id },
        }),
      ).toBe(0);
      expect(
        await db.auditEvent.count({
          where: {
            action: 'DemoTimetablePublished',
            idempotencyRef: f.decision.clientRequestId,
          },
        }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER time007_test_final_delay ON "OutboxEvent"',
      );
      await db.$executeRawUnsafe('DROP FUNCTION time007_test_final_delay()');
    }
  });
  it('blocks an incomplete roster on one occurrence instead of using the course union as membership', async () => {
    const f = await scenario();
    const duplicate = {
      ...f.command.sessions[0],
      id: randomUUID(),
      registrationIds: [],
      startAt: '2026-10-13T08:00:00+02:00',
      endAt: '2026-10-13T09:00:00+02:00',
    };
    const saved = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: f.saved.version,
      sessions: [...f.command.sessions, duplicate],
    });
    expect(saved.status).toBe('BLOCKED');
    const review = await publication.review(f.approver.auth, saved.id);
    expect(review.currentIssues.map((row) => row.code)).toContain(
      'ROSTER_UNVERIFIED',
    );
    await expect(
      publication.publish(f.approver.auth, saved.id, {
        ...f.decision,
        clientRequestId: randomUUID(),
        contentDigest: review.draft.contentDigest,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('recovers the exact receipt after source changes and refuses changed command with the same key', async () => {
    const f = await scenario();
    const result = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    await db.teachingVenue.update({
      where: { id: f.venue.id },
      data: { teachingCapacity: 51 },
    });
    expect(
      await publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).toEqual(result);
    await expect(
      publication.publish(f.approver.auth, f.saved.id, {
        ...f.decision,
        reason: 'Different approval decision',
      }),
    ).rejects.toMatchObject({ status: 409 });
    const review = await publication.review(
      f.approver.auth,
      f.saved.id,
      undefined,
      f.decision.clientRequestId,
    );
    expect(review.requestReceipt?.publicationId).toBe(result.publicationId);
    const another = await actor(
      'DOMAIN_ADMIN',
      'timetable-demo-master-publish',
    );
    expect(
      (
        await publication.review(
          another.auth,
          f.saved.id,
          undefined,
          f.decision.clientRequestId,
        )
      ).requestReceipt,
    ).toBeNull();
    await db.roleAssignment.update({
      where: { id: f.approver.assignmentId },
      data: { revokedAt: new Date() },
    });
    await expect(
      publication.publish(f.approver.auth, f.saved.id, f.decision),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('serializes competing decisions and replaces the current publication only after a successful new revision', async () => {
    const f = await scenario();
    const other = await actor('DOMAIN_ADMIN', 'timetable-demo-master-publish');
    const results = await Promise.allSettled([
      publication.publish(f.approver.auth, f.saved.id, f.decision),
      publication.publish(other.auth, f.saved.id, {
        ...f.decision,
        clientRequestId: randomUUID(),
      }),
    ]);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    const current = await db.timetableDemoPublication.findFirstOrThrow({
      where: { periodId: f.period.id },
    });
    const sessions = f.command.sessions.map((row, index) =>
      index
        ? row
        : {
            ...row,
            startAt: '2026-10-12T08:15:00+02:00',
            endAt: '2026-10-12T09:15:00+02:00',
          },
    );
    const next = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: f.saved.version,
      sessions,
    });
    const review = await publication.review(f.approver.auth, next.id);
    expect(review.impact.changed).toBe(1);
    expect(review.impact.changes[0]).toMatchObject({
      kind: 'CHANGED',
      before: { startAt: '2026-10-12T06:00:00.000Z' },
      after: { startAt: '2026-10-12T06:15:00.000Z' },
    });
    await expect(
      publication.publish(f.approver.auth, next.id, {
        ...f.decision,
        clientRequestId: randomUUID(),
        contentDigest: review.draft.contentDigest,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const result = await publication.publish(f.approver.auth, next.id, {
      ...f.decision,
      clientRequestId: randomUUID(),
      contentDigest: review.draft.contentDigest,
      expectedPublicationId: current.id,
    });
    expect(result.version).toBe(2);
    const ownChanged = await registration.timetable(
      f.student.auth,
      f.attempt.id,
      f.period.code,
    );
    expect(ownChanged.changes).toHaveLength(1);
    expect(ownChanged.changes[0].kind).toBe('CHANGED');
    expect(ownChanged.publication?.previousVersion).toBe(1);
    expect(
      (
        await registration.timetable(
          f.student.auth,
          f.attempt.id,
          f.period.code,
        )
      ).publication?.id,
    ).toBe(result.publicationId);
    expect(
      await db.timetableDemoPublication.count({
        where: { periodId: f.period.id },
      }),
    ).toBe(2);
    expect(
      (await publication.review(f.approver.auth, next.id, 2)).publications[0]
        .isCurrent,
    ).toBe(false);
  });
  it('rolls back publication, projection, audit and outbox together; same decision can recover safely', async () => {
    const f = await scenario();
    await db.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION time007_test_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."type"='DemoTimetablePublished' THEN RAISE EXCEPTION 'fictional test outbox failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER time007_test_outbox_failure BEFORE INSERT ON "OutboxEvent" FOR EACH ROW EXECUTE FUNCTION time007_test_outbox_failure()`,
    );
    try {
      await expect(
        publication.publish(f.approver.auth, f.saved.id, f.decision),
      ).rejects.toThrow();
      expect(
        await db.timetableDemoPublication.count({
          where: { periodId: f.period.id },
        }),
      ).toBe(0);
      expect(
        await db.timetableStudentSession.count({
          where: { periodId: f.period.id },
        }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER time007_test_outbox_failure ON "OutboxEvent"',
      );
      await db.$executeRawUnsafe('DROP FUNCTION time007_test_outbox_failure()');
    }
    expect(
      (await publication.publish(f.approver.auth, f.saved.id, f.decision))
        .version,
    ).toBe(1);
  });
  it('reports only changed members when an otherwise identical activity allocation is replaced', async () => {
    const f = await scenario();
    const current = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    const identical = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: f.saved.version,
    });
    expect(
      (await publication.review(f.approver.auth, identical.id)).impact,
    ).toMatchObject({
      added: 0,
      changed: 0,
      removed: 0,
      affectedLearners: 0,
      changes: [],
    });
    const originalOffering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: f.attempt.offeringId },
    });
    const secondOffering = await db.programmeOffering.create({
      data: {
        programmeId: originalOffering.programmeId,
        intake: `TIME-IMPACT-${randomUUID()}`,
        studyMode: originalOffering.studyMode,
        campus: originalOffering.campus,
        availability: 'OPEN',
      },
    });
    const secondApplication = await db.application.create({
      data: {
        accountId: f.student.accountId,
        offeringId: secondOffering.id,
        reference: `TIME-IMPACT-${randomUUID()}`,
        policyVersion: 'FICTIONAL-TEST',
        requirementVersion: 'FICTIONAL-TEST',
      },
    });
    const secondAttempt = await db.programmeAttempt.create({
      data: {
        studentId: f.record.id,
        offeringId: secondOffering.id,
        applicationId: secondApplication.id,
        curriculumVersionId: f.attempt.curriculumVersionId,
        intake: secondOffering.intake,
        status: 'ACTIVE',
      },
    });
    const replacement = await db.institutionalRegistration.create({
      data: {
        attemptId: secondAttempt.id,
        periodId: f.period.id,
        receipt: `TIME-IMPACT-${randomUUID()}`,
        snapshot: { fictionalFixture: true },
        roster: {
          create: { courseId: f.sourceRegistration.roster[0].courseId },
        },
      },
      include: { roster: true },
    });
    await db.courseRegistration.update({
      where: { id: f.sourceRegistration.roster[0].id },
      data: { status: 'DROPPED' },
    });
    const sessions = f.command.sessions.map((session) =>
      session.registrationIds.includes(f.sourceRegistration.roster[0].id)
        ? { ...session, registrationIds: [replacement.roster[0].id] }
        : session,
    );
    const revised = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: identical.version,
      sessions,
    });
    const review = await publication.review(f.approver.auth, revised.id);
    expect(review.currentReady).toBe(true);
    expect(review.impact).toMatchObject({
      added: 0,
      changed: 1,
      removed: 0,
      affectedLearners: 1,
      changes: [
        {
          kind: 'CHANGED',
          membershipChanged: true,
          membershipAdded: 1,
          membershipRemoved: 1,
        },
      ],
    });
    expect(review.impact.changes[0].before).toEqual(
      review.impact.changes[0].after,
    );
    expect(JSON.stringify(review.impact)).not.toContain(
      replacement.roster[0].id,
    );
    const result = await publication.publish(f.approver.auth, revised.id, {
      ...f.decision,
      clientRequestId: randomUUID(),
      contentDigest: review.draft.contentDigest,
      expectedPublicationId: current.publicationId,
    });
    expect(result.version).toBe(2);
  });
  it('serializes a new rule owner command after the in-flight publication it would supersede', async () => {
    const f = await scenario();
    const campus = await db.institutionUnit.findUniqueOrThrow({
      where: { id: f.rule.campusUnitId },
    });
    const editor = await actor(
      'DOMAIN_ADMIN',
      'timetable-demo-rules-draft',
      undefined,
      campus.code,
    );
    await db.roleAssignment.update({
      where: { id: editor.assignmentId },
      data: { scopeType: 'CAMPUS' },
    });
    editor.auth.scope = `CAMPUS:${campus.code}`;
    let reachedFinalWrite!: () => void;
    const reached = new Promise<void>((resolve) => {
      reachedFinalWrite = resolve;
    });
    let releaseFinalWrite!: () => void;
    const released = new Promise<void>((resolve) => {
      releaseFinalWrite = resolve;
    });
    const delayed = db.$extends({
      query: {
        outboxEvent: {
          async create({ args, query }) {
            const result = await query(args);
            if (args.data.type === 'DemoTimetablePublished') {
              reachedFinalWrite();
              await released;
            }
            return result;
          },
        },
      },
    });
    const order: string[] = [];
    const publishing = new TimetablePublicationService(
      delayed as unknown as PrismaService,
    )
      .publish(f.approver.auth, f.saved.id, f.decision)
      .then(() => {
        order.push('publication');
      });
    await reached;
    const savingRule = app
      .get(DemoTimetableRulesService)
      .create(editor.auth, {
        clientRequestId: randomUUID(),
        expectedVersion: 1,
        periodId: f.period.id,
        teachingStartDate: '2026-10-01',
        teachingEndDate: '2026-12-31',
        dailyStartTime: '07:00',
        dailyEndTime: '18:00',
        allowedWeekdays: [1, 2, 3, 4, 5],
        maxSessionMinutes: 120,
        roomTurnaroundMinutes: 5,
        maxOccurrences: 100,
        travel: [],
      })
      .then(() => {
        order.push('rule');
      });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      releaseFinalWrite();
    }
    await Promise.all([publishing, savingRule]);
    expect(order).toEqual(['publication', 'rule']);
    expect(
      (await publication.review(f.approver.auth, f.saved.id)).currentIssues.map(
        (row) => row.code,
      ),
    ).toContain('RULE_SUPERSEDED');
  });
  it('reads source versions committed by a setup owner while publication waits for its lock', async () => {
    const f = await scenario();
    let ownerHasLock!: () => void;
    const locked = new Promise<void>((resolve) => {
      ownerHasLock = resolve;
    });
    let releaseOwner!: () => void;
    const released = new Promise<void>((resolve) => {
      releaseOwner = resolve;
    });
    const changingSource = db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(260007, 3)::text`;
        await tx.institutionUnitVersion.create({
          data: {
            unitId: f.rule.campusUnitId,
            version: 2,
            name: 'Fictional campus changed by setup owner',
            unitType: 'CAMPUS',
            unitKind: 'CAMPUS',
            status: 'DRAFT',
          },
        });
        ownerHasLock();
        await released;
      },
      { timeout: 10000 },
    );
    await locked;
    const publishing = publication
      .publish(f.approver.auth, f.saved.id, f.decision)
      .then(
        (result) => ({ result, error: null }),
        (error: unknown) => ({ result: null, error }),
      );
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      releaseOwner();
    }
    await changingSource;
    expect((await publishing).error).toMatchObject({ status: 409 });
    expect(
      await db.timetableDemoPublication.count({
        where: { periodId: f.period.id },
      }),
    ).toBe(0);
  });
  it('traverses all immutable proposal versions by period instead of truncating a global selector', async () => {
    const f = await scenario();
    let version = f.saved.version;
    for (let i = 0; i < 21; i++) {
      const next = await master.create(f.proposer.auth, {
        ...f.command,
        clientRequestId: randomUUID(),
        expectedVersion: version,
      });
      version = next.version;
    }
    const first = await master.draftHistory(f.approver.auth, f.period.id);
    expect(first.items).toHaveLength(20);
    expect(first.items[0].version).toBe(22);
    expect(first.olderVersionCursor).toBe(3);
    const second = await master.draftHistory(
      f.approver.auth,
      f.period.id,
      first.olderVersionCursor!,
    );
    expect(second.items.map((row) => row.version)).toEqual([2, 1]);
    expect(second.olderVersionCursor).toBeNull();
    await request(app.getHttpServer())
      .get('/timetabling/demo-master/draft-history')
      .query({ periodId: f.period.id, beforeVersion: 0 })
      .set('Cookie', f.approver.cookie)
      .expect(400);
    const wrong = await actor('STUDENT', 'study');
    await expect(
      master.draftHistory(wrong.auth, f.period.id),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rechecks natural expiry during draft read queries before returning any preview data', async () => {
    const f = await scenario();
    const cases = [
      {
        query: 'catalogue',
        run: (service: MasterPreviewService) =>
          service.catalogue(f.approver.auth),
      },
      {
        query: 'list',
        run: (service: MasterPreviewService) => service.list(f.approver.auth),
      },
      {
        query: 'course',
        run: (service: MasterPreviewService) =>
          service.course(f.approver.auth, f.saved.id, 'SWE111'),
      },
    ];
    for (const check of cases) {
      await db.roleAssignment.update({
        where: { id: f.approver.assignmentId },
        data: { endsAt: new Date(Date.now() + 2500) },
      });
      const delayed = db.$extends({
        query: {
          academicPeriod: {
            async findMany({ args, query }) {
              const result = await query(args);
              if (check.query === 'catalogue')
                await new Promise((resolve) => setTimeout(resolve, 3000));
              return result;
            },
          },
          timetableDemoMasterDraft: {
            async findMany({ args, query }) {
              const result = await query(args);
              if (check.query === 'list')
                await new Promise((resolve) => setTimeout(resolve, 3000));
              return result;
            },
            async findUnique({ args, query }) {
              const result = await query(args);
              if (check.query === 'course')
                await new Promise((resolve) => setTimeout(resolve, 3000));
              return result;
            },
          },
        },
      });
      await expect(
        check.run(
          new MasterPreviewService(delayed as unknown as PrismaService),
        ),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
  it('keeps two owned attempts separate when only the original attempt has a published allocation', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    const application = await db.application.findUniqueOrThrow({
      where: { id: f.attempt.applicationId },
    });
    const originalOffering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: application.offeringId },
    });
    const secondOffering = await db.programmeOffering.create({
      data: {
        programmeId: originalOffering.programmeId,
        intake: `TIME-SECOND-${randomUUID()}`,
        studyMode: originalOffering.studyMode,
        campus: originalOffering.campus,
        availability: 'OPEN',
      },
    });
    const secondApplication = await db.application.create({
      data: {
        accountId: f.student.accountId,
        offeringId: secondOffering.id,
        reference: `TIME-SECOND-${randomUUID()}`,
        policyVersion: 'FICTIONAL-TEST',
        requirementVersion: 'FICTIONAL-TEST',
      },
    });
    const secondAttempt = await db.programmeAttempt.create({
      data: {
        studentId: f.record.id,
        offeringId: secondOffering.id,
        applicationId: secondApplication.id,
        curriculumVersionId: f.attempt.curriculumVersionId,
        intake: secondOffering.intake,
        status: 'ACTIVE',
      },
    });
    await db.institutionalRegistration.create({
      data: {
        attemptId: secondAttempt.id,
        periodId: f.period.id,
        receipt: `SECOND-${randomUUID()}`,
        snapshot: { fictionalFixture: true },
        roster: {
          create: f.sourceRegistration.roster.map((row) => ({
            courseId: row.courseId,
          })),
        },
      },
    });
    expect(
      (
        await registration.timetable(
          f.student.auth,
          secondAttempt.id,
          f.period.code,
        )
      ).sessions,
    ).toEqual([]);
    expect(
      (
        await registration.timetable(
          f.student.auth,
          f.attempt.id,
          f.period.code,
        )
      ).sessions,
    ).toHaveLength(2);
  });
  it('hides a withdrawn attempt and a cancelled period, and denies all publication routes outside isolated demo mode', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.programmeAttempt.update({
      where: { id: f.attempt.id },
      data: { status: 'WITHDRAWN' },
    });
    expect(
      (
        await registration.timetable(
          f.student.auth,
          f.attempt.id,
          f.period.code,
        )
      ).sessions,
    ).toEqual([]);
    await db.programmeAttempt.update({
      where: { id: f.attempt.id },
      data: { status: 'ACTIVE' },
    });
    await db.academicPeriod.update({
      where: { id: f.period.id },
      data: { status: 'SUSPENDED' },
    });
    expect(
      (
        await registration.timetable(
          f.student.auth,
          f.attempt.id,
          f.period.code,
        )
      ).sessions,
    ).toEqual([]);
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'false';
    try {
      expect(
        (
          await registration.timetable(
            f.student.auth,
            f.attempt.id,
            f.period.code,
          )
        ).sessions,
      ).toEqual([]);
      await expect(
        publication.review(f.approver.auth, f.saved.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        publication.publish(f.approver.auth, f.saved.id, f.decision),
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
    }
  });
  it('denies an inactive student person even while the account and study appointment remain active', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.person.update({
      where: { id: f.student.personId },
      data: { status: 'INACTIVE' },
    });
    await expect(
      registration.timetable(f.student.auth, f.attempt.id, f.period.code),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('denies a student appointment naturally expiring during published projection reads', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.roleAssignment.update({
      where: { id: f.student.assignmentId },
      data: { endsAt: new Date(Date.now() + 2500) },
    });
    const delayed = db.$extends({
      query: {
        timetableStudentSession: {
          async findMany({ args, query }) {
            const result = await query(args);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return result;
          },
        },
      },
    });
    const delayedRegistration = new RegistrationService(
      delayed as unknown as PrismaService,
      app.get(FinanceService),
      app.get(IntegrationService),
    );
    await expect(
      delayedRegistration.timetable(
        f.student.auth,
        f.attempt.id,
        f.period.code,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
