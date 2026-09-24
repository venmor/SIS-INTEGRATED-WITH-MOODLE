import { describe, expect, it, vi } from 'vitest';
import { IntegrationService } from './integration.service.js';
import { MoodleApiError } from './moodle-live.js';

function harness() {
  let transactionDepth = 0;
  const db = {
    outboxEvent: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'outbox-1',
        type: 'MoodleEnrolmentQueued',
        payload: {},
        deliveredAt: null,
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    integrationDeliveryAttempt: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'attempt-1',
        outboxId: 'outbox-1',
        state: 'PENDING',
        attempt: 0,
      }),
      create: vi.fn().mockResolvedValue({
        id: 'attempt-1',
        outboxId: 'outbox-1',
        state: 'PENDING',
        attempt: 0,
      }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const prisma = {
    ...db,
    $transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => {
      transactionDepth += 1;
      try {
        return await callback(db);
      } finally {
        transactionDepth -= 1;
      }
    }),
  };

  const service = new IntegrationService(prisma as never);
  const internals = service as unknown as {
    simulatorMode: () => Promise<string>;
    maintenanceWindow: () => Promise<unknown>;
    routeDelivery: (...args: unknown[]) => Promise<void>;
  };
  internals.simulatorMode = vi.fn().mockResolvedValue('SUCCESS');
  internals.maintenanceWindow = vi.fn().mockResolvedValue(null);

  return {
    service,
    db,
    internals,
    transactionDepth: () => transactionDepth,
  };
}

describe('IntegrationService live configuration', () => {
  it('returns a readable failed validation for half-configured live mode', async () => {
    const oldUrl = process.env.MOODLE_API_URL;
    const oldToken = process.env.MOODLE_API_TOKEN;
    process.env.MOODLE_API_URL = 'https://moodle.example.test';
    delete process.env.MOODLE_API_TOKEN;

    const service = new IntegrationService({} as never);
    const internals = service as unknown as {
      opsRole: () => Promise<string>;
    };
    internals.opsRole = vi.fn().mockResolvedValue('MOODLE_ADMIN');

    try {
      await expect(
        service.validateConnection({
          accountId: 'account-1',
          assignmentId: 'assignment-1',
          activeRole: 'MOODLE_ADMIN',
        } as never),
      ).resolves.toMatchObject({
        backend: 'live',
        ok: false,
        version: null,
        detail: expect.stringMatching(/incomplete/i),
      });
    } finally {
      process.env.MOODLE_API_URL = oldUrl;
      process.env.MOODLE_API_TOKEN = oldToken;
    }
  });
});

describe('IntegrationService read-only live mode', () => {
  it('does not let the background worker consume queued work while live writes are disabled', async () => {
    const oldUrl = process.env.MOODLE_API_URL;
    const oldToken = process.env.MOODLE_API_TOKEN;
    const oldWrites = process.env.MOODLE_LIVE_WRITES;
    process.env.MOODLE_API_URL = 'https://moodle.example.test';
    process.env.MOODLE_API_TOKEN = 'test-token';
    process.env.MOODLE_LIVE_WRITES = 'false';

    const prisma = {
      integrationDeliveryAttempt: { findMany: vi.fn() },
      outboxEvent: { findMany: vi.fn() },
    };
    const service = new IntegrationService(prisma as never);

    try {
      await expect(service.runWorker()).resolves.toEqual({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
      });
      expect(prisma.integrationDeliveryAttempt.findMany).not.toHaveBeenCalled();
      expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
    } finally {
      process.env.MOODLE_API_URL = oldUrl;
      process.env.MOODLE_API_TOKEN = oldToken;
      process.env.MOODLE_LIVE_WRITES = oldWrites;
    }
  });
});

describe('IntegrationService live reconciliation safety', () => {
  it('reports live drift without queueing repair work while live writes are disabled', async () => {
    const oldWrites = process.env.MOODLE_LIVE_WRITES;
    process.env.MOODLE_LIVE_WRITES = 'false';

    const prisma = {
      reconciliationRun: {
        create: vi.fn().mockResolvedValue({ id: 'run-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      moodleMapping: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'mapping-1',
            sisId: 'offering-1:2026S1',
            moodleId: '42',
          },
        ]),
      },
      programmeAttempt: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'attempt-1', studentId: 'student-1' },
        ]),
      },
      courseRegistration: {
        findMany: vi.fn().mockResolvedValue([
          { registration: { attemptId: 'attempt-1' } },
        ]),
      },
      student: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'student-1', studentNumber: 'STU-1' },
        ]),
      },
      institutionalRegistration: {
        findFirst: vi.fn().mockResolvedValue({ id: 'registration-1' }),
      },
      integrationDeliveryAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      outboxEvent: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'outbox-1',
          aggregate: 'InstitutionalRegistration',
          aggregateId: 'registration-1',
          type: 'MoodleEnrolmentQueued',
          payload: { eventType: 'zm.sis.registration.enrolment-queued.v1' },
        }),
        create: vi.fn(),
      },
      tGAllocation: { findMany: vi.fn().mockResolvedValue([]) },
      reconciliationCase: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'case-1' }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };

    const service = new IntegrationService(prisma as never);
    const internals = service as unknown as {
      opsRole: () => Promise<string>;
      adapter: () => {
        backend: 'live';
        listActualEnrolments: () => Promise<unknown[]>;
        listActualGroupMembers: () => Promise<unknown[]>;
      };
    };
    internals.opsRole = vi.fn().mockResolvedValue('MOODLE_ADMIN');
    internals.adapter = vi.fn().mockReturnValue({
      backend: 'live',
      listActualEnrolments: vi.fn().mockResolvedValue([]),
      listActualGroupMembers: vi.fn().mockResolvedValue([]),
    });

    try {
      await expect(
        service.runReconciliation({
          accountId: 'account-1',
          assignmentId: 'assignment-1',
          activeRole: 'MOODLE_ADMIN',
        } as never),
      ).resolves.toMatchObject({
        diffs: 1,
        repaired: 0,
        cases: 1,
      });
      expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
      expect(prisma.integrationDeliveryAttempt.create).not.toHaveBeenCalled();
      expect(prisma.reconciliationCase.create).toHaveBeenCalled();
    } finally {
      process.env.MOODLE_LIVE_WRITES = oldWrites;
    }
  });

  it('stores the resolved live Moodle course id in the active shell mapping', async () => {
    const mapping = {
      id: 'mapping-1',
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: 'offering-1:2026S1',
      moodleId: 'SIM-SH-SWE-2026S1',
      status: 'ACTIVE',
    };
    const db = {
      programmeOffering: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'offering-1',
          intake: '2026S1',
          programme: { code: 'SWE' },
        }),
      },
      academicPeriod: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'period-1',
          code: '2026S1',
        }),
      },
      moodleMapping: {
        findFirst: vi.fn().mockResolvedValue(mapping),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ ...mapping, moodleId: '42' }),
      },
    };
    const service = new IntegrationService({} as never);
    const internals = service as unknown as {
      adapter: () => {
        backend: 'live';
        ensureShell: () => Promise<{ id: string; created: boolean }>;
      };
      shellFor: (
        tx: unknown,
        offeringId: string,
        periodCode: string,
      ) => Promise<{ id: string; ref: string }>;
    };
    internals.adapter = vi.fn().mockReturnValue({
      backend: 'live',
      ensureShell: vi.fn().mockResolvedValue({ id: '42', created: false }),
    });

    await expect(
      internals.shellFor(db, 'offering-1', '2026S1'),
    ).resolves.toEqual({
      id: '42',
      ref: 'SIM-SH-SWE-2026S1',
    });
    expect(db.moodleMapping.update).toHaveBeenCalledWith({
      where: { id: 'mapping-1' },
      data: { moodleId: '42' },
    });
  });

  it('reads shell counts from the live adapter instead of simulator tables in live mode', async () => {
    const prisma = {
      moodleMapping: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'mapping-1',
            sisId: 'offering-1:2026S1',
            moodleId: '42',
            status: 'ACTIVE',
          },
        ]),
      },
      programmeOffering: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'offering-1',
            intake: '2026S1',
            programme: { code: 'SWE' },
          },
        ]),
      },
      simShell: { findMany: vi.fn() },
    };
    const service = new IntegrationService(prisma as never);
    const internals = service as unknown as {
      moodleAdmin: () => Promise<void>;
      adapter: () => {
        backend: 'live';
        listActualEnrolments: () => Promise<Array<{ status: string }>>;
        listActualGroupMembers: () => Promise<Array<{ status: string }>>;
      };
    };
    internals.moodleAdmin = vi.fn().mockResolvedValue(undefined);
    internals.adapter = vi.fn().mockReturnValue({
      backend: 'live',
      listActualEnrolments: vi.fn().mockResolvedValue([
        { key: 'STU-1', role: 'Student', status: 'ACTIVE' },
        { key: 'STU-2', role: 'Student', status: 'ACTIVE' },
      ]),
      listActualGroupMembers: vi.fn().mockResolvedValue([
        { groupKey: 'Tutorial A', studentKey: 'STU-1', status: 'ACTIVE' },
      ]),
    });

    await expect(
      service.listShells({
        accountId: 'account-1',
        assignmentId: 'assignment-1',
        activeRole: 'MOODLE_ADMIN',
      } as never),
    ).resolves.toEqual({
      items: [
        {
          shellRef: 'SIM-SH-SWE-2026S1',
          offeringId: 'offering-1',
          periodId: '2026S1',
          status: 'ACTIVE',
          activeEnrolments: 2,
          activeGroupMembers: 1,
        },
      ],
    });
    expect(prisma.simShell.findMany).not.toHaveBeenCalled();
  });
});

describe('IntegrationService delivery lease', () => {
  it('returns stale DELIVERING claims to PENDING before scanning due work', async () => {
    const oldUrl = process.env.MOODLE_API_URL;
    const oldToken = process.env.MOODLE_API_TOKEN;
    delete process.env.MOODLE_API_URL;
    delete process.env.MOODLE_API_TOKEN;

    const prisma = {
      integrationDeliveryAttempt: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      outboxEvent: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new IntegrationService(prisma as never);
    const internals = service as unknown as {
      deliveryPaused: () => Promise<boolean>;
    };
    internals.deliveryPaused = vi.fn().mockResolvedValue(false);

    try {
      await expect(service.runWorker()).resolves.toEqual({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
      });
      expect(prisma.integrationDeliveryAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ state: 'DELIVERING' }),
          data: expect.objectContaining({ state: 'PENDING' }),
        }),
      );
    } finally {
      process.env.MOODLE_API_URL = oldUrl;
      process.env.MOODLE_API_TOKEN = oldToken;
    }
  });
});

describe('IntegrationService delivery boundary', () => {
  it('performs provider delivery outside Prisma interactive transactions', async () => {
    const h = harness();
    h.internals.routeDelivery = vi.fn(async () => {
      expect(h.transactionDepth()).toBe(0);
    });

    await expect(h.service.deliverOutbox('outbox-1')).resolves.toEqual({
      outcome: 'DELIVERED',
    });
  });

  it('reports non-retryable Moodle failures as manual review', async () => {
    const h = harness();
    h.internals.routeDelivery = vi.fn(async () => {
      throw new MoodleApiError(false, 'Moodle invalidparameter.');
    });

    await expect(h.service.deliverOutbox('outbox-1')).resolves.toEqual({
      outcome: 'MANUAL_REVIEW',
    });
    expect(h.db.integrationDeliveryAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({ state: 'MANUAL_REVIEW' }),
      }),
    );
  });
});
