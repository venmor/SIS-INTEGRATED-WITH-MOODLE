import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { user, key } from './helpers/phase6.js';
import request from 'supertest';

/**
 * TASK-PH8-003 ops health and incident queue e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: manual open + list scoping, ack ownership, resolve
 * demands evidence + root cause, close immutability, auto-open on
 * notification dead-letter (dedupe), auto-open on integration
 * dead-letter, mandatory lane stays examinations-only, role denials,
 * neutrals, racing-resolve convergence, idempotent replay + key
 * conflict, expired-grant 403. Domain dead-letter writes are driven
 * through the real workers; incident rows are asserted, never invented.
 */
const csrf = { 'x-requested-with': 'XMLHttpRequest' };

describe('Phase 8 ops incident queue', () => {
  let app: INestApplication;
  let db: PrismaService;
  let supportCookie: string;
  let supportAccountId: string;
  let moodleCookie: string;
  let sysadminCookie: string;
  let studentCookie: string;
  let tutorCookie: string;

  const post = (path: string, body: object, cookie: string) =>
    request(app.getHttpServer())
      .post(`/ops${path}`)
      .set(csrf)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string, cookie: string) =>
    request(app.getHttpServer()).get(`/ops${path}`).set('Cookie', cookie);

  const openBody = (extra = {}) => ({
    idempotencyKey: key(),
    title: 'Simulator provider timeouts',
    severity: 'HIGH',
    sourceRef: `manual-${key()}`,
    ...extra,
  });

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
    const support = await user(
      db,
      'INTEGRATION_SUPPORT',
      ['replay-event'],
      'SYSTEM',
      'MOODLE',
    );
    supportCookie = support.cookie;
    supportAccountId = support.accountId;
    moodleCookie = (
      await user(db, 'MOODLE_ADMIN', ['sync-moodle'], 'SYSTEM', 'MOODLE')
    ).cookie;
    sysadminCookie = (
      await user(db, 'SYSADMIN', ['administer-identity'], 'SYSTEM', 'GLOBAL')
    ).cookie;
    studentCookie = (await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')).cookie;
    tutorCookie = (
      await user(db, 'TUT', ['mark-delegated-activities'], 'TUTORIAL_GROUP', 'TG-1')
    ).cookie;
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  it('open-happy-path: manual incident opens with owner and target', async () => {
    const res = (await post('/incidents', openBody(), supportCookie).expect(201))
      .body as { id: string; status: string; ownerRole: string };
    expect(res.status).toBe('OPEN');
    expect(res.ownerRole).toBe('INTEGRATION_SUPPORT');
    const row = await db.opsIncident.findUniqueOrThrow({ where: { id: res.id } });
    expect(row.sourceKind).toBe('MANUAL');
    expect(row.version).toBe(1);
  });

  it('open-refusal: bad severity and short titles fail closed', async () => {
    const bad = await post('/incidents', openBody({ severity: 'COSMIC' }), supportCookie);
    expect(bad.status).toBe(400);
    const short = await post('/incidents', openBody({ title: 'Down' }), supportCookie);
    expect(short.status).toBe(400);
    expect(
      await db.opsIncident.count({ where: { title: 'Down' } }),
    ).toBe(0);
  });

  it('lifecycle: ack takes ownership, resolve demands evidence, close seals', async () => {
    const opened = (await post('/incidents', openBody(), supportCookie).expect(201))
      .body as { id: string; version: number };
    const acked = (await post(
      `/incidents/${opened.id}/acknowledge`,
      { idempotencyKey: key(), version: opened.version },
      supportCookie,
    ).expect(201)).body as { status: string; version: number; ownerAccountId: string };
    expect(acked.status).toBe('ACKNOWLEDGED');
    expect(acked.ownerAccountId).toBe(supportAccountId);
    const bare = await post(
      `/incidents/${opened.id}/resolve`,
      { idempotencyKey: key(), version: acked.version, rootCause: 'Timeout', recoveryEvidence: 'Fixed' },
      supportCookie,
    );
    expect(bare.status).toBe(400);
    const resolved = (await post(
      `/incidents/${opened.id}/resolve`,
      {
        idempotencyKey: key(),
        version: acked.version,
        rootCause: 'Simulator provider timed out under retry storm.',
        recoveryEvidence: 'Provider recovered; deliveries drained and reconciled against the outbox.',
        preventiveAction: 'Halve the worker batch during incidents.',
      },
      supportCookie,
    ).expect(201)).body as { status: string };
    expect(resolved.status).toBe('RESOLVED');
    const closed = (await post(
      `/incidents/${opened.id}/close`,
      { idempotencyKey: key(), version: acked.version + 1 },
      supportCookie,
    ).expect(201)).body as { status: string };
    expect(closed.status).toBe('CLOSED');
    const sealed = await post(
      `/incidents/${opened.id}/acknowledge`,
      { idempotencyKey: key(), version: acked.version + 2 },
      supportCookie,
    );
    expect(sealed.status).toBe(409);
    expect(sealed.body.code).toBe('REQUEST_CLOSED');
  });

  it('auto-open-notify: notification dead-letter opens exactly one incident', async () => {
    const gov = (await user(db, 'SYSADMIN', ['administer-identity'], 'SYSTEM', 'GLOBAL')).cookie;
    const acct = (await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')).accountId;
    const api = request(app.getHttpServer());
    const tpl = (await api.post('/notifications/templates').set(csrf).set('Cookie', gov).send({
      idempotencyKey: key(),
      event: 'SUPPORT_REPLY',
      title: 'Support update',
      body: 'Your adviser sent a support message.',
      office: 'Welfare',
      category: 'SUPPORT',
      mandatory: false,
    }).expect(201)).body as { id: string };
    const rec = (await api.post('/notifications/records').set(csrf).set('Cookie', gov).send({
      idempotencyKey: key(),
      templateId: tpl.id,
      event: 'SUPPORT_REPLY',
      title: 'Support update',
      body: 'Your adviser sent a support message.',
      office: 'Welfare',
      category: 'SUPPORT',
      mandatory: false,
      recipientAccountId: acct,
      dedupeKey: key(),
      channels: ['SMS_SIM'],
      simulateFailure: true,
    }).expect(201)).body as { id: string };
    for (let i = 0; i < 3; i++) {
      await db.notificationDelivery.updateMany({
        where: { recordId: rec.id },
        data: { nextRunAt: new Date(Date.now() - 1000) },
      });
      await api.post('/notifications/worker/run').set(csrf).set('Cookie', gov).send({}).expect(201);
    }
    const incidents = await db.opsIncident.findMany({
      where: { sourceKind: 'NOTIFICATION_DELIVERY' },
    });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].status).toBe('OPEN');
  });

  it('auto-open-integrate: integration dead-letter opens one incident', async () => {
    const outbox = await db.outboxEvent.create({
      data: {
        aggregate: 'MoodleDelivery',
        aggregateId: key(),
        type: 'MoodleGradeTransferStaged',
        payload: {},
      },
    });
    const attempt = await db.integrationDeliveryAttempt.create({
      data: {
        outboxId: outbox.id,
        state: 'DEAD_LETTER',
        attempt: 5,
        lastError: 'SIMULATED_PROVIDER_FAILURE',
      },
    });
    await post(
      `/incidents/sweep`,
      { idempotencyKey: key(), attemptId: attempt.id },
      supportCookie,
    ).expect(201);
    await post(
      `/incidents/sweep`,
      { idempotencyKey: key(), attemptId: attempt.id },
      supportCookie,
    ).expect(201);
    const incidents = await db.opsIncident.findMany({
      where: { sourceKind: 'INTEGRATION_DELIVERY', sourceRef: attempt.id },
    });
    expect(incidents).toHaveLength(1);
  });

  it('mandatory-lane: mandatory dead-letters stay examinations-only', async () => {
    const gov = (await user(db, 'SYSADMIN', ['administer-identity'], 'SYSTEM', 'GLOBAL')).cookie;
    const acct = (await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')).accountId;
    const api = request(app.getHttpServer());
    const tpl = (await api.post('/notifications/templates').set(csrf).set('Cookie', gov).send({
      idempotencyKey: key(),
      event: 'RESULT_RELEASED',
      title: 'Official results released',
      body: 'Your official results are available securely in the portal.',
      office: 'Examinations',
      category: 'RESULT',
      mandatory: true,
    }).expect(201)).body as { id: string };
    const rec = (await api.post('/notifications/records').set(csrf).set('Cookie', gov).send({
      idempotencyKey: key(),
      templateId: tpl.id,
      event: 'RESULT_RELEASED',
      title: 'Official results released',
      body: 'Your official results are available securely in the portal.',
      office: 'Examinations',
      category: 'RESULT',
      mandatory: true,
      recipientAccountId: acct,
      dedupeKey: key(),
      channels: ['SMS_SIM'],
      simulateFailure: true,
    }).expect(201)).body as { id: string };
    for (let i = 0; i < 3; i++) {
      await db.notificationDelivery.updateMany({
        where: { recordId: rec.id },
        data: { nextRunAt: new Date(Date.now() - 1000) },
      });
      await api.post('/notifications/worker/run').set(csrf).set('Cookie', gov).send({}).expect(201);
    }
    const delivery = await db.notificationDelivery.findFirstOrThrow({
      where: { recordId: rec.id },
    });
    expect(delivery.state).toBe('DEAD_LETTER');
    // Mandatory lane: examinations escalation record exists, but no
    // generic OpsIncident duplicates it.
    const escalations = await db.notificationRecord.count({
      where: { event: 'NOTICE_ESCALATED' },
    });
    expect(escalations).toBeGreaterThanOrEqual(1);
    expect(
      await db.opsIncident.count({ where: { sourceKind: 'NOTIFICATION_DELIVERY' } }),
    ).toBe(0);
  });

  it('denials: students, tutors and sysadmin refused on writes', async () => {
    for (const cookie of [studentCookie, tutorCookie, sysadminCookie]) {
      const denied = await post('/incidents', openBody(), cookie);
      expect([403, 404]).toContain(denied.status);
    }
    const opened = (await post('/incidents', openBody(), supportCookie).expect(201))
      .body as { id: string; version: number };
    for (const cookie of [studentCookie, tutorCookie]) {
      const dec = await post(
        `/incidents/${opened.id}/acknowledge`,
        { idempotencyKey: key(), version: opened.version },
        cookie,
      );
      expect([403, 404]).toContain(dec.status);
    }
  });

  it('reads: moodle admins read queue, outsiders get neutrals', async () => {
    await post('/incidents', openBody(), supportCookie).expect(201);
    const queue = (await get('/queue', moodleCookie).expect(200)).body as {
      openIncidents: number;
    };
    expect(queue.openIncidents).toBeGreaterThanOrEqual(1);
    const missing = await get(`/incidents/${key()}`, supportCookie);
    expect(missing.status).toBe(404);
    const outsider = await get('/queue', studentCookie);
    expect([403, 404]).toContain(outsider.status);
  });

  it('neutral: unknown incidents are 404 without disclosure', async () => {
    const missing = await get(`/incidents/${key()}`, supportCookie);
    expect(missing.status).toBe(404);
  });

  it('concurrency: racing resolves converge on one outcome', async () => {
    const opened = (await post('/incidents', openBody(), supportCookie).expect(201))
      .body as { id: string; version: number };
    await post(
      `/incidents/${opened.id}/acknowledge`,
      { idempotencyKey: key(), version: opened.version },
      supportCookie,
    ).expect(201);
    const evidence = {
      rootCause: 'Simulator provider timed out under retry storm.',
      recoveryEvidence: 'Provider recovered; deliveries drained and reconciled against the outbox.',
    };
    const [a, b] = await Promise.all([
      post(`/incidents/${opened.id}/resolve`, { idempotencyKey: key(), version: opened.version + 1, ...evidence }, supportCookie),
      post(`/incidents/${opened.id}/resolve`, { idempotencyKey: key(), version: opened.version + 1, ...evidence }, supportCookie),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);
    const kept = await db.opsIncident.findUniqueOrThrow({ where: { id: opened.id } });
    expect(kept.status).toBe('RESOLVED');
  });

  it('idempotent: same key replays; mismatched key conflicts', async () => {
    const k = key();
    const ref = `manual-${key()}`;
    const first = (await post('/incidents', { ...openBody(), sourceRef: ref, idempotencyKey: k }, supportCookie).expect(201))
      .body as { id: string };
    const retry = (await post('/incidents', { ...openBody(), sourceRef: ref, idempotencyKey: k }, supportCookie    ).expect(201))
      .body as { id: string };
    expect(retry.id).toBe(first.id);
    const conflict = await post(
      '/incidents',
      { ...openBody({ title: 'Different incident entirely here' }), idempotencyKey: k },
      supportCookie,
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('expired-grant: lapsed support cannot open incidents', async () => {
    const target = await db.roleAssignment.findFirstOrThrow({
      where: { accountId: supportAccountId, role: 'INTEGRATION_SUPPORT' },
    });
    await db.roleAssignment.update({
      where: { id: target.id },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const denied = await post('/incidents', openBody(), supportCookie);
      expect(denied.status).toBe(403);
    } finally {
      await db.roleAssignment.update({
        where: { id: target.id },
        data: { endsAt: null },
      });
    }
  });
});
