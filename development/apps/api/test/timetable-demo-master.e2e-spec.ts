import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('fictional master and course previews', () => {
  let app: INestApplication;
  let db: PrismaService;
  const oldDemo = process.env.DEMO_MODE;
  const oldGate = process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS;

  async function actor(role: string, scopeType: string, scopeRef: string, capability: string) {
    const person = await db.person.create({ data: { displayName: 'Fictional preview actor', email: `${randomUUID()}@demo.invalid` } });
    const account = await db.account.create({ data: { personId: person.id, username: randomUUID() } });
    const assignment = await db.roleAssignment.create({ data: { accountId: account.id, role, scopeType, scopeRef,
      capabilities: capability ? [capability] : [], reason: 'fictional preview test', startsAt: new Date('2020-01-01') } });
    const token = randomUUID();
    await db.session.create({ data: { accountId: account.id, activeAssignmentId: assignment.id,
      tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) } });
    return { cookie: `sid=${token}`, assignmentId: assignment.id, accountId: account.id };
  }

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) || !/(test|review|ci)/i.test(new URL(url).pathname))
      throw new Error('Use a loopback review database.');
    process.env.DEMO_MODE = 'true'; process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); await app.init(); db = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
    if (oldDemo === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = oldDemo;
    if (oldGate === undefined) delete process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS; else process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = oldGate;
  });

  it('saves one blocked master version and filters course view from the same snapshot', async () => {
    const period = await db.academicPeriod.findUniqueOrThrow({ where: { code: 'DEMO-2026-TEACHING' } });
    const rule = await db.timetableDemoRuleDraft.findFirstOrThrow({ where: { periodId: period.id }, orderBy: { createdAt: 'desc' } });
    const sections = await db.teachingSection.findMany({ where: { offering: { periodId: period.id } },
      include: { offering: { include: { courseVersion: { include: { course: true } } } } } });
    const venues = await db.teachingVenue.findMany({ where: { building: { campusUnit: { code: 'DEMO-MAIN' } } } });
    const teacher = await db.roleAssignment.findMany({ where: { scopeType: 'SECTION', scopeRef: { in: sections.map((s) => s.id) }, role: 'LEC' } });
    expect(sections.length).toBeGreaterThanOrEqual(2);
    const who = await actor('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY', 'timetable-demo-master-draft');
    const latest = await db.timetableDemoMasterDraft.findFirst({ where: { periodId: period.id }, orderBy: { version: 'desc' } });
    const selected = sections.slice(0, 2);
    const input = { clientRequestId: randomUUID(), expectedVersion: latest?.version ?? 0, periodId: period.id, ruleDraftId: rule.id,
      sessions: selected.map((section) => ({ id: randomUUID(), sectionId: section.id, venueId: venues[0].id,
        teacherAssignmentId: teacher.find((assignment) => assignment.scopeRef === section.id)!.id,
        registrationIds: [], startAt: '2026-10-05T08:00:00+02:00', endAt: '2026-10-05T09:00:00+02:00',
        plannedSeats: 20, requiresStepFreeAccess: false })) };
    const saved = await request(app.getHttpServer()).post('/timetabling/demo-master').set('Cookie', who.cookie).send(input).expect(201);
    expect(saved.body.status).toBe('BLOCKED');
    const list = await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', who.cookie).expect(200);
    const row = list.body.find((draft: { id: string }) => draft.id === saved.body.id);
    expect(row.issues.map((issue: { code: string }) => issue.code)).toContain('ROOM_CONFLICT');
    expect(row.issues.map((issue: { code: string }) => issue.code)).toContain('ROSTER_UNVERIFIED');
    const courseCode = selected[0].offering.courseVersion.course.code;
    const filtered = await request(app.getHttpServer()).get(`/timetabling/demo-master/${saved.body.id}/course/${courseCode}`).set('Cookie', who.cookie).expect(200);
    expect(filtered.body.masterDraftId).toBe(saved.body.id);
    expect(filtered.body.sessions).toHaveLength(1);
    expect(filtered.body.sessions[0].courseCode).toBe(courseCode);
    const replay = await request(app.getHttpServer()).post('/timetabling/demo-master').set('Cookie', who.cookie).send(input).expect(201);
    expect(replay.body.id).toBe(saved.body.id);
    await request(app.getHttpServer()).post('/timetabling/demo-master').set('Cookie', who.cookie).send({ ...input, sessions: input.sessions.slice(0, 1) }).expect(409);
    await request(app.getHttpServer()).post('/timetabling/demo-master').set('Cookie', who.cookie).send({ ...input, clientRequestId: randomUUID(), sessions: input.sessions.slice(0, 1) }).expect(409);
    const partial = await request(app.getHttpServer()).post('/timetabling/demo-master').set('Cookie', who.cookie)
      .send({ ...input, clientRequestId: randomUUID(), expectedVersion: saved.body.version, sessions: input.sessions.slice(0, 1) }).expect(201);
    const partialCourse = await request(app.getHttpServer()).get(`/timetabling/demo-master/${partial.body.id}/course/${courseCode}`)
      .set('Cookie', who.cookie).expect(200);
    expect(partialCourse.body.issues.map((issue: { code: string }) => issue.code)).toContain('COVERAGE_INCOMPLETE');
    await expect(db.timetableDemoMasterDraft.update({ where: { id: saved.body.id }, data: { status: 'CONFLICT_FREE_FOR_REVIEW' } })).rejects.toThrow(/append-only/);
  });

  it('denies unrelated and revoked actors and closes the demo switch', async () => {
    const student = await actor('STU', 'PERSON', 'self', 'timetable-demo-master-draft');
    await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', student.cookie).expect(403);
    const planner = await actor('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY', 'timetable-demo-master-draft');
    await request(app.getHttpServer()).get('/timetabling/demo-master/catalogue').set('Cookie', planner.cookie).expect(200);
    await db.roleAssignment.update({ where: { id: planner.assignmentId }, data: { revokedAt: new Date() } });
    await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', planner.cookie).expect(403);
    const another = await actor('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY', 'timetable-demo-master-draft');
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'false';
    await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', another.cookie).expect(404);
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS = 'true';
  });

  it('switches timetable workspaces only between owned live appointments', async () => {
    const planner = await actor('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY', 'timetable-demo-master-draft');
    const campus = await db.roleAssignment.create({ data: { accountId: planner.accountId,
      role: 'DOMAIN_ADMIN', scopeType: 'CAMPUS', scopeRef: 'DEMO-MAIN',
      capabilities: ['timetable-demo-rules-draft'], startsAt: new Date('2020-01-01'), reason: 'Fictional switching fixture' } });
    const headers = { Cookie: planner.cookie, 'x-requested-with': 'XMLHttpRequest' };
    const switched = await request(app.getHttpServer()).post('/auth/workspace/switch').set(headers)
      .send({ assignmentId: campus.id }).expect(200);
    expect(switched.body.activeWorkspace.role).toBe('DOMAIN_ADMIN');
    await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', planner.cookie).expect(403);
    await request(app.getHttpServer()).post('/auth/workspace/switch').set(headers)
      .send({ assignmentId: planner.assignmentId }).expect(200);
    await request(app.getHttpServer()).get('/timetabling/demo-master').set('Cookie', planner.cookie).expect(200);
    const another = await actor('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY', 'timetable-demo-master-draft');
    await request(app.getHttpServer()).post('/auth/workspace/switch').set(headers)
      .send({ assignmentId: another.assignmentId }).expect(400);
    await db.roleAssignment.update({ where: { id: campus.id }, data: { revokedAt: new Date() } });
    await request(app.getHttpServer()).post('/auth/workspace/switch').set(headers)
      .send({ assignmentId: campus.id }).expect(400);
  });
});
