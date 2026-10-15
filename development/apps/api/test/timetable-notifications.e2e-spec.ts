import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { MasterPreviewService } from '../src/timetabling/master-preview.service.js';
import { TimetablePublicationService } from '../src/timetabling/publication.service.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';

// Real publication -> owner event -> bounded recipient records. No provider mocks.
describe('timetable notification owner handoff', () => {
  let app: INestApplication,
    db: PrismaService,
    master: MasterPreviewService,
    publication: TimetablePublicationService,
    notifications: NotificationsService;
  const password = 'Synthetic-timetable-proof-2026';
  const previous = {
    demo: process.env.DEMO_MODE,
    gate: process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS,
    vercel: process.env.VERCEL,
  };
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
        scopeRef,
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
        scope: `${appointment.scopeType}:${scopeRef}`,
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
    process.env.VERCEL = '1'; // Disable timers; every tick is explicit in these tests.
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
    master = app.get(MasterPreviewService);
    publication = app.get(TimetablePublicationService);
    notifications = app.get(NotificationsService);
    // Drain retained fixtures through the real bounded worker before new scenarios.
    for (let tick = 0; tick < 20; tick++) await notifications.runWorker();
  });
  afterAll(async () => {
    if (app) await app.close();
    for (const [key, value] of [
      ['DEMO_MODE', previous.demo],
      ['SIS_ENABLE_TIMETABLE_DEMO_DRAFTS', previous.gate],
      ['VERCEL', previous.vercel],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  beforeEach(async () => {
    // Each scenario observes its own handoff; retained test events use the same
    // real worker rather than deleting durable history between cases.
    for (let tick = 0; tick < 5; tick++) await notifications.runWorker();
  });
  const ownRecords = (accountId: string) =>
    db.notificationRecord.findMany({
      where: {
        recipientAccountId: accountId,
        event: { in: ['TIMETABLE_PUBLISHED', 'TIMETABLE_UPDATED'] },
      },
      orderBy: { createdAt: 'asc' },
    });
  async function scenario(extraStudents = 0) {
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
    const participants = [{ student, attempt, sourceRegistration }];
    for (let index = 0; index < extraStudents; index++) {
      const person = await db.person.create({
        data: { displayName: 'Generated timetable participant' },
      });
      const account = await db.account.create({
        data: {
          personId: person.id,
          username: randomUUID(),
          roles: {
            create: {
              role: 'STUDENT',
              scopeType: 'PERSON',
              scopeRef: person.id,
              capabilities: ['study'],
              startsAt: new Date('2020-01-01'),
              reason: 'Isolated notification participant',
            },
          },
        },
      });
      const application = await db.application.create({
        data: {
          accountId: account.id,
          offeringId: programmeOffering.id,
          reference: `NOTIFY-${randomUUID()}`,
          policyVersion: 'FICTIONAL-TEST',
          requirementVersion: 'FICTIONAL-TEST',
        },
      });
      const studentRecord = await db.student.create({
        data: {
          personId: person.id,
          studentNumber: `NOTIFY-${randomUUID()}`,
        },
      });
      const nextAttempt = await db.programmeAttempt.create({
        data: {
          studentId: studentRecord.id,
          offeringId: programmeOffering.id,
          applicationId: application.id,
          curriculumVersionId: current.id,
          intake: programmeOffering.intake,
          status: 'ACTIVE',
        },
      });
      const nextRegistration = await db.institutionalRegistration.create({
        data: {
          attemptId: nextAttempt.id,
          periodId: period.id,
          receipt: randomUUID(),
          snapshot: {},
          roster: {
            create: courses.map((course) => ({ courseId: course.id })),
          },
        },
        include: { roster: true },
      });
      participants.push({
        student: { ...student, personId: person.id, accountId: account.id },
        attempt: nextAttempt,
        sourceRegistration: nextRegistration,
      });
    }
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
        teachingCapacity: 100,
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
          capacity: 100,
        },
      });
      const section = await db.teachingSection.create({
        data: {
          offeringId: offering.id,
          code: 'A',
          capacity: 100,
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
        registrationIds: participants.map(
          (participant) =>
            participant.sourceRegistration.roster.find(
              (row) => row.courseId === course.id,
            )!.id,
        ),
        startAt: `2026-10-12T${index ? '10' : '08'}:00:00+02:00`,
        endAt: `2026-10-12T${index ? '11' : '09'}:00:00+02:00`,
        plannedSeats: Math.max(20, participants.length),
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
      participants,
      proposer,
      approver,
      student,
      period,
      attempt,
      record,
      sourceRegistration,
      programmeOffering,
      rule,
      venue,
      command,
      saved,
      decision,
    };
  }
  it('consumes a real publication into one own notice, exact academic link and real in-system delivery', async () => {
    const f = await scenario();
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    expect(await ownRecords(f.student.accountId)).toHaveLength(0);
    await notifications.runWorker();
    const rows = await ownRecords(f.student.accountId);
    expect(rows).toHaveLength(1);
    expect(rows[0].event).toBe('TIMETABLE_PUBLISHED');
    expect(rows[0].dedupeKey).toBe(
      `timetable:${published.publicationId}:${f.student.accountId}`,
    );
    const link = new URL(rows[0].actionPath!, 'http://localhost');
    expect(link.pathname).toBe('/student/timetable');
    expect(link.searchParams.get('attemptId')).toBe(f.attempt.id);
    expect(link.searchParams.get('period')).toBe(f.period.code);
    const ownInbox = await request(app.getHttpServer())
      .get('/notifications/records/mine')
      .set('Cookie', f.student.cookie)
      .expect(200);
    expect(
      ownInbox.body.items.find(
        (item: { id: string }) => item.id === rows[0].id,
      ),
    ).toMatchObject({
      actionPath: rows[0].actionPath,
      body: rows[0].body,
      office: 'Timetabling',
    });
    const deliveries = await db.notificationDelivery.findMany({
      where: { recordId: rows[0].id },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].channel).toBe('IN_SYSTEM');
    expect(deliveries[0].state).toBe('DELIVERED');
    expect(deliveries[0].providerRef).toBeNull(); // In-system records are not simulated external delivery.
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
  });

  it('notifies a replacement once while preserving prior publication and existing read receipt', async () => {
    const f = await scenario();
    const first = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    await notifications.runWorker();
    const initial = (await ownRecords(f.student.accountId))[0];
    expect(initial).toBeDefined();
    await notifications.markRead(f.student.auth, randomUUID(), initial.id);
    const next = await master.create(f.proposer.auth, {
      ...f.command,
      clientRequestId: randomUUID(),
      expectedVersion: f.saved.version,
      sessions: f.command.sessions.map((session) => ({
        ...session,
        startAt: session.startAt.replace('2026-10-12', '2026-10-13'),
        endAt: session.endAt.replace('2026-10-12', '2026-10-13'),
      })),
    });
    const review = await publication.review(f.approver.auth, next.id);
    const second = await publication.publish(f.approver.auth, next.id, {
      ...f.decision,
      clientRequestId: randomUUID(),
      contentDigest: review.draft.contentDigest,
      expectedPublicationId: first.publicationId,
    });
    await notifications.runWorker();
    await notifications.runWorker();
    const rows = await ownRecords(f.student.accountId);
    expect(rows.map((row) => row.event)).toEqual([
      'TIMETABLE_PUBLISHED',
      'TIMETABLE_UPDATED',
    ]);
    expect(rows[1].dedupeKey).toBe(
      `timetable:${second.publicationId}:${f.student.accountId}`,
    );
    expect(
      (
        await db.notificationDelivery.findFirstOrThrow({
          where: { recordId: initial.id },
        })
      ).state,
    ).toBe('READ');
    expect(
      await db.timetableDemoPublication.count({
        where: { periodId: f.period.id },
      }),
    ).toBe(2);
  });

  it('derives recipients from current registration and student authority, ignoring forged event recipients', async () => {
    const f = await scenario(10);
    const outsider = await actor('STUDENT', 'study');
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.outboxEvent.updateMany({
      where: {
        type: 'DemoTimetablePublished',
        aggregateId: (
          await db.timetableDemoPublication.findFirstOrThrow({
            where: { periodId: f.period.id },
          })
        ).id,
      },
      data: {
        payload: {
          recipientAccountId: outsider.accountId,
          attemptId: 'forged',
        },
      },
    });
    await db.courseRegistration.updateMany({
      where: { registrationId: f.participants[1].sourceRegistration.id },
      data: { status: 'DROPPED' },
    });
    await db.programmeAttempt.update({
      where: { id: f.participants[2].attempt.id },
      data: { status: 'WITHDRAWN' },
    });
    await db.account.update({
      where: { id: f.participants[3].student.accountId },
      data: { status: 'SUSPENDED' },
    });
    await db.roleAssignment.updateMany({
      where: {
        accountId: f.participants[4].student.accountId,
        role: 'STUDENT',
      },
      data: { revokedAt: new Date() },
    });
    await db.roleAssignment.updateMany({
      where: {
        accountId: f.participants[5].student.accountId,
        role: 'STUDENT',
      },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    await db.roleAssignment.updateMany({
      where: {
        accountId: f.participants[6].student.accountId,
        role: 'STUDENT',
      },
      data: { startsAt: new Date(Date.now() + 3_600_000) },
    });
    await db.roleAssignment.updateMany({
      where: {
        accountId: f.participants[7].student.accountId,
        role: 'STUDENT',
      },
      data: { capabilities: [] },
    });
    await db.person.update({
      where: { id: f.participants[8].student.personId },
      data: { status: 'INACTIVE' },
    });
    await db.student.updateMany({
      where: { personId: f.participants[9].student.personId },
      data: { status: 'INACTIVE' },
    });
    await db.institutionalRegistration.update({
      where: { id: f.participants[10].sourceRegistration.id },
      data: { status: 'REVERSED' },
    });
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
    for (const participant of f.participants.slice(1))
      expect(await ownRecords(participant.student.accountId)).toHaveLength(0);
    expect(await ownRecords(outsider.accountId)).toHaveLength(0);
    const notice = (await ownRecords(f.student.accountId))[0];
    const outsideInbox = await request(app.getHttpServer())
      .get('/notifications/records/mine')
      .set('Cookie', outsider.cookie)
      .expect(200);
    expect(
      outsideInbox.body.items.some(
        (item: { id: string }) => item.id === notice.id,
      ),
    ).toBe(false);
    await request(app.getHttpServer())
      .get(`/notifications/records/${notice.id}`)
      .set('Cookie', outsider.cookie)
      .expect(404);
  });

  it('limits a tick to fifty recipients, resumes its durable cursor and converges under racing ticks', async () => {
    const f = await scenario(54);
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    const prefix = `timetable:${published.publicationId}:`;
    await notifications.runWorker();
    expect(
      await db.notificationRecord.count({
        where: { dedupeKey: { startsWith: prefix } },
      }),
    ).toBe(50);
    expect(
      await db.timetableNotificationDispatch.findFirstOrThrow({
        where: { publicationId: published.publicationId },
      }),
    ).toMatchObject({
      state: 'PENDING',
      recipientCount: 50,
      notificationCount: 50,
    });
    await Promise.all([notifications.runWorker(), notifications.runWorker()]);
    expect(
      await db.notificationRecord.count({
        where: { dedupeKey: { startsWith: prefix } },
      }),
    ).toBe(55);
    await notifications.runWorker();
    expect(
      await db.notificationRecord.count({
        where: { dedupeKey: { startsWith: prefix } },
      }),
    ).toBe(55);
    for (const participant of f.participants)
      expect(await ownRecords(participant.student.accountId)).toHaveLength(1);
    expect(
      await db.timetableNotificationDispatch.findFirstOrThrow({
        where: { publicationId: published.publicationId },
      }),
    ).toMatchObject({
      state: 'COMPLETE',
      recipientCount: 55,
      notificationCount: 55,
    });
  });

  it('rolls back recipient effects and progress together, then resumes after a database failure', async () => {
    const f = await scenario();
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    const name = `notify_failure_${randomUUID().replaceAll('-', '')}`;
    await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger AS $$ BEGIN
      IF NEW."dedupeKey" = 'timetable:${published.publicationId}:${f.student.accountId}' THEN
        RAISE EXCEPTION 'isolated recipient failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${name} BEFORE INSERT ON "NotificationRecord" FOR EACH ROW EXECUTE FUNCTION ${name}()`,
    );
    try {
      await expect(notifications.runWorker()).rejects.toThrow(
        'isolated recipient failure',
      );
      expect(await ownRecords(f.student.accountId)).toHaveLength(0);
      expect(
        await db.timetableNotificationDispatch.count({
          where: { publicationId: published.publicationId },
        }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER ${name} ON "NotificationRecord"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`);
    }
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
    expect(
      await db.timetableDemoPublication.count({
        where: { id: published.publicationId },
      }),
    ).toBe(1);
  });

  it('allows only a live system administrator to trigger the worker manually', async () => {
    const student = await actor('STUDENT', 'study');
    const admin = await actor(
      'SYSADMIN',
      'administer-identity',
      undefined,
      'GLOBAL',
    );
    const run = (cookie: string) =>
      request(app.getHttpServer())
        .post('/notifications/worker/run')
        .set('Cookie', cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({ idempotencyKey: randomUUID() });
    await run(student.cookie).expect(403);
    await request(app.getHttpServer())
      .post('/notifications/worker/run')
      .expect(401);
    await request(app.getHttpServer())
      .post('/notifications/worker/run')
      .set('Cookie', admin.cookie)
      .send({})
      .expect(403);
    await run(admin.cookie).expect(201);
    await db.roleAssignment.update({
      where: { id: admin.assignmentId },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    await run(admin.cookie).expect(403);
  });

  it('denies an inactive administrator person or a non-global system appointment', async () => {
    const inactive = await actor(
      'SYSADMIN',
      'administer-identity',
      undefined,
      'GLOBAL',
    );
    const scoped = await actor(
      'SYSADMIN',
      'administer-identity',
      undefined,
      'DEMO-UNIVERSITY',
    );
    await db.person.update({
      where: { id: inactive.personId },
      data: { status: 'INACTIVE' },
    });
    for (const admin of [inactive, scoped]) {
      await request(app.getHttpServer())
        .post('/notifications/worker/run')
        .set('Cookie', admin.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({})
        .expect(403);
      expect(
        await db.auditEvent.count({
          where: {
            actorAccountId: admin.accountId,
            action: 'NotificationWorkerDenied',
            outcome: 'DENY',
          },
        }),
      ).toBe(1);
    }
  });

  it('excludes post-publication accounts and keeps the link on the published programme attempt', async () => {
    const f = await scenario();
    const otherOffering = await db.programmeOffering.create({
      data: {
        programmeId: f.programmeOffering.programmeId,
        intake: `OTHER-${randomUUID()}`,
        studyMode: 'FULLTIME',
        campus: 'MAIN',
        availability: 'OPEN',
      },
    });
    const unrelatedApplication = await db.application.create({
      data: {
        accountId: f.student.accountId,
        offeringId: otherOffering.id,
        reference: `UNRELATED-${randomUUID()}`,
        policyVersion: 'FICTIONAL-TEST',
        requirementVersion: 'FICTIONAL-TEST',
      },
    });
    await db.programmeAttempt.create({
      data: {
        id: `00000000-${randomUUID().slice(9)}`,
        studentId: f.record.id,
        applicationId: unrelatedApplication.id,
        offeringId: otherOffering.id,
        intake: otherOffering.intake,
        curriculumVersionId: f.attempt.curriculumVersionId,
        status: 'ACTIVE',
      },
    });
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    const source = await db.timetableDemoPublication.findUniqueOrThrow({
      where: { id: published.publicationId },
    });
    const late = await actor('STUDENT', 'study', f.student.personId);
    await db.account.update({
      where: { id: late.accountId },
      data: {
        createdAt: new Date(source.publishedAt.getTime() + 1000),
      },
    });
    await notifications.runWorker();
    expect(await ownRecords(late.accountId)).toHaveLength(0);
    const own = await ownRecords(f.student.accountId);
    expect(own).toHaveLength(1);
    const link = new URL(own[0].actionPath!, 'http://localhost');
    expect(link.searchParams.get('attemptId')).toBe(f.attempt.id);
  });

  it('does not create a notice when the academic period closes before dispatch', async () => {
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await db.academicPeriod.update({
      where: { id: f.period.id },
      data: { status: 'CLOSED' },
    });
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(0);
    expect(
      await db.institutionalRegistration.findUniqueOrThrow({
        where: { id: f.sourceRegistration.id },
      }),
    ).toMatchObject({ status: 'REGISTERED' });
  });

  it('leaves the owner event pending while the fictional timetable gate is disabled', async () => {
    const f = await scenario();
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'false';
    try {
      await notifications.runWorker();
      expect(await ownRecords(f.student.accountId)).toHaveLength(0);
      expect(
        await db.timetableNotificationDispatch.count({
          where: { publicationId: published.publicationId },
        }),
      ).toBe(0);
    } finally {
      process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
    }
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
  });

  it('converges duplicate publication events without acknowledging another owner', async () => {
    const f = await scenario();
    const published = await publication.publish(
      f.approver.auth,
      f.saved.id,
      f.decision,
    );
    await db.outboxEvent.create({
      data: {
        aggregate: 'DemoTimetable',
        aggregateId: published.publicationId,
        type: 'DemoTimetablePublished',
        payload: { recipientAccountId: 'forged' },
      },
    });
    const name = `notify_race_${randomUUID().replaceAll('-', '')}`;
    await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger AS $$ BEGIN
      IF NEW."dedupeKey" = 'timetable:${published.publicationId}:${f.student.accountId}' THEN
        PERFORM pg_sleep(0.2); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${name} BEFORE INSERT ON "NotificationRecord" FOR EACH ROW EXECUTE FUNCTION ${name}()`,
    );
    try {
      await Promise.all([notifications.runWorker(), notifications.runWorker()]);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER ${name} ON "NotificationRecord"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`);
    }
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
    expect(
      await db.timetableNotificationDispatch.count({
        where: {
          publicationId: published.publicationId,
          state: 'COMPLETE',
        },
      }),
    ).toBe(2);
    const sources = await db.outboxEvent.findMany({
      where: {
        type: 'DemoTimetablePublished',
        aggregateId: published.publicationId,
      },
    });
    expect(sources.every((event) => event.deliveredAt === null)).toBe(true);
  });

  it('blocks an event with no owned publication while allowing the next valid handoff', async () => {
    const source = await db.outboxEvent.create({
      data: {
        aggregate: 'DemoTimetable',
        aggregateId: randomUUID(),
        type: 'DemoTimetablePublished',
        payload: { recipientAccountId: randomUUID() },
      },
    });
    await notifications.runWorker();
    expect(
      await db.timetableNotificationDispatch.findUniqueOrThrow({
        where: { eventId: source.id },
      }),
    ).toMatchObject({
      state: 'BLOCKED',
      failureCode: 'SOURCE_PUBLICATION_UNAVAILABLE',
      notificationCount: 0,
    });
    const f = await scenario();
    await publication.publish(f.approver.auth, f.saved.id, f.decision);
    await notifications.runWorker();
    expect(await ownRecords(f.student.accountId)).toHaveLength(1);
  });
});
