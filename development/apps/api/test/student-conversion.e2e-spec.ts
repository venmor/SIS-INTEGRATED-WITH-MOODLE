import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-002 student conversion e2e (records module).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: convert-happy-path, convert-duplicate-routes-to-queue,
 * convert-resolve-separate, convert-resolve-link, convert-replay,
 * convert-idempotency, convert-preconditions, convert-denied,
 * convert-foreign-neutral, candidates-list.
 */
describe('Phase 4 student conversion', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let sysadmin: string;
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
  const recGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/records${path}`).set('Cookie', c);

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

  async function acceptedApp(opts: { blocking?: boolean; skipTasks?: boolean } = {}) {
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
      givenName: 'Convert',
      familyName: 'Applicant',
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
    const claimVersion = (
      (await appGet(`/${id}/timeline`, c).expect(200)).body as {
        version: number;
      }
    ).version;
    await staffPost(
      `/${id}/claim`,
      { version: claimVersion, idempotencyKey: key() },
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
        conditions: opts.blocking
          ? [
              {
                text: 'Provide certified documents.',
                detail: null,
                owner: 'APPLICANT',
                deadline: null,
                blocksMatriculation: true,
              },
            ]
          : [],
      },
      approver,
    ).expect(201);
    const timelineVersion = async () =>
      (
        (await appGet(`/${id}/timeline`, c).expect(200)).body as {
          version: number;
        }
      ).version;
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
    for (const taskKey of opts.skipTasks
      ? []
      : ['CONFIRM_CONTACT', 'ACCEPT_DECLARATIONS']) {
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
    return { id, cookie: c };
  }

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
    sysadmin = (await user('SYSADMIN', ['administer-case-demo'])).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('convert-happy-path: accepted offer becomes a unique student', async () => {
    const app = await acceptedApp();
    const converted = await recPost(
      `/applications/${app.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    const body = converted.body as {
      id: string;
      studentNumber: string;
      attemptId: string;
      curriculumVersion: number;
      personId: string;
    };
    expect(body.studentNumber).toMatch(/^STU-2026-\d{4}$/);
    expect(body.attemptId).toBeDefined();
    expect(body.curriculumVersion).toBe(1);
    expect(body.personId).toBeDefined();
    // The applicant account gained the student workspace.
    const roles = await db.roleAssignment.findMany({
      where: { accountId: (await db.application.findUniqueOrThrow({ where: { id: app.id } })).accountId, role: 'STUDENT' },
    });
    expect(roles).toHaveLength(1);
    expect(roles[0].scopeRef).toBe(body.studentNumber);
    expect(roles[0].capabilities).toContain('study');
    // Immutable receipt via audit.
    const audit = await db.auditEvent.findFirst({
      where: { action: 'StudentConverted', targetRef: body.id },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('ALLOW');
  });

  it('convert-duplicate-routes-to-queue: matching identity blocks, never merges', async () => {
    const first = await acceptedApp();
    await recPost(
      `/applications/${first.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    const second = await acceptedApp();
    // Force an exact email match between two different people.
    const firstPerson = await db.application
      .findUniqueOrThrow({
        where: { id: first.id },
        include: { account: { include: { person: true } } },
      })
      .then((a) => a.account.person);
    const secondApp = await db.application.findUniqueOrThrow({
      where: { id: second.id },
      include: { account: true },
    });
    await db.person.update({
      where: { id: secondApp.account.personId },
      data: { email: firstPerson.email as string },
    });
    const blocked = await recPost(
      `/applications/${second.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    expect((blocked.body as { code: string }).code).toBe('DUPLICATE_IDENTITY');
    const candidateId = (blocked.body as { candidateId: string }).candidateId;
    expect(candidateId).toBeDefined();
    expect(
      await db.student.count({
        where: { personId: secondApp.account.personId },
      }),
    ).toBe(0);
    const listed = await recGet('/duplicates', records).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (c) => c.id === candidateId,
      ),
    ).toBe(true);
  });

  it('convert-resolve-separate: distinct people convert independently', async () => {
    const first = await acceptedApp();
    await recPost(
      `/applications/${first.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    const second = await acceptedApp();
    const firstEmail = (
      await db.application
        .findUniqueOrThrow({
          where: { id: first.id },
          include: { account: { include: { person: true } } },
        })
        .then((a) => a.account.person)
    ).email as string;
    const secondApp = await db.application.findUniqueOrThrow({
      where: { id: second.id },
      include: { account: true },
    });
    await db.person.update({
      where: { id: secondApp.account.personId },
      data: { email: firstEmail },
    });
    const blocked = await recPost(
      `/applications/${second.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    const candidateId = (blocked.body as { candidateId: string }).candidateId;
    await recPost(
      `/duplicates/${candidateId}/resolve`,
      {
        idempotencyKey: key(),
        decision: 'KEEP_SEPARATE',
        reason: 'Different birth dates on file.',
      },
      records,
    ).expect(201);
    const converted = await recPost(
      `/applications/${second.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    expect(
      (converted.body as { personId: string }).personId,
    ).toBe(secondApp.account.personId);
  });

  it('convert-resolve-link: conversion follows the surviving person', async () => {
    const first = await acceptedApp();
    const firstConverted = await recPost(
      `/applications/${first.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    const survivor = (firstConverted.body as { personId: string }).personId;
    const survivorEmail = (
      await db.person.findUniqueOrThrow({ where: { id: survivor } })
    ).email as string;
    const second = await acceptedApp();
    const secondApp = await db.application.findUniqueOrThrow({
      where: { id: second.id },
      include: { account: true },
    });
    // Same human, second application: exact email match.
    await db.person.update({
      where: { id: secondApp.account.personId },
      data: { email: survivorEmail },
    });
    const blocked = await recPost(
      `/applications/${second.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    const candidateId = (blocked.body as { candidateId: string }).candidateId;
    await recPost(
      `/duplicates/${candidateId}/resolve`,
      {
        idempotencyKey: key(),
        decision: 'LINK_EXISTING',
        reason: 'Same national record presented twice.',
      },
      records,
    ).expect(201);
    const converted = await recPost(
      `/applications/${second.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    expect((converted.body as { personId: string }).personId).toBe(survivor);
    // One human, one student record: the second admission reused it.
    expect(await db.student.count({ where: { personId: survivor } })).toBe(1);
    expect(
      (converted.body as { studentNumber: string }).studentNumber,
    ).toBe((firstConverted.body as { studentNumber: string }).studentNumber);
    const merged = await db.person.findUniqueOrThrow({
      where: { id: secondApp.account.personId },
    });
    expect(merged.status).toBe('DUPLICATE');
    expect(merged.duplicateOfPersonId).toBe(survivor);
  });

  it('convert-replay: same key returns the stored student', async () => {
    const app = await acceptedApp();
    const same = key();
    const first = await recPost(
      `/applications/${app.id}/convert`,
      { idempotencyKey: same },
      records,
    ).expect(201);
    const second = await recPost(
      `/applications/${app.id}/convert`,
      { idempotencyKey: same },
      records,
    ).expect(201);
    expect(second.body).toEqual(first.body);
    expect(
      await db.student.count({
        where: {
          personId: (first.body as { personId: string }).personId,
        },
      }),
    ).toBe(1);
  });

  it('convert-idempotency: same key with different payload conflicts', async () => {
    const app = await acceptedApp();
    const same = key();
    await recPost(
      `/applications/${app.id}/convert`,
      { idempotencyKey: same },
      records,
    ).expect(201);
    const other = await acceptedApp();
    const conflict = await recPost(
      `/applications/${other.id}/convert`,
      { idempotencyKey: same },
      records,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('convert-preconditions: each missing gate names its cause', async () => {
    // Submitted but never decided: full submit flow, no staff action.
    const me = await user('APP', ['apply'], 'APPLICATION', key());
    const mc = me.cookie;
    const started = await appPost(
      '',
      { offeringId, confirmed: true, idempotencyKey: key() },
      mc,
    ).expect(201);
    const submittedId = started.body.id as string;
    let submittedVersion = started.body.version as number;
    const submitSave = async (section: string, data: object) => {
      const r = await appPost(
        `/${submittedId}/sections/${section}`,
        { version: submittedVersion, idempotencyKey: key(), complete: true, data },
        mc,
      ).expect(201);
      submittedVersion = r.body.version as number;
    };
    await submitSave('personal', {
      givenName: 'Pending',
      familyName: 'Applicant',
      dateOfBirth: '2000-01-01',
    });
    await submitSave('contact', { preferredChannel: 'PORTAL' });
    await submitSave('qualifications', {
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
    const { readFile: readFixture } = await import('node:fs/promises');
    const fixturePdf = await readFixture(
      new URL(
        '../../../packages/test-fixtures/documents/fictional-result.pdf',
        import.meta.url,
      ),
    );
    const submittedUpload = await request(app.getHttpServer())
      .post(`/applications/${submittedId}/documents`)
      .set(csrf)
      .set('Cookie', mc)
      .field('category', 'qualification')
      .field('version', String(submittedVersion))
      .field('idempotencyKey', key())
      .attach('file', fixturePdf, 'fictional-result.pdf')
      .expect(201);
    const submittedDocId = (
      submittedUpload.body as { documents: Array<{ id: string }> }
    ).documents.at(-1)?.id as string;
    submittedVersion = (submittedUpload.body as { version: number }).version;
    await appPost(
      `/${submittedId}/documents/${submittedDocId}/scan`,
      { version: submittedVersion, idempotencyKey: key() },
      mc,
    ).expect(201);
    const submittedReview = await appGet(
      `/${submittedId}/review`,
      mc,
    ).expect(200);
    submittedVersion = submittedReview.body.application.version as number;
    await appPost(
      `/${submittedId}/submit`,
      {
        version: submittedVersion,
        confirmed: true,
        idempotencyKey: key(),
        declarations: [
          { id: 'accuracy', version: 'DEMO-DECLARATION-v1', accepted: true },
          { id: 'evidence', version: 'DEMO-DECLARATION-v1', accepted: true },
          { id: 'processing', version: 'DEMO-DECLARATION-v1', accepted: true },
        ],
      },
      mc,
    ).expect(201);
    const refused = await recPost(
      `/applications/${submittedId}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('OFFER_NOT_ACCEPTED');
    // Blocking condition unmet.
    const blocked = await acceptedApp({ blocking: true });
    const blocking = await recPost(
      `/applications/${blocked.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    expect((blocking.body as { code: string }).code).toBe(
      'CONDITION_BLOCKING',
    );
    // Required applicant onboarding tasks incomplete.
    const skipped = await acceptedApp({ skipTasks: true });
    const incomplete = await recPost(
      `/applications/${skipped.id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(409);
    expect((incomplete.body as { code: string }).code).toBe(
      'ONBOARDING_INCOMPLETE',
    );
  });

  it('convert-denied: applicant, officer, approver and sysadmin cannot convert', async () => {
    const app = await acceptedApp();
    const body = { idempotencyKey: key() };
    await recPost(`/applications/${app.id}/convert`, body, app.cookie).expect(
      403,
    );
    await recPost(`/applications/${app.id}/convert`, body, officer).expect(
      403,
    );
    await recPost(`/applications/${app.id}/convert`, body, approver).expect(
      403,
    );
    await recPost(`/applications/${app.id}/convert`, body, sysadmin).expect(
      403,
    );
    await recGet('/duplicates', app.cookie).expect(403);
  });

  it('convert-foreign-neutral: unknown ids look like foreign ids', async () => {
    await recPost(`/applications/${randomUUID()}/convert`, {
      idempotencyKey: key(),
    }, records).expect(404);
    const other = await acceptedApp();
    const stranger = await user('RECORDS_OFFICER', ['convert-student'], 'INTAKE', 'OTHER');
    await recPost(
      `/applications/${other.id}/convert`,
      { idempotencyKey: key() },
      stranger.cookie,
    ).expect(404);
  });
});
