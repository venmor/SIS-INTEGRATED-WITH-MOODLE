import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';

/**
 * TASK-PH8-004 daily document-upload quota e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Handbook §19.41: document upload needs file-size/type limits AND a
 * per-user daily quota. Size/type already enforced; this proves the quota:
 * N uploads pass, the (N+1)th is refused 429 with Retry-After and an
 * audited DENY, yesterday's rows do not count, and quotas are per-account.
 */
const csrf = { 'x-requested-with': 'XMLHttpRequest' };
const key = () => randomUUID();
const QUOTA = policy.upload.maxUploadsPerDay as number;

describe('Phase 8 upload quota', () => {
  let app: INestApplication;
  let db: PrismaService;
  let pdf: Buffer;
  const createdOfferingIds: string[] = [];
  const createdProgrammeIds: string[] = [];

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

  async function offeringId() {
    const programme = await db.programme.create({
      data: {
        code: `TEST-${key()}`,
        name: 'Fictional test programme',
        awardLevel: 'Bachelor',
        school: 'Test',
        duration: '4 years',
        overview: 'Quota test only',
        feeScheduleRef: 'DEMO-ACADEMIC-2026-v1/test',
        publishedVersion: 'TEST-v1',
        effectiveDate: new Date(),
        owningOffice: 'Admissions',
      },
    });
    createdProgrammeIds.push(programme.id);
    await db.requirementRule.create({
      data: {
        programmeId: programme.id,
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
        programmeId: programme.id,
        intake: '2026S1',
        studyMode: 'FULLTIME',
        campus: 'MAIN',
        availability: 'OPEN',
        deadline: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    createdOfferingIds.push(offering.id);
    return offering.id;
  }

  async function start(cookie: string, oid: string) {
    const res = await request(app.getHttpServer())
      .post('/applications')
      .set(csrf)
      .set('Cookie', cookie)
      .send({ offeringId: oid, confirmed: true, idempotencyKey: key() })
      .expect(201);
    return res.body as { id: string; version: number };
  }

  function upload(
    cookie: string,
    appId: string,
    version: number,
    extra: Record<string, string> = {},
  ) {
    let r = request(app.getHttpServer())
      .post(`/applications/${appId}/documents`)
      .set(csrf)
      .set('Cookie', cookie)
      .field('category', 'qualification')
      .field('version', String(version))
      .field('idempotencyKey', key());
    for (const [k, v] of Object.entries(extra)) r = r.field(k, v);
    return r.attach('file', pdf, 'fictional-result.pdf');
  }

  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error(
        'Use an isolated test/review database for admissions tests.',
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
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
    pdf = await readFile(
      new URL(
        '../../../packages/test-fixtures/documents/fictional-result.pdf',
        import.meta.url,
      ),
    );
  }, 120000);

  afterAll(async () => {
    for (const offeringId of createdOfferingIds) {
      await db.applicationDocument.deleteMany({
        where: { application: { offeringId } },
      });
      await db.applicationSubmission.deleteMany({
        where: { application: { offeringId } },
      });
      await db.application.deleteMany({ where: { offeringId } });
      await db.programmeOffering.deleteMany({ where: { id: offeringId } });
    }
    for (const programmeId of createdProgrammeIds) {
      await db.requirementRule.deleteMany({ where: { programmeId } });
      await db.programme.deleteMany({ where: { id: programmeId } });
    }
    await app.close();
  });

  it('quota-allow: uploads within the daily budget succeed', async () => {
    const u = await user();
    const draft = await start(u.cookie, await offeringId());
    const res = await upload(u.cookie, draft.id, draft.version).expect(201);
    expect(
      (res.body as { documents: Array<{ id: string }> }).documents.length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('quota-deny: the (N+1)th upload is refused with Retry-After and audit', async () => {
    const u = await user();
    let draft = await start(u.cookie, await offeringId());
    let current: string | undefined;
    for (let i = 0; i < QUOTA; i++) {
      const res = await upload(
        u.cookie,
        draft.id,
        draft.version,
        current
          ? { replacesId: current, replacementReason: 'Cleaner scan.' }
          : {},
      ).expect(201);
      const body = res.body as {
        version: number;
        documents: Array<{ id: string }>;
      };
      draft = { id: draft.id, version: body.version };
      current = body.documents.at(-1)?.id;
    }
    const denied = await upload(
      u.cookie,
      draft.id,
      draft.version,
      current
        ? { replacesId: current, replacementReason: 'One more.' }
        : {},
    );
    expect(denied.status).toBe(429);
    expect(denied.headers['retry-after']).toBeDefined();
    expect(
      await db.auditEvent.count({
        where: {
          action: 'ApplicationDocumentQuotaDenied',
          actorAccountId: u.accountId,
          outcome: 'DENY',
        },
      }),
    ).toBeGreaterThanOrEqual(1);
    expect(
      await db.applicationDocument.count({
        where: { application: { accountId: u.accountId } },
      }),
    ).toBe(QUOTA);
  });

  it('quota-day-scoped: yesterday rows do not consume today budget', async () => {
    const u = await user();
    const draft = await start(u.cookie, await offeringId());
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    let latest = '';
    for (let i = 0; i < QUOTA; i++) {
      const created = await db.applicationDocument.create({
        data: {
          applicationId: draft.id,
          category: 'qualification',
          fileName: `old-${i}.pdf`,
          mimeType: 'application/pdf',
          size: 4,
          content: new Uint8Array([1, 2, 3]),
          sha256: `old-${key()}`,
          version: i + 1,
          replacesId: latest || undefined,
          replacementReason: latest ? 'Older scan.' : undefined,
          createdAt: yesterday,
        },
      });
      latest = created.id;
    }
    // Today count is zero: the upload is allowed despite 10 older rows.
    await upload(u.cookie, draft.id, draft.version, {
      replacesId: latest,
      replacementReason: 'Cleaner scan.',
    }).expect(201);
  });

  it('quota-per-account: one account at quota does not block another', async () => {
    const full = await user();
    const fullDraft = await start(full.cookie, await offeringId());
    let latest = '';
    for (let i = 0; i < QUOTA; i++) {
      const created = await db.applicationDocument.create({
        data: {
          applicationId: fullDraft.id,
          category: 'qualification',
          fileName: `full-${i}.pdf`,
          mimeType: 'application/pdf',
          size: 4,
          content: new Uint8Array([1, 2, 3]),
          sha256: `full-${key()}`,
          version: i + 1,
          replacesId: latest || undefined,
          replacementReason: latest ? 'Older scan.' : undefined,
        },
      });
      latest = created.id;
    }
    await upload(full.cookie, fullDraft.id, fullDraft.version, {
      replacesId: latest,
      replacementReason: 'One more.',
    }).expect(429);
    const other = await user();
    const otherDraft = await start(other.cookie, await offeringId());
    await upload(other.cookie, otherDraft.id, otherDraft.version).expect(201);
  });
});
