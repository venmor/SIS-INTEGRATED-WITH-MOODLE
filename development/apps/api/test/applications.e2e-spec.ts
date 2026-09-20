import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import type { ApplicationView, SubmissionReceipt } from '@sis/contracts';

describe('Phase 2 owned applicant journey', () => {
  let app: INestApplication,
    db: PrismaService,
    cookie: string,
    other: string,
    accountId: string,
    offeringId: string,
    draft: ApplicationView;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const scanner = {
    scan: vi
      .fn<
        (
          content: Uint8Array,
        ) => Promise<{ status: string; scanner: string | null }>
      >()
      .mockResolvedValue({
        status: 'AwaitingQualityCheck',
        scanner: 'TEST-ADAPTER',
      }),
  };
  const post = (path: string, body: object, c = cookie) =>
    request(app.getHttpServer())
      .post(`/applications${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const get = (path: string, c = cookie) =>
    request(app.getHttpServer()).get(`/applications${path}`).set('Cookie', c);
  const key = () => randomUUID();
  async function user() {
    const person = await db.person.create({
      data: {
        displayName: 'Fictional applicant',
        email: `${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: key() },
    });
    const role = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'APP',
        scopeType: 'APPLICATION',
        scopeRef: account.id,
        capabilities: ['apply'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const token = key();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: role.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { cookie: `sid=${token}`, accountId: account.id };
  }
  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error(
        'Use an isolated test/review database for admissions tests.',
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DocumentScanner)
      .useValue(scanner)
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
    const u = await user();
    cookie = u.cookie;
    accountId = u.accountId;
    other = (await user()).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    const testProgramme = await db.programme.create({
      data: {
        code: `TEST-${key()}`,
        name: 'Fictional test programme',
        awardLevel: 'Bachelor',
        school: 'Test',
        duration: '4 years',
        overview: 'Test only',
        feeScheduleRef: 'DEMO-ACADEMIC-2026-v1/test',
        publishedVersion: 'TEST-v1',
        effectiveDate: new Date(),
        owningOffice: 'Admissions',
      },
    });
    const route = await db.qualificationRoute.findUniqueOrThrow({
      where: { code: 'ECZ' },
    });
    await db.requirementRule.create({
      data: {
        programmeId: testProgramme.id,
        routeId: route.id,
        ruleKey: 'math',
        label: 'Mathematics',
        kind: 'GRADE',
        mandatory: true,
        minGrade: 6,
        evidence: 'Result statement',
      },
    });
    const offering = await db.programmeOffering.create({
      data: {
        programmeId: testProgramme.id,
        intake: 'TEST',
        studyMode: seeded.studyMode,
        campus: seeded.campus,
        availability: 'OPEN',
        deadline: new Date(Date.now() + 86400000),
      },
    });
    offeringId = offering.id;
  });
  afterAll(async () => {
    await app.close();
  });
  it('requires a session and CSRF; unconfirmed start creates nothing', async () => {
    await request(app.getHttpServer()).get('/applications').expect(401);
    await request(app.getHttpServer())
      .post('/applications')
      .set('Cookie', cookie)
      .send({})
      .expect(403);
    await post('', {
      offeringId,
      confirmed: false,
      idempotencyKey: key(),
    }).expect(400);
    expect(await db.application.count({ where: { accountId } })).toBe(0);
  });
  it('starts exactly one draft under concurrent deliberate requests and replays same key', async () => {
    const idempotencyKey = key();
    const body = { offeringId, confirmed: true, idempotencyKey };
    const results = await Promise.all([
      post('', body),
      post('', { ...body, idempotencyKey: key() }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    draft = results[0].body;
    expect(results[1].body.id).toBe(draft.id);
    expect((await post('', body)).body.id).toBe(draft.id);
    await post('', { ...body, confirmed: false }).expect(409);
    expect(await db.application.count({ where: { accountId } })).toBe(1);
  });
  it('denies cross-applicant reads, writes and command lookup without disclosing data', async () => {
    await get(`/${draft.id}`, other).expect(404);
    await post(
      `/${draft.id}/sections/personal`,
      {
        version: draft.version,
        idempotencyKey: key(),
        data: { givenName: 'Probe' },
        complete: false,
      },
      other,
    ).expect(404);
    const r = await get(`/commands/${key()}`, other).expect(200);
    expect(r.body).toEqual({ status: 'NOT_FOUND' });
  });
  it('saves valid fields but identifies invalid date and forbids account contact fields', async () => {
    const r = await post(`/${draft.id}/sections/personal`, {
      version: draft.version,
      idempotencyKey: key(),
      complete: true,
      data: {
        givenName: 'Demo',
        familyName: 'Applicant',
        dateOfBirth: '2026-02-31',
      },
    }).expect(422);
    expect(r.body.saved).toBe(true);
    expect(r.body.fieldErrors.dateOfBirth).toBeDefined();
    draft = (await get(`/${draft.id}`)).body;
    expect(draft.personal.givenName).toBe('Demo');
    expect(draft.personal.dateOfBirth).toBeUndefined();
  });
  it('protects stale version and completes personal contact and structured results', async () => {
    await post(`/${draft.id}/sections/personal`, {
      version: 1,
      idempotencyKey: key(),
      complete: false,
      data: { givenName: 'Stale' },
    }).expect(409);
    for (const [section, data] of Object.entries({
      personal: { dateOfBirth: '2000-01-01' },
      contact: { preferredChannel: 'PORTAL' },
      qualifications: {
        routeCode: 'ECZ',
        institution: 'Fictional ECZ',
        awardTitle: 'Grade 12',
        completionYear: 2025,
        status: 'COMPLETED',
        subjects: [{ subject: 'Mathematics', grade: 4 }],
      },
    })) {
      draft = (
        await post(`/${draft.id}/sections/${section}`, {
          version: draft.version,
          idempotencyKey: key(),
          complete: true,
          data,
        }).expect(201)
      ).body;
    }
    expect(draft.completeCount).toBe(3);
  });
  it('cannot overwrite verified account contact via application fields', async () => {
    const r = await post(`/${draft.id}/sections/contact`, {
      version: draft.version,
      idempotencyKey: key(),
      complete: false,
      data: { emailVerifiedAt: '2030-01-01' },
    }).expect(422);
    expect(r.body.fieldErrors.emailVerifiedAt).toBeDefined();
    draft = (await get(`/${draft.id}`)).body;
  });
  it('blocks submission with missing documents and absent/current declarations', async () => {
    await post(`/${draft.id}/submit`, {
      version: draft.version,
      idempotencyKey: key(),
      confirmed: true,
      declarations: [],
    }).expect(409);
    await post(`/${draft.id}/submit`, {
      version: draft.version,
      idempotencyKey: key(),
      confirmed: true,
      declarations: policy.declarations.map((d) => ({ ...d, accepted: true })),
    }).expect(400);
  });
  it('rejects unsupported disguised and oversized files without creating documents', async () => {
    for (const content of [
      Buffer.from('MZ malware'),
      Buffer.from('%PDF-1.4 /Encrypt\n%%EOF'),
    ])
      await request(app.getHttpServer())
        .post(`/applications/${draft.id}/documents`)
        .set(csrf)
        .set('Cookie', cookie)
        .field('category', 'qualification')
        .field('version', String(draft.version))
        .field('idempotencyKey', key())
        .attach('file', content, {
          filename: 'file.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    await request(app.getHttpServer())
      .post(`/applications/${draft.id}/documents`)
      .set(csrf)
      .set('Cookie', cookie)
      .field('category', 'qualification')
      .field('version', String(draft.version))
      .field('idempotencyKey', key())
      .attach('file', Buffer.alloc(policy.upload.maxBytes + 1), {
        filename: 'oversize.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);
    expect(
      await db.applicationDocument.count({
        where: { applicationId: draft.id },
      }),
    ).toBe(0);
  });
  it('quarantines real multipart bytes and denies preview before scanner pass', async () => {
    const bytes = await readFile(
      '../../packages/test-fixtures/documents/fictional-result.pdf',
    );
    draft = (
      await request(app.getHttpServer())
        .post(`/applications/${draft.id}/documents`)
        .set(csrf)
        .set('Cookie', cookie)
        .field('category', 'qualification')
        .field('version', String(draft.version))
        .field('idempotencyKey', key())
        .attach('file', bytes, {
          filename: 'fictional-result.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)
    ).body;
    const doc = draft.documents.at(-1)!;
    expect(doc.status).toBe('SecurityScanPending');
    await get(`/${draft.id}/documents/${doc.id}/content`).expect(404);
    await get(`/${draft.id}/documents/${doc.id}/content`, other).expect(404);
    scanner.scan.mockResolvedValueOnce({
      status: 'SecurityScanPending',
      scanner: null,
    });
    draft = (
      await post(`/${draft.id}/documents/${doc.id}/scan`, {
        version: draft.version,
        idempotencyKey: key(),
      }).expect(201)
    ).body;
    expect(draft.documents[0].canPreview).toBe(false);
    draft = (
      await post(`/${draft.id}/documents/${doc.id}/scan`, {
        version: draft.version,
        idempotencyKey: key(),
      }).expect(201)
    ).body;
    const res = await get(`/${draft.id}/documents/${doc.id}/content`).expect(
      200,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    expect(draft.documents[0].status).toBe('AwaitingQualityCheck');
  });
  it('preserves replacement history, rejects unsafe previews, and recovers with a new safe version', async () => {
    const original = draft.documents.at(-1)!;
    const bytes = await readFile(
      '../../packages/test-fixtures/documents/fictional-result.pdf',
    );
    const upload = (replacesId: string, reason: string) =>
      request(app.getHttpServer())
        .post(`/applications/${draft.id}/documents`)
        .set(csrf)
        .set('Cookie', cookie)
        .field('category', 'qualification')
        .field('version', String(draft.version))
        .field('idempotencyKey', key())
        .field('replacesId', replacesId)
        .field('replacementReason', reason)
        .attach('file', bytes, {
          filename: 'replacement.pdf',
          contentType: 'application/pdf',
        });
    await upload(original.id, '').expect(409);
    draft = (await upload(original.id, 'Clearer fictional scan').expect(201))
      .body;
    const replacement = draft.documents.at(-1)!;
    expect(draft.documents.find((d) => d.id === original.id)?.status).toBe(
      'Withdrawn',
    );
    await get(`/${draft.id}/documents/${original.id}/content`).expect(404);
    scanner.scan.mockResolvedValueOnce({
      status: 'SecurityScanFailed',
      scanner: 'TEST-ADAPTER',
    });
    draft = (
      await post(`/${draft.id}/documents/${replacement.id}/scan`, {
        version: draft.version,
        idempotencyKey: key(),
      }).expect(201)
    ).body;
    await get(`/${draft.id}/documents/${replacement.id}/content`).expect(404);
    expect((await get(`/${draft.id}/review`)).body.ready).toBe(false);
    draft = (
      await upload(replacement.id, 'Replace rejected fictional file').expect(
        201,
      )
    ).body;
    const safe = draft.documents.at(-1)!;
    draft = (
      await post(`/${draft.id}/documents/${safe.id}/scan`, {
        version: draft.version,
        idempotencyKey: key(),
      }).expect(201)
    ).body;
    expect(safe.version).toBe(original.version + 2);
    expect((await get(`/${draft.id}/review`)).body.ready).toBe(true);
  });
  it('blocks an existing ready draft when its fee policy becomes unavailable', async () => {
    const offering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: offeringId },
      include: { programme: true },
    });
    await db.programme.update({
      where: { id: offering.programmeId },
      data: { feeScheduleRef: 'UNAPPROVED-POLICY' },
    });
    try {
      const review = (await get(`/${draft.id}/review`)).body;
      expect(review.ready).toBe(false);
      await post(`/${draft.id}/submit`, {
        version: draft.version,
        idempotencyKey: key(),
        confirmed: true,
        declarations: policy.declarations.map((d) => ({
          id: d.id,
          version: d.version,
          accepted: true,
        })),
      }).expect(409);
      expect(
        await db.applicationSubmission.count({
          where: { applicationId: draft.id },
        }),
      ).toBe(0);
    } finally {
      await db.programme.update({
        where: { id: offering.programmeId },
        data: { feeScheduleRef: offering.programme.feeScheduleRef },
      });
    }
  });
  it('rechecks server-time deadline and changed declarations at submission', async () => {
    const deadline = new Date(Date.now() + 86400000);
    await db.programmeOffering.update({
      where: { id: offeringId },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    await post(`/${draft.id}/submit`, {
      version: draft.version,
      idempotencyKey: key(),
      confirmed: true,
      declarations: policy.declarations.map((d) => ({
        id: d.id,
        version: d.version,
        accepted: true,
      })),
    }).expect(409);
    await db.programmeOffering.update({
      where: { id: offeringId },
      data: { deadline },
    });
    await post(`/${draft.id}/submit`, {
      version: draft.version,
      idempotencyKey: key(),
      confirmed: true,
      declarations: policy.declarations.map((d) => ({
        id: d.id,
        version: 'old',
        accepted: true,
      })),
    }).expect(409);
  });
  it('rolls back submission when outbox write fails', async () => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."aggregateId" = '${draft.id}' THEN RAISE EXCEPTION 'injected outbox failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER test_outbox_failure BEFORE INSERT ON "OutboxEvent" FOR EACH ROW EXECUTE FUNCTION test_outbox_failure()',
    );
    try {
      await post(`/${draft.id}/submit`, {
        version: draft.version,
        idempotencyKey: key(),
        confirmed: true,
        declarations: policy.declarations.map((d) => ({
          id: d.id,
          version: d.version,
          accepted: true,
        })),
      }).expect(503);
      expect(
        await db.applicationSubmission.count({
          where: { applicationId: draft.id },
        }),
      ).toBe(0);
      expect(
        (await db.application.findUniqueOrThrow({ where: { id: draft.id } }))
          .state,
      ).not.toBe('Submitted');
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER test_outbox_failure ON "OutboxEvent"',
      );
      await db.$executeRawUnsafe('DROP FUNCTION test_outbox_failure()');
    }
  });
  it('concurrent submit and lost-response retries yield exactly one immutable receipt and outbox', async () => {
    const idempotencyKey = key(),
      body = {
        version: draft.version,
        idempotencyKey,
        confirmed: true,
        declarations: policy.declarations.map((d) => ({
          id: d.id,
          version: d.version,
          accepted: true,
        })),
      };
    const results = await Promise.all([
      post(`/${draft.id}/submit`, body),
      post(`/${draft.id}/submit`, { ...body, idempotencyKey: key() }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const receipt = results[0].body as SubmissionReceipt;
    expect(results[1].body).toEqual(receipt);
    expect((await post(`/${draft.id}/submit`, body)).body).toEqual(receipt);
    expect((await get(`/${draft.id}/receipt`)).body).toEqual(receipt);
    expect((await get(`/commands/${idempotencyKey}`)).body.response).toEqual(
      receipt,
    );
    expect(
      await db.applicationSubmission.count({
        where: { applicationId: draft.id },
      }),
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: { aggregateId: draft.id, type: 'ApplicationSubmitted' },
      }),
    ).toBe(1);
    await expect(
      db.applicationSubmission.update({
        where: { applicationId: draft.id },
        data: { receipt: { tampered: true } },
      }),
    ).rejects.toThrow();
    await post(`/${draft.id}/sections/personal`, {
      version: draft.version,
      idempotencyKey: key(),
      complete: false,
      data: { givenName: 'Tampered' },
    }).expect(409);
    await get(`/${draft.id}/receipt`, other).expect(404);
  });
  it('requires live contact proof and an effective applicant assignment before starting', async () => {
    const u = await user();
    const account = await db.account.findUniqueOrThrow({
      where: { id: u.accountId },
    });
    await db.person.update({
      where: { id: account.personId },
      data: { emailVerifiedAt: null },
    });
    await post(
      '',
      { offeringId, confirmed: true, idempotencyKey: key() },
      u.cookie,
    ).expect(409);
    await db.person.update({
      where: { id: account.personId },
      data: { emailVerifiedAt: new Date() },
    });
    await db.roleAssignment.updateMany({
      where: { accountId: u.accountId },
      data: { startsAt: new Date(Date.now() + 86400000) },
    });
    await post(
      '',
      { offeringId, confirmed: true, idempotencyKey: key() },
      u.cookie,
    ).expect(403);
    expect(
      await db.application.count({ where: { accountId: u.accountId } }),
    ).toBe(0);
  });
  it('changes programme deliberately, preserves personal data/history and discards idempotently', async () => {
    const u = await user();
    let current: ApplicationView = (
      await post(
        '',
        { offeringId, confirmed: true, idempotencyKey: key() },
        u.cookie,
      ).expect(201)
    ).body;
    for (const [section, data] of Object.entries({
      personal: { givenName: 'Keep me' },
      qualifications: { routeCode: 'ECZ' },
    })) {
      current = (
        await post(
          `/${current.id}/sections/${section}`,
          {
            version: current.version,
            complete: false,
            data,
            idempotencyKey: key(),
          },
          u.cookie,
        ).expect(201)
      ).body;
    }
    const bytes = await readFile(
      '../../packages/test-fixtures/documents/fictional-result.pdf',
    );
    current = (
      await request(app.getHttpServer())
        .post(`/applications/${current.id}/documents`)
        .set(csrf)
        .set('Cookie', u.cookie)
        .field('version', String(current.version))
        .field('idempotencyKey', key())
        .field('category', 'qualification')
        .attach('file', bytes, {
          filename: 'result.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)
    ).body;
    const target = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    await post(
      `/${current.id}/change-programme`,
      {
        version: current.version,
        offeringId: target.id,
        confirmed: false,
        idempotencyKey: key(),
      },
      u.cookie,
    ).expect(400);
    current = (
      await post(
        `/${current.id}/change-programme`,
        {
          version: current.version,
          offeringId: target.id,
          confirmed: true,
          idempotencyKey: key(),
        },
        u.cookie,
      ).expect(201)
    ).body;
    expect(current.offering.id).toBe(target.id);
    expect(current.personal.givenName).toBe('Keep me');
    expect(current.qualifications).toEqual({});
    expect(current.documents[0].status).toBe('Withdrawn');
    const body = {
      version: current.version,
      confirmed: true,
      idempotencyKey: key(),
    };
    await post(
      `/${current.id}/discard`,
      { ...body, confirmed: false },
      u.cookie,
    ).expect(400);
    const discarded = await post(
      `/${current.id}/discard`,
      body,
      u.cookie,
    ).expect(201);
    const replay = await post(`/${current.id}/discard`, body, u.cookie).expect(
      201,
    );
    expect(replay.body.version).toBe(discarded.body.version);
    expect(discarded.body.state).toBe('Discarded');
    expect((await get('', u.cookie)).body.items).toEqual([]);
    const restarted = await post(
      '',
      { offeringId: target.id, confirmed: true, idempotencyKey: key() },
      u.cookie,
    ).expect(201);
    expect(restarted.body.id).not.toBe(current.id);
  });
  it('enforces the configured active application count across offerings', async () => {
    const u = await user();
    const source = await db.programmeOffering.findUniqueOrThrow({
      where: { id: offeringId },
    });
    const ids = [offeringId];
    for (let i = 0; i < 3; i++) {
      const extra = await db.programmeOffering.create({
        data: {
          programmeId: source.programmeId,
          intake: source.intake,
          studyMode: `TEST-${i}`,
          campus: source.campus,
          availability: 'OPEN',
          deadline: new Date(Date.now() + 86400000),
        },
      });
      ids.push(extra.id);
    }
    for (const id of ids.slice(0, 3))
      await post(
        '',
        { offeringId: id, confirmed: true, idempotencyKey: key() },
        u.cookie,
      ).expect(201);
    await post(
      '',
      { offeringId: ids[3], confirmed: true, idempotencyKey: key() },
      u.cookie,
    ).expect(409);
    expect(
      await db.application.count({ where: { accountId: u.accountId } }),
    ).toBe(3);
  });
  it('suspending the account invalidates an already-issued session immediately', async () => {
    await db.account.update({
      where: { id: accountId },
      data: { status: 'SUSPENDED' },
    });
    await get('').expect(401);
    await db.account.update({
      where: { id: accountId },
      data: { status: 'ACTIVE' },
    });
  });
});
