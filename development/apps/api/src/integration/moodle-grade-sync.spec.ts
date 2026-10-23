import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoodleGradeSyncService } from './moodle-grade-sync.service.js';

type Feed = unknown;

function harness(options?: {
  feed?: Feed;
  feedStatus?: number;
  mapping?: { id: string } | null;
  stageError?: Error;
}) {
  const audits: Array<Record<string, unknown>> = [];
  const staged: Array<Record<string, unknown>> = [];

  const prisma = {
    gradeActivityMapping: {
      findFirst: vi.fn(async () => (options?.mapping === undefined ? { id: 'mapping-1' } : options.mapping)),
    },
    auditEvent: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        audits.push(args.data);
        return { correlationId: 'corr-1' };
      }),
    },
  };

  const provision = {
    assertCapability: vi.fn(async () => undefined),
  };

  const assessment = {
    stageBatchFromSource: vi.fn(async (input: Record<string, unknown>) => {
      if (options?.stageError) throw options.stageError;
      staged.push(input);
      return { body: { id: `batch-${staged.length}` } };
    }),
  };

  const scheduler = {
    addCronJob: vi.fn(),
    deleteCronJob: vi.fn(),
    getCronJobs: () => new Map(),
  };

  const service = new MoodleGradeSyncService(
    prisma as never,
    provision as never,
    assessment as never,
    scheduler as never,
  );
  return { service, prisma, provision, assessment, audits, staged };
}

const authority = {
  accountId: 'account-1',
  activeRole: 'LECTURER',
  assignmentId: 'assignment-1',
  scopeType: 'PROGRAMME',
  scopeRef: 'BSC_CS',
} as never;

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MOODLE_GRADE_AUTO_SYNC;
  delete process.env.MOODLE_GRADE_FEED_URL;
  delete process.env.MOODLE_GRADE_SYNC_MINUTES;
});

describe('Moodle grade passback guardrails', () => {
  it('is off unless the automatic flag is set', () => {
    const { service } = harness();
    expect(service.status()).toEqual({ autoSync: false, feedConfigured: false });
  });

  it('does not start the scheduled job without the flag', () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    const { service } = harness();
    const scheduler = (service as unknown as { scheduler: { addCronJob: ReturnType<typeof vi.fn> } }).scheduler;
    service.onModuleInit();
    expect(scheduler.addCronJob).not.toHaveBeenCalled();
  });

  it('requires the grade-sync capability for a manual run', async () => {
    const { service, provision } = harness();
    provision.assertCapability.mockRejectedValueOnce(new Error('CAPABILITY_REQUIRED'));
    await expect(service.runForActor(authority)).rejects.toThrow('CAPABILITY_REQUIRED');
  });

  it('fails closed when no feed is configured', async () => {
    const { service, assessment } = harness();
    const result = await service.runForActor(authority);
    expect(result).toMatchObject({ status: 'FEED_NOT_CONFIGURED' });
    expect(assessment.stageBatchFromSource).not.toHaveBeenCalled();
  });

  it('changes nothing when the source is unreachable', async () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    vi.stubGlobal('fetch', vi.fn(async () => null));
    const { service, assessment, audits } = harness();
    const result = await service.runForActor(authority);
    expect(result).toMatchObject({ status: 'SOURCE_UNAVAILABLE' });
    expect(assessment.stageBatchFromSource).not.toHaveBeenCalled();
    expect(audits).toHaveLength(0);
  });

  it('stages a batch through the mapping and audits the run', async () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          batches: [
            {
              courseRef: 'CS101',
              activityRef: 'assign-1',
              revision: 'rev-7',
              grades: [{ studentRef: '2023001234', rawValue: 87 }],
            },
          ],
        }),
      })),
    );
    const { service, staged, audits } = harness();

    const result = await service.runForActor(authority);

    expect(result).toMatchObject({ status: 'COMPLETED', batches: 1, staged: 1, failed: 0 });
    expect(staged[0]).toMatchObject({
      mappingId: 'mapping-1',
      sourceRevision: 'CS101:assign-1:rev-7',
      lines: [{ studentRef: '2023001234', rawValue: 87 }],
    });
    expect(audits[0]).toMatchObject({ action: 'CMD-Moodle-GradeSync', outcome: 'ALLOW' });
  });

  it('skips batches without an ACTIVE mapping instead of inventing one', async () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          batches: [
            { courseRef: 'CS101', activityRef: 'assign-9', revision: 'r1', grades: [{ studentRef: '1' }] },
          ],
        }),
      })),
    );
    const { service, staged } = harness({ mapping: null });

    const result = await service.runForActor(authority);

    expect(result).toMatchObject({ batches: 1, staged: 0, skipped: 1 });
    expect(staged).toHaveLength(0);
  });

  it('reports a staging failure without stopping the remaining batches', async () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          batches: [
            { courseRef: 'CS101', activityRef: 'a1', revision: 'r1', grades: [{ studentRef: '1', rawValue: 1 }] },
            { courseRef: 'CS101', activityRef: 'a2', revision: 'r2', grades: [{ studentRef: '2', rawValue: 2 }] },
          ],
        }),
      })),
    );
    const { service, assessment } = harness();
    assessment.stageBatchFromSource
      .mockRejectedValueOnce(
        Object.assign(new Error('The Moodle source is unreachable.'), {
          response: { code: 'SOURCE_UNAVAILABLE' },
        }),
      )
      .mockResolvedValueOnce({ body: { id: 'batch-2' } });

    const result = await service.runForActor(authority);

    expect(result).toMatchObject({ batches: 2, staged: 1, failed: 1 });
    expect((result as { results: Array<{ reason?: string }> }).results[0]?.reason).toBe(
      'SOURCE_UNAVAILABLE',
    );
  });

  it('never calls validation or publication', async () => {
    process.env.MOODLE_GRADE_FEED_URL = 'http://feed.invalid';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          batches: [{ courseRef: 'CS101', activityRef: 'a1', revision: 'r1', grades: [{ studentRef: '1' }] }],
        }),
      })),
    );
    const { service, assessment } = harness();
    const published = vi.fn();
    (assessment as Record<string, unknown>).validateBatch = published;
    (assessment as Record<string, unknown>).releasePackage = published;

    await service.runForActor(authority);

    expect(published).not.toHaveBeenCalled();
  });
});
