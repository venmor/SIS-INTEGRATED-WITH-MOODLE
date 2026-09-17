import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 audit-timeline proofs (TASK-PH1-005 DoD, §15.19 admin rows).
// Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// The immutable audit trail is paginated, filterable and shape-stable — and
// visible only to IAM administrators (security-approved access report).
// Throwaway e2e.aud.* rows are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('audit-timeline (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.aud.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E audit ${tag}` },
    });
    const account = await prisma.account.create({
      data: { personId: person.id, username, status: 'ACTIVE' },
    });
    await prisma.credential.create({
      data: {
        accountId: account.id,
        kind: 'PASSWORD',
        secretHash: await hash(password),
        status: 'ACTIVE',
      },
    });
    return username;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.aud.' } },
      select: { id: true },
    });
    const staleIds = stale.map((a) => a.id);
    if (staleIds.length > 0) {
      await prisma.session.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.recoveryToken.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.credential.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.roleAssignment.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.auditEvent.deleteMany({
        where: { actorAccountId: { in: staleIds } },
      });
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E audit ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('refuses non-administrators without disclosure', async () => {
    const username = await makeUser('deny', 'Long-Enough-Password-1');
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const refused = await agent.get('/auth/audit/timeline');
    expect(refused.status).toBe(403);
    expect(refused.body.reference).toBeDefined();
  });

  it('paginates, filters and returns the §15.19-permitted shape', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });

    const page = await admin.get('/auth/audit/timeline').query({ take: 5 });
    expect(page.status).toBe(200);
    expect(typeof page.body.total).toBe('number');
    expect(Array.isArray(page.body.events)).toBe(true);
    expect(page.body.events.length).toBeLessThanOrEqual(5);
    if (page.body.events.length > 0) {
      const row = page.body.events[0];
      expect(Object.keys(row).sort()).toEqual(
        [
          'action',
          'activeRole',
          'actorAccountId',
          'correlationId',
          'errorCategory',
          'id',
          'occurredAt',
          'outcome',
          'purpose',
          'reason',
          'scope',
          'targetRef',
        ].sort(),
      );
      // Minimized content: no raw payloads, states or metadata ride the list.
      expect('metadata' in row).toBe(false);
      expect('priorState' in row).toBe(false);
      expect('newState' in row).toBe(false);
    }

    // Filter by a known action narrows the set; unknown query keys are refused.
    const denied = await admin
      .get('/auth/audit/timeline')
      .query({ action: 'CMD-IAM-Guard' });
    expect(denied.status).toBe(200);
    for (const row of denied.body.events as Array<{ action: string }>) {
      expect(row.action).toBe('CMD-IAM-Guard');
    }
    const junk = await admin
      .get('/auth/audit/timeline')
      .query({ dropTable: '1' });
    expect(junk.status).toBe(400);
    const inverted = await admin.get('/auth/audit/timeline').query({
      startDate: '2026-09-17T00:00:00Z',
      endDate: '2026-09-16T00:00:00Z',
    });
    expect(inverted.status).toBe(400);
    expect(inverted.body.reference).toBeDefined();

    // §19 access-to-audit: successful reads leave their own ALLOW trail.
    const mweene = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const readAudit = await prisma.auditEvent.findFirst({
      where: {
        actorAccountId: mweene.id,
        action: 'CMD-IAM-AuditTimeline',
        outcome: 'ALLOW',
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(readAudit).toBeDefined();
    expect(readAudit?.purpose).toBe('audit-access');
  });

  it('rate-limits timeline reads with neutral responses and references', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    // Read budget is 120/minute shared across this file's reads: hammer
    // until held (bounded), then assert the neutral 429 shape.
    let limited: {
      status: number;
      body: { message?: string; reference?: string };
      headers: Record<string, string>;
    } | null = null;
    for (let i = 0; i < 130; i++) {
      const res = (await admin
        .get('/auth/audit/timeline')
        .query({ take: 1 })) as unknown as typeof limited & object;
      if (res && (res as { status: number }).status === 429) {
        limited = res as typeof limited;
        break;
      }
      expect((res as { status: number }).status).toBe(200);
    }
    expect(limited).not.toBeNull();
    expect(limited?.body.message).toContain('For your security');
    expect(limited?.body.reference).toBeDefined();
    expect(limited?.headers['retry-after']).toBeDefined();
  });
});
