import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('fictional timetable rule drafts', () => {
  let app: INestApplication;
  let db: PrismaService;
  let periodId: string;
  const previousDemoMode = process.env.DEMO_MODE;
  const previousGate = process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS;

  async function campus() {
    const code = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    const unit = await db.institutionUnit.create({ data: { code } });
    await db.institutionUnitVersion.create({
      data: { unitId: unit.id, version: 1, name: 'Fictional campus', unitType: 'CAMPUS' },
    });
    return { ...unit, code };
  }

  async function actor(role: string, scopeRef: string, capabilities = ['timetable-demo-rules-draft']) {
    const person = await db.person.create({
      data: { displayName: 'Fictional scheduler', email: `${randomUUID()}@demo.invalid`, emailVerifiedAt: new Date() },
    });
    const account = await db.account.create({ data: { personId: person.id, username: randomUUID() } });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id, role, scopeType: 'CAMPUS', scopeRef, capabilities,
        reason: 'synthetic timetable test', startsAt: new Date('2020-01-01'),
      },
    });
    const token = randomUUID();
    await db.session.create({ data: {
      accountId: account.id, activeAssignmentId: assignment.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    } });
    return { cookie: `sid=${token}`, assignmentId: assignment.id };
  }

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) || !/(test|review|ci)/i.test(new URL(url).pathname))
      throw new Error('Use a loopback isolated test/review database.');
    process.env.DEMO_MODE = 'true';
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
    const period = await db.academicPeriod.upsert({
      where: { code: 'DEMO-TIME-005-TEST' }, update: {},
      create: { code: 'DEMO-TIME-005-TEST', status: 'DRAFT' },
    });
    periodId = period.id;
  });

  afterAll(async () => {
    await app.close();
    if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previousDemoMode;
    if (previousGate === undefined) delete process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS;
    else process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = previousGate;
  });

  it('saves immutable versions and handles retry, changed-key reuse and stale edits', async () => {
    const home = await campus();
    const away = await campus();
    const user = await actor('DOMAIN_ADMIN', home.code);
    const input = {
      clientRequestId: randomUUID(), expectedVersion: 0,
      periodId, teachingStartDate: '2026-10-05', teachingEndDate: '2026-12-18',
      dailyStartTime: '08:00', dailyEndTime: '18:00', allowedWeekdays: [1, 2, 3, 4, 5], maxSessionMinutes: 180,
      roomTurnaroundMinutes: 15, maxOccurrences: 200,
      travel: [{ fromCampus: home.code, toCampus: away.code, minutes: 30 }],
    };
    const first = await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send(input).expect(201);
    expect(first.body.version).toBe(1);
    const retry = await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send(input).expect(201);
    expect(retry.body.id).toBe(first.body.id);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({ ...input, maxOccurrences: 201 }).expect(409);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({ ...input, clientRequestId: randomUUID(), maxOccurrences: 201 }).expect(409);
    const second = await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({ ...input, clientRequestId: randomUUID(), expectedVersion: 1, maxOccurrences: 201 }).expect(201);
    expect(second.body.version).toBe(2);
    const list = await request(app.getHttpServer()).get('/timetabling/demo-rules').set('Cookie', user.cookie).expect(200);
    expect(list.body.versions.map((row: { version: number }) => row.version)).toEqual([2, 1]);
    expect(list.body.versions[0].planningPolicyComplete).toBe(true);
    await expect(db.timetableDemoRuleDraft.update({ where: { id: first.body.id }, data: { maxOccurrences: 1 } })).rejects.toThrow(/append-only/);
    const audit = await db.auditEvent.findFirst({ where: { targetRef: first.body.id, action: 'DemoTimetableRuleDraftSaved' } });
    expect(audit?.outcome).toBe('ALLOW');
    expect(audit?.metadata).toBeNull();
    expect(JSON.stringify(audit)).not.toContain('"minutes":30');
  });

  it('denies cross-campus, missing capability, revoked appointments and malformed routes', async () => {
    const home = await campus();
    const away = await campus();
    const user = await actor('DOMAIN_ADMIN', home.code);
    const other = await actor('DOMAIN_ADMIN', away.code);
    const noCapability = await actor('DOMAIN_ADMIN', home.code, []);
    const input = { clientRequestId: randomUUID(), expectedVersion: 0, periodId,
      teachingStartDate: '2026-10-05', teachingEndDate: '2026-12-18', dailyStartTime: '08:00', dailyEndTime: '18:00',
      allowedWeekdays: [1, 2, 3, 4, 5], maxSessionMinutes: 180,
      roomTurnaroundMinutes: 10, maxOccurrences: 20, travel: [] };
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send(input).expect(201);
    const otherList = await request(app.getHttpServer()).get('/timetabling/demo-rules').set('Cookie', other.cookie).expect(200);
    expect(otherList.body.versions).toEqual([]);
    await request(app.getHttpServer()).get('/timetabling/demo-rules').set('Cookie', noCapability.cookie).expect(403);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({ ...input, clientRequestId: randomUUID(), expectedVersion: 1, travel: [{ fromCampus: home.code, toCampus: 'MAIN', minutes: 2 }] }).expect(400);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({ ...input, clientRequestId: randomUUID(), expectedVersion: 1, periodId: randomUUID() }).expect(400);
    await db.roleAssignment.update({ where: { id: user.assignmentId }, data: { revokedAt: new Date() } });
    await request(app.getHttpServer()).get('/timetabling/demo-rules').set('Cookie', user.cookie).expect(403);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send(input).expect(403);
  });

  it('closes read and write when the demo switch is off', async () => {
    const home = await campus();
    const user = await actor('DOMAIN_ADMIN', home.code);
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'false';
    await request(app.getHttpServer()).get('/timetabling/demo-rules').set('Cookie', user.cookie).expect(404);
    await request(app.getHttpServer()).post('/timetabling/demo-rules').set('Cookie', user.cookie).send({}).expect(404);
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
  });
});
