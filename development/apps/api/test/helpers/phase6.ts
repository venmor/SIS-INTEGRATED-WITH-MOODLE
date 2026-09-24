import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../../src/identity-access/prisma.service.js';
import type { DocumentScanner } from '../../src/admissions/scanner.js';

/**
 * Shared Phase 6 e2e journey helpers (TASK-PH6-000..006). Proven flow
 * extracted from the Phase 4/5 specs: applicant → submitted → reviewed →
 * offered → accepted → onboarded → converted → student → registered →
 * assessed. Keeps the seven slice specs small and identical in setup.
 */
export const csrf = { 'x-requested-with': 'XMLHttpRequest' };
export const key = () => randomUUID();

export interface Ctx {
  app: INestApplication;
  db: PrismaService;
  officer: string;
  approver: string;
  records: string;
  finance: string;
  offeringId: string;
}

export function http(ctx: Ctx) {
  const server = ctx.app.getHttpServer();
  return {
    appPost: (path: string, body: object, c: string) =>
      request(server).post(`/applications${path}`).set(csrf).set('Cookie', c).send(body),
    appGet: (path: string, c: string) =>
      request(server).get(`/applications${path}`).set('Cookie', c),
    staffPost: (path: string, body: object, c: string) =>
      request(server).post(`/review${path}`).set(csrf).set('Cookie', c).send(body),
    staffGet: (path: string, c: string) =>
      request(server).get(`/review${path}`).set('Cookie', c),
    recPost: (path: string, body: object, c: string) =>
      request(server).post(`/records${path}`).set(csrf).set('Cookie', c).send(body),
    regPost: (path: string, body: object, c: string) =>
      request(server).post(`/registration${path}`).set(csrf).set('Cookie', c).send(body),
    regGet: (path: string, c: string) =>
      request(server).get(`/registration${path}`).set('Cookie', c),
    finPost: (path: string, body: object, c: string) =>
      request(server).post(`/finance${path}`).set(csrf).set('Cookie', c).send(body),
    finGet: (path: string, c: string) =>
      request(server).get(`/finance${path}`).set('Cookie', c),
    raw: () => server,
  };
}

export async function user(
  db: PrismaService,
  role: string,
  capabilities: string[],
  scopeType = 'SYSTEM',
  scopeRef = 'GLOBAL',
) {
  const person = await db.person.create({
    data: {
      displayName: `Fictional ${role} ${key().slice(0, 8)}`,
      email: `${key()}@demo.invalid`,
      emailVerifiedAt: new Date(),
    },
  });
  const account = await db.account.create({
    data: { personId: person.id, username: key() },
  });
  const assignment = await db.roleAssignment.create({
    data: {
      accountId: account.id,
      role,
      scopeType,
      scopeRef,
      capabilities,
      reason: 'isolated test',
      startsAt: new Date('2020-01-01'),
    },
  });
  const token = key();
  await db.session.create({
    data: {
      accountId: account.id,
      activeAssignmentId: assignment.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { cookie: `sid=${token}`, accountId: account.id };
}

export async function convertedStudent(
  ctx: Ctx,
  givenName = 'Phase',
  familyName = 'Student',
) {
  const { appPost, appGet, staffPost, staffGet, recPost } = http(ctx);
  const { db, officer, approver, records, offeringId } = ctx;
  const me = await user(db, 'APP', ['apply'], 'APPLICATION', key());
  const c = me.cookie;
  const started = await appPost(
    '',
    { offeringId, confirmed: true, idempotencyKey: key() },
    c,
  ).expect(201);
  const id = started.body.id as string;
  let version = started.body.version as number;
  const save = async (section: string, data: object) => {
    const r = await appPost(
      `/${id}/sections/${section}`,
      { version, idempotencyKey: key(), complete: true, data },
      c,
    ).expect(201);
    version = r.body.version as number;
  };
  await save('personal', { givenName, familyName, dateOfBirth: '2000-01-01' });
  await save('contact', { preferredChannel: 'PORTAL' });
  await save('qualifications', {
    routeCode: 'ECZ',
    institution: 'Fictional ECZ',
    awardTitle: 'Grade 12',
    completionYear: 2025,
    status: 'COMPLETED',
    subjects: [
      { subject: 'Mathematics', grade: 4 },
      { subject: 'English', grade: 5 },
    ],
  });
  const { readFile } = await import('node:fs/promises');
  const pdf = await readFile(
    new URL(
      '../../../../packages/test-fixtures/documents/fictional-result.pdf',
      import.meta.url,
    ),
  );
  const uploaded = await request(ctx.app.getHttpServer())
    .post(`/applications/${id}/documents`)
    .set(csrf)
    .set('Cookie', c)
    .field('category', 'qualification')
    .field('version', String(version))
    .field('idempotencyKey', key())
    .attach('file', pdf, 'fictional-result.pdf')
    .expect(201);
  const docId = (uploaded.body as { documents: Array<{ id: string }> })
    .documents.at(-1)?.id as string;
  version = (uploaded.body as { version: number }).version;
  await appPost(
    `/${id}/documents/${docId}/scan`,
    { version, idempotencyKey: key() },
    c,
  ).expect(201);
  const review = await appGet(`/${id}/review`, c).expect(200);
  version = review.body.application.version as number;
  await appPost(
    `/${id}/submit`,
    {
      version,
      confirmed: true,
      idempotencyKey: key(),
      declarations: [
        { id: 'accuracy', version: 'DEMO-DECLARATION-v1', accepted: true },
        { id: 'evidence', version: 'DEMO-DECLARATION-v1', accepted: true },
        { id: 'processing', version: 'DEMO-DECLARATION-v1', accepted: true },
      ],
    },
    c,
  ).expect(201);
  const timelineVersion = async () =>
    (
      (await appGet(`/${id}/timeline`, c).expect(200)).body as {
        version: number;
      }
    ).version;
  await staffPost(
    `/${id}/claim`,
    { version: await timelineVersion(), idempotencyKey: key() },
    officer,
  ).expect(201);
  const queue = await staffGet(`/queue/${id}`, officer).expect(200);
  await staffPost(
    `/${id}/recommendations`,
    {
      version: (queue.body as { version: number }).version,
      idempotencyKey: key(),
      eligibilityOutcome: 'ELIGIBLE',
      recommendation: 'FAVOURABLE',
      rationale: 'Fixture recommendation.',
    },
    officer,
  ).expect(201);
  const queue2 = await staffGet(`/queue/${id}`, officer).expect(200);
  await staffPost(
    `/${id}/decision/release`,
    {
      version: (queue2.body as { version: number }).version,
      idempotencyKey: key(),
      outcome: 'ADMIT_WITH_CONDITIONS',
      message: 'Offered a place with conditions.',
      acceptBy: '2027-01-15T17:00:00.000Z',
      conditions: [],
    },
    approver,
  ).expect(201);
  await appPost(
    `/${id}/offer/response`,
    {
      version: await timelineVersion(),
      idempotencyKey: key(),
      decision: 'ACCEPT',
      declarations: [
        'UNDERSTAND_TERMS',
        'ACCEPT_PROGRAMME',
        'INFO_ACCURATE',
        'REGISTRATION_SEPARATE',
      ],
    },
    c,
  ).expect(201);
  for (const taskKey of ['CONFIRM_CONTACT', 'ACCEPT_DECLARATIONS']) {
    await appPost(
      `/${id}/onboarding/tasks`,
      { version: await timelineVersion(), idempotencyKey: key(), taskKey },
      c,
    ).expect(201);
  }
  await recPost(
    `/applications/${id}/convert`,
    { idempotencyKey: key() },
    records,
  ).expect(201);
  const account = await db.application.findUniqueOrThrow({
    where: { id },
    select: { accountId: true },
  });
  const assignment = await db.roleAssignment.findFirstOrThrow({
    where: { accountId: account.accountId, role: 'STUDENT' },
  });
  const token = key();
  await db.session.create({
    data: {
      accountId: account.accountId,
      activeAssignmentId: assignment.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { id, cookie: `sid=${token}` };
}

const DECLARATIONS = ['PLAN_ACCURATE', 'RULES_UNDERSTOOD', 'FINANCE_UNDERSTOOD'];

export async function registeredStudent(
  ctx: Ctx,
  codes = ['SWE111', 'MTH111', 'ENG111'],
) {
  const { regPost } = http(ctx);
  const student = await convertedStudent(ctx);
  const saved = await regPost(
    '/plan',
    { version: 1, idempotencyKey: key(), courseCodes: codes },
    student.cookie,
  ).expect(201);
  const planVersion = (saved.body as { version: number }).version;
  await regPost(
    '/submit',
    { version: planVersion, idempotencyKey: key(), declarations: DECLARATIONS },
    student.cookie,
  ).expect(201);
  const attempt = await ctx.db.programmeAttempt.findUniqueOrThrow({
    where: { applicationId: student.id },
  });
  return { ...student, attemptId: attempt.id };
}

export async function assessedStudent(
  ctx: Ctx,
  codes = ['SWE111', 'MTH111', 'ENG111'],
) {
  const { finPost } = http(ctx);
  const student = await registeredStudent(ctx, codes);
  await finPost(
    '/assess',
    { idempotencyKey: key(), attemptId: student.attemptId },
    ctx.finance,
  ).expect(201);
  return student;
}
