import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpsService } from '../ops/ops.service.js';
import { IntegrationService } from './integration.service.js';
import { OperationsQueueService } from './operations-queue.service.js';

const ADMIN = {
  accountId: 'admin',
  activeRole: 'MOODLE_ADMIN',
  assignmentId: 'admin-role',
  scope: 'SYSTEM:MOODLE',
};
const SUPPORT = {
  accountId: 'support',
  activeRole: 'INTEGRATION_SUPPORT',
  assignmentId: 'support-role',
  scope: 'SYSTEM:INTEGRATION',
};
const at = new Date('2026-01-01T00:00:00Z');

function mode(kind: 'simulator' | 'live-test' | 'live-test-disabled') {
  vi.stubEnv(
    'MOODLE_INTEGRATION_MODE',
    kind === 'live-test-disabled' ? 'live-test' : kind,
  );
  vi.stubEnv('MOODLE_API_URL', 'https://moodle.example.test');
  vi.stubEnv(
    'MOODLE_API_TOKEN',
    kind === 'live-test-disabled' ? '' : 'fixture-only',
  );
  vi.stubEnv('MOODLE_ALLOWED_HOST', 'moodle.example.test');
  vi.stubEnv('MOODLE_EXPECTED_SITE_ID', '1');
  vi.stubEnv('MOODLE_EXPECTED_VERSION', 'fixture-release');
  vi.stubEnv('MOODLE_ROLE_IDS', '{"student":5}');
  vi.stubEnv('MOODLE_CATEGORY_ID', '7');
  vi.stubEnv('MOODLE_COURSE_VISIBLE', '0');
  vi.stubEnv('MOODLE_LIVE_TEST_RUN_ID', 'configuration-is-not-approval');
  vi.stubEnv('MOODLE_LIVE_TEST_DB_FINGERPRINT', 'a'.repeat(64));
  vi.stubEnv('MOODLE_LIVE_TEST_COHORT_PREFIX', 'SIS-MOODLE-LIVE-TEST-');
}

function fixture() {
  const mutations: string[] = [];
  const events = [1, 2].map((number) => ({
    id: `event-${number}`,
    type: 'MoodleEnrolmentQueued',
    aggregateId: 'registration',
    occurredAt: at,
    deliveredAt: null,
    payload: {
      registrationId: 'registration',
      attemptId: 'programme-attempt',
      period: '2026S1',
    },
  }));
  const attempt = {
    id: 'previous-attempt',
    outboxId: events[0].id,
    outbox: events[0],
    state: 'PENDING',
    attempt: 3,
    nextRunAt: at,
    lastError: 'Earlier evidence',
    createdAt: at,
  };
  const commandResponse = { id: 'case', status: 'RESOLVED' };
  const model = (
    name: string,
    reads: Record<string, unknown> = {},
    written: unknown = { id: name },
  ) => {
    const result: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of [
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findMany',
      'count',
      'aggregate',
    ]) {
      result[method] = vi.fn(
        async () => reads[method] ?? (method === 'findMany' ? [] : null),
      );
    }
    for (const method of ['create', 'update', 'updateMany', 'upsert']) {
      result[method] = vi.fn(async () => {
        mutations.push(`${name}.${method}`);
        return written;
      });
    }
    return result;
  };
  const db = {
    roleAssignment: model('roleAssignment', {
      findFirst: { id: 'active-role' },
    }),
    moodleConnection: model('moodleConnection', {
      findUnique: {
        id: 'connection',
        provider: 'MOODLE-SIM-v1',
        status: 'HEALTHY',
        capabilities: { paused: false, scenario: 'SUCCESS' },
        lastCheckedAt: at,
      },
    }),
    moodleMaintenance: model('moodleMaintenance'),
    outboxEvent: model('outboxEvent', {
      findUnique: events[0],
      findMany: events,
    }),
    integrationDeliveryAttempt: model(
      'integrationDeliveryAttempt',
      { findFirst: attempt, findUnique: attempt, findMany: [attempt] },
      attempt,
    ),
    programmeAttempt: model('programmeAttempt', {
      findUnique: {
        id: 'programme-attempt',
        offeringId: 'offering',
        studentId: 'student',
      },
    }),
    institutionalRegistration: model('institutionalRegistration', {
      findUnique: { id: 'registration' },
    }),
    programmeOffering: model('programmeOffering', {
      findUnique: {
        id: 'offering',
        intake: '2026S1',
        programme: { code: 'SWE' },
      },
      findUniqueOrThrow: {
        id: 'offering',
        intake: '2026S1',
        programme: { code: 'SWE' },
      },
    }),
    academicPeriod: model('academicPeriod', {
      findUnique: { id: 'period', code: '2026S1' },
      findUniqueOrThrow: { id: 'period', code: '2026S1' },
    }),
    moodleMapping: model('moodleMapping'),
    mappingCheck: model('mappingCheck'),
    simShell: model('simShell', {}, { id: 'sim-shell' }),
    simStudentEnrolment: model(
      'simStudentEnrolment',
      {},
      { createdAt: at, updatedAt: at },
    ),
    tGAllocation: model('tGAllocation'),
    reconciliationRun: model('reconciliationRun', {}, { id: 'recon-run' }),
    reconciliationCase: model('reconciliationCase', {
      findUnique: {
        id: 'case',
        status: 'OPEN',
        studentId: 'student',
        shellId: 'sim-shell',
      },
    }),
    applicationCommand: model('applicationCommand'),
    replayDecision: model('replayDecision', {
      findUnique: {
        id: 'replay',
        status: 'PENDING',
        requesterAccountId: 'different-person',
        scope: 'attempt',
        attemptId: attempt.id,
      },
    }),
    auditEvent: model('auditEvent'),
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(
    async (callback: (transaction: typeof db) => Promise<unknown>) =>
      callback(db),
  );
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('Unexpected network call'));
  return {
    db,
    events,
    attempt,
    mutations,
    fetch,
    commandResponse,
    service: new IntegrationService(db as never, { openFromDeadLetter: vi.fn() } as unknown as OpsService),
    queue: new OperationsQueueService(db as never),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe.each(['live-test', 'live-test-disabled'] as const)(
  '%s source-flow deferral',
  (backend) => {
    it('defers direct dispatch before an attempt, mapping or request', async () => {
      mode(backend);
      const f = fixture();
      const before = JSON.stringify({ event: f.events[0], attempt: f.attempt });
      await expect(
        f.service.deliverOutbox(f.events[0].id),
      ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
      expect(f.mutations).toEqual([]);
      expect(JSON.stringify({ event: f.events[0], attempt: f.attempt })).toBe(
        before,
      );
      expect(f.fetch).not.toHaveBeenCalled();
    });

    it('counts deferred canonical sources without claiming due/orphan rows', async () => {
      mode(backend);
      const f = fixture();
      await expect(f.service.runWorker(25)).resolves.toMatchObject({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 2,
        deferral: { outcome: 'NOT_PROVISIONED', backend },
      });
      expect(f.db.integrationDeliveryAttempt.findMany).not.toHaveBeenCalled();
      expect(f.mutations).toEqual([]);
      expect(f.fetch).not.toHaveBeenCalled();
    });

    it('reports no processed work when the live queue is empty', async () => {
      mode(backend);
      const f = fixture();
      f.db.outboxEvent.findMany.mockResolvedValue([]);
      await expect(f.service.runWorker()).resolves.toMatchObject({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 0,
        deferral: { outcome: 'NOT_PROVISIONED', backend },
      });
      expect(f.mutations).toEqual([]);
    });

    it('defers the authorized manual worker without claiming sources', async () => {
      mode(backend);
      const f = fixture();
      await expect(f.service.runWorkerNow(ADMIN)).resolves.toMatchObject({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 2,
        deferral: { outcome: 'NOT_PROVISIONED', backend },
      });
      expect(f.mutations).toEqual([]);
    });

    it('does not record a replay request as a successful action', async () => {
      mode(backend);
      const f = fixture();
      f.db.integrationDeliveryAttempt.findUnique.mockResolvedValue({
        ...f.attempt,
        state: 'DEAD_LETTER',
      });
      await expect(
        f.service.requestReplay(SUPPORT, 'key', {
          attemptId: f.attempt.id,
          reason: 'Reviewed old delivery evidence',
          declaration: true,
        }),
      ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
      expect(f.db.applicationCommand.findUnique).not.toHaveBeenCalled();
      expect(f.mutations).toEqual([]);
    });

    it('does not provision a fake ACTIVE mapping or command success', async () => {
      mode(backend);
      const f = fixture();
      await expect(
        f.service.provisionShell(ADMIN, 'key', {
          offeringId: 'offering',
          period: '2026S1',
        }),
      ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
      expect(f.mutations).toEqual([]);
      expect(f.db.$transaction).not.toHaveBeenCalled();
      expect(f.fetch).not.toHaveBeenCalled();
    });

    it.each(['draft', 'test', 'activate'])(
      'defers mapping %s before synthetic evidence or command replay',
      async (operation) => {
        mode(backend);
        const f = fixture();
        f.db.moodleMapping.findUnique.mockResolvedValue({
          id: 'mapping',
          status: 'DRAFT',
          creatorAccountId: 'different-person',
          kind: 'SHELL',
          sisType: 'OfferingPeriod',
          sisId: 'offering:2026S1',
          moodleId: 'legacy-simulator-shell',
        });
        f.db.mappingCheck.findFirst.mockResolvedValue({ result: 'PASS' });
        f.db.applicationCommand.findUnique.mockResolvedValue({
          response: { id: 'mapping', status: 'ACTIVE', result: 'PASS' },
        });
        const result =
          operation === 'draft'
            ? f.service.draftMapping(ADMIN, 'key', {
                kind: 'SHELL',
                sisType: 'OfferingPeriod',
                sisId: 'offering:2026S1',
                moodleId: 'legacy-simulator-shell',
              })
            : operation === 'test'
              ? f.service.testMapping(ADMIN, 'key', 'mapping')
              : f.service.activateMapping(ADMIN, 'key', 'mapping');
        await expect(result).resolves.toMatchObject({
          outcome: 'NOT_PROVISIONED',
          backend,
        });
        expect(f.db.applicationCommand.findUnique).not.toHaveBeenCalled();
        expect(f.mutations).toEqual([]);
        expect(f.fetch).not.toHaveBeenCalled();
      },
    );

    it('does not promote an old ACTIVE simulator mapping to live readiness', async () => {
      mode(backend);
      const f = fixture();
      f.db.moodleMapping.findUnique.mockResolvedValue({
        id: 'mapping',
        status: 'ACTIVE',
        creatorAccountId: 'different-person',
      });
      await expect(
        f.service.activateMapping(ADMIN, 'key', 'mapping'),
      ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
      expect(f.db.applicationCommand.findUnique).not.toHaveBeenCalled();
      expect(f.mutations).toEqual([]);
    });

    it('does not create or complete a reconciliation run', async () => {
      mode(backend);
      const f = fixture();
      await expect(f.service.runReconciliation(ADMIN)).resolves.toMatchObject({
        outcome: 'NOT_PROVISIONED',
        backend,
      });
      expect(f.mutations).toEqual([]);
      expect(f.db.moodleMapping.findMany).not.toHaveBeenCalled();
      expect(f.fetch).not.toHaveBeenCalled();
    });

    it.each(['REQUEUE', 'SUSPEND_ACCESS', 'ESCALATE', 'MARK_RESOLVED'])(
      'defers reconciliation action %s',
      async (action) => {
        mode(backend);
        const f = fixture();
        const input = {
          action,
          note: 'Evidence remains preserved while access is prepared.',
        };
        // An existing successful simulator command must not become live success.
        f.db.applicationCommand.findUnique.mockResolvedValue({
          key: 'key',
          accountId: ADMIN.accountId,
          action: 'ResolveReconciliationCase',
          digest: createHash('sha256')
            .update(JSON.stringify({ id: 'case', ...input }))
            .digest('hex'),
          response: f.commandResponse,
          status: 201,
        });
        await expect(
          f.service.resolveReconCase(ADMIN, 'key', 'case', input),
        ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
        expect(f.db.applicationCommand.findUnique).not.toHaveBeenCalled();
        expect(f.mutations).toEqual([]);
        expect(f.fetch).not.toHaveBeenCalled();
      },
    );

    it('does not reset retries through replay approval', async () => {
      mode(backend);
      const f = fixture();
      await expect(
        f.service.decideReplay(SUPPORT, 'key', 'replay', { approve: true }),
      ).resolves.toMatchObject({ outcome: 'NOT_PROVISIONED', backend });
      expect(f.mutations).toEqual([]);
      expect(f.attempt.attempt).toBe(3);
    });

    it.each(['retry', 'redirect'])(
      'blocks operations-queue %s without changing source/history',
      async (operation) => {
        mode(backend);
        const f = fixture();
        const before = JSON.stringify({
          event: f.events[0],
          attempt: f.attempt,
        });
        const result =
          operation === 'retry'
            ? f.queue.retryDelivery(f.attempt.id)
            : f.queue.redirectDelivery(f.attempt.id, 'sms');
        await expect(result).resolves.toMatchObject({
          outcome: 'NOT_PROVISIONED',
          backend,
        });
        expect(f.mutations).toEqual([]);
        expect(JSON.stringify({ event: f.events[0], attempt: f.attempt })).toBe(
          before,
        );
      },
    );

    it('shows zero-attempt deferred sources separately from historical attempts', async () => {
      mode(backend);
      const f = fixture();
      const result = await f.service.listDeliveries(ADMIN);
      expect(result).toMatchObject({
        writeReadiness: {
          outcome: backend === 'live-test' ? 'LIVE_READY' : 'NOT_PROVISIONED',
          backend,
        },
        deferredSources: [
          {
            outboxId: 'event-1',
            eventType: 'MoodleEnrolmentQueued',
            outcome: 'NOT_PROVISIONED',
          },
          {
            outboxId: 'event-2',
            eventType: 'MoodleEnrolmentQueued',
            outcome: 'NOT_PROVISIONED',
          },
        ],
      });
      expect(result.items).toHaveLength(1);
      expect(f.mutations).toEqual([]);
    });

    it('discloses omitted waiting sources without consuming or changing them', async () => {
      mode(backend);
      const f = fixture();
      const sources = Array.from({ length: 101 }, (_, index) => ({
        id: `waiting-source-${index}`,
        type: 'MoodleEnrolmentQueued',
        occurredAt: new Date('2026-10-07T08:00:00Z'),
      }));
      f.db.outboxEvent.findMany.mockResolvedValue(sources);
      const before = JSON.stringify(sources);
      const result = await f.service.listDeliveries(ADMIN);
      expect(result).toMatchObject({ deferredSourcesTruncated: true });
      expect(result.deferredSources).toHaveLength(100);
      expect(result.deferredSources[99].outboxId).toBe('waiting-source-99');
      expect(JSON.stringify(sources)).toBe(before);
      expect(f.mutations).toEqual([]);
    });
  },
);

describe('deferral preserves ordinary validation and simulator execution', () => {
  it('still denies a manual caller without active authority', async () => {
    mode('live-test');
    const f = fixture();
    f.db.roleAssignment.findFirst.mockResolvedValue(null);
    await expect(f.service.runReconciliation(ADMIN)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      f.service.provisionShell(ADMIN, 'key', { offeringId: 'offering' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(f.mutations).toEqual([]);
  });

  it('preserves unknown action, missing case and closed case outcomes', async () => {
    mode('live-test');
    const f = fixture();
    await expect(
      f.service.resolveReconCase(ADMIN, 'key', 'case', { action: 'UNKNOWN' }),
    ).rejects.toMatchObject({ status: 400 });
    f.db.reconciliationCase.findUnique.mockResolvedValue(null);
    await expect(
      f.service.resolveReconCase(ADMIN, 'key', 'case', { action: 'REQUEUE' }),
    ).rejects.toMatchObject({ status: 404 });
    f.db.reconciliationCase.findUnique.mockResolvedValue({
      status: 'RESOLVED',
    });
    await expect(
      f.service.resolveReconCase(ADMIN, 'key', 'case', { action: 'REQUEUE' }),
    ).rejects.toMatchObject({ status: 409 });
    expect(f.mutations).toEqual([]);
  });

  it('rejects suspension without a usable student key before deferral', async () => {
    mode('live-test');
    const f = fixture();
    f.db.reconciliationCase.findUnique.mockResolvedValue({
      id: 'case',
      status: 'OPEN',
      shellId: 'shell',
      studentId: null,
      detail: { externalKey: '' },
    });
    await expect(
      f.service.resolveReconCase(ADMIN, 'key', 'case', {
        action: 'SUSPEND_ACCESS',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(f.mutations).toEqual([]);
  });

  it('preserves missing replay and four-eyes denial before deferral', async () => {
    mode('live-test');
    const f = fixture();
    f.db.replayDecision.findUnique.mockResolvedValue(null);
    await expect(
      f.service.decideReplay(SUPPORT, 'key', 'replay', { approve: true }),
    ).rejects.toMatchObject({ status: 404 });
    f.db.replayDecision.findUnique.mockResolvedValue({
      status: 'PENDING',
      requesterAccountId: SUPPORT.accountId,
    });
    await expect(
      f.service.decideReplay(SUPPORT, 'key', 'replay', { approve: true }),
    ).rejects.toMatchObject({ status: 403 });
    expect(f.mutations).toEqual([]);
  });

  it('preserves replay request validation and closed/decline decision outcomes', async () => {
    mode('live-test');
    const f = fixture();
    const request = {
      attemptId: f.attempt.id,
      reason: 'Reviewed evidence',
      declaration: true,
    };
    await expect(
      f.service.requestReplay(SUPPORT, 'key', {
        ...request,
        declaration: false,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      f.service.requestReplay(SUPPORT, 'key', request),
    ).rejects.toMatchObject({ status: 409 });
    f.db.integrationDeliveryAttempt.findUnique.mockResolvedValue(null);
    await expect(
      f.service.requestReplay(SUPPORT, 'key', request),
    ).rejects.toMatchObject({ status: 404 });
    f.db.replayDecision.findUnique.mockResolvedValue({
      status: 'APPROVED',
      requesterAccountId: 'different-person',
    });
    await expect(
      f.service.decideReplay(SUPPORT, 'key', 'replay', { approve: true }),
    ).rejects.toMatchObject({ status: 409 });
    f.db.replayDecision.findUnique.mockResolvedValue({
      status: 'PENDING',
      requesterAccountId: 'different-person',
    });
    await expect(
      f.service.decideReplay(SUPPORT, 'key', 'replay', { approve: false }),
    ).rejects.toMatchObject({ status: 400 });
    expect(f.mutations).toEqual([]);
  });

  it('preserves mapping kind, missing mapping, separation of duties and test-required errors', async () => {
    mode('live-test');
    const f = fixture();
    await expect(
      f.service.draftMapping(ADMIN, 'key', {
        kind: 'UNKNOWN',
        sisType: 'OfferingPeriod',
        sisId: 'offering:2026S1',
        moodleId: 'shell',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      f.service.testMapping(ADMIN, 'key', 'missing'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      f.service.activateMapping(ADMIN, 'key', 'missing'),
    ).rejects.toMatchObject({ status: 404 });
    f.db.moodleMapping.findUnique.mockResolvedValue({
      id: 'mapping',
      status: 'DRAFT',
      creatorAccountId: ADMIN.accountId,
    });
    await expect(
      f.service.activateMapping(ADMIN, 'key', 'mapping'),
    ).rejects.toMatchObject({ status: 403 });
    f.db.moodleMapping.findUnique.mockResolvedValue({
      id: 'mapping',
      status: 'DRAFT',
      creatorAccountId: 'different-person',
    });
    await expect(
      f.service.activateMapping(ADMIN, 'key', 'mapping'),
    ).rejects.toMatchObject({ status: 409 });
    f.db.roleAssignment.findFirst.mockResolvedValue(null);
    await expect(
      f.service.draftMapping(ADMIN, 'key', {
        kind: 'SHELL',
        sisType: 'OfferingPeriod',
        sisId: 'offering:2026S1',
        moodleId: 'shell',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(f.mutations).toEqual([]);
  });

  it('preserves missing outbox and operations-queue outcomes', async () => {
    mode('live-test');
    const f = fixture();
    f.db.outboxEvent.findUnique.mockResolvedValue(null);
    await expect(f.service.deliverOutbox('missing')).rejects.toMatchObject({
      status: 404,
    });
    f.db.integrationDeliveryAttempt.findUnique.mockResolvedValue(null);
    await expect(f.queue.retryDelivery('missing')).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      f.queue.redirectDelivery('missing', 'sms'),
    ).rejects.toMatchObject({ status: 404 });
    expect(f.mutations).toEqual([]);
  });

  it('rechecks readiness after a source read before consuming an attempt', async () => {
    mode('simulator');
    const f = fixture();
    f.db.outboxEvent.findUnique.mockImplementation(async () => {
      mode('live-test');
      return f.events[0];
    });
    await expect(
      f.service.deliverOutbox(f.events[0].id),
    ).resolves.toMatchObject({
      outcome: 'NOT_PROVISIONED',
      backend: 'live-test',
    });
    expect(f.mutations).toEqual([]);
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it.each(['simulator', 'live-test'] as const)(
    'preserves non-Moodle retry and redirect in %s',
    async (backend) => {
      mode(backend);
      const f = fixture();
      f.db.integrationDeliveryAttempt.findUnique.mockResolvedValue({
        ...f.attempt,
        outbox: { ...f.events[0], type: 'ApplicationSubmitted' },
      });
      await f.queue.retryDelivery(f.attempt.id);
      await f.queue.redirectDelivery(f.attempt.id, 'sms');
      expect(f.db.integrationDeliveryAttempt.update).toHaveBeenCalledTimes(2);
      expect(f.db.outboxEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { payload: expect.objectContaining({ channels: ['sms'] }) },
        }),
      );
    },
  );

  it('executes the existing simulator enrolment, source acknowledgement and attempt path', async () => {
    mode('simulator');
    const f = fixture();
    await expect(f.service.deliverOutbox(f.events[0].id)).resolves.toEqual({
      outcome: 'DELIVERED',
    });
    expect(f.db.simStudentEnrolment.upsert).toHaveBeenCalled();
    expect(f.db.integrationDeliveryAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { state: 'DELIVERING', attempt: 4 } }),
    );
    expect(f.db.outboxEvent.update).toHaveBeenCalled();
    expect(f.fetch).not.toHaveBeenCalled();
  });
});
