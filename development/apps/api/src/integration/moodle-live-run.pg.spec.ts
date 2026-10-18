import 'reflect-metadata';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {
  MoodleLiveRunController,
  MoodleRunRateGuard,
} from './moodle-live-run.controller.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { SessionService } from '../identity-access/session.service.js';
import { WorkspaceService } from '../identity-access/workspace.service.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  MoodleLiveRunService,
  type MoodleRunActor,
  MoodleRunIdentityPort,
} from './moodle-live-run.service.js';
import { hashToken } from '../identity-access/session.service.js';

// Dedicated opt-in database; no reset or shared-data cleanup.
const enabled = process.env.MOODLE_RUN_PG_TEST === '1';
describe.skipIf(!enabled)(
  'persisted governed Moodle foundation on PostgreSQL',
  () => {
    let prisma: PrismaService;
    let service: MoodleLiveRunService;
    let admin: MoodleRunActor;
    let support: MoodleRunActor;
    let other: MoodleRunActor;
    const password = 'Synthetic-only-review-password-2026!';
    const identity = {
      check: vi.fn(async () => ({
        ok: true,
        version: '4.5.6',
        numericVersion: '20261016',
      })),
    };
    const key = () => randomUUID();
    async function actor(
      role: string,
      scopeRef = 'foundation-review',
      personId?: string,
    ): Promise<MoodleRunActor> {
      const person = personId
        ? { id: personId }
        : await prisma.person.create({
            data: { displayName: 'Fictional Moodle reviewer' },
          });
      const account = await prisma.account.create({
        data: { personId: person.id, username: `run-review-${key()}` },
      });
      await prisma.credential.create({
        data: {
          accountId: account.id,
          kind: 'PASSWORD',
          secretHash: await hash(password),
        },
      });
      const assignment = await prisma.roleAssignment.create({
        data: {
          accountId: account.id,
          role,
          scopeType: 'INSTITUTION',
          scopeRef,
          capabilities:
            role === 'MOODLE_ADMIN'
              ? ['manage-mapping', 'sync-moodle']
              : ['replay-event'],
          reason: 'Synthetic test authority',
        },
      });
      const sessionToken = key();
      await prisma.session.create({
        data: {
          tokenHash: hashToken(sessionToken),
          accountId: account.id,
          activeAssignmentId: assignment.id,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      return {
        accountId: account.id,
        assignmentId: assignment.id,
        activeRole: role,
        scopeType: 'INSTITUTION',
        scopeRef,
        sessionToken,
      };
    }
    async function receipt(who: MoodleRunActor, view: any, action: any) {
      view = await service.detail(who, view.id);
      return (
        await service.issueReceipt(who, view.id, {
          action,
          version: view.version,
          evidenceChecksum: view.actionEvidence[action],
          password,
        })
      ).receiptToken;
    }
    async function command(
      who: MoodleRunActor,
      view: any,
      action: any,
      extra = {},
    ) {
      return service.command(who, view.id, action, {
        idempotencyKey: key(),
        version: view.version,
        reason: 'Synthetic lifecycle verification',
        ...extra,
      });
    }
    beforeAll(async () => {
      const target = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
      if (process.env.DEMO_MODE !== 'true' || !['localhost','127.0.0.1'].includes(target.hostname)
        || !/^sis_moodle_foundation_review_[A-Za-z0-9]+$/.test(target.pathname.slice(1)))
        throw Error('DEDICATED_TEST_DB_REQUIRED');
      Object.assign(process.env, {
        MOODLE_INTEGRATION_MODE: 'live-test',
        MOODLE_API_URL: 'https://moodle.example.edu',
        MOODLE_ALLOWED_HOST: 'moodle.example.edu',
        MOODLE_API_TOKEN: 'synthetic-token-never-sent',
        MOODLE_EXPECTED_SITE_ID: '2',
        MOODLE_EXPECTED_VERSION: '4.5.6',
        MOODLE_ROLE_IDS: '{"student":5}',
        MOODLE_CATEGORY_ID: '2',
        MOODLE_COURSE_VISIBLE: '0',
        MOODLE_LIVE_TEST_COHORT_PREFIX: 'SIS-MOODLE-LIVE-TEST-',
      });
      prisma = new PrismaService();
      service = new MoodleLiveRunService(
        prisma,
        identity as unknown as MoodleRunIdentityPort,
      );
      admin = await actor('MOODLE_ADMIN');
      support = await actor('INTEGRATION_SUPPORT');
      other = await actor('INTEGRATION_SUPPORT', 'another-scope');
      const previous = await service.current(support);
      if (
        previous &&
        ['PREPARED', 'RUNNING', 'PAUSED'].includes(previous.state)
      )
        await command(support, previous, 'fail');
    }, 30000);
    afterAll(async () => {
      if (prisma) await prisma.$disconnect();
    });

    it('persists exact independent consent, gates runtime binding, preserves immutable evidence and terminal closure', async () => {
      let run = await service.prepare(admin, {
        idempotencyKey: key(),
        reason: 'Isolated synthetic test',
        nonProductionConfirmed: true,
        syntheticOnlyConfirmed: true,
      });
      expect(run.state).toBe('PREPARED');
      expect(run.requiredBinding.dbFingerprint).toMatch(/^[a-f0-9]{64}$/);
      await expect(service.detail(other, run.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(command(admin, run, 'pause')).rejects.toMatchObject({
        status: 403,
      });
      run = await command(admin, run, 'add-entry', {
        entity: 'Account',
        entityId: admin.accountId,
      });
      run = await command(admin, run, 'add-entry', {
        entity: 'Account',
        entityId: support.accountId,
      });
      run = await command(admin, run, 'seal');
      await expect(
        prisma.moodleScopeManifestEntry.create({
          data: {
            manifestId: (
              await prisma.moodleScopeManifest.findUniqueOrThrow({
                where: { runId: run.id },
              })
            ).id,
            entity: 'Account',
            entityId: other.accountId,
            cohortPrefix: run.cohortPrefix,
            addedByAccountId: admin.accountId,
          },
        }),
      ).rejects.toThrow();
      await expect(
        service.issueReceipt(admin, run.id, {
          action: 'technical-approval',
          version: run.version,
          evidenceChecksum: run.actionEvidence['technical-approval']!,
          password: 'wrong-password',
        }),
      ).rejects.toMatchObject({ status: 403 });
      const technical = await receipt(admin, run, 'technical-approval');
      await expect(
        command(support, run, 'technical-approval', {
          receiptToken: technical,
        }),
      ).rejects.toMatchObject({ status: 403 });
      run = await command(admin, run, 'technical-approval', {
        receiptToken: technical,
      });
      const startReceipt = await receipt(support, run, 'start');
      await expect(
        command(support, run, 'start', { receiptToken: startReceipt }),
      ).rejects.toMatchObject({ status: 409 });
      expect(identity.check).not.toHaveBeenCalled();
      process.env.MOODLE_LIVE_TEST_RUN_ID = run.requiredBinding.runId;
      process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT =
        run.requiredBinding.dbFingerprint;
      const startKey = key();
      const startInput = {
        idempotencyKey: startKey,
        version: run.version,
        reason: 'Exact independent operational consent',
        receiptToken: startReceipt,
      };
      const starts = await Promise.all([
        service.command(support, run.id, 'start', startInput),
        service.command(support, run.id, 'start', startInput),
      ]);
      expect(starts[0]).toEqual(starts[1]);
      run = starts[0];
      expect(run.state).toBe('RUNNING');
      expect(run.actualNumericVersion).toBe('20261016');
      expect(run.deliveryReadiness.outcome).toBe('NOT_PROVISIONED');
      expect(JSON.stringify(run)).not.toContain('synthetic-token-never-sent');
      expect(JSON.stringify(run)).not.toContain('https://');
      await expect(command(support, run, 'complete')).rejects.toThrow(
        'FULL_REHEARSAL_EVIDENCE_REQUIRED',
      );
      run = await command(support, run, 'pause');
      await expect(
        command(support, run, 'resume', { receiptToken: startReceipt }),
      ).rejects.toMatchObject({ status: 409 });
      // An unchanged target needs fresh operational consent on resume, while
      // the original technical approval retains its live authority.
      const pauseTime = Date.now();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(pauseTime + 16 * 60 * 1000);
      try {
        run = await command(support, run, 'resume', {
          receiptToken: await receipt(support, run, 'resume'),
        });
      } finally {
        vi.useRealTimers();
      }

      run = await command(support, run, 'fail');
      expect(run.endedAt).not.toBeNull();
      await expect(command(support, run, 'start')).rejects.toMatchObject({
        status: 409,
      });
      await expect(
        command(support, run, 'close', {
          receiptToken: await receipt(support, run, 'close'),
        }),
      ).rejects.toMatchObject({ status: 409 });
      run = await command(admin, run, 'close-technical', {
        receiptToken: await receipt(admin, run, 'close-technical'),
        credentialRetiredConfirmed: true,
      });
      run = await command(support, run, 'close', {
        receiptToken: await receipt(support, run, 'close'),
        evidenceFrozenConfirmed: true,
        humanReviewConfirmed: true,
      });
      expect(run.state).toBe('CLOSED');
      expect(run.permittedActions).toEqual([]);
      await expect(
        prisma.moodleLiveTestRunTransition.update({
          where: { id: run.decisions[0].id },
          data: { reason: 'rewrite' },
        }),
      ).rejects.toThrow();
    }, 60000);

    it('rejects live authority changes, proof substitution, expired consent, stale commands and simultaneous preparations', async () => {
      admin = await actor('MOODLE_ADMIN');
      support = await actor('INTEGRATION_SUPPORT');
      const attempts = await Promise.allSettled([
        service.prepare(admin, {
          idempotencyKey: key(),
          reason: 'First synthetic race',
          nonProductionConfirmed: true,
          syntheticOnlyConfirmed: true,
        }),
        service.prepare(admin, {
          idempotencyKey: key(),
          reason: 'Second synthetic race',
          nonProductionConfirmed: true,
          syntheticOnlyConfirmed: true,
        }),
      ]);
      expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
      expect(attempts.filter((a) => a.status === 'rejected')).toHaveLength(1);
      let run = (
        attempts.find(
          (a) => a.status === 'fulfilled',
        ) as PromiseFulfilledResult<any>
      ).value;
      await expect(
        command(admin, run, 'add-entry', {
          entity: 'Account',
          entityId: key(),
        }),
      ).rejects.toMatchObject({ status: 409 });
      run = await command(admin, run, 'add-entry', {
        entity: 'Account',
        entityId: admin.accountId,
      });
      await expect(
        command(admin, run, 'seal', { version: run.version - 1 }),
      ).rejects.toMatchObject({ status: 409 });
      run = await command(admin, run, 'seal');
      const approval = await receipt(admin, run, 'technical-approval');
      const differentSession = key();
      await prisma.session.create({
        data: {
          tokenHash: hashToken(differentSession),
          accountId: admin.accountId,
          activeAssignmentId: admin.assignmentId,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await expect(
        command(
          { ...admin, sessionToken: differentSession },
          run,
          'technical-approval',
          { receiptToken: approval },
        ),
      ).rejects.toMatchObject({ status: 409 });
      run = await command(admin, run, 'technical-approval', {
        receiptToken: approval,
      });
      await expect(
        command(admin, run, 'technical-approval', { receiptToken: approval }),
      ).rejects.toMatchObject({ status: 409 });
      const originalPerson = await prisma.account.findUniqueOrThrow({
        where: { id: admin.accountId },
      });
      const samePerson = await actor(
        'INTEGRATION_SUPPORT',
        'foundation-review',
        originalPerson.personId,
      );
      const samePersonView = await service.detail(samePerson, run.id);
      await expect(
        command(samePerson, run, 'start', {
          receiptToken: await receipt(samePerson, samePersonView, 'start'),
        }),
      ).rejects.toMatchObject({ status: 409 });
      const op = await receipt(support, run, 'start');
      const now = Date.now();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now + 16 * 60 * 1000);
      await expect(
        command(support, run, 'start', { receiptToken: op }),
      ).rejects.toMatchObject({ status: 409 });
      vi.useRealTimers();
      process.env.MOODLE_LIVE_TEST_RUN_ID = run.requiredBinding.runId;
      process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT =
        run.requiredBinding.dbFingerprint;
      await prisma.session.update({
        where: { tokenHash: hashToken(admin.sessionToken) },
        data: { revokedAt: new Date() },
      });
      await expect(
        command(support, run, 'start', { receiptToken: op }),
      ).rejects.toMatchObject({ status: 409 });
      const replacement = await actor('MOODLE_ADMIN');
      run = await command(replacement, run, 'technical-approval', {
        receiptToken: await receipt(replacement, run, 'technical-approval'),
      });
      const supportReceipt = await receipt(support, run, 'start');
      await prisma.roleAssignment.update({
        where: { id: replacement.assignmentId! },
        data: { endsAt: new Date(Date.now() - 1000) },
      });
      await expect(
        command(support, run, 'start', { receiptToken: supportReceipt }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(service.detail(replacement, run.id)).rejects.toMatchObject({
        status: 403,
      });
      const anotherAdmin = await actor('MOODLE_ADMIN');
      run = await command(anotherAdmin, run, 'technical-approval', {
        receiptToken: await receipt(anotherAdmin, run, 'technical-approval'),
      });
      const fresh = await receipt(support, run, 'start');
      const badConfig = process.env.MOODLE_CATEGORY_ID;
      process.env.MOODLE_CATEGORY_ID = '99';
      await expect(
        command(support, run, 'start', { receiptToken: fresh }),
      ).rejects.toMatchObject({ status: 409 });
      process.env.MOODLE_CATEGORY_ID = badConfig;
      run = await command(support, run, 'start', { receiptToken: fresh });
      const pauseInput = {
        idempotencyKey: key(),
        version: run.version,
        reason: 'Pause race evidence',
      };
      const pauses = await Promise.allSettled([
        service.command(support, run.id, 'pause', pauseInput),
        service.command(support, run.id, 'pause', {
          ...pauseInput,
          idempotencyKey: key(),
        }),
      ]);
      expect(pauses.filter((p) => p.status === 'fulfilled')).toHaveLength(1);
      expect(pauses.filter((p) => p.status === 'rejected')).toHaveLength(1);
      run = await service.detail(support, run.id);
      expect(run.state).toBe('PAUSED');
      await expect(
        service.command(support, run.id, 'pause', {
          ...pauseInput,
          reason: 'Changed same key',
        }),
      ).rejects.toMatchObject({ status: 409 });
      run = await command(support, run, 'fail');
      const manifest = await prisma.moodleScopeManifest.findUniqueOrThrow({
        where: { runId: run.id },
      });
      await expect(
        prisma.moodleScopeManifest.update({
          where: { id: manifest.id },
          data: { checksum: 'rewrite' },
        }),
      ).rejects.toThrow();
      const entries = await prisma.moodleScopeManifestEntry.findMany({
        where: { manifestId: manifest.id },
      });
      await expect(
        prisma.moodleScopeManifestEntry.delete({
          where: { id: entries[0]!.id },
        }),
      ).rejects.toThrow();
      const proof =
        await prisma.moodleRunAuthenticationReceipt.findUniqueOrThrow({
          where: { tokenHash: hashToken(fresh) },
        });
      await expect(
        prisma.moodleRunAuthenticationReceipt.update({
          where: { id: proof.id },
          data: { evidenceChecksum: 'rewrite' },
        }),
      ).rejects.toThrow();
      const audits = await prisma.auditEvent.findMany({
        where: { targetRef: run.id },
      });
      expect(audits.some((a) => a.outcome === 'DENY')).toBe(true);
      expect(audits.some((a) => a.outcome === 'ALLOW')).toBe(true);
      expect(JSON.stringify(audits)).not.toContain(password);
      expect(JSON.stringify(audits)).not.toContain(fresh);
      expect(JSON.stringify(audits)).not.toContain(
        'synthetic-token-never-sent',
      );
      admin = await actor('MOODLE_ADMIN');
    }, 60000);

    it('revalidates consent after the transaction-free identity read and rate-limits password guessing', async () => {
      const technical = await actor('MOODLE_ADMIN');
      const operational = await actor('INTEGRATION_SUPPORT');
      const insufficient = await actor('MOODLE_ADMIN');
      await prisma.roleAssignment.update({
        where: { id: insufficient.assignmentId! },
        data: { capabilities: ['manage-mapping'] },
      });
      await expect(
        service.prepare(insufficient, {
          idempotencyKey: key(),
          reason: 'Insufficient permission',
          nonProductionConfirmed: true,
          syntheticOnlyConfirmed: true,
        }),
      ).rejects.toMatchObject({ status: 403 });
      let run = await service.prepare(technical, {
        idempotencyKey: key(),
        reason: 'Post-preflight authority proof',
        nonProductionConfirmed: true,
        syntheticOnlyConfirmed: true,
      });
      run = await command(technical, run, 'add-entry', {
        entity: 'Account',
        entityId: technical.accountId,
      });
      run = await command(technical, run, 'seal');
      const syncOnly = await actor('MOODLE_ADMIN');
      await prisma.roleAssignment.update({
        where: { id: syncOnly.assignmentId! },
        data: { capabilities: ['sync-moodle'] },
      });
      const syncView = await service.detail(syncOnly, run.id);
      expect(syncView.permittedActions).toContain('technical-approval');
      expect(syncView.permittedActions).not.toContain('add-entry');
      expect(syncView.permittedActions).not.toContain('seal');
      const limited = await actor('MOODLE_ADMIN');
      const limitedView = await service.detail(limited, run.id);
      for (let attempt = 0; attempt < 3; attempt++)
        await expect(
          service.issueReceipt(limited, run.id, {
            action: 'technical-approval',
            version: run.version,
            evidenceChecksum: limitedView.actionEvidence['technical-approval']!,
            password: 'incorrect',
          }),
        ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.issueReceipt(limited, run.id, {
          action: 'technical-approval',
          version: run.version,
          evidenceChecksum: limitedView.actionEvidence['technical-approval']!,
          password,
        }),
      ).rejects.toMatchObject({ status: 429 });
      expect(
        await prisma.moodleRunAuthenticationReceipt.count({
          where: { accountId: limited.accountId, runId: run.id },
        }),
      ).toBe(0);
      run = await command(technical, run, 'technical-approval', {
        receiptToken: await receipt(technical, run, 'technical-approval'),
      });
      process.env.MOODLE_LIVE_TEST_RUN_ID = run.requiredBinding.runId;
      process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT =
        run.requiredBinding.dbFingerprint;
      const operationalProof = await receipt(operational, run, 'start');
      identity.check.mockImplementationOnce(async () => {
        const locks = await prisma.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*)::bigint AS count FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=current_database())`;
        expect(Number(locks[0]!.count)).toBe(0);
        await prisma.session.update({
          where: { tokenHash: hashToken(technical.sessionToken) },
          data: { revokedAt: new Date() },
        });
        return { ok: true, version: '4.5.6', numericVersion: '20261016' };
      });
      await expect(
        command(operational, run, 'start', { receiptToken: operationalProof }),
      ).rejects.toMatchObject({ status: 409 });
      expect((await service.detail(operational, run.id)).state).toBe(
        'PREPARED',
      );
      expect(
        (
          await prisma.moodleRunAuthenticationReceipt.findUniqueOrThrow({
            where: { tokenHash: hashToken(operationalProof) },
          })
        ).usedAt,
      ).toBeNull();
      await command(operational, run, 'fail');
    }, 60000);

    it('exposes the real PostgreSQL lifecycle through authenticated, CSRF-protected HTTP commands', async () => {
      support = await actor('INTEGRATION_SUPPORT');
      const module = await Test.createTestingModule({
        controllers: [MoodleLiveRunController],
        providers: [
          { provide: PrismaService, useValue: prisma },
          { provide: MoodleLiveRunService, useValue: service },
          WorkspaceService,
          SessionService,
          SessionGuard,
          CsrfGuard,
          MoodleRunRateGuard,
        ],
      }).compile();
      const app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      const server = app.getHttpServer();
      const post = (who: MoodleRunActor, path: string, body: any) =>
        request(server)
          .post('/integration/live-test/' + path)
          .set('Cookie', `sid=${who.sessionToken}`)
          .set('x-requested-with', 'XMLHttpRequest')
          .send(body);
      const input = {
        idempotencyKey: key(),
        reason: 'HTTP synthetic preparation',
        nonProductionConfirmed: true,
        syntheticOnlyConfirmed: true,
      };
      try {
        await request(server).get('/integration/live-test/setup').expect(401);
        await request(server)
          .post('/integration/live-test/runs')
          .set('Cookie', `sid=${admin.sessionToken}`)
          .send(input)
          .expect(403);
        await post(support, 'runs', input).expect(403);
        await post(admin, 'runs', {
          ...input,
          secondApproverAccountId: support.accountId,
        }).expect(400);
        let response = await post(admin, 'runs', input).expect(201);
        let run = response.body;
        const replay = await post(admin, 'runs', input).expect(201);
        expect(replay.body).toEqual(run);
        const otherAssignment = await prisma.roleAssignment.create({
          data: {
            accountId: admin.accountId,
            role: 'MOODLE_ADMIN',
            scopeType: 'INSTITUTION',
            scopeRef: 'another-scope',
            capabilities: ['manage-mapping', 'sync-moodle'],
            reason: 'Synthetic workspace-switch replay verification',
          },
        });
        await prisma.session.update({
          where: { tokenHash: hashToken(admin.sessionToken) },
          data: { activeAssignmentId: otherAssignment.id },
        });
        try {
          await request(server)
            .get(`/integration/live-test/runs/${run.id}`)
            .set('Cookie', `sid=${admin.sessionToken}`)
            .expect(404);
          const denied = await post(admin, 'runs', input).expect(404);
          expect(denied.body.message).toBe('MOODLE_RUN_NOT_FOUND');
          expect(JSON.stringify(denied.body)).not.toContain(run.id);
        } finally {
          await prisma.session.update({
            where: { tokenHash: hashToken(admin.sessionToken) },
            data: { activeAssignmentId: admin.assignmentId },
          });
        }
        await request(server)
          .get(`/integration/live-test/runs/${run.id}`)
          .set('Cookie', `sid=${other.sessionToken}`)
          .expect(404);
        const mutate = async (
          who: MoodleRunActor,
          action: string,
          extra = {},
        ) => {
          const result = await post(who, `runs/${run.id}/${action}`, {
            idempotencyKey: key(),
            version: run.version,
            reason: 'Synthetic HTTP lifecycle',
            ...extra,
          }).expect(201);
          run = result.body;
          return run;
        };
        await mutate(admin, 'manifest/entries', {
          entity: 'Account',
          entityId: admin.accountId,
        });
        await mutate(admin, 'manifest/seal');
        const auth = async (who: MoodleRunActor, action: string) => {
          const detail = await request(server)
            .get(`/integration/live-test/runs/${run.id}`)
            .set('Cookie', `sid=${who.sessionToken}`)
            .expect(200);
          return (
            await post(who, `runs/${run.id}/reauthenticate`, {
              action,
              version: run.version,
              evidenceChecksum: detail.body.actionEvidence[action],
              password,
            }).expect(201)
          ).body.receiptToken;
        };
        await mutate(admin, 'technical-approval', {
          receiptToken: await auth(admin, 'technical-approval'),
        });
        process.env.MOODLE_LIVE_TEST_RUN_ID = run.requiredBinding.runId;
        process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT =
          run.requiredBinding.dbFingerprint;
        await mutate(support, 'start', {
          receiptToken: await auth(support, 'start'),
        });
        expect(run.state).toBe('RUNNING');
        await post(admin, `runs/${run.id}/pause`, {
          idempotencyKey: key(),
          version: run.version,
          reason: 'Wrong actor',
        }).expect(403);
        await mutate(support, 'pause');
        await mutate(support, 'resume', {
          receiptToken: await auth(support, 'resume'),
        });
        await mutate(support, 'fail');
        await mutate(admin, 'close-technical', {
          receiptToken: await auth(admin, 'close-technical'),
          credentialRetiredConfirmed: true,
        });
        await mutate(support, 'close', {
          receiptToken: await auth(support, 'close'),
          evidenceFrozenConfirmed: true,
          humanReviewConfirmed: true,
        });
        expect(run.state).toBe('CLOSED');
        expect(run.deliveryReadiness.outcome).toBe('NOT_PROVISIONED');
        expect(JSON.stringify(run)).not.toContain(password);
      } finally {
        await app.close();
      }
    }, 60000);
  },
);
