import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Deliberately opt-in: this creates 20,000 fictional applicants in a local
// isolated database and reuses that intake on later runs. Formal submissions
// are immutable, including in tests. It is not part of normal CI.
const loadDescribe =
  process.env.RUN_SYNTHETIC_LOAD === 'true' ? describe : describe.skip;

loadDescribe('V2 admissions queue synthetic scale check', () => {
  let app: INestApplication;
  let db: PrismaService;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (
      !url ||
      !['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname) ||
      !/(test|review|ci)/i.test(new URL(url).pathname) ||
      process.env.DEMO_MODE !== 'true'
    )
      throw new Error(
        'Synthetic load requires a local isolated demo database.',
      );
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('traverses 20,000 intake-scoped cases in bounded pages without repetition', async () => {
    const existing = await db.programmeOffering.findFirst({
      where: { intake: { startsWith: 'V2LOAD-' } },
      orderBy: { createdAt: 'asc' },
    });
    const prefix = existing?.intake ?? `V2LOAD-${randomUUID().slice(0, 8)}`;
    const source = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    const offering =
      existing ??
      (await db.programmeOffering.create({
        data: {
          programmeId: source.programmeId,
          intake: prefix,
          studyMode: source.studyMode,
          campus: source.campus,
          availability: 'OPEN',
          deadline: new Date('2099-01-01T00:00:00.000Z'),
        },
      }));
    const officerPerson = await db.person.create({
      data: { displayName: 'Fictional load test officer' },
    });
    const officerAccount = await db.account.create({
      data: {
        personId: officerPerson.id,
        username: `${prefix}-officer-${randomUUID().slice(0, 8)}`,
      },
    });
    const officerAssignment = await db.roleAssignment.create({
      data: {
        accountId: officerAccount.id,
        role: 'ADMISSIONS_OFFICER',
        scopeType: 'INTAKE',
        scopeRef: prefix,
        capabilities: ['review-assigned'],
        startsAt: new Date('2020-01-01'),
        reason: 'synthetic queue scale check',
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: officerAccount.id,
        activeAssignmentId: officerAssignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const batchSize = 1000;
    const existingCount = await db.application.count({
      where: { offeringId: offering.id },
    });
    expect([0, 20_000]).toContain(existingCount);
    if (existingCount === 0) {
      for (let start = 0; start < 20_000; start += batchSize) {
        const rows = Array.from({ length: batchSize }, (_, offset) => {
          const number = start + offset;
          return {
            personId: randomUUID(),
            accountId: randomUUID(),
            applicationId: randomUUID(),
            reference: `${prefix}-APP-${String(number).padStart(5, '0')}`,
            number,
          };
        });
        await db.person.createMany({
          data: rows.map((row) => ({
            id: row.personId,
            displayName: `Fictional applicant ${row.number}`,
          })),
        });
        await db.account.createMany({
          data: rows.map((row) => ({
            id: row.accountId,
            personId: row.personId,
            username: `${prefix}-app-${row.number}`,
          })),
        });
        await db.application.createMany({
          data: rows.map((row) => ({
            id: row.applicationId,
            accountId: row.accountId,
            offeringId: offering.id,
            reference: row.reference,
            state: 'Submitted',
            policyVersion: 'APPLICATION-DEMO-v1',
            requirementVersion: 'SYNTHETIC-QUEUE-LOAD-v1',
          })),
        });
        await db.applicationSubmission.createMany({
          data: rows.map((row) => ({
            applicationId: row.applicationId,
            reference: row.reference,
            snapshot: { synthetic: true },
            receipt: { reference: row.reference },
          })),
        });
      }
    }

    const seen = new Set<string>();
    const durations: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    let rateWaits = 0;
    do {
      const params = new URLSearchParams({
        scope: 'pool',
        state: 'Submitted',
        take: '100',
      });
      if (cursor) params.set('cursor', cursor);
      const started = performance.now();
      const response = await request(app.getHttpServer())
        .get(`/review/queue?${params.toString()}`)
        .set('Cookie', `sid=${token}`);
      if (response.status === 429) {
        // Preserve the production per-account budget; this traversal test
        // honours Retry-After rather than bypassing the guard.
        const retryAfter = Math.max(
          1,
          Number(response.headers['retry-after'] ?? 1),
        );
        rateWaits += 1;
        expect(rateWaits).toBeLessThanOrEqual(2);
        await new Promise((resolve) =>
          setTimeout(resolve, (retryAfter + 1) * 1000),
        );
        continue;
      }
      expect(response.status).toBe(200);
      durations.push(performance.now() - started);
      const body = response.body as {
        items: Array<{ applicationId: string }>;
        nextCursor: string | null;
        hasMore: boolean;
      };
      expect(body.items.length).toBeLessThanOrEqual(100);
      for (const item of body.items) {
        expect(seen.has(item.applicationId)).toBe(false);
        seen.add(item.applicationId);
      }
      cursor = body.nextCursor;
      pages += 1;
      expect(body.hasMore).toBe(cursor !== null);
    } while (cursor);

    expect(seen.size).toBe(20_000);
    expect(pages).toBe(200);
    const ordered = [...durations].sort((a, b) => a - b);
    process.stdout.write(
      `Synthetic queue traversal: ${seen.size} cases, ${pages} pages; p50 ${ordered[99].toFixed(1)} ms, p95 ${ordered[189].toFixed(1)} ms, max ${ordered.at(-1)!.toFixed(1)} ms; rate-limit waits ${rateWaits}. Local machine only; no service target inferred.\n`,
    );
  }, 180_000);
});
