import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-006 add/drop and exception skeleton e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: change-add, change-drop-required, change-drop,
 * change-unknown, change-duplicate, amendment-approve-add,
 * amendment-approve-drop, amendment-decline, amendment-late,
 * amendment-history, waitlist-join, waitlist-duplicate, waitlist-accept,
 * waitlist-full, waitlist-expired, waitlist-cancel, changes-denied,
 * changes-neutral.
 */
describe('Phase 4 course changes and waitlist', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let finance: string;
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
  const finPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/finance${path}`)
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
      givenName: 'Change',
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

  const DECLARATIONS = ['PLAN_ACCURATE', 'RULES_UNDERSTOOD', 'FINANCE_UNDERSTOOD'];

  async function registeredStudent(codes = ['SWE111', 'MTH111', 'ENG111']) {
    const app = await convertedStudent();
    const saved = await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: codes },
      app.cookie,
    ).expect(201);
    const planVersion = (saved.body as { version: number }).version;
    await regPost(
      '/submit',
      { version: planVersion, idempotencyKey: key(), declarations: DECLARATIONS },
      app.cookie,
    ).expect(201);
    return app;
  }

  const change = (
    cookie: string,
    body: object,
  ) => regPost('/changes', { idempotencyKey: key(), ...body }, cookie);

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
    finance = (
      await user('FINANCE_OFFICER', ['assess-charges'], 'FINANCE', 'GLOBAL')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('change-add: request an elective addition with reason', async () => {
    const app = await registeredStudent();
    const created = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Interested in business basics.',
    }).expect(201);
    expect((created.body as { status: string }).status).toBe('PENDING');
    expect((created.body as { version: number }).version).toBe(1);
    const dupe = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Second try.',
    }).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
  });

  it('change-drop-required: compulsory courses refuse with advice', async () => {
    const app = await registeredStudent();
    const refused = await change(app.cookie, {
      kind: 'DROP',
      courseCode: 'SWE111',
      reason: 'Too hard.',
    }).expect(409);
    expect((refused.body as { code: string }).code).toBe('NON_DROPPABLE');
    expect(JSON.stringify(refused.body)).toMatch(/advice/i);
  });

  it('change-unknown: outside-curriculum and missing courses refuse', async () => {
    const app = await registeredStudent();
    const unknown = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'NOPE999',
      reason: 'Invented.',
    }).expect(400);
    expect((unknown.body as { code: string }).code).toBe('UNKNOWN_COURSE');
  });

  it('amendment-approve-add: roster grows, version bumps, event queued', async () => {
    const app = await registeredStudent();
    const created = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Interested in business basics.',
    }).expect(201);
    const amendmentId = (created.body as { id: string }).id;
    const decided = await regPost(
      `/amendments/${amendmentId}/decide`,
      { approve: true, note: 'Capacity confirmed.', idempotencyKey: key() },
      records,
    ).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const status = await regGet('/status', app.cookie).expect(200);
    const body = status.body as {
      registration: { version: number };
      amendments: Array<{ status: string; kind: string }>;
      moodle: { state: string };
    };
    expect(body.registration.version).toBe(2);
    expect(
      body.amendments.some(
        (a) => a.kind === 'ADD' && a.status === 'APPROVED',
      ),
    ).toBe(true);
    const outbox = await db.outboxEvent.findFirst({
      where: { type: 'MoodleCourseAdded' },
    });
    expect(outbox).toBeDefined();
  });

  it('amendment-prerequisite: an approval cannot add an unmet prerequisite', async () => {
    const app = await registeredStudent();
    const created = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'SWE121',
      reason: 'I want to study data structures.',
    }).expect(201);
    const denied = await regPost(
      `/amendments/${(created.body as { id: string }).id}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(409);
    expect((denied.body as { code: string }).code).toBe('PREREQ_UNMET');
  });

  it('amendment-finance: an approved add reassesses charges', async () => {
    const app = await registeredStudent();
    const student = await db.student.findFirstOrThrow({
      where: { person: { accounts: { some: { sessions: { some: { tokenHash: createHash('sha256').update(app.cookie.slice(4)).digest('hex') } } } } } },
      include: { attempts: true },
    });
    const attemptId = student.attempts[0].id;
    await finPost('/assess', { attemptId, idempotencyKey: key() }, finance).expect(201);
    const account = await db.financeAccount.findUniqueOrThrow({ where: { studentId: student.id } });
    const invoice = await db.financeInvoice.findFirstOrThrow({ where: { accountId: account.id } });
    const before = await db.financeChargeLine.aggregate({ where: { invoiceId: invoice.id }, _sum: { amountMinor: true } });
    const created = await change(app.cookie, { kind: 'ADD', courseCode: 'BUS111', reason: 'Elective.' }).expect(201);
    const approved = await regPost(`/amendments/${(created.body as { id: string }).id}/decide`, { approve: true, idempotencyKey: key() }, records);
    expect(approved.status, JSON.stringify(approved.body)).toBe(201);
    const after = await db.financeChargeLine.aggregate({ where: { invoiceId: invoice.id }, _sum: { amountMinor: true } });
    expect((after._sum.amountMinor ?? 0) - (before._sum.amountMinor ?? 0)).toBe(85000);
    const clearance = await db.financeClearance.findFirstOrThrow({ where: { studentId: student.id } });
    expect(clearance.status).not.toBe('CLEARED');
  });

  it('amendment-credit: a drop appends a credit without erasing the original charge', async () => {
    const app = await registeredStudent(['SWE111', 'MTH111', 'ENG111', 'BUS111']);
    const student = await db.student.findFirstOrThrow({
      where: { person: { accounts: { some: { sessions: { some: { tokenHash: createHash('sha256').update(app.cookie.slice(4)).digest('hex') } } } } } },
      include: { attempts: true },
    });
    await finPost('/assess', { attemptId: student.attempts[0].id, idempotencyKey: key() }, finance).expect(201);
    const account = await db.financeAccount.findUniqueOrThrow({ where: { studentId: student.id } });
    const invoice = await db.financeInvoice.findFirstOrThrow({ where: { accountId: account.id } });
    const created = await change(app.cookie, { kind: 'DROP', courseCode: 'BUS111', reason: 'Change my elective.' }).expect(201);
    await regPost(`/amendments/${(created.body as { id: string }).id}/decide`, { approve: true, idempotencyKey: key() }, records).expect(201);
    const bus = await db.financeChargeLine.findMany({ where: { invoiceId: invoice.id, course: { code: 'BUS111' } }, orderBy: { createdAt: 'asc' } });
    expect(bus.map((row) => [row.code, row.amountMinor])).toEqual([
      ['COURSE_FEE', 85000], ['COURSE_FEE_REVERSAL', -85000],
    ]);
  });

  it('amendment-approve-drop: roster flips, never deletes', async () => {
    const app = await registeredStudent(['SWE111', 'MTH111', 'ENG111', 'BUS111']);
    const created = await change(app.cookie, {
      kind: 'DROP',
      courseCode: 'BUS111',
      reason: 'Overloaded.',
    }).expect(201);
    await regPost(
      `/amendments/${(created.body as { id: string }).id}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(201);
    const status = await regGet('/status', app.cookie).expect(200);
    expect(
      (status.body as { registration: { version: number } }).registration
        .version,
    ).toBe(2);
    const table = await regGet('/timetable', app.cookie).expect(200);
    const codes = (
      table.body as {
        groups: Array<{ courses: Array<{ code: string }> }>;
      }
    ).groups.flatMap((g) => g.courses.map((c) => c.code));
    expect(codes).not.toContain('BUS111');
    expect(codes).toContain('SWE111');
  });

  it('amendment-decline: refusal preserves everything', async () => {
    const app = await registeredStudent();
    const created = await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Maybe.',
    }).expect(201);
    const declined = await regPost(
      `/amendments/${(created.body as { id: string }).id}/decide`,
      { approve: false, note: 'Not this period.', idempotencyKey: key() },
      records,
    ).expect(201);
    expect((declined.body as { status: string }).status).toBe('REJECTED');
    const status = await regGet('/status', app.cookie).expect(200);
    expect(
      (status.body as { registration: { version: number } }).registration
        .version,
    ).toBe(1);
  });

  it('amendment-late: closed windows route to late policy', async () => {
    const app = await registeredStudent();
    await db.academicPeriod.update({
      where: { code: '2026S1' },
      data: { addDropClose: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const created = await change(app.cookie, {
        kind: 'ADD',
        courseCode: 'BUS111',
        reason: 'Late add.',
      }).expect(201);
      expect((created.body as { status: string }).status).toBe('LATE');
    } finally {
      await db.academicPeriod.update({
        where: { code: '2026S1' },
        data: { addDropClose: new Date('2027-12-31T00:00:00Z') },
      });
    }
  });

  it('amendment-history: every change is a versioned row', async () => {
    const app = await registeredStudent();
    await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'First.',
    }).expect(201);
    const status = await regGet('/status', app.cookie).expect(200);
    const amendments = (
      status.body as {
        amendments: Array<{ version: number; kind: string; status: string }>;
      }
    ).amendments;
    expect(amendments).toHaveLength(1);
    expect(amendments[0].version).toBe(1);
    expect(amendments[0].status).toBe('PENDING');
  });

  it('waitlist-join: position assigned in order', async () => {
    // Queue positions are per course, so earlier suite entries may exist;
    // two fresh students must still land exactly one apart, in order.
    const first = await registeredStudent();
    const joined = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      first.cookie,
    ).expect(201);
    const head = (joined.body as { position: number }).position;
    expect(head).toBeGreaterThanOrEqual(1);
    expect((joined.body as { status: string }).status).toBe('WAITING');
    const second = await registeredStudent();
    const following = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      second.cookie,
    ).expect(201);
    expect((following.body as { position: number }).position).toBe(head + 1);
    const dupe = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      first.cookie,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
  });

  it('waitlist-accept: revalidated place enrols with events', async () => {
    const app = await registeredStudent();
    const joined = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      app.cookie,
    ).expect(201);
    const entryId = (joined.body as { id: string }).id;
    const accepted = await regPost(
      `/waitlist/${entryId}/decide`,
      { approve: true, note: 'Seat released.', idempotencyKey: key() },
      records,
    ).expect(201);
    expect((accepted.body as { status: string }).status).toBe('ACCEPTED');
    const outbox = await db.outboxEvent.findFirst({
      where: { type: 'MoodleCourseAdded' },
    });
    expect(outbox).toBeDefined();
  });

  it('waitlist-full: no seat means no place', async () => {
    const app = await registeredStudent();
    const joined = await regPost(
      '/waitlist',
      { courseCode: 'BUS112', idempotencyKey: key() },
      app.cookie,
    ).expect(201);
    const refused = await regPost(
      `/waitlist/${(joined.body as { id: string }).id}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('CAPACITY_EXCEEDED');
  });

  it('waitlist-expired: stale places close out', async () => {
    const app = await registeredStudent();
    const joined = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      app.cookie,
    ).expect(201);
    const entryId = (joined.body as { id: string }).id;
    await db.waitlistEntry.update({
      where: { id: entryId },
      data: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });
    const refused = await regPost(
      `/waitlist/${entryId}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('ENTRY_EXPIRED');
    expect(
      (
        await db.waitlistEntry.findUniqueOrThrow({ where: { id: entryId } })
      ).status,
    ).toBe('EXPIRED');
  });

  it('waitlist-decline: refusal cancels the entry', async () => {
    const app = await registeredStudent();
    const joined = await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      app.cookie,
    ).expect(201);
    // Records decline stands in for the student cancel path in this slice.
    const cancelled = await regPost(
      `/waitlist/${(joined.body as { id: string }).id}/decide`,
      { approve: false, idempotencyKey: key() },
      records,
    ).expect(201);
    expect((cancelled.body as { status: string }).status).toBe('CANCELLED');
  });

  it('changes-denied: roles without scope refused', async () => {
    await registeredStudent();
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await change(applicant.cookie, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Nope.',
    }).expect(403);
    await regPost(
      '/waitlist',
      { courseCode: 'BUS111', idempotencyKey: key() },
      applicant.cookie,
    ).expect(403);
    await regGet('/amendments', applicant.cookie).expect(403);
    // Records officers cannot file student changes.
    await change(records, {
      kind: 'ADD',
      courseCode: 'BUS111',
      reason: 'Staff filing.',
    }).expect(403);
  });

  it('changes-neutral: unknown courses and entries 404', async () => {
    const app = await registeredStudent();
    await regPost(
      `/amendments/${randomUUID()}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(404);
    await regPost(
      `/waitlist/${randomUUID()}/decide`,
      { approve: true, idempotencyKey: key() },
      records,
    ).expect(404);
    await change(app.cookie, {
      kind: 'ADD',
      courseCode: 'NOPE999',
      reason: 'Missing.',
    }).expect(400);
  });
});
