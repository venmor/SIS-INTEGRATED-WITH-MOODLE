import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ExpiryDaemonService } from '../src/identity-access/expiry-daemon.service.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 expiry-warning proofs (TASK-PH1-005 DoD). Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Assignments nearing expiry (inside security.expiryWarningThresholdMinutes)
// surface a warning prosody: the owner sees a countdown-eligible banner,
// acknowledges it, and the session continues uninterrupted. Warnings are
// strictly scoped — nobody sees or acks another person's rows. Throwaway
// e2e.wrn.* rows are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('expiry-warning (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let daemon: ExpiryDaemonService;
  let server: unknown;
  const stamp = Date.now().toString(36);
  const assignmentIds: string[] = [];

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.wrn.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E warning ${tag}` },
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
    daemon = app.get(ExpiryDaemonService);
  });

  afterAll(async () => {
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.wrn.' } },
      select: { id: true },
    });
    const staleIds = stale.map((a) => a.id);
    await prisma.expiryWarning.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    // Daemon ticks during this file also write audit/outbox rows for the
    // swept assignments: remove them so reruns stay hermetic.
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: assignmentIds } },
    });
    await prisma.auditEvent.deleteMany({
      where: { targetRef: { in: assignmentIds } },
    });
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
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E warning ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('warns before expiry, scopes warnings per owner, acks without interrupting the session', async () => {
    const username = await makeUser('warn', 'Long-Enough-Password-1');
    const owner = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: owner.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-WRN-1',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        // Inside the 5-minute demo warning threshold, still live.
        endsAt: new Date(Date.now() + 3 * 60 * 1000),
        reason: 'E2E warning grant',
      },
    });
    assignmentIds.push(assignment.id);

    await daemon.runCheck();
    const created = await prisma.expiryWarning.findFirst({
      where: { assignmentId: assignment.id, acknowledgedAt: null },
    });
    expect(created).toBeDefined();

    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const listed = await agent.get('/auth/workspace/expiry-warnings');
    expect(listed.status).toBe(200);
    expect(
      listed.body.map((w: { assignmentId: string }) => w.assignmentId),
    ).toContain(assignment.id);

    // Another person sees none of it and cannot ack it.
    const strangerName = await makeUser('stranger', 'Long-Enough-Password-1');
    const stranger = request.agent(server as never);
    await stranger
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: strangerName, password: 'Long-Enough-Password-1' });
    const foreign = await stranger.get('/auth/workspace/expiry-warnings');
    expect(foreign.status).toBe(200);
    expect(foreign.body).toEqual([]);
    const hijack = await stranger
      .post(`/auth/workspace/expiry-warnings/${created?.id}/ack`)
      .set(CSRF);
    expect(hijack.status).toBe(404);

    // Owner acks: the warning closes, the session continues.
    const ack = await agent
      .post(`/auth/workspace/expiry-warnings/${created?.id}/ack`)
      .set(CSRF);
    expect(ack.status).toBe(200);
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.activeWorkspace?.assignmentId).toBe(assignment.id);
    const again = await agent.get('/auth/workspace/expiry-warnings');
    expect(again.body).toEqual([]);

    // Repeat acks stay 200 (tolerant, no error swell); junk ids are 400.
    const repeat = await agent
      .post(`/auth/workspace/expiry-warnings/${created?.id}/ack`)
      .set(CSRF);
    expect(repeat.status).toBe(200);
    const junk = await agent
      .post('/auth/workspace/expiry-warnings/not-a-uuid/ack')
      .set(CSRF);
    expect(junk.status).toBe(400);
  });
});
