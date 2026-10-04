import { HttpException } from '@nestjs/common';
import { MOODLE_LIVE_V1 } from '@sis/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../identity-access/prisma.service.js';
import { IntegrationService } from './integration.service.js';
import { LiveMoodleAdapter } from './moodle-live.js';
import type { LiveTestRefusalCode } from './moodle-live-config.js';
import { SimulatorAdapter } from './moodle-sim-adapter.js';

/**
 * R19 — the three `integration.service.ts` call sites that consume the
 * `BackendSelection` object union.
 *
 * Each of the three has one behaviour under test here, and each behaviour
 * is a refusal: a `live-test-disabled` selection must not become a
 * `SimulatorAdapter`, must not let a simulator scenario be written, and
 * must not be reported as `simulator` over `@Get('health')`. The
 * simulator and live-test branches are tested too, so that a
 * refuse-everything implementation cannot pass.
 *
 * Every literal below is an example-zone placeholder, byte-identical to
 * the fixtures in `moodle-live-config.spec.ts`: `moodle.example.edu` is a
 * reserved documentation domain, and the site id, release, role ids,
 * category id, run id, fingerprint and token are invented. None of them is
 * a claim about a real Moodle target.
 */
const EXAMPLE_TOKEN = 'test-token-never-real-0000';
const EXAMPLE_DB_FINGERPRINT = '0123456789abcdef'.repeat(4);

/** Every `MOODLE_LIVE_V1.requiredEnv` variable at a valid example-zone
 *  value, plus the demo flag. Each test breaks one or two variables, so a
 *  refusal list it asserts is attributable to those variables alone. */
function validEnv(): NodeJS.ProcessEnv {
  return {
    DEMO_MODE: 'true',
    MOODLE_INTEGRATION_MODE: 'live-test',
    MOODLE_API_URL: 'https://moodle.example.edu',
    MOODLE_API_TOKEN: EXAMPLE_TOKEN,
    MOODLE_ALLOWED_HOST: 'moodle.example.edu',
    MOODLE_EXPECTED_SITE_ID: '2',
    MOODLE_EXPECTED_VERSION: '4.5.6',
    MOODLE_ROLE_IDS: '{"Student":5,"Tutor":6,"Non-editing tutor":7}',
    MOODLE_CATEGORY_ID: '1',
    MOODLE_COURSE_VISIBLE: '0',
    MOODLE_LIVE_TEST_RUN_ID: 'run-example-0001',
    MOODLE_LIVE_TEST_DB_FINGERPRINT: EXAMPLE_DB_FINGERPRINT,
    MOODLE_LIVE_TEST_COHORT_PREFIX: 'SIS-MOODLE-LIVE-TEST-',
  };
}

/** Two variables broken, so the refusal list is a set of exactly two. */
function disabledEnv(): NodeJS.ProcessEnv {
  return {
    ...validEnv(),
    // A leading zero is refused rather than rewritten to `2`.
    MOODLE_EXPECTED_SITE_ID: '02',
    MOODLE_CATEGORY_ID: 'not-a-number',
  };
}

const REFUSAL_CODES: LiveTestRefusalCode[] = [
  'SITE_ID_INVALID',
  'CATEGORY_INVALID',
];

/** The environment keys this suite reads, so `beforeEach`/`afterEach` can
 *  clear and restore exactly those and nothing else in `process.env`. */
const ENV_KEYS = ['DEMO_MODE', ...MOODLE_LIVE_V1.requiredEnv] as readonly string[];

function applyEnv(env: NodeJS.ProcessEnv): void {
  for (const key of ENV_KEYS) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** The keys `connectionHealth` is allowed to put in a response body. A
 *  `descriptor` key, or any other unexpected key, fails the assertion: the
 *  point of the projection is that there is no room for one. */
const ALLOWED_HEALTH_KEYS = new Set([
  'provider',
  'backend',
  'version',
  'status',
  'detail',
  'reasons',
  'lastCheckedAt',
]);

/** Values that live in a `LiveTestDescriptor` and must never reach a
 *  health response, an error message, or a thrown body's JSON. */
const FORBIDDEN_VALUES = [
  EXAMPLE_TOKEN,
  'https://moodle.example.edu',
  'moodle.example.edu',
  'run-example-0001',
  EXAMPLE_DB_FINGERPRINT,
];

/** Every own property name at any depth, enumerable or not. A descriptor
 *  reached through a response body would show up here as `descriptor` and
 *  as `token`, which is a sharper claim than "the serialised JSON has no
 *  token in it": the descriptor's `token` is non-enumerable, so only an
 *  own-property walk can prove the credential is unreachable rather than
 *  merely unprinted. */
function propertyNames(value: unknown, seen = new Set<unknown>()): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);
  const own = Object.getOwnPropertyNames(value);
  return own.flatMap((name) => [
    name,
    ...propertyNames((value as Record<string, unknown>)[name], seen),
  ]);
}

/** Runs `fn` and returns whatever it threw. A call that returns normally
 *  fails the test instead of passing it silently. */
async function capture(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a refusal, but the call returned normally');
}

function prismaDouble() {
  const connection = {
    id: 'conn-1',
    provider: 'MOODLE-SIM-v1',
    status: 'HEALTHY',
    capabilities: {},
    lastCheckedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const double = {
    roleAssignment: { findFirst: vi.fn(async () => ({ id: 'ra-1' })) },
    moodleConnection: {
      findUnique: vi.fn(async () => connection),
      create: vi.fn(async () => connection),
      update: vi.fn(async () => connection),
    },
    moodleMaintenance: { findFirst: vi.fn(async () => null) },
    integrationIncident: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 'inc-1' })),
    },
    auditEvent: { create: vi.fn(async () => ({ id: 'audit-1' })) },
  };
  return { double, prisma: double as unknown as PrismaService };
}

const AUTH = {
  accountId: 'acct-1',
  assignmentId: 'ra-1',
  activeRole: 'MOODLE_ADMIN',
  scope: 'INTEGRATION:conn-1',
};

/** Stubs `fetch` and records every call. The live health path must make
 *  exactly one, and the simulator and refused paths must make none; no
 *  test here opens a socket. */
function stubFetch(): { calls: string[] } {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown) => {
      calls.push(String(input));
      return {
        ok: true,
        status: 200,
        json: async () => ({ version: '4.5.6', sitename: 'Example Moodle' }),
      } as unknown as Response;
    }),
  );
  return { calls };
}

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  applyEnv(saved);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('IntegrationService.adapter refuses a disabled live-test', () => {
  it('returns SimulatorAdapter for the simulator selection', () => {
    applyEnv({ MOODLE_INTEGRATION_MODE: 'simulator' });
    const { prisma } = prismaDouble();
    const adapter = new IntegrationService(prisma).adapter();
    expect(adapter).toBeInstanceOf(SimulatorAdapter);
    expect(adapter.backend).toBe('simulator');
  });

  it('returns LiveMoodleAdapter for a valid live-test selection', () => {
    applyEnv(validEnv());
    const { prisma } = prismaDouble();
    const adapter = new IntegrationService(prisma).adapter();
    expect(adapter).toBeInstanceOf(LiveMoodleAdapter);
    expect(adapter.backend).toBe('live-test');
  });

  it('throws instead of returning SimulatorAdapter when live-test is refused', async () => {
    applyEnv(disabledEnv());
    const { prisma } = prismaDouble();
    const error = await capture(() => new IntegrationService(prisma).adapter());
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;
    const body = exception.getResponse() as Record<string, unknown>;
    expect(exception.getStatus()).toBe(503);
    expect(body.code).toBe('LIVE_BACKEND_REFUSED');
    // Exactly the two broken variables, not a sample and not a superset.
    expect([...(body.reasons as LiveTestRefusalCode[])].sort()).toEqual(
      [...REFUSAL_CODES].sort(),
    );
    expect(body.saved).toBe(false);
    expect(typeof body.supportReference).toBe('string');
  });

  it('carries no token, URL or other environment value in the refusal', async () => {
    applyEnv(disabledEnv());
    const { prisma } = prismaDouble();
    const error = await capture(() => new IntegrationService(prisma).adapter());
    const exception = error as HttpException;
    const body = exception.getResponse() as Record<string, unknown>;
    const surface = [
      exception.message,
      JSON.stringify(body),
      String(exception.getStatus()),
    ].join('\n');
    for (const value of FORBIDDEN_VALUES) {
      expect(surface, `refusal leaked ${value.slice(0, 24)}`).not.toContain(
        value,
      );
    }
    // No descriptor, and no reason code carrying a value either.
    expect(Object.keys(body).sort()).toEqual([
      'code',
      'message',
      'nextAction',
      'reasons',
      'saved',
      'supportReference',
    ]);
  });
});

describe('IntegrationService.setSimulatorMode refuses a disabled live-test', () => {
  it('still sets a simulator scenario for the simulator selection', async () => {
    applyEnv({ DEMO_MODE: 'true', MOODLE_INTEGRATION_MODE: 'simulator' });
    const { double, prisma } = prismaDouble();
    const out = await new IntegrationService(prisma).setSimulatorMode(
      AUTH,
      'SUCCESS',
    );
    expect(out).toMatchObject({ provider: 'MOODLE-SIM-v1', scenario: 'SUCCESS' });
    expect(double.moodleConnection.update).toHaveBeenCalledTimes(1);
    expect(double.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it('still refuses the simulator controls for a live-test selection', async () => {
    applyEnv(validEnv());
    const { double, prisma } = prismaDouble();
    const error = await capture(() =>
      new IntegrationService(prisma).setSimulatorMode(AUTH, 'SUCCESS'),
    );
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;
    const body = exception.getResponse() as Record<string, unknown>;
    expect(exception.getStatus()).toBe(400);
    expect(body.code).toBe('LIVE_BACKEND');
    expect(body.message).toBe(
      'Simulator controls do not apply to a live connection.',
    );
    // A live backend is refused without a reason list: nothing was invalid.
    expect(body.reasons).toBeUndefined();
    expect(double.moodleConnection.update).not.toHaveBeenCalled();
    expect(double.auditEvent.create).not.toHaveBeenCalled();
  });

  it('refuses to write a scenario when live-test is refused, and writes nothing', async () => {
    applyEnv(disabledEnv());
    const { double, prisma } = prismaDouble();
    const error = await capture(() =>
      new IntegrationService(prisma).setSimulatorMode(AUTH, 'SUCCESS'),
    );
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;
    const body = exception.getResponse() as Record<string, unknown>;
    expect(exception.getStatus()).toBe(400);
    expect(body.code).toBe('LIVE_BACKEND');
    // The message must name the refusal, not pretend the backend is live.
    expect(body.message).not.toBe(
      'Simulator controls do not apply to a live connection.',
    );
    expect(body.message).toMatch(/not configured/i);
    expect([...(body.reasons as LiveTestRefusalCode[])].sort()).toEqual(
      [...REFUSAL_CODES].sort(),
    );
    // The refusal is the whole point: no scenario reaches the database.
    expect(double.moodleConnection.update).not.toHaveBeenCalled();
    expect(double.moodleConnection.create).not.toHaveBeenCalled();
    expect(double.auditEvent.create).not.toHaveBeenCalled();
    expect(double.integrationIncident.create).not.toHaveBeenCalled();
    const surface = `${exception.message}\n${JSON.stringify(body)}`;
    for (const value of FORBIDDEN_VALUES) {
      expect(surface, `refusal leaked ${value.slice(0, 24)}`).not.toContain(
        value,
      );
    }
  });
});

describe('IntegrationService.connectionHealth projects the selection', () => {
  it('reports the simulator as the simulator', async () => {
    applyEnv({ MOODLE_INTEGRATION_MODE: 'simulator' });
    const { calls } = stubFetch();
    const { prisma } = prismaDouble();
    const body = await new IntegrationService(prisma).connectionHealth(AUTH);
    expect(body).toMatchObject({
      provider: 'MOODLE-SIM-v1',
      backend: 'simulator',
      version: 'MOODLE-SIM-v1',
      status: 'HEALTHY',
    });
    expect(body).not.toHaveProperty('reasons');
    expect(calls, 'the simulator must not call Moodle').toEqual([]);
  });

  it('performs the live call for a live-test selection and reports live-test', async () => {
    applyEnv(validEnv());
    const { calls } = stubFetch();
    const { prisma } = prismaDouble();
    const body = await new IntegrationService(prisma).connectionHealth(AUTH);
    expect(body).toMatchObject({
      backend: 'live-test',
      version: '4.5.6',
      status: 'HEALTHY',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('wsfunction=core_webservice_get_site_info');
  });

  it('reports the refusal, makes no Moodle call, and never says simulator', async () => {
    applyEnv(disabledEnv());
    const { calls } = stubFetch();
    const { prisma } = prismaDouble();
    const service = new IntegrationService(prisma);
    const adapter = vi.spyOn(service, 'adapter');
    const body = await service.connectionHealth(AUTH);
    expect(body.backend).toBe('live-test-disabled');
    expect(body.backend).not.toBe('simulator');
    expect(body.status).toBe('Failing');
    expect(body.version).toBeNull();
    expect([...(body.reasons as LiveTestRefusalCode[])].sort()).toEqual(
      [...REFUSAL_CODES].sort(),
    );
    // A refused configuration names no target, so nothing is contacted and
    // no adapter is even built.
    expect(calls).toEqual([]);
    expect(adapter).not.toHaveBeenCalled();
  });

  it('leaks no descriptor, token or target value on any of the three paths', async () => {
    // Live-test first: it is the only path that ever holds a descriptor, so
    // it is the only one that can leak a token. The value assertions run
    // before the structural allowlist so that a leak is reported as a leak
    // rather than as a stray key.
    const cases: [string, NodeJS.ProcessEnv][] = [
      ['live-test', validEnv()],
      ['live-test-disabled', disabledEnv()],
      ['simulator', { MOODLE_INTEGRATION_MODE: 'simulator' }],
    ];
    for (const [label, env] of cases) {
      applyEnv(env);
      stubFetch();
      const { prisma } = prismaDouble();
      const body = await new IntegrationService(prisma).connectionHealth(AUTH);
      // 1. The credential is not reachable as a property at any depth.
      //    `token` is asserted first, and would fire before `descriptor`,
      //    so this is not vacuous: it proves the walk does reach a
      //    descriptor's non-enumerable `token` when one is present.
      const names = propertyNames(body);
      expect(
        names,
        `health exposed a token on the ${label} path`,
      ).not.toContain('token');
      expect(
        names,
        `health exposed a descriptor on the ${label} path`,
      ).not.toContain('descriptor');
      // 2. No configured target value is printed.
      const surface = JSON.stringify(body);
      for (const value of FORBIDDEN_VALUES) {
        expect(
          surface,
          `health leaked ${value.slice(0, 24)} on the ${label} path`,
        ).not.toContain(value);
      }
      // 3. No room for an extra field either.
      for (const key of Object.keys(body)) {
        expect(
          ALLOWED_HEALTH_KEYS.has(key),
          `unexpected health key ${key} on the ${label} path`,
        ).toBe(true);
      }
    }
  });
});
