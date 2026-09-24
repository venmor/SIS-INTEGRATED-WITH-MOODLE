import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { http, key, user, type Ctx } from './helpers/phase6.js';

/**
 * TASK-PH6-001 mapping configuration and lifecycle e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: map-draft, map-kinds, map-test-pass, map-test-fail,
 * map-activate, map-foureyes, map-version, map-shell, map-health,
 * map-denied, map-neutral, map-concurrent.
 */
describe('Phase 6 mapping registry and lifecycle', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let adminA: string;
  let adminB: string;
  let offeringId: string;

  const intPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/integration${path}`)
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', c)
      .send(body);
  const intGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/integration${path}`).set('Cookie', c);

  const draft = (cookie: string, body: object) =>
    intPost('/mappings', { idempotencyKey: key(), ...body }, cookie);

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
    adminA = (
      await user(
        db,
        'MOODLE_ADMIN',
        ['sync-moodle', 'manage-mapping'],
        'SYSTEM',
        'MOODLE',
      )
    ).cookie;
    adminB = (
      await user(
        db,
        'MOODLE_ADMIN',
        ['sync-moodle', 'manage-mapping'],
        'SYSTEM',
        'MOODLE',
      )
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
    ctx = {
      app,
      db,
      officer,
      approver,
      records,
      finance,
      offeringId,
    } as Ctx;
  });

  afterAll(async () => {
    await app.close();
  });

  it('map-draft: officers draft versioned mappings', async () => {
    const res = await draft(adminA, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: `${offeringId}:2026S1`,
      moodleId: 'SIM-SH-SWE-2026S1',
    }).expect(201);
    const body = res.body as { status: string; version: number };
    expect(body.status).toBe('DRAFT');
    expect(body.version).toBe(1);
  });

  it('map-kinds: registry kinds are closed', async () => {
    const refused = await draft(adminA, {
      kind: 'WORMHOLE',
      sisType: 'OFFERING',
      sisId: 'x',
      moodleId: 'y',
    }).expect(400);
    expect((refused.body as { code: string }).code).toBe('UNKNOWN_KIND');
  });

  it('map-test-pass: synthetic validation checks the SIS side', async () => {
    const created = await draft(adminA, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: `${offeringId}:2026S1`,
      moodleId: 'SIM-SH-SWE-2026S1',
    }).expect(201);
    const id = (created.body as { id: string }).id;
    const tested = await intPost(
      `/mappings/${id}/test`,
      { idempotencyKey: key() },
      adminA,
    ).expect(201);
    expect((tested.body as { result: string }).result).toBe('PASS');
  });

  it('map-test-fail: dangling SIS references fail without writing', async () => {
    const created = await draft(adminA, {
      kind: 'GROUP',
      sisType: 'TUTORIAL_GROUP',
      sisId: '00000000-0000-0000-0000-000000000000',
      moodleId: 'SIM-GRP-1',
    }).expect(201);
    const id = (created.body as { id: string }).id;
    const tested = await intPost(
      `/mappings/${id}/test`,
      { idempotencyKey: key() },
      adminA,
    ).expect(201);
    const body = tested.body as { result: string; reasons: string[] };
    expect(body.result).toBe('FAIL');
    expect(body.reasons.length).toBeGreaterThan(0);
    // A test never activates anything.
    expect(
      (await db.moodleMapping.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('DRAFT');
  });

  it('map-activate: passing mappings activate under four-eyes', async () => {
    const created = await draft(adminA, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: `${offeringId}:2026S1`,
      moodleId: 'SIM-SH-SWE-2026S1',
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await intPost(`/mappings/${id}/test`, { idempotencyKey: key() }, adminA).expect(201);
    const activated = await intPost(
      `/mappings/${id}/activate`,
      { idempotencyKey: key() },
      adminB,
    ).expect(201);
    expect((activated.body as { status: string }).status).toBe('ACTIVE');
  });

  it('map-foureyes: creators never activate their own mappings', async () => {
    const created = await draft(adminA, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: `${offeringId}:2026S1`,
      moodleId: 'SIM-SH-SWE-2026S1',
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await intPost(`/mappings/${id}/test`, { idempotencyKey: key() }, adminA).expect(201);
    const refused = await intPost(
      `/mappings/${id}/activate`,
      { idempotencyKey: key() },
      adminA,
    ).expect(403);
    expect((refused.body as { code: string }).code).toBe('SOD_VIOLATION');
  });

  it('map-version: activation without a passing test is refused', async () => {
    const created = await draft(adminA, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: `${offeringId}:2026S1`,
      moodleId: 'SIM-SH-SWE-2026S1',
    }).expect(201);
    const id = (created.body as { id: string }).id;
    const refused = await intPost(
      `/mappings/${id}/activate`,
      { idempotencyKey: key() },
      adminB,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('TEST_REQUIRED');
  });

  it('map-shell: one shell per offering and period', async () => {
    const first = await intPost(
      '/shells/provision',
      { idempotencyKey: key(), offeringId },
      adminA,
    ).expect(201);
    const reference = (first.body as { moodleId: string }).moodleId;
    expect(reference).toBe('SIM-SH-SWE-2026S1');
    const replay = await intPost(
      '/shells/provision',
      { idempotencyKey: key(), offeringId },
      adminA,
    ).expect(201);
    expect((replay.body as { moodleId: string }).moodleId).toBe(reference);
    expect(
      await db.moodleMapping.count({
        where: { kind: 'SHELL', sisType: 'OFFERING', status: 'ACTIVE' },
      }),
    ).toBe(1);
  });

  it('map-health: connection state without secrets', async () => {
    const health = await intGet('/health', adminA).expect(200);
    const body = health.body as { provider: string; status: string };
    expect(body.provider).toBe('MOODLE-SIM-v1');
    expect(body.status).toBe('HEALTHY');
    expect(JSON.stringify(health.body)).not.toMatch(/secret|password|key/i);
  });

  it('map-denied: other roles manage nothing', async () => {
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await draft(lecturer.cookie, {
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: 'x',
      moodleId: 'y',
    }).expect(403);
    await intGet('/mappings', lecturer.cookie).expect(403);
    await intGet('/health', lecturer.cookie).expect(403);
    const applicant = await user(db, 'APP', ['apply'], 'APPLICATION', key());
    await intPost(
      '/shells/provision',
      { idempotencyKey: key(), offeringId },
      applicant.cookie,
    ).expect(403);
  });

  it('map-neutral: unknown mappings 404', async () => {
    await intPost(
      `/mappings/00000000-0000-0000-0000-000000000000/test`,
      { idempotencyKey: key() },
      adminA,
    ).expect(404);
  });

  it('map-concurrent: racing provisions converge', async () => {
    const [left, right] = await Promise.all([
      intPost('/shells/provision', { idempotencyKey: key(), offeringId }, adminA),
      intPost('/shells/provision', { idempotencyKey: key(), offeringId }, adminA),
    ]);
    expect(left.status).toBe(201);
    expect(right.status).toBe(201);
    expect(
      (left.body as { moodleId: string }).moodleId,
    ).toBe((right.body as { moodleId: string }).moodleId);
  });
});
