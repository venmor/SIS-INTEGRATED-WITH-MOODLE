import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-004 course selection and validation e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: plan-empty, plan-save, plan-prereq, plan-capacity,
 * plan-unknown, plan-outside-curriculum, plan-update-version,
 * plan-hold-notice, plan-overload, plan-underload, plan-required-missing,
 * plan-version, plan-idempotency, plan-denied, plan-neutral.
 */
describe('Phase 4 course selection and validation', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const appPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/applications${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const appGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/applications${path}`).set('Cookie', c);
  const staffPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/review${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const staffGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/review${path}`).set('Cookie', c);
  const recPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/records${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const regGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/registration${path}`).set('Cookie', c);
  const regPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/registration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

  async function user(
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

  async function convertedStudent() {
    const me = await user('APP', ['apply'], 'APPLICATION', key());
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
    await save('personal', {
      givenName: 'Plan',
      familyName: 'Student',
      dateOfBirth: '2000-01-01',
    });
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
        '../../../packages/test-fixtures/documents/fictional-result.pdf',
        import.meta.url,
      ),
    );
    const uploaded = await request(app.getHttpServer())
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
        {
          version: await timelineVersion(),
          idempotencyKey: key(),
          taskKey,
        },
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

  type Board = {
    version: number;
    status: string;
    items: Array<{ code: string }>;
    available: Array<{ code: string }>;
    validation: Array<{ code: string; result: string; resultCode: string; explanation: string }>;
    loadHalves: number;
    notices: string[];
  };
  const board = async (cookie: string, query = '') =>
    (
      (await regGet(`/plan${query}`, cookie).expect(200)).body as Board
    );
  const save = (cookie: string, version: number, courseCodes: string[]) =>
    regPost(
      '/plan',
      { version, idempotencyKey: key(), courseCodes },
      cookie,
    );

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
    officer = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    approver = (
      await user('ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    records = (
      await user('RECORDS_OFFICER', ['convert-student'], 'INTAKE', '2026')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('plan-empty: no plan yet, catalogue available with prereqs', async () => {
    const app = await convertedStudent();
    const empty = await board(app.cookie);
    expect(empty.version).toBe(0);
    expect(empty.status).toBe('NONE');
    expect(empty.items).toHaveLength(0);
    expect(empty.available.map((c) => c.code)).toContain('SWE111');
    expect(empty.available.map((c) => c.code)).toContain('SWE121');
    expect(empty.validation).toHaveLength(5);
    expect(
      empty.validation.every((v) => v.resultCode === 'REQUIRED_MISSING'),
    ).toBe(true);
  });

  it('plan-save: draft with eligible courses validates clean', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, [
      'SWE111',
      'MTH111',
      'ENG111',
    ]).expect(201);
    const body = saved.body as Board;
    expect(body.version).toBe(1);
    expect(body.status).toBe('DRAFT');
    expect(body.items.map((i) => i.code).sort()).toEqual([
      'ENG111',
      'MTH111',
      'SWE111',
    ]);
    expect(body.loadHalves).toBe(3);
    expect(
      body.validation.filter((v) => v.result === 'BLOCK'),
    ).toHaveLength(0);
    expect(
      body.validation.some(
        (v) => v.resultCode === 'ELIGIBLE' && v.result === 'PASS',
      ),
    ).toBe(true);
  });

  it('plan-prereq: unmet prerequisites block with reasons', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, ['SWE121']).expect(201);
    const blocked = (saved.body as Board).validation.find(
      (v) => v.code === 'SWE121',
    );
    expect(blocked?.result).toBe('BLOCK');
    expect(blocked?.resultCode).toBe('PREREQ_UNMET');
    expect(blocked?.explanation ?? '').toContain('SWE111');
  });

  it('plan-capacity: zero-capacity courses block', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, ['BUS112']).expect(201);
    const blocked = (saved.body as Board).validation.find(
      (v) => v.code === 'BUS112',
    );
    expect(blocked?.result).toBe('BLOCK');
    expect(blocked?.resultCode).toBe('CAPACITY_FULL');
  });

  it('plan-unknown: unknown codes are refused by name', async () => {
    const app = await convertedStudent();
    const refused = await save(app.cookie, 1, ['NOPE999']).expect(400);
    expect((refused.body as { code: string }).code).toBe('UNKNOWN_COURSE');
    expect(JSON.stringify(refused.body)).toContain('NOPE999');
  });

  it('plan-outside-curriculum: existing but unlinked courses refused', async () => {
    const outsider = await db.course.create({
      data: {
        code: 'ZZZ999',
        title: 'Outside the curriculum',
        credits: 15,
        courseType: 'half',
        semester: 'S1',
        capacity: 10,
      },
    });
    const app = await convertedStudent();
    const refused = await save(app.cookie, 1, ['ZZZ999']).expect(400);
    expect((refused.body as { code: string }).code).toBe('UNKNOWN_COURSE');
    await db.course.delete({ where: { id: outsider.id } });
  });

  it('plan-update-version: resaves replace items and bump the version', async () => {
    const app = await convertedStudent();
    await save(app.cookie, 1, ['SWE111']).expect(201);
    // The client sends the current version; the server bumps it.
    const second = await save(app.cookie, 1, ['SWE111', 'MTH111']).expect(201);
    expect((second.body as Board).version).toBe(2);
    expect((second.body as Board).items.map((i) => i.code).sort()).toEqual([
      'MTH111',
      'SWE111',
    ]);
    const stale = await save(app.cookie, 1, ['ENG111']).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
  });

  it('plan-hold-notice: active holds surface on the board', async () => {
    const app = await convertedStudent();
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    const student = await db.student.findFirstOrThrow({
      where: { id: attempt.studentId },
    });
    await db.hold.create({
      data: {
        studentId: student.id,
        holdType: 'FEE_ARREARS',
        effect: 'Blocks registration finalization.',
        reason: 'Unpaid prior balance.',
        office: 'Finance',
        status: 'ACTIVE',
      },
    });
    const withHold = await board(app.cookie);
    expect(
      withHold.notices.some((n) => n.includes('Finance')),
    ).toBe(true);
  });

  it('plan-overload: excess load warns before submit', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, [
      'SWE111',
      'MTH111',
      'ENG111',
      'SWE121',
      'SWE150',
      'BUS111',
    ]).expect(201);
    expect((saved.body as Board).loadHalves).toBe(7);
    expect(
      (saved.body as Board).notices.some((n) => n.includes('maximum')),
    ).toBe(true);
  });

  it('plan-underload: thin plans warn about the minimum', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, ['ENG111']).expect(201);
    expect((saved.body as Board).loadHalves).toBe(1);
    expect(
      (saved.body as Board).notices.some((n) => n.includes('minimum')),
    ).toBe(true);
  });

  it('plan-required-missing: absent required courses warn', async () => {
    const app = await convertedStudent();
    const saved = await save(app.cookie, 1, ['BUS111']).expect(201);
    const missing = (saved.body as Board).validation.filter(
      (v) => v.resultCode === 'REQUIRED_MISSING',
    );
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((v) => v.result === 'WARNING')).toBe(true);
  });

  it('plan-version: covered by update test', async () => {
    const app = await convertedStudent();
    await save(app.cookie, 1, ['SWE111']).expect(201);
    await save(app.cookie, 99, ['MTH111']).expect(409);
  });

  it('plan-idempotency: same key replays without bumping', async () => {
    const app = await convertedStudent();
    const same = key();
    const first = await regPost(
      '/plan',
      { version: 1, idempotencyKey: same, courseCodes: ['SWE111'] },
      app.cookie,
    ).expect(201);
    const replay = await regPost(
      '/plan',
      { version: 1, idempotencyKey: same, courseCodes: ['SWE111'] },
      app.cookie,
    ).expect(201);
    expect((replay.body as Board).version).toBe(
      (first.body as Board).version,
    );
    // Same key, different payload conflicts.
    await regPost(
      '/plan',
      { version: 1, idempotencyKey: same, courseCodes: ['MTH111'] },
      app.cookie,
    ).expect(409);
  });

  it('plan-denied: non-student workspaces refused', async () => {
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await regGet('/plan', applicant.cookie).expect(403);
    await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: [] },
      applicant.cookie,
    ).expect(403);
    await regGet('/plan', officer).expect(403);
  });

  it('plan-neutral: unknown attempts and periods 404', async () => {
    const app = await convertedStudent();
    await regGet(`/plan?attemptId=${randomUUID()}`, app.cookie).expect(404);
    await regGet('/plan?period=NOPE', app.cookie).expect(404);
  });
});
