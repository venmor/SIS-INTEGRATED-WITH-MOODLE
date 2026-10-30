import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { MoodleEntitlementService } from './moodle-entitlement.service.js';

type Overrides = {
  student?: { status: string } | null;
  course?: { status: string; registrationId: string } | null;
  registration?: { attemptId: string; periodId: string; status: string } | null;
  period?: { endDate: Date | null } | null;
  periodCode?: string;
  item?: Record<string, unknown> | null;
  mapping?: { moodleId: string } | null;
  offeringMapping?: { moodleId: string } | null;
};

function prismaWith(overrides: Overrides) {
  const mappingQueries: Record<string, unknown>[] = [];
  return {
    student: {
      findUnique: async () =>
        overrides.student === undefined
          ? { status: 'ACTIVE' }
          : overrides.student,
    },
    courseRegistration: {
      findUnique: async () =>
        overrides.course === undefined
          ? { status: 'ENROLLED', registrationId: 'reg-1' }
          : overrides.course,
    },
    institutionalRegistration: {
      findUnique: async () =>
        overrides.registration === undefined
          ? { attemptId: 'attempt-1', periodId: 'period-1', status: 'REGISTERED' }
          : overrides.registration,
    },
    academicPeriod: {
      findUnique: async () => ({
        code: overrides.periodCode ?? '2026-S1',
      }),
    },
    academicPeriodVersion: {
      findFirst: async () =>
        overrides.period === undefined
          ? { endDate: new Date(Date.now() + 86_400_000) }
          : overrides.period,
    },
    moodleProvisionRequestItem: {
      findFirst: async () =>
        overrides.item === undefined
          ? {
              id: 'item-1',
              state: 'DELIVERED',
              moodleRole: 'Student',
              validityPolicy: 'WHILE_ENROLLED',
              validUntil: null,
              shellRef: 'SHELL-1',
              request: { state: 'COMPLETED' },
            }
          : overrides.item,
    },
    moodleMapping: {
      findFirst: async (args: { where: Record<string, unknown> }) => {
        mappingQueries.push(args.where);
        // The live path looks the shell up by `offeringId:periodCode`; the
        // simulator stores the shortname and is matched directly.
        const live = args.where.sisType === 'OFFERING';
        if (live) {
          return overrides.offeringMapping === undefined
            ? null
            : overrides.offeringMapping;
        }
        return overrides.mapping === undefined ? { moodleId: '9' } : overrides.mapping;
      },
    },
    __mappingQueries: mappingQueries,
  };
}

function service(overrides: Overrides) {
  return new MoodleEntitlementService(
    prismaWith(overrides) as never,
  );
}

const input = { studentId: 'student-1', courseRegistrationId: 'course-1' };

describe('Moodle entitlement resolution', () => {
  it('grants access for a delivered item on a live registration', async () => {
    const result = await service({}).resolve(
      prismaWith({}) as never,
      input,
    );
    expect(result).toMatchObject({
      entitled: true,
      reason: 'OK',
      itemId: 'item-1',
      moodleCourseRef: '9',
    });
  });

  it('refuses a student who is no longer active', async () => {
    const result = await service({ student: { status: 'WITHDRAWN' } }).resolve(
      prismaWith({ student: { status: 'WITHDRAWN' } }) as never,
      input,
    );
    expect(result).toEqual({ entitled: false, reason: 'WITHDRAWN' });
  });

  it('refuses a dropped course registration', async () => {
    const result = await service({
      course: { status: 'DROPPED', registrationId: 'reg-1' },
    }).resolve(
      prismaWith({ course: { status: 'DROPPED', registrationId: 'reg-1' } }) as never,
      input,
    );
    expect(result).toEqual({ entitled: false, reason: 'COURSE_DROPPED' });
  });

  it('refuses a closed period even when the item was delivered', async () => {
    const result = await service({
      period: { endDate: new Date(Date.now() - 1_000) },
    }).resolve(
      prismaWith({ period: { endDate: new Date(Date.now() - 1_000) } }) as never,
      input,
    );
    expect(result).toEqual({ entitled: false, reason: 'PERIOD_CLOSED' });
  });

  it('refuses a revoked item on the very next click', async () => {
    const result = await service({
      item: {
        id: 'item-1',
        state: 'REVOKED',
        moodleRole: 'Student',
        validityPolicy: 'WHILE_ENROLLED',
        validUntil: null,
        shellRef: 'SHELL-1',
        request: { state: 'REVOKED' },
      },
    }).resolve(
      prismaWith({
        item: {
          id: 'item-1',
          state: 'REVOKED',
          moodleRole: 'Student',
          validityPolicy: 'WHILE_ENROLLED',
          validUntil: null,
          shellRef: 'SHELL-1',
          request: { state: 'REVOKED' },
        },
      }) as never,
      input,
    );
    expect(result).toMatchObject({ entitled: false, reason: 'REVOKED' });
  });

  it('refuses a policy-expired item', async () => {
    const item = {
      id: 'item-1',
      state: 'DELIVERED',
      moodleRole: 'Student',
      validityPolicy: 'THIS_PERIOD',
      validUntil: new Date(Date.now() - 1_000),
      shellRef: 'SHELL-1',
      request: { state: 'COMPLETED' },
    };
    const result = await service({ item }).resolve(
      prismaWith({ item }) as never,
      input,
    );
    expect(result).toMatchObject({ entitled: false, reason: 'EXPIRED' });
  });

  it('refuses an item that has not been delivered yet', async () => {
    const item = {
      id: 'item-1',
      state: 'QUEUED',
      moodleRole: 'Student',
      validityPolicy: 'WHILE_ENROLLED',
      validUntil: null,
      shellRef: null,
      request: { state: 'QUEUED' },
    };
    const result = await service({ item }).resolve(
      prismaWith({ item }) as never,
      input,
    );
    expect(result).toMatchObject({ entitled: false, reason: 'NOT_DELIVERED' });
  });

  it('refuses when no provisioning item exists', async () => {
    const result = await service({ item: null }).resolve(
      prismaWith({ item: null }) as never,
      input,
    );
    expect(result).toEqual({ entitled: false, reason: 'NO_ITEM' });
  });
});

describe('Moodle entitlement course resolution', () => {
  const delivered = {
    id: 'item-1',
    state: 'DELIVERED',
    moodleRole: 'Student',
    validityPolicy: 'WHILE_ENROLLED',
    validUntil: null,
    shellRef: 'DEMO-101-2026-S1',
    request: { state: 'COMPLETED' },
  };

  it('uses the offering+period shell mapping, which holds the live course id', async () => {
    const item = { ...delivered, offeringId: 'offering-1' };
    const db = prismaWith({
      item,
      mapping: null,
      offeringMapping: { moodleId: '42' },
      periodCode: '2026-S1',
    });
    const result = await new MoodleEntitlementService(db as never).resolve(
      db as never,
      input,
    );
    expect(result).toMatchObject({ entitled: true, moodleCourseRef: '42' });
    expect(db.__mappingQueries[0]).toMatchObject({
      kind: 'SHELL',
      sisType: 'OFFERING',
      sisId: 'offering-1:2026-S1',
      status: 'ACTIVE',
    });
  });

  it('matches the stored shortname for a simulator item without an offering', async () => {
    const db = prismaWith({ item: delivered });
    const result = await new MoodleEntitlementService(db as never).resolve(
      db as never,
      input,
    );
    expect(result).toMatchObject({ moodleCourseRef: '9' });
    expect(db.__mappingQueries).toEqual([
      { kind: 'SHELL', moodleId: 'DEMO-101-2026-S1', status: 'ACTIVE' },
    ]);
  });

  it('reports the shell reference when no mapping row exists yet', async () => {
    const item = { ...delivered, offeringId: 'offering-1' };
    const db = prismaWith({ item, mapping: null, offeringMapping: null });
    const result = await new MoodleEntitlementService(db as never).resolve(
      db as never,
      input,
    );
    expect(result).toMatchObject({
      entitled: true,
      reason: 'OK',
      moodleCourseRef: 'DEMO-101-2026-S1',
    });
  });
});
