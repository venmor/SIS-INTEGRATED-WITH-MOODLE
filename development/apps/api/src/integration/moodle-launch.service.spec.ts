import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { MoodleLaunchService } from './moodle-launch.service.js';
import type { Entitlement } from './moodle-entitlement.service.js';

const KEY = 'x'.repeat(48);
const BRIDGE = 'https://moodle.example/auth/sis/login.php';

const audits: Record<string, unknown>[] = [];

type TicketRow = {
  id: string;
  usedAt: Date | null;
  expiresAt: Date;
  studentId?: string;
  courseRegistrationId?: string;
  tokenHash?: string;
  provisionItemId?: string | null;
  issuedToAccountId?: string;
  createdAt?: Date;
};

function prismaWith(options: {
  ownStudentId?: string | null;
  ticket?: TicketRow | null;
  onTicketUpdate?: (data: Record<string, unknown>) => void;
} = {}) {
  return {
    account: {
      findUnique: async () => ({ personId: 'person-1' }),
    },
    student: {
      findUnique: async () =>
        options.ownStudentId === null
          ? null
          : { id: options.ownStudentId ?? 'student-own' },
    },
    auditEvent: {
      create: async (args: { data: Record<string, unknown> }) => {
        audits.push(args.data);
        return { correlationId: 'corr' };
      },
    },
    moodleLaunchTicket: {
      create: async (args: { data: Record<string, unknown> }) => ({
        id: 'ticket-1',
        usedAt: null,
        ...args.data,
      }),
      findUnique: async () => (options.ticket === undefined ? null : options.ticket),
      update: async (args: { data: Record<string, unknown> }) => {
        options.onTicketUpdate?.(args.data);
        return {};
      },
    },
  };
}

function entitlementWith(result: Entitlement) {
  return { resolve: vi.fn(async () => result) } as never;
}

const entitled: Entitlement = {
  entitled: true,
  reason: 'OK',
  itemId: 'item-1',
  moodleRole: 'Student',
  validityPolicy: 'WHILE_ENROLLED',
  validUntil: null,
  moodleCourseRef: '9',
};

const studentAuth = {
  accountId: 'account-1',
  assignmentId: 'assignment-1',
  activeRole: 'STU',
  scope: 'PROGRAMME:BSC_CS',
  scopeType: 'PROGRAMME',
  scopeRef: 'BSC_CS',
};

async function issueWithBridge(
  service: MoodleLaunchService,
): Promise<string> {
  const issued = await service.createLaunchToken(studentAuth, {
    studentId: 'student-own',
    courseId: 'course-1',
    shellRef: null,
  });
  expect(issued.ok).toBe(true);
  const url = new URL(issued.launchUrl!);
  return url.searchParams.get('sso')!;
}

beforeEach(() => {
  audits.length = 0;
  process.env.MOODLE_SSO_SIGNING_KEY = KEY;
  process.env.MOODLE_BASE_URL = 'https://moodle.example';
  process.env.MOODLE_SSO_BRIDGE_URL = BRIDGE;
});

afterEach(() => {
  delete process.env.MOODLE_SSO_SIGNING_KEY;
  delete process.env.MOODLE_BASE_URL;
  delete process.env.MOODLE_SSO_BRIDGE_URL;
});

describe('Moodle launch issue', () => {
  it('issues an SSO bridge link for the student own course', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    const result = await service.createLaunchToken(studentAuth, {
      studentId: 'student-own',
      courseId: 'course-1',
      shellRef: null,
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('SSO');
    expect(result.launchUrl).toMatch(/^https:\/\/moodle\.example\/auth\/sis\/login\.php\?sso=/);
    expect(audits.some((a) => a.outcome === 'ALLOW')).toBe(true);
  });

  it('falls back to an honest deep link when no SSO bridge is configured', async () => {
    delete process.env.MOODLE_SSO_BRIDGE_URL;
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    const result = await service.createLaunchToken(studentAuth, {
      studentId: 'student-own',
      courseId: 'course-1',
      shellRef: null,
    });
    expect(result.mode).toBe('DEEP_LINK_ONLY');
    expect(result.launchUrl).toBe('https://moodle.example/course/view.php?id=9');
  });

  it('refuses a student launching another student record', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    await expect(
      service.createLaunchToken(studentAuth, {
        studentId: 'student-other',
        courseId: 'course-1',
        shellRef: null,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(audits.some((a) => a.outcome === 'DENY')).toBe(true);
  });

  it('refuses when entitlement fails and audits the reason', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith({ entitled: false, reason: 'REVOKED' }),
    );
    const error = await service
      .createLaunchToken(studentAuth, {
        studentId: 'student-own',
        courseId: 'course-1',
        shellRef: null,
      })
      .catch((e) => e as HttpException);
    expect((error as HttpException).getStatus()).toBe(403);
    expect(audits.some((a) => a.reason === 'REVOKED')).toBe(true);
  });

  it('requires a configured signing key instead of inventing one', async () => {
    delete process.env.MOODLE_SSO_SIGNING_KEY;
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    await expect(
      service.createLaunchToken(studentAuth, {
        studentId: 'student-own',
        courseId: 'course-1',
        shellRef: null,
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe('Moodle launch consume', () => {
  it('rejects malformed tokens without touching storage', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    await expect(service.consumeLaunchToken('not-a-token')).resolves.toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });

  it('rejects a well-signed but unknown ticket', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', ticket: null }) as never,
      entitlementWith(entitled),
    );
    const token = await issueWithBridge(service);
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: false,
      reason: 'UNKNOWN',
    });
  });

  it('rejects a replayed ticket', async () => {
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          id: 'ticket-1',
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        },
      }) as never,
      entitlementWith(entitled),
    );
    const token = await issueWithBridge(service);
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: false,
      reason: 'USED',
    });
  });

  it('refuses a ticket whose entitlement was revoked before use', async () => {
    const entitlement = {
      resolve: vi
        .fn()
        .mockResolvedValueOnce(entitled)
        .mockResolvedValueOnce({ entitled: false, reason: 'REVOKED' }),
    } as never;
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          id: 'ticket-1',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        },
      }) as never,
      entitlement,
    );
    const token = await issueWithBridge(service);
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: false,
      reason: 'REVOKED',
    });
  });

  it('consumes a valid ticket once and returns the mapped course URL', async () => {
    let consumedAt: Record<string, unknown> | null = null;
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          id: 'ticket-1',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        },
        onTicketUpdate: (data) => {
          consumedAt = data;
        },
      }) as never,
      entitlementWith(entitled),
    );
    const token = await issueWithBridge(service);
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: true,
      url: 'https://moodle.example/course/view.php?id=9',
    });
    expect(consumedAt).toHaveProperty('usedAt');
  });
});
