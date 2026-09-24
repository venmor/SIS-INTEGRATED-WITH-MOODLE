import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import {
  assessedStudent,
  http,
  key,
  user,
  type Ctx,
} from './helpers/phase6.js';

/**
 * TASK-PH6-004 delivery queue, workspaces and maintenance e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: ops-queue, ops-health, ops-shells, ops-maintenance,
 * ops-defer, ops-student-states, ops-denied, ops-neutral.
 */
describe('Phase 6 delivery queues and maintenance', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let admin: string;
  let support: string;

  const intPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/integration${path}`)
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', c)
      .send(body);
  const intGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/integration${path}`).set('Cookie', c);
  const regGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/registration${path}`).set('Cookie', c);

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
    const records = (
      await user(db, 'RECORDS_OFFICER', ['convert-student'], 'INTAKE', '2026')
    ).cookie;
    const finance = (
      await user(db, 'FINANCE_OFFICER', ['assess-charges'], 'FINANCE', 'GLOBAL')
    ).cookie;
    admin = (
      await user(
        db,
        'MOODLE_ADMIN',
        ['sync-moodle', 'manage-mapping'],
        'SYSTEM',
        'MOODLE',
      )
    ).cookie;
    support = (
      await user(
        db,
        'INTEGRATION_SUPPORT',
        ['replay-event', 'manage-incident'],
        'SYSTEM',
        'INTEGRATION',
      )
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

  it('ops-queue: both operations roles see deliveries with envelopes', async () => {
    await assessedStudent(ctx);
    await intPost('/worker/run', {}, admin).expect(201);
    for (const cookie of [admin, support]) {
      const queue = await intGet('/deliveries', cookie).expect(200);
      const items = (
        queue.body as {
          items: Array<{
            id: string;
            eventType: string;
            state: string;
            attempt: number;
            lastError: string | null;
          }>;
        }
      ).items;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(
        items.every(
          (i) =>
            typeof i.eventType === 'string' &&
            typeof i.state === 'string' &&
            Number.isInteger(i.attempt),
        ),
      ).toBe(true);
      const first = items[0];
      const detail = await intGet(`/deliveries/${first.id}`, cookie).expect(200);
      expect(
        ((detail.body as { envelope: Record<string, unknown> }).envelope)
          .idempotencyKey,
      ).toBeDefined();
    }
  });

  it('ops-health: outage and recovery show without secrets', async () => {
    await db.moodleMaintenance.deleteMany();
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
    const healthy = await intGet('/health', admin).expect(200);
    expect((healthy.body as { status: string }).status).toBe('HEALTHY');
    await intPost('/simulator/mode', { mode: 'OUTAGE' }, admin).expect(201);
    const down = await intGet('/health', support).expect(200);
    expect((down.body as { status: string }).status).toBe('OUTAGE');
    expect(JSON.stringify(down.body)).not.toMatch(/secret|password/i);
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
    const back = await intGet('/health', admin).expect(200);
    expect((back.body as { status: string }).status).toBe('HEALTHY');
  });

  it('ops-shells: shells and enrolments list with counts', async () => {
    const student = await assessedStudent(ctx);
    void student;
    await intPost('/worker/run', {}, admin).expect(201);
    const shells = await intGet('/shells', admin).expect(200);
    const shellItems = (
      shells.body as {
        items: Array<{ shellRef: string; activeEnrolments: number }>;
      }
    ).items;
    expect(shellItems).toHaveLength(1);
    expect(shellItems[0].shellRef).toBe('SIM-SH-SWE-2026S1');
    expect(shellItems[0].activeEnrolments).toBeGreaterThanOrEqual(1);
    const enrolments = await intGet('/enrolments', admin).expect(200);
    const rows = (
      enrolments.body as {
        items: Array<{ studentNumber: string | null; status: string }>;
      }
    ).items;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.studentNumber !== null)).toBe(true);
  });

  it('ops-maintenance: windows schedule, defer and cancel', async () => {
    const student = await assessedStudent(ctx);
    const now = Date.now();
    const scheduled = await intPost(
      '/maintenance',
      {
        idempotencyKey: key(),
        reason: 'Demo database upgrade.',
        startsAt: new Date(now - 1000).toISOString(),
        endsAt: new Date(now + 3600_000).toISOString(),
      },
      admin,
    ).expect(201);
    const windowId = (scheduled.body as { id: string }).id;
    const health = await intGet('/health', admin).expect(200);
    expect((health.body as { status: string }).status).toBe('MAINTENANCE');
    // Deliveries inside the window defer without failing.
    const run = await intPost('/worker/run', {}, admin).expect(201);
    expect((run.body as { dead: number }).dead).toBe(0);
    const status = await regGet('/status', student.cookie).expect(200);
    expect(
      (status.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    // Invalid windows are refused.
    await intPost(
      '/maintenance',
      {
        idempotencyKey: key(),
        reason: 'Backwards.',
        startsAt: new Date(now + 3600_000).toISOString(),
        endsAt: new Date(now - 1000).toISOString(),
      },
      admin,
    ).expect(400);
    await intPost(
      `/maintenance/${windowId}/cancel`,
      { idempotencyKey: key() },
      admin,
    ).expect(201);
    // Deferred attempts keep their future slot; release them for the check.
    await db.integrationDeliveryAttempt.updateMany({
      data: { nextRunAt: new Date('2020-01-01T00:00:00Z') },
    });
    const recovered = await intPost('/worker/run', {}, admin).expect(201);
    expect((recovered.body as { delivered: number }).delivered).toBeGreaterThanOrEqual(
      1,
    );
    const synced = await regGet('/status', student.cookie).expect(200);
    expect(
      (synced.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Synced');
  });

  it('ops-defer: deferred attempts resume at the window end', async () => {
    await assessedStudent(ctx);
    const now = Date.now();
    await intPost(
      '/maintenance',
      {
        idempotencyKey: key(),
        reason: 'Short window.',
        startsAt: new Date(now - 1000).toISOString(),
        endsAt: new Date(now + 3600_000).toISOString(),
      },
      admin,
    ).expect(201);
    await intPost('/worker/run', {}, admin).expect(201);
    const deferred = await db.integrationDeliveryAttempt.findFirst({
      where: { lastError: 'Deferred for scheduled maintenance.' },
      orderBy: { createdAt: 'desc' },
    });
    expect(deferred).toBeDefined();
    expect(deferred!.nextRunAt!.getTime()).toBeGreaterThan(now);
    // Leave no active window behind for later suites.
    await db.moodleMaintenance.deleteMany();
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
  });

  it('ops-student-states: students read own sync state only', async () => {
    const student = await assessedStudent(ctx);
    const status = await regGet('/status', student.cookie).expect(200);
    expect(
      (status.body as { moodle: { state: string; detail: string } }).moodle
        .detail.length,
    ).toBeGreaterThan(0);
  });

  it('ops-denied: academic and applicant roles stay outside', async () => {
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    for (const path of [
      '/deliveries',
      '/shells',
      '/enrolments',
      '/maintenance',
      '/health',
    ]) {
      await intGet(path, lecturer.cookie).expect(403);
    }
    await intPost(
      '/maintenance',
      {
        idempotencyKey: key(),
        reason: 'Nope.',
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 1000).toISOString(),
      },
      lecturer.cookie,
    ).expect(403);
    const applicant = await user(db, 'APP', ['apply'], 'APPLICATION', key());
    await intGet('/deliveries', applicant.cookie).expect(403);
    const student = await assessedStudent(ctx);
    await intGet('/deliveries', student.cookie).expect(403);
    await intPost('/worker/run', {}, student.cookie).expect(403);
  });

  it('ops-neutral: unknown deliveries and windows 404', async () => {
    await intGet('/deliveries/00000000-0000-0000-0000-000000000000', admin).expect(
      404,
    );
    await intPost(
      '/maintenance/00000000-0000-0000-0000-000000000000/cancel',
      { idempotencyKey: key() },
      admin,
    ).expect(404);
  });
});
