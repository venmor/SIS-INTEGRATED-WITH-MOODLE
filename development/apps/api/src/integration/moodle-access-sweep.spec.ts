import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { MoodleProvisionService } from './moodle-provision.service.js';
import { sweepIntervalToCron } from './moodle-access-sweep.service.js';

type Item = {
  id: string;
  requestId: string;
  studentId: string;
  courseRegistrationId: string | null;
};

type Overrides = {
  expired?: Item[];
  batch?: Item[];
  student?: { status: string } | null;
  course?: { status: string; registrationId: string } | null;
  registration?: { status: string } | null;
  request?: { revokedAt: Date | null } | null;
  claimWins?: boolean;
  liveItems?: number;
};

function harness(overrides: Overrides = {}) {
  const calls = {
    outbox: [] as Array<{ type: string; payload: Record<string, unknown> }>,
    audits: [] as Array<Record<string, unknown>>,
    itemUpdates: [] as Array<Record<string, unknown>>,
    requestUpdates: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    moodleProvisionRequestItem: {
      findMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
        // The expiry pass filters on validUntil; the drift pass does not.
        return 'validUntil' in args.where ? (overrides.expired ?? []) : (overrides.batch ?? []);
      }),
      updateMany: vi.fn(async (args: { data: Record<string, unknown> }) => {
        calls.itemUpdates.push(args.data);
        return { count: overrides.claimWins === false ? 0 : 1 };
      }),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        calls.itemUpdates.push(args.data);
        return {};
      }),
      count: vi.fn(async () => overrides.liveItems ?? 0),
    },
    moodleProvisionRequest: {
      findUnique: vi.fn(async () =>
        overrides.request === undefined ? { revokedAt: null } : overrides.request,
      ),
      updateMany: vi.fn(async (args: { data: Record<string, unknown> }) => {
        calls.requestUpdates.push(args.data);
        return { count: 1 };
      }),
    },
    outboxEvent: {
      create: vi.fn(async (args: { data: { type: string; payload: Record<string, unknown> } }) => {
        calls.outbox.push(args.data);
        return {};
      }),
    },
    auditEvent: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        calls.audits.push(args.data);
        return { correlationId: 'corr-1' };
      }),
    },
    student: {
      findUnique: vi.fn(async () =>
        overrides.student === undefined ? { status: 'ACTIVE' } : overrides.student,
      ),
    },
    courseRegistration: {
      findUnique: vi.fn(async () =>
        overrides.course === undefined
          ? { status: 'ENROLLED', registrationId: 'reg-1' }
          : overrides.course,
      ),
    },
    institutionalRegistration: {
      findUnique: vi.fn(async () =>
        overrides.registration === undefined ? { status: 'REGISTERED' } : overrides.registration,
      ),
    },
    $transaction: vi.fn(async (fn: (db: unknown) => Promise<unknown>) => fn(prisma)),
  };

  const provision = new MoodleProvisionService(
    prisma as never,
    {} as never,
    {} as never,
  );
  return { provision, prisma, calls };
}

const item = (id: string): Item => ({
  id,
  requestId: 'req-1',
  studentId: 'student-1',
  courseRegistrationId: 'course-1',
});

describe('Moodle access sweep', () => {
  it('revokes an item whose validity window has ended', async () => {
    const { provision, calls } = harness({ expired: [item('item-1')], liveItems: 0 });

    const result = await provision.sweepExpiredAccess({ now: new Date('2026-12-01T00:00:00Z') });

    expect(result).toMatchObject({ expired: 1, revoked: 1, corrected: 0 });
    expect(calls.itemUpdates[0]).toMatchObject({
      state: 'REVOKED',
      revokeReason: 'access-period-ended',
    });
    expect(calls.outbox[0]?.type).toBe('MoodleProvisionRevoked');
    expect(calls.outbox[0]?.payload.idempotencyKey).toBe('req-1:item-1:revoke');
    expect(calls.audits[0]).toMatchObject({
      action: 'CMD-Moodle-AccessSweep',
      reason: 'access-period-ended',
    });
    // Nothing live remains, so the parent request is withdrawn too.
    expect(calls.requestUpdates[0]).toMatchObject({ state: 'REVOKED' });
  });

  it('revokes a delivered item when the course is dropped in the SIS', async () => {
    const { provision, calls } = harness({
      expired: [],
      batch: [item('item-2')],
      course: { status: 'DROPPED', registrationId: 'reg-1' },
    });

    const result = await provision.sweepExpiredAccess({ now: new Date('2026-12-01T00:00:00Z') });

    expect(result).toMatchObject({ expired: 0, checked: 1, revoked: 0, corrected: 1 });
    expect(calls.itemUpdates[0]).toMatchObject({
      state: 'REVOKED',
      revokeReason: 'course-dropped',
    });
    expect(calls.outbox).toHaveLength(1);
  });

  it('revokes when the student is no longer active', async () => {
    const { provision, calls } = harness({
      expired: [],
      batch: [item('item-3')],
      student: { status: 'GRADUATED' },
    });

    const result = await provision.sweepExpiredAccess({});

    expect(result.corrected).toBe(1);
    expect(calls.itemUpdates[0]?.revokeReason).toBe('student-inactive');
  });

  it('revokes when the institutional registration is no longer registered', async () => {
    const { provision, calls } = harness({
      expired: [],
      batch: [item('item-4')],
      registration: { status: 'WITHDRAWN' },
    });

    const result = await provision.sweepExpiredAccess({});

    expect(result.corrected).toBe(1);
    expect(calls.itemUpdates[0]?.revokeReason).toBe('registration-closed');
  });

  it('leaves a healthy item alone and records the check time', async () => {
    const { provision, calls } = harness({ expired: [], batch: [item('item-5')] });

    const result = await provision.sweepExpiredAccess({ now: new Date('2026-12-01T00:00:00Z') });

    expect(result).toMatchObject({ revoked: 0, corrected: 0, checked: 1 });
    expect(calls.outbox).toHaveLength(0);
    expect(calls.audits).toHaveLength(0);
    expect(calls.itemUpdates[0]).toMatchObject({ lastCheckedAt: new Date('2026-12-01T00:00:00Z') });
  });

  it('never double-writes when another sweep already claimed the item', async () => {
    const { provision, calls } = harness({
      expired: [item('item-6')],
      claimWins: false,
    });

    const result = await provision.sweepExpiredAccess({});

    expect(result.revoked).toBe(0);
    expect(calls.outbox).toHaveLength(0);
    expect(calls.audits).toHaveLength(0);
  });

  it('does not revoke when the parent request was withdrawn manually', async () => {
    const { provision, calls } = harness({
      expired: [],
      batch: [item('item-7')],
      request: { revokedAt: new Date() },
    });

    const result = await provision.sweepExpiredAccess({});

    expect(result.corrected).toBe(1);
    expect(calls.itemUpdates[0]?.revokeReason).toBe('request-withdrawn');
  });
});

describe('sweep interval scheduling', () => {
  it('accepts a bounded cadence', () => {
    expect(sweepIntervalToCron(15)).toBe('*/15 * * * *');
    expect(sweepIntervalToCron(5)).toBe('*/5 * * * *');
    expect(sweepIntervalToCron(59)).toBe('*/59 * * * *');
  });

  it('falls back to the default for out-of-range or invalid cadences', () => {
    expect(sweepIntervalToCron(0)).toBe('*/15 * * * *');
    expect(sweepIntervalToCron(60)).toBe('*/15 * * * *');
    expect(sweepIntervalToCron(7.5)).toBe('*/15 * * * *');
    expect(sweepIntervalToCron(Number.NaN)).toBe('*/15 * * * *');
  });
});
