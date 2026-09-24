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
