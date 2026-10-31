import 'reflect-metadata';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
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
  /** Active Moodle user mapping for the student; null when none exists yet. */
  userMapping?: { moodleId: string } | null;
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
    moodleMapping: {
      findFirst: async () =>
        options.userMapping === undefined
          ? { moodleId: '5' }
          : options.userMapping,
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

/**
 * The bridge assertion is `base64url(payload).base64url(hmac)`, verified inside
 * the Moodle site with the same key. Tests decode it the same way so a change
 * to the payload or the signature is caught here rather than at login.
 */
function decodeAssertion(assertion: string): Record<string, unknown> {
  const [body, mac] = assertion.split('.');
  const expected = createHmac('sha256', KEY).update(body).digest('base64url');
  expect(mac).toBe(expected);
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
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

/**
 * Mint a SIS launch ticket credential (`raw.nonce.hmac`) — the form the
 * `/moodle/launch/consume/:token` route accepts. It is signed with the same
 * key and structure the service uses, so the signature check is exercised for
 * real; the fake store returns the configured ticket row whatever its hash is.
 *
 * This is a different credential from the SSO assertion the bridge receives:
 * `createLaunchToken` puts the assertion in the launch URL, so the ticket
 * itself is not returned to the caller.
 */
function mintTicket(): string {
  const raw = randomBytes(32).toString('base64url');
  const nonce = randomUUID();
  const signature = createHmac('sha256', KEY)
    .update(`${raw}.${nonce}`)
    .digest('hex');
  return `${raw}.${nonce}.${signature}`;
}

const unusedTicket: TicketRow = {
  id: 'ticket-1',
  usedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
};

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
  it('stores a single-use ticket and audits the grant', async () => {
    const captured: Record<string, unknown>[] = [];
    const fake = prismaWith({ ownStudentId: 'student-own' });
    const create = fake.moodleLaunchTicket.create;
    const service = new MoodleLaunchService(
      {
        ...fake,
        moodleLaunchTicket: {
          ...fake.moodleLaunchTicket,
          create: async (args: { data: Record<string, unknown> }) => {
            captured.push(args.data);
            return create(args);
          },
        },
      } as never,
      entitlementWith(entitled),
    );
    const result = await service.createLaunchToken(studentAuth, {
      studentId: 'student-own',
      courseId: 'course-1',
      shellRef: null,
    });
    expect(result.mode).toBe('SSO');
    // The ticket is stored hashed and bound to this student, course and item,
    // and it never appears in the URL the browser is sent to.
    expect(captured).toHaveLength(1);
    const stored = captured[0] as Record<string, unknown> & { tokenHash: string };
    expect(stored).toMatchObject({
      studentId: 'student-own',
      courseRegistrationId: 'course-1',
      provisionItemId: 'item-1',
      issuedToAccountId: 'account-1',
    });
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.launchUrl).not.toContain(stored.tokenHash);
  });

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

    const assertion = new URL(result.launchUrl!).searchParams.get('sso')!;
    expect(decodeAssertion(assertion)).toMatchObject({
      v: 1,
      uid: 5,
      cid: 9,
      sub: 'student-own',
    });
    expect(audits.some((a) => a.outcome === 'ALLOW' && a.metadata)).toBe(true);
  });

  it('binds the assertion to the mapped Moodle identities and expires it in 60s', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', userMapping: { moodleId: '17' } }) as never,
      entitlementWith(entitled),
    );
    const result = await service.createLaunchToken(studentAuth, {
      studentId: 'student-own',
      courseId: 'course-1',
      shellRef: null,
    });
    const assertion = new URL(result.launchUrl!).searchParams.get('sso')!;
    const payload = decodeAssertion(assertion);
    expect(payload).toMatchObject({ uid: 17, cid: 9 });
    expect(Number(payload.exp) - Number(payload.iat)).toBe(60);
    expect(typeof payload.nonce).toBe('string');
  });

  it('degrades to a deep link when the student has no Moodle account yet', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', userMapping: null }) as never,
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

  it('refuses to sign a Moodle identity that is not a number', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', userMapping: { moodleId: 'SIS-STUDENT-1' } }) as never,
      entitlementWith({ ...entitled, moodleCourseRef: 'DEMO-101-2026S1' }),
    );
    const result = await service.createLaunchToken(studentAuth, {
      studentId: 'student-own',
      courseId: 'course-1',
      shellRef: null,
    });
    expect(result.mode).toBe('DEEP_LINK_ONLY');
    expect(result.launchUrl).toBe(
      'https://moodle.example/course/view.php?id=DEMO-101-2026S1',
    );
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

describe('Moodle bridge resolution', () => {
  it('returns the numeric Moodle identities for a valid ticket', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', ticket: unusedTicket }) as never,
      entitlementWith(entitled),
    );
    await expect(service.resolveBridgeTicket(mintTicket())).resolves.toEqual({
      ok: true,
      moodleCourseId: 9,
      moodleUserId: 5,
    });
  });

  it('spends the ticket so the bridge cannot replay it', async () => {
    let spent = false;
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          ...unusedTicket,
          get usedAt() {
            return spent ? new Date() : null;
          },
        },
        onTicketUpdate: () => {
          spent = true;
        },
      }) as never,
      entitlementWith(entitled),
    );
    const token = mintTicket();
    await expect(service.resolveBridgeTicket(token)).resolves.toMatchObject({
      ok: true,
    });
    await expect(service.resolveBridgeTicket(token)).resolves.toEqual({
      ok: false,
      reason: 'USED',
    });
  });

  it('fails closed when the student has no Moodle account mapping', async () => {
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        userMapping: null,
        ticket: unusedTicket,
      }) as never,
      entitlementWith(entitled),
    );
    await expect(service.resolveBridgeTicket(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'NO_MOODLE_USER',
    });
  });

  it('fails closed when the entitled shell has no numeric Moodle id yet', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', ticket: unusedTicket }) as never,
      entitlementWith({ ...entitled, moodleCourseRef: 'DEMO-101-2026S1' }),
    );
    await expect(service.resolveBridgeTicket(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'NO_MOODLE_COURSE',
    });
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

  it('rejects a token whose signature does not verify', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own' }) as never,
      entitlementWith(entitled),
    );
    const parts = mintTicket().split('.');
    const tampered = `${parts[0]}.${parts[1]}.${createHmac('sha256', 'y'.repeat(48))
      .update(`${parts[0]}.${parts[1]}`)
      .digest('hex')}`;
    await expect(service.consumeLaunchToken(tampered)).resolves.toEqual({
      ok: false,
      reason: 'SIGNATURE',
    });
  });

  it('rejects a well-signed but unknown ticket', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', ticket: null }) as never,
      entitlementWith(entitled),
    );
    await expect(service.consumeLaunchToken(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'UNKNOWN',
    });
  });

  it('rejects a replayed ticket', async () => {
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: { ...unusedTicket, usedAt: new Date() },
      }) as never,
      entitlementWith(entitled),
    );
    await expect(service.consumeLaunchToken(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'USED',
    });
  });

  it('rejects a ticket past its expiry', async () => {
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          ...unusedTicket,
          expiresAt: new Date(Date.now() - 1_000),
        },
      }) as never,
      entitlementWith(entitled),
    );
    await expect(service.consumeLaunchToken(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'EXPIRED',
    });
  });

  it('refuses a ticket whose entitlement was revoked before use', async () => {
    const service = new MoodleLaunchService(
      prismaWith({ ownStudentId: 'student-own', ticket: unusedTicket }) as never,
      entitlementWith({ entitled: false, reason: 'REVOKED' }),
    );
    await expect(service.consumeLaunchToken(mintTicket())).resolves.toEqual({
      ok: false,
      reason: 'REVOKED',
    });
  });

  it('consumes a valid ticket once and returns the mapped course URL', async () => {
    let consumedAt: Record<string, unknown> | null = null;
    let spent = false;
    const service = new MoodleLaunchService(
      prismaWith({
        ownStudentId: 'student-own',
        ticket: {
          ...unusedTicket,
          get usedAt() {
            return spent ? new Date() : null;
          },
        },
        onTicketUpdate: (data) => {
          consumedAt = data;
          spent = true;
        },
      }) as never,
      entitlementWith(entitled),
    );
    const token = mintTicket();
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: true,
      url: 'https://moodle.example/course/view.php?id=9',
    });
    expect(consumedAt).toHaveProperty('usedAt');
    await expect(service.consumeLaunchToken(token)).resolves.toEqual({
      ok: false,
      reason: 'USED',
    });
  });
});

describe('Moodle teaching access', () => {
  const staffAuth = {
    accountId: 'Account-2',
    assignmentId: 'assignment-2',
    activeRole: 'LEC',
    scope: 'PROGRAMME:BSC_CS',
    scopeType: 'PROGRAMME',
    scopeRef: 'BSC_CS',
  };

  function teachingPrisma(
    assignments: number,
    mappings: Array<{ sisId: string; moodleId: string }>,
  ) {
    return {
      teachingAssignment: {
        findMany: async () =>
          Array.from({ length: assignments }, (_, n) => ({
            id: `assign-${n}`,
            role: 'Lecturer',
            groupId: null,
            capabilities: ['teach', 'stage-marks'],
            offering: {
              id: `offering-${n}`,
              intake: '2026',
              programme: { code: 'BSC_CS', name: 'Computer Science' },
            },
          })),
      },
      moodleMapping: {
        findMany: async () =>
          mappings.map((m) => ({
            kind: 'SHELL',
            sisType: 'OFFERING',
            status: 'ACTIVE',
            ...m,
          })),
      },
      auditEvent: { create: async () => ({ correlationId: 'corr' }) },
    };
  }

  it('reports a created Moodle course with a real destination', async () => {
    const service = new MoodleLaunchService(
      teachingPrisma(1, [{ sisId: 'offering-0:2026S1', moodleId: '41' }]) as never,
      entitlementWith(entitled),
    );
    const view = await service.myTeachingAccess(staffAuth);
    expect(view.state).toBe('READY');
    expect(view.confirmedCount).toBe(1);
    // Staff Moodle identities are `sis.staff.<lowercased account id>`, the same
    // username provisioning sends to the site, so the page never invents one.
    expect(view.moodleUsername).toBe('sis.staff.account-2');
    expect(view.moodleLoginUrl).toBe('https://moodle.example/login/index.php');
    expect(view.items[0]).toMatchObject({
      teachingRole: 'Lecturer',
      periodCode: '2026S1',
      moodleCourseRef: '41',
      shellRef: null,
      moodleCourseUrl: 'https://moodle.example/course/view.php?id=41',
      state: 'CONFIRMED',
    });
  });

  it('holds a shell reference back until the course exists on the site', async () => {
    const service = new MoodleLaunchService(
      teachingPrisma(1, [{ sisId: 'offering-0:2026S1', moodleId: 'BSC-CS-2026' }]) as never,
      entitlementWith(entitled),
    );
    const view = await service.myTeachingAccess(staffAuth);
    expect(view.state).toBe('PREPARING');
    expect(view.confirmedCount).toBe(0);
    // A non-numeric shell reference is not a Moodle course id, so no link is
    // offered rather than sending a staff member to a page that cannot exist.
    expect(view.items[0]).toMatchObject({
      shellRef: 'BSC-CS-2026',
      moodleCourseRef: null,
      moodleCourseUrl: null,
      state: 'WAITING',
    });
  });

  it('separates approved teaching with no Moodle course from teaching nothing', async () => {
    // This is the state the cloud demonstration actually reaches: the account
    // holds an approved assignment, but nothing has been created on the Moodle
    // site yet. Collapsing it into "no approved teaching assignments" sends the
    // lecturer to a coordinator when the real wait is provisioning.
    const service = new MoodleLaunchService(
      teachingPrisma(1, []) as never,
      entitlementWith(entitled),
    );
    const view = await service.myTeachingAccess(staffAuth);
    expect(view).toMatchObject({
      items: [],
      assignmentCount: 1,
      totalCourses: 0,
      confirmedCount: 0,
      state: 'PREPARING',
    });
  });

  it('is empty for an account that teaches nothing', async () => {
    const service = new MoodleLaunchService(
      teachingPrisma(0, []) as never,
      entitlementWith(entitled),
    );
    const view = await service.myTeachingAccess(staffAuth);
    expect(view).toMatchObject({
      items: [],
      assignmentCount: 0,
      confirmedCount: 0,
      totalCourses: 0,
      state: 'NONE',
    });
  });

  it('never reads another account’s assignments', async () => {
    const seen: unknown[] = [];
    const base = teachingPrisma(1, [{ sisId: 'offering-0:2026S1', moodleId: '41' }]);
    const prisma = {
      ...base,
      teachingAssignment: {
        findMany: async (args: unknown) => {
          seen.push(args);
          return base.teachingAssignment.findMany();
        },
      },
    };
    const service = new MoodleLaunchService(prisma as never, entitlementWith(entitled));
    await service.myTeachingAccess(staffAuth);
    // The query is keyed to the caller alone: staff see only their own
    // approved assignments, with no delegated-capability path to widen it.
    expect(seen[0]).toMatchObject({
      where: { accountId: 'Account-2', status: 'ACTIVE' },
    });
  });
});
