import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { hash } from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DEMO_UNIVERSITY_TEMPLATE } from '@sis/config';

describe('governed fictional university setup', () => {
  let app: INestApplication;
  let db: PrismaService;
  const password = 'Fictional-test-password-2026';
  const oldDemo = process.env.DEMO_MODE;
  const oldGate = process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP;
  async function actor(
    capabilities: string[],
    role = 'DOMAIN_ADMIN',
    scopeRef = 'DEMO-UNIVERSITY',
    personId?: string,
  ) {
    const person = personId
      ? { id: personId }
      : await db.person.create({
          data: {
            displayName: 'Fictional setup actor',
            email: `${randomUUID()}@demo.invalid`,
          },
        });
    const account = await db.account.create({
      data: {
        personId: person.id,
        username: randomUUID(),
        credentials: {
          create: { kind: 'PASSWORD', secretHash: await hash(password) },
        },
      },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType: 'SYSTEM',
        scopeRef,
        capabilities,
        reason: 'Fictional setup integration test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    return {
      accountId: account.id,
      personId: person.id,
      assignmentId: assignment.id,
      cookie: `sid=${token}`,
    };
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (url.hostname !== '127.0.0.1' || !url.pathname.includes('setup003_test'))
      throw new Error('Use the dedicated setup003_test database.');
    process.env.DEMO_MODE = 'true';
    process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP = 'true';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (app) await app.close();
    if (oldDemo === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = oldDemo;
    if (oldGate === undefined)
      delete process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP;
    else process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP = oldGate;
  });
  async function report(cookie: string) {
    return (
      await request(app.getHttpServer())
        .get('/institution-setup/demo-university')
        .set('Cookie', cookie)
        .expect(200)
    ).body;
  }
  const approval = (row: {
    contentDigest: string;
    baseActivationId: string | null;
  }) => ({
    clientRequestId: randomUUID(),
    contentDigest: row.contentDigest,
    expectedActivationId: row.baseActivationId,
    confirmFictionalActivation: true,
    password,
  });

  it('installs an exact independent version atomically and preserves legacy calendar windows', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const before = await report(proposer.cookie);
    const legacy = await db.academicPeriod.findUniqueOrThrow({
      where: { code: 'DEMO-2026-TEACHING' },
    });
    const input = {
      clientRequestId: randomUUID(),
      expectedVersion: before.latestVersion,
      expectedActivationId: before.activeActivationId,
      reason: 'Install fictional structure and calendar for testing',
      profile: DEMO_UNIVERSITY_TEMPLATE,
    };
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send(input)
        .expect(201)
    ).body;
    const again = await request(app.getHttpServer())
      .post('/institution-setup/demo-university')
      .set('Cookie', proposer.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(input)
      .expect(201);
    expect(again.body.id).toBe(saved.id);
    await request(app.getHttpServer())
      .post('/institution-setup/demo-university')
      .set('Cookie', proposer.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ ...input, reason: 'Different reason' })
      .expect(409);
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    expect(row.ownProposal).toBe(false);
    const command = approval(row);
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${saved.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ ...command, password: 'wrong' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${saved.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ ...command, contentDigest: '0'.repeat(64) })
      .expect(409);
    const activatedResponse = await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${saved.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(command);
    expect(
      activatedResponse.status,
      JSON.stringify(activatedResponse.body),
    ).toBe(201);
    const activated = activatedResponse.body;
    const replay = await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${saved.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(command)
      .expect(201);
    expect(replay.body.activationId).toBe(activated.activationId);
    const installed = await report(approver.cookie);
    expect(installed.activeVersion.id).toBe(saved.id);
    expect(installed.activeVersion.profile.units).toHaveLength(8);
    expect(
      installed.handoffs.some(
        (x: { label: string; status: string }) =>
          x.label === 'Registration calendar' && x.status === 'PENDING',
      ),
    ).toBe(true);
    const unitProjection = await db.institutionUnitVersion.findMany({
      where: { setupVersionId: saved.id },
    });
    expect(unitProjection).toHaveLength(8);
    const periodProjection = await db.academicPeriodVersion.findMany({
      where: { setupVersionId: saved.id },
    });
    expect(periodProjection).toHaveLength(5);
    const unchanged = await db.academicPeriod.findUniqueOrThrow({
      where: { id: legacy.id },
    });
    expect(unchanged.registrationOpen).toEqual(legacy.registrationOpen);
    expect(unchanged.registrationClose).toEqual(legacy.registrationClose);
    expect(unchanged.status).toBe(legacy.status);
    expect(
      await db.auditEvent.count({
        where: {
          action: 'DemoInstitutionSetupActivated',
          targetRef: saved.id,
          outcome: 'ALLOW',
        },
      }),
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: { type: 'DemoInstitutionSetupActivated', aggregateId: saved.id },
      }),
    ).toBe(1);
    await expect(
      db.demoInstitutionSetupVersion.update({
        where: { id: saved.id },
        data: { reason: 'Overwrite' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      db.academicPeriodVersion.update({
        where: { id: periodProjection[0].id },
        data: { name: 'Overwrite' },
      }),
    ).rejects.toThrow(/append-only/);
  });
  it('blocks self approval even through a separate account for the same person', async () => {
    const proposer = await actor([
      'institution-demo-setup-propose',
      'institution-demo-setup-approve',
    ]);
    const alias = await actor(
      ['institution-demo-setup-approve'],
      'DOMAIN_ADMIN',
      'DEMO-UNIVERSITY',
      proposer.personId,
    );
    const r = await report(proposer.cookie);
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'Test independent review',
          profile: r.activeVersion.profile,
        })
        .expect(201)
    ).body;
    const row = (await report(alias.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    expect(row.ownProposal).toBe(true);
    for (const cookie of [proposer.cookie, alias.cookie])
      await request(app.getHttpServer())
        .post(`/institution-setup/demo-university/${saved.id}/activate`)
        .set('Cookie', cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send(approval(row))
        .expect(403);
  });
  it('serialises competing activations and denies stale drafts and removal of stable codes', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const r = await report(proposer.cookie);
    const first = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'First rename',
          profile: {
            ...r.activeVersion.profile,
            name: 'Fictional reviewed first rename',
          },
        })
        .expect(201)
    ).body;
    const second = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: first.version,
          expectedActivationId: r.activeActivationId,
          reason: 'Alternative rename',
          profile: {
            ...r.activeVersion.profile,
            name: 'Fictional reviewed alternative rename',
          },
        })
        .expect(201)
    ).body;
    const current = await report(approver.cookie);
    const rows = [first, second].map((s) =>
      current.versions.find((v: { id: string }) => v.id === s.id),
    );
    const outcomes = await Promise.all(
      rows.map((row) =>
        request(app.getHttpServer())
          .post(`/institution-setup/demo-university/${row.id}/activate`)
          .set('Cookie', approver.cookie)
          .set('x-requested-with', 'XMLHttpRequest')
          .send(approval(row)),
      ),
    );
    expect(outcomes.map((o) => o.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    const now = await report(proposer.cookie);
    await request(app.getHttpServer())
      .post('/institution-setup/demo-university')
      .set('Cookie', proposer.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({
        clientRequestId: randomUUID(),
        expectedVersion: now.latestVersion,
        expectedActivationId: r.activeActivationId,
        reason: 'Stale base',
        profile: now.activeVersion.profile,
      })
      .expect(409);
    const profile = structuredClone(now.activeVersion.profile);
    profile.units = profile.units.filter(
      (u: { code: string }) => u.code !== 'DEMO-ACADEMIC-SKILLS',
    );
    profile.relationships = profile.relationships.filter(
      (edge: { fromCode: string; toCode: string }) =>
        edge.fromCode !== 'DEMO-ACADEMIC-SKILLS' &&
        edge.toCode !== 'DEMO-ACADEMIC-SKILLS',
    );
    const removed = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: now.latestVersion,
          expectedActivationId: now.activeActivationId,
          reason: 'Attempt remove identity',
          profile,
        })
        .expect(201)
    ).body;
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === removed.id,
    );
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${row.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(approval(row))
      .expect(409);
    expect((await report(proposer.cookie)).activeActivationId).toBe(
      now.activeActivationId,
    );
  });
  it('denies technical admins, wrong scope, revoked appointment and disabled isolation', async () => {
    await request(app.getHttpServer())
      .get('/institution-setup/demo-university')
      .expect(401);
    for (const who of [
      await actor(['institution-demo-setup-propose'], 'SYSADMIN', 'GLOBAL'),
      await actor(['institution-demo-setup-propose'], 'DOMAIN_ADMIN', 'OTHER'),
    ])
      await request(app.getHttpServer())
        .get('/institution-setup/demo-university')
        .set('Cookie', who.cookie)
        .expect(403);
    const proposer = await actor(['institution-demo-setup-propose']);
    await db.roleAssignment.update({
      where: { id: proposer.assignmentId },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer())
      .get('/institution-setup/demo-university')
      .set('Cookie', proposer.cookie)
      .expect(403);
    const live = await actor(['institution-demo-setup-propose']);
    process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP = 'false';
    await request(app.getHttpServer())
      .get('/institution-setup/demo-university')
      .set('Cookie', live.cookie)
      .expect(404);
    process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP = 'true';
  });
  it('requires server mutation protection and limits password reconfirmation attempts', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    await request(app.getHttpServer())
      .post('/institution-setup/demo-university')
      .set('Cookie', proposer.cookie)
      .expect(403);
    const approver = await actor(['institution-demo-setup-approve']);
    const command = {
      clientRequestId: randomUUID(),
      contentDigest: '0'.repeat(64),
      expectedActivationId: null,
      confirmFictionalActivation: true,
      password: 'wrong',
    };
    for (let i = 0; i < 5; i++)
      await request(app.getHttpServer())
        .post(`/institution-setup/demo-university/${randomUUID()}/activate`)
        .set('Cookie', approver.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .set('x-requested-with', 'XMLHttpRequest')
        .send(command)
        .expect(403);
    const limited = await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${randomUUID()}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .set('x-requested-with', 'XMLHttpRequest')
      .send(command)
      .expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('retains campus behaviour when its configured type uses a different label and code', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const r = await report(proposer.cookie);
    const profile = structuredClone(r.activeVersion.profile);
    const campusTypes = profile.unitTypes
      .filter((t: { kind: string }) => t.kind === 'CAMPUS')
      .map((t: { code: string }) => t.code);
    profile.unitTypes = profile.unitTypes.map(
      (t: { code: string; kind: string }) =>
        t.kind === 'CAMPUS'
          ? { ...t, code: 'SITE', label: 'Teaching site' }
          : t,
    );
    profile.units = profile.units.map((u: { typeCode: string }) =>
      campusTypes.includes(u.typeCode) ? { ...u, typeCode: 'SITE' } : u,
    );
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'Configure teaching site terminology',
          profile,
        })
        .expect(201)
    ).body;
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${row.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(approval(row))
      .expect(201);
    const campusActor = await actor(['timetable-demo-rules-draft']);
    await db.roleAssignment.update({
      where: { id: campusActor.assignmentId },
      data: { scopeType: 'CAMPUS', scopeRef: 'DEMO-MAIN' },
    });
    const response = await request(app.getHttpServer())
      .get('/timetabling/demo-rules')
      .set('Cookie', campusActor.cookie)
      .expect(200);
    expect(response.body.campusCode).toBe('DEMO-MAIN');
  });
  it('rechecks proposer appointment and expiry before approval', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const r = await report(proposer.cookie);
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'Appointment must remain active',
          profile: r.activeVersion.profile,
        })
        .expect(201)
    ).body;
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    await db.roleAssignment.update({
      where: { id: proposer.assignmentId },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${row.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(approval(row))
      .expect(403);
    await db.roleAssignment.update({
      where: { id: approver.assignmentId },
      data: { endsAt: new Date('2020-01-01') },
    });
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${row.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(approval(row))
      .expect(403);
    expect(
      await db.demoInstitutionSetupActivation.count({
        where: { setupVersionId: saved.id },
      }),
    ).toBe(0);
  });
  it('pages historical versions without changing the current activation or draft base', async () => {
    let proposer = await actor(['institution-demo-setup-propose']);
    const initial = await report(proposer.cookie);
    let latest = initial.latestVersion;
    for (let i = 0; i < 22; i++) {
      if (i === 11) proposer = await actor(['institution-demo-setup-propose']);
      const saved = (
        await request(app.getHttpServer())
          .post('/institution-setup/demo-university')
          .set('Cookie', proposer.cookie)
          .set('x-requested-with', 'XMLHttpRequest')
          .send({
            clientRequestId: randomUUID(),
            expectedVersion: latest,
            expectedActivationId: initial.activeActivationId,
            reason: `Historical review example ${i + 1}`,
            profile: initial.activeVersion.profile,
          })
          .expect(201)
      ).body;
      latest = saved.version;
    }
    const newest = await report(proposer.cookie);
    expect(newest.versions).toHaveLength(20);
    expect(newest.olderVersionCursor).toBe(newest.versions.at(-1).version);
    const older = (
      await request(app.getHttpServer())
        .get('/institution-setup/demo-university')
        .query({ beforeVersion: newest.olderVersionCursor })
        .set('Cookie', proposer.cookie)
        .expect(200)
    ).body;
    expect(older.versions[0].version).toBeLessThan(newest.olderVersionCursor);
    expect(older.latestVersion).toBe(latest);
    expect(older.activeActivationId).toBe(newest.activeActivationId);
    expect(
      older.versions.some((v: { id: string }) =>
        newest.versions.some((n: { id: string }) => n.id === v.id),
      ),
    ).toBe(false);
    await request(app.getHttpServer())
      .get('/institution-setup/demo-university')
      .query({ beforeVersion: '-1' })
      .set('Cookie', proposer.cookie)
      .expect(400);
  });
  it('rolls back every projection and success record when the final outbox insert fails', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const r = await report(proposer.cookie);
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'Atomic failure rehearsal',
          profile: r.activeVersion.profile,
        })
        .expect(201)
    ).body;
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    const command = approval(row);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_setup003_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."aggregateId" = '${saved.id}' AND NEW."type" = 'DemoInstitutionSetupActivated' THEN RAISE EXCEPTION 'Injected isolated setup003 failure'; END IF; RETURN NEW; END $$`,
    );
    try {
      await db.$executeRawUnsafe(
        'CREATE TRIGGER test_setup003_fail_event BEFORE INSERT ON "OutboxEvent" FOR EACH ROW EXECUTE FUNCTION test_setup003_fail_event()',
      );
      await request(app.getHttpServer())
        .post(`/institution-setup/demo-university/${row.id}/activate`)
        .set('Cookie', approver.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send(command)
        .expect(500);
      expect(
        await db.institutionUnitVersion.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
      expect(
        await db.institutionUnitRelationship.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
      expect(
        await db.academicPeriodVersion.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
      expect(
        await db.demoInstitutionSetupActivation.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
      expect(
        await db.auditEvent.count({
          where: {
            action: 'DemoInstitutionSetupActivated',
            outcome: 'ALLOW',
            targetRef: saved.id,
          },
        }),
      ).toBe(0);
      expect(
        await db.outboxEvent.count({ where: { aggregateId: saved.id } }),
      ).toBe(0);
      expect(
        await db.demoInstitutionSetupVersion.findUnique({
          where: { id: saved.id },
        }),
      ).not.toBeNull();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS test_setup003_fail_event ON "OutboxEvent"',
      );
      await db.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS test_setup003_fail_event()',
      );
    }
    await request(app.getHttpServer())
      .post(`/institution-setup/demo-university/${row.id}/activate`)
      .set('Cookie', approver.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send(command)
      .expect(201);
  });
  it('refuses approval if an appointment expires while projections are being installed', async () => {
    const proposer = await actor(['institution-demo-setup-propose']);
    const approver = await actor(['institution-demo-setup-approve']);
    const r = await report(proposer.cookie);
    const saved = (
      await request(app.getHttpServer())
        .post('/institution-setup/demo-university')
        .set('Cookie', proposer.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({
          clientRequestId: randomUUID(),
          expectedVersion: r.latestVersion,
          expectedActivationId: r.activeActivationId,
          reason: 'Expiry during approval rehearsal',
          profile: r.activeVersion.profile,
        })
        .expect(201)
    ).body;
    const row = (await report(approver.cookie)).versions.find(
      (v: { id: string }) => v.id === saved.id,
    );
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_setup003_delay_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."setupVersionId" = '${saved.id}' THEN PERFORM pg_sleep(1); END IF; RETURN NEW; END $$`,
    );
    try {
      await db.$executeRawUnsafe(
        'CREATE TRIGGER test_setup003_delay_projection BEFORE INSERT ON "InstitutionUnitVersion" FOR EACH ROW EXECUTE FUNCTION test_setup003_delay_projection()',
      );
      await db.roleAssignment.update({
        where: { id: approver.assignmentId },
        data: { endsAt: new Date(Date.now() + 5000) },
      });
      await request(app.getHttpServer())
        .post(`/institution-setup/demo-university/${row.id}/activate`)
        .set('Cookie', approver.cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send(approval(row))
        .expect(403);
      expect(
        await db.institutionUnitVersion.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
      expect(
        await db.demoInstitutionSetupActivation.count({
          where: { setupVersionId: saved.id },
        }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS test_setup003_delay_projection ON "InstitutionUnitVersion"',
      );
      await db.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS test_setup003_delay_projection()',
      );
    }
  });
});
