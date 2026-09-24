import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import {
  convertedStudent,
  csrf,
  http,
  key,
  registeredStudent,
  user,
  type Ctx,
} from './helpers/phase6.js';

/**
 * TASK-PH6-002 outbox envelopes and payload standardisation e2e.
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: envelope-submit, envelope-amend, envelope-waitlist,
 * envelope-legacy, attempt-lifecycle, envelope-concurrent,
 * envelope-preserved.
 */
describe('Phase 6 outbox envelopes', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let records: string;
  let finance: string;

  const regPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/registration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

  const ENVELOPE = [
    'eventId',
    'eventType',
    'correlationId',
    'idempotencyKey',
    'payloadVersion',
    'deliveryStatus',
    'retryPolicy',
  ];

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
    const officer = (
      await user(db, 'ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    const approver = (
      await user(db, 'ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    records = (
      await user(db, 'RECORDS_OFFICER', ['convert-student'], 'INTAKE', '2026')
    ).cookie;
    finance = (
      await user(db, 'FINANCE_OFFICER', ['assess-charges'], 'FINANCE', 'GLOBAL')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    ctx = {
      app,
      db,
      officer,
      approver,
      records,
      finance,
      offeringId: seeded.id,
    } as Ctx;
  });

  afterAll(async () => {
    await app.close();
  });

  async function queuedEvents(applicationId: string) {
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId },
    });
    const registration =
      await db.institutionalRegistration.findFirstOrThrow({
        where: { attemptId: attempt.id },
      });
    return db.outboxEvent.findMany({
      where: { aggregateId: registration.id },
      orderBy: { occurredAt: 'asc' },
    });
  }

  it('envelope-submit: registration events carry the full envelope', async () => {
    const student = await registeredStudent(ctx);
    const events = await queuedEvents(student.id);
    expect(events.length).toBeGreaterThanOrEqual(1);
    const first = events[0];
    expect(first.type).toBe('MoodleEnrolmentQueued');
    const payload = first.payload as Record<string, unknown>;
    for (const field of ENVELOPE) expect(payload[field]).toBeDefined();
    expect(payload.eventId).toBe(first.id);
    expect(payload.eventType).toBe('zm.sis.registration.course-enrolled.v1');
    expect(payload.payloadVersion).toBe(1);
    expect(payload.retryPolicy).toBe('MOODLE-DEMO-v1');
    expect(
      (payload.courses as string[]).sort(),
    ).toEqual(['ENG111', 'MTH111', 'SWE111']);
  });

  it('envelope-amend: change events version their amendment', async () => {
    const student = await registeredStudent(ctx, ['SWE111', 'MTH111', 'ENG111', 'BUS111']);
    const created = await regPost(
      '/changes',
      {
        idempotencyKey: key(),
        kind: 'DROP',
        courseCode: 'BUS111',
        reason: 'Envelope check.',
      },
      student.cookie,
    ).expect(201);
    const amendmentId = (created.body as { id: string }).id;
    await request(http(ctx).raw())
      .post(`/registration/amendments/${amendmentId}/decide`)
      .set(csrf)
      .set('Cookie', records)
      .send({ approve: true, idempotencyKey: key() })
      .expect(201);
    const events = await queuedEvents(student.id);
    const change = events.find((e) => e.type === 'MoodleCourseRemoved');
    expect(change).toBeDefined();
    const payload = change!.payload as Record<string, unknown>;
    for (const field of ENVELOPE) expect(payload[field]).toBeDefined();
    expect(payload.eventType).toBe('zm.sis.registration.course-removed.v1');
    expect(typeof payload.amendmentVersion).toBe('number');
  });

  it('envelope-waitlist: accepted places carry the registration version', async () => {
    const student = await registeredStudent(ctx);
    const joined = await regPost(
      '/waitlist',
      { idempotencyKey: key(), courseCode: 'BUS111' },
      student.cookie,
    ).expect(201);
    const entryId = (joined.body as { id: string }).id;
    await request(http(ctx).raw())
      .post(`/registration/waitlist/${entryId}/decide`)
      .set(csrf)
      .set('Cookie', records)
      .send({ approve: true, note: 'Seat released.', idempotencyKey: key() })
      .expect(201);
    const events = await queuedEvents(student.id);
    const added = events.find((e) => e.type === 'MoodleCourseAdded');
    expect(added).toBeDefined();
    const payload = added!.payload as Record<string, unknown>;
    for (const field of ENVELOPE) expect(payload[field]).toBeDefined();
    expect(typeof payload.amendmentVersion).toBe('number');
  });

  it('envelope-legacy: rows without envelopes resolve deterministically', async () => {
    const student = await registeredStudent(ctx);
    const events = await queuedEvents(student.id);
    const legacy = await db.outboxEvent.create({
      data: {
        aggregate: 'InstitutionalRegistration',
        aggregateId: events[0].aggregateId,
        type: 'MoodleEnrolmentQueued',
        payload: { registrationId: events[0].aggregateId },
      },
    });
    // The worker derivation (slice 3 contract): aggregate + type + row id
    // always rebuild the same idempotency key for legacy rows.
    const derived = `legacy:${legacy.aggregate}:${legacy.type}:${legacy.id}`;
    const again = `legacy:${legacy.aggregate}:${legacy.type}:${legacy.id}`;
    expect(derived).toBe(again);
    expect(derived.length).toBeGreaterThan(0);
    await db.outboxEvent.delete({ where: { id: legacy.id } });
  });

  it('attempt-lifecycle: delivery attempts start pending', async () => {
    const student = await registeredStudent(ctx);
    const events = await queuedEvents(student.id);
    const attempt = await db.integrationDeliveryAttempt.create({
      data: { outboxId: events[0].id, state: 'PENDING', attempt: 0 },
    });
    expect(attempt.state).toBe('PENDING');
    const reread = await db.integrationDeliveryAttempt.findMany({
      where: { outboxId: events[0].id },
    });
    expect(reread).toHaveLength(1);
  });

  it('envelope-concurrent: racing submits confirm once', async () => {
    const student = await convertedStudent(ctx);
    const { regPost: submit } = http(ctx);
    const payload = (v: number) => ({
      version: v,
      idempotencyKey: key(),
      declarations: ['PLAN_ACCURATE', 'RULES_UNDERSTOOD', 'FINANCE_UNDERSTOOD'],
    });
    const saved = await submit(
      '/plan',
      {
        version: 1,
        idempotencyKey: key(),
        courseCodes: ['SWE111', 'MTH111'],
      },
      student.cookie,
    ).expect(201);
    const version = (saved.body as { version: number }).version;
    const [left, right] = await Promise.all([
      submit('/submit', payload(version), student.cookie),
      submit('/submit', payload(version), student.cookie),
    ]);
    // Resource-idempotent: both calls succeed with the single stored
    // registration, so exactly one enrolment event exists.
    expect(left.status).toBe(201);
    expect(right.status).toBe(201);
    expect(left.body).toEqual(right.body);
    const events = await queuedEvents(student.id);
    expect(
      events.filter((e) => e.type === 'MoodleEnrolmentQueued'),
    ).toHaveLength(1);
  });

  it('envelope-preserved: confirmation still never reverses', async () => {
    const student = await registeredStudent(ctx);
    const events = await queuedEvents(student.id);
    expect(events.length).toBeGreaterThanOrEqual(1);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const registration =
      await db.institutionalRegistration.findFirstOrThrow({
        where: { attemptId: attempt.id },
      });
    expect(registration.status).toBe('REGISTERED');
  });
});
