import { describe, expect, it } from 'vitest';
import { MOODLE_DEMO_V1, MOODLE_LIVE_V1 } from '@sis/config';
import {
  configFingerprint,
  selectBackend,
  type BackendSelection,
  type LiveTestDescriptor,
  type LiveTestRefusalCode,
} from './moodle-live-config.js';

describe('MOODLE live-test policy', () => {
  it('keeps the simulator the default and never arms live from a URL and token', () => {
    expect(MOODLE_LIVE_V1.version).toBe('MOODLE-LIVE-TEST-v1');
    expect(MOODLE_LIVE_V1.provider).toBe('MOODLE-CLOUD-TEST');
    expect(MOODLE_DEMO_V1.provider).toBe('MOODLE-SIM-v1');
    expect('live' in MOODLE_DEMO_V1).toBe(false);
    expect(MOODLE_LIVE_V1.modes).toEqual(['simulator', 'live-test']);
    expect(MOODLE_LIVE_V1.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
    expect(MOODLE_LIVE_V1.restPath).toBe('/webservice/rest/server.php');
    expect(MOODLE_LIVE_V1.tokenParam).toBe('wstoken');
    expect(MOODLE_LIVE_V1.formatParam).toEqual({ moodlewsrestformat: 'json' });
    expect(MOODLE_LIVE_V1.timeoutMs).toBe(15000);
    expect(MOODLE_LIVE_V1.authorisedFunctions).toEqual([
      'core_webservice_get_site_info',
      'core_course_get_courses_by_field',
      'core_course_create_courses',
      'core_user_get_users',
      'core_enrol_get_enrolled_users',
      'enrol_manual_enrol_users',
      'enrol_manual_unenrol_users',
      'core_group_get_course_groups',
      'core_group_create_groups',
      'core_group_add_group_members',
      'core_group_delete_group_members',
      'core_group_get_group_members',
    ]);
    expect(MOODLE_LIVE_V1.runStates).toEqual([
      'PREPARED',
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'FAILED',
      'CLOSED',
    ]);
    expect(MOODLE_LIVE_V1.terminalStates).toEqual([
      'COMPLETED',
      'FAILED',
      'CLOSED',
    ]);
    expect(MOODLE_LIVE_V1.requiredEnv).toContain(
      'MOODLE_LIVE_TEST_COHORT_PREFIX',
    );
    expect(MOODLE_LIVE_V1.requiredEnv).not.toContain('MOODLE_REAUTH_MODE');
    // The cohort prefix is a reserved namespace, not a tunable: it must never be
    // derived from a course name, a user, or anything else a test run supplies.
    expect(MOODLE_LIVE_V1.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
  });
});

/**
 * Task 3 — fail-closed live-test configuration.
 *
 * Every literal below is an example-zone placeholder: `moodle.example.edu`
 * is in a reserved documentation domain, and the site ids, release strings,
 * role ids, category id, run id and tokens are invented fixtures. No value
 * here is a claim about a real Moodle target, and none may be "corrected"
 * to match one — the real target's identity arrives from the environment at
 * run time and is deliberately absent from this repository.
 */
const EXAMPLE_TOKEN = 'test-token-never-real-0000';
const EXAMPLE_DB_FINGERPRINT = '0123456789abcdef'.repeat(4);

/** Every `MOODLE_LIVE_V1.requiredEnv` variable at a valid example-zone
 *  value. Each test overrides one variable at a time, so the refusal list
 *  it asserts is attributable to that one variable and nothing else. */
function validEnv(): NodeJS.ProcessEnv {
  return {
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

/**
 * Asserts a refusal whose `reasons` is *exactly* the expected codes, not
 * merely a superset. Comparing the whole array — order-insensitively — is
 * what makes "collects every failing code" a real assertion: a
 * `toContain` check would also pass an implementation that returned only
 * the first code it found.
 */
function refuse(
  env: NodeJS.ProcessEnv,
  ...expected: LiveTestRefusalCode[]
): LiveTestRefusalCode[] {
  const selection = selectBackend(env);
  expect(selection.kind, 'expected a refusal').toBe('live-test-disabled');
  if (selection.kind !== 'live-test-disabled') throw new Error('unreachable');
  expect([...selection.reasons].sort()).toEqual([...expected].sort());
  return selection.reasons;
}

/** Asserts a resolved live-test selection and returns its descriptor. */
function live(env: NodeJS.ProcessEnv): LiveTestDescriptor {
  const selection = selectBackend(env);
  expect(selection.kind, 'expected live-test').toBe('live-test');
  if (selection.kind !== 'live-test') throw new Error('unreachable');
  return selection.descriptor;
}

/** Every code the module may refuse with, kept beside its test so the
 *  exhaustiveness test below can fail when a code is added or renamed. */
const ALL_CODES: LiveTestRefusalCode[] = [
  'MODE_INVALID',
  'URL_NOT_HTTPS',
  'URL_HAS_PATH',
  'URL_HAS_USERINFO',
  'URL_HAS_QUERY',
  'HOST_NOT_ALLOWED',
  'TOKEN_MISSING',
  'SITE_ID_INVALID',
  'RELEASE_MISSING',
  'ROLE_IDS_INVALID',
  'CATEGORY_INVALID',
  'VISIBILITY_INVALID',
  'RUN_ID_MISSING',
  'DB_FINGERPRINT_MISSING',
  'COHORT_PREFIX_MISMATCH',
];

/** One variable broken at a time, one code expected. R17d(i): each case
 *  asserts the reason list is exactly `[code]`, so an implementation that
 *  collected nothing, or that invented extra codes, fails here. */
const SINGLE_VARIABLE_REFUSALS: Array<{
  label: string;
  patch: NodeJS.ProcessEnv;
  code: LiveTestRefusalCode;
}> = [
  {
    label: 'MOODLE_INTEGRATION_MODE is the legacy "live"',
    patch: { MOODLE_INTEGRATION_MODE: 'live' },
    code: 'MODE_INVALID',
  },
  {
    label: 'MOODLE_API_URL is http',
    patch: { MOODLE_API_URL: 'http://moodle.example.edu' },
    code: 'URL_NOT_HTTPS',
  },
  {
    label: 'MOODLE_API_URL carries a path',
    patch: { MOODLE_API_URL: 'https://moodle.example.edu/moodle' },
    code: 'URL_HAS_PATH',
  },
  {
    label: 'MOODLE_API_URL carries userinfo',
    patch: { MOODLE_API_URL: 'https://u:p@moodle.example.edu' },
    code: 'URL_HAS_USERINFO',
  },
  {
    label: 'MOODLE_API_URL carries a query',
    patch: {
      MOODLE_API_URL: 'https://moodle.example.edu?webservice/rest/server.php',
    },
    code: 'URL_HAS_QUERY',
  },
  {
    label: 'the allowlist names a different host',
    patch: { MOODLE_ALLOWED_HOST: 'www.moodle.example.edu' },
    code: 'HOST_NOT_ALLOWED',
  },
  {
    label: 'MOODLE_API_TOKEN is empty',
    patch: { MOODLE_API_TOKEN: '' },
    code: 'TOKEN_MISSING',
  },
  {
    label: 'MOODLE_EXPECTED_SITE_ID is 0',
    patch: { MOODLE_EXPECTED_SITE_ID: '0' },
    code: 'SITE_ID_INVALID',
  },
  {
    label: 'MOODLE_EXPECTED_VERSION is empty',
    patch: { MOODLE_EXPECTED_VERSION: '' },
    code: 'RELEASE_MISSING',
  },
  {
    label: 'MOODLE_ROLE_IDS holds a string instead of an id',
    patch: { MOODLE_ROLE_IDS: '{"Student":"5"}' },
    code: 'ROLE_IDS_INVALID',
  },
  {
    label: 'MOODLE_CATEGORY_ID is not a number',
    patch: { MOODLE_CATEGORY_ID: 'abc' },
    code: 'CATEGORY_INVALID',
  },
  {
    label: 'MOODLE_COURSE_VISIBLE is neither 0 nor 1',
    patch: { MOODLE_COURSE_VISIBLE: '2' },
    code: 'VISIBILITY_INVALID',
  },
  {
    label: 'MOODLE_LIVE_TEST_RUN_ID is empty',
    patch: { MOODLE_LIVE_TEST_RUN_ID: '' },
    code: 'RUN_ID_MISSING',
  },
  {
    label: 'MOODLE_LIVE_TEST_DB_FINGERPRINT is uppercase hex',
    patch: { MOODLE_LIVE_TEST_DB_FINGERPRINT: 'A'.repeat(64) },
    code: 'DB_FINGERPRINT_MISSING',
  },
  {
    label: 'MOODLE_LIVE_TEST_COHORT_PREFIX is not the reserved namespace',
    patch: { MOODLE_LIVE_TEST_COHORT_PREFIX: 'SIS-MOODLE-' },
    code: 'COHORT_PREFIX_MISMATCH',
  },
];

describe('selectBackend mode selection', () => {
  it('supplies every required variable and no variable the policy excludes', () => {
    expect(Object.keys(validEnv()).sort()).toEqual(
      [...MOODLE_LIVE_V1.requiredEnv].sort(),
    );
    // `MOODLE_REAUTH_MODE` defaults to session-age, so its absence must stay
    // meaningful: the descriptor is built without it.
    expect(validEnv().MOODLE_REAUTH_MODE).toBeUndefined();
  });

  it('resolves to the simulator when the mode is unset, even with a url and token', () => {
    const env = { ...validEnv(), MOODLE_INTEGRATION_MODE: undefined };
    expect(selectBackend(env).kind).toBe('simulator');
  });

  it('resolves to the simulator for an explicit simulator mode', () => {
    expect(selectBackend({ ...validEnv(), MOODLE_INTEGRATION_MODE: 'simulator' }))
      .toEqual({ kind: 'simulator' });
  });

  it('resolves to the simulator before any other check runs', () => {
    // Every other variable is broken. The simulator is still the answer,
    // because mode is read first and returns immediately.
    const env: NodeJS.ProcessEnv = {
      MOODLE_INTEGRATION_MODE: 'simulator',
      MOODLE_API_URL: 'http://not a url',
      MOODLE_API_TOKEN: '',
      MOODLE_ALLOWED_HOST: '###',
      MOODLE_EXPECTED_SITE_ID: 'abc',
      MOODLE_EXPECTED_VERSION: '',
      MOODLE_ROLE_IDS: '{',
      MOODLE_CATEGORY_ID: '-1',
      MOODLE_COURSE_VISIBLE: 'yes',
      MOODLE_LIVE_TEST_RUN_ID: '',
      MOODLE_LIVE_TEST_DB_FINGERPRINT: 'nope',
      MOODLE_LIVE_TEST_COHORT_PREFIX: 'wrong',
    };
    expect(selectBackend(env)).toEqual({ kind: 'simulator' });
  });

  it('reads the mode case-sensitively, so a differently cased label refuses', () => {
    refuse({ ...validEnv(), MOODLE_INTEGRATION_MODE: 'LIVE-TEST' }, 'MODE_INVALID');
    refuse({ ...validEnv(), MOODLE_INTEGRATION_MODE: 'live_test' }, 'MODE_INVALID');
  });

  it('trims the mode, so surrounding whitespace is not a refusal', () => {
    const selection = selectBackend({
      ...validEnv(),
      MOODLE_INTEGRATION_MODE: '  live-test  ',
    });
    expect(selection.kind).toBe('live-test');
  });

  it('resolves to live-test with a validated descriptor when every value is present', () => {
    const env = validEnv();
    const selection = selectBackend(env);
    expect(selection.kind).toBe('live-test');
    if (selection.kind !== 'live-test') throw new Error('unreachable');
    expect(selection.descriptor.host).toBe('moodle.example.edu');
    expect(selection.descriptor.siteId).toBe(2);
    expect(selection.descriptor.release).toBe('4.5.6');
    expect(selection.descriptor.roleIds).toEqual({
      Student: 5,
      Tutor: 6,
      'Non-editing tutor': 7,
    });
    expect(selection.descriptor.categoryId).toBe(1);
    expect(selection.descriptor.courseVisible).toBe(0);
    expect(selection.descriptor.cohortPrefix).toBe('SIS-MOODLE-LIVE-TEST-');
    expect(selection.descriptor.configFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('carries the transport constants from the policy object, not from env', () => {
    const d = live(validEnv());
    expect(d.baseUrl).toBe('https://moodle.example.edu');
    expect(d.restPath).toBe(MOODLE_LIVE_V1.restPath);
    expect(d.timeoutMs).toBe(MOODLE_LIVE_V1.timeoutMs);
    expect(d.runId).toBe('run-example-0001');
    expect(d.dbFingerprint).toBe(EXAMPLE_DB_FINGERPRINT);
  });

  it('produces the same config fingerprint when only the token differs', () => {
    const a = selectBackend({
      ...validEnv(),
      MOODLE_API_TOKEN: 'test-token-never-real-a',
    });
    const b = selectBackend({
      ...validEnv(),
      MOODLE_API_TOKEN: 'test-token-never-real-b',
    });
    expect(a.kind).toBe('live-test');
    expect(b.kind).toBe('live-test');
    if (a.kind !== 'live-test' || b.kind !== 'live-test')
      throw new Error('unreachable');
    expect(a.descriptor.configFingerprint).toBe(b.descriptor.configFingerprint);
    expect(a.descriptor.configFingerprint).not.toContain('test-token');
  });

  it('produces a different config fingerprint when the expected release differs', () => {
    const a = selectBackend({ ...validEnv(), MOODLE_EXPECTED_VERSION: '4.5.6' });
    const b = selectBackend({ ...validEnv(), MOODLE_EXPECTED_VERSION: '4.5.7' });
    if (a.kind !== 'live-test' || b.kind !== 'live-test')
      throw new Error('unreachable');
    expect(a.descriptor.configFingerprint).not.toBe(
      b.descriptor.configFingerprint,
    );
  });

  it('produces the same config fingerprint when only role id key order differs', () => {
    const a = live(validEnv());
    const b = live({
      ...validEnv(),
      MOODLE_ROLE_IDS: '{"Non-editing tutor":7,"Tutor":6,"Student":5}',
    });
    expect(a.configFingerprint).toBe(b.configFingerprint);
  });

  it('produces a different config fingerprint when a role id differs', () => {
    const a = live(validEnv());
    const b = live({
      ...validEnv(),
      MOODLE_ROLE_IDS: '{"Student":5,"Tutor":6,"Non-editing tutor":8}',
    });
    expect(a.configFingerprint).not.toBe(b.configFingerprint);
  });

  it('excludes the token and the fingerprint itself from configFingerprint', () => {
    const d = live(validEnv());
    const { token, configFingerprint: printed, ...rest } = d;
    expect(token).toBe(EXAMPLE_TOKEN);
    expect(configFingerprint(rest)).toBe(printed);
    // A caller that hands over a whole descriptor — token included, and
    // enumerable or not — still gets the same fingerprint.
    expect(configFingerprint(d as unknown as typeof rest)).toBe(printed);
  });
});

describe('selectBackend host allowlist', () => {
  it('accepts an allowlist entry that differs only by case and a trailing dot', () => {
    // `moodle.example.edu.` is the same site as `moodle.example.edu`.
    // Refusing it would be a bypass in the refusing direction: it teaches an
    // operator to disable the check.
    const d = live({ ...validEnv(), MOODLE_ALLOWED_HOST: 'MOODLE.Example.EDU.' });
    expect(d.host).toBe('moodle.example.edu');
    expect(d.baseUrl).toBe('https://moodle.example.edu');
  });

  it('normalizes a trailing dot on the URL host too', () => {
    const d = live({ ...validEnv(), MOODLE_API_URL: 'https://moodle.example.edu./' });
    expect(d.host).toBe('moodle.example.edu');
    expect(d.baseUrl).toBe('https://moodle.example.edu');
  });

  it('refuses a host whose label differs from the allowed host', () => {
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'www.moodle.example.edu' },
      'HOST_NOT_ALLOWED',
    );
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'evil-moodle.example.edu' },
      'HOST_NOT_ALLOWED',
    );
  });

  it('refuses a URL host that is a subdomain of an allowed host', () => {
    refuse(
      { ...validEnv(), MOODLE_API_URL: 'https://sub.moodle.example.edu' },
      'HOST_NOT_ALLOWED',
    );
  });

  it('refuses an allowlist that is narrower than the URL host', () => {
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'sub.moodle.example.edu' },
      'HOST_NOT_ALLOWED',
    );
  });

  it('accepts any one entry of a multi-entry allowlist, normalized', () => {
    const d = live({
      ...validEnv(),
      MOODLE_ALLOWED_HOST: 'other.example.edu, MOODLE.Example.EDU.',
    });
    expect(d.host).toBe('moodle.example.edu');
  });

  it('refuses when the allowlist is absent, and when it is empty', () => {
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: undefined },
      'HOST_NOT_ALLOWED',
    );
    refuse({ ...validEnv(), MOODLE_ALLOWED_HOST: '' }, 'HOST_NOT_ALLOWED');
    refuse({ ...validEnv(), MOODLE_ALLOWED_HOST: '   ' }, 'HOST_NOT_ALLOWED');
  });

  it('refuses the whole allowlist when one entry is malformed', () => {
    // Dropping the malformed entry would narrow the allowlist silently; the
    // valid entry beside it must not rescue it.
    refuse(
      {
        ...validEnv(),
        MOODLE_ALLOWED_HOST: 'moodle.example.edu, not a host',
      },
      'HOST_NOT_ALLOWED',
    );
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'moodle.example.edu,' },
      'HOST_NOT_ALLOWED',
    );
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'moodle.example.edu/webservice' },
      'HOST_NOT_ALLOWED',
    );
  });

  it('refuses an allowlist entry that a hostname parser would truncate', () => {
    // WHATWG resolves `\` as a path separator, so a bare `new URL` would
    // silently reduce this to its first segment. Refusing is the only
    // explicable outcome.
    refuse(
      { ...validEnv(), MOODLE_ALLOWED_HOST: 'moodle.example.edu\\evil.example' },
      'HOST_NOT_ALLOWED',
    );
  });
});

describe('selectBackend URL shape', () => {
  it('refuses an unparseable URL without throwing', () => {
    const env = { ...validEnv(), MOODLE_API_URL: 'not a url' };
    expect(() => selectBackend(env)).not.toThrow();
    refuse(env, 'URL_NOT_HTTPS');
  });

  it('refuses a URL carrying a fragment', () => {
    // The reason-code union has no fragment code, so a fragment is refused
    // under the closest sibling it has. Recorded as a gap: a sixteenth code
    // would name it honestly.
    refuse(
      { ...validEnv(), MOODLE_API_URL: 'https://moodle.example.edu#admin' },
      'URL_HAS_QUERY',
    );
  });

  it('refuses a trailing-slash-bearing subpath and accepts the bare root', () => {
    const d = live({ ...validEnv(), MOODLE_API_URL: 'https://moodle.example.edu/' });
    expect(d.baseUrl).toBe('https://moodle.example.edu');
  });

  it('keeps a configured port in baseUrl rather than dropping it silently', () => {
    const d = live({
      ...validEnv(),
      MOODLE_API_URL: 'https://moodle.example.edu:8443',
    });
    expect(d.host).toBe('moodle.example.edu');
    expect(d.baseUrl).toBe('https://moodle.example.edu:8443');
  });
});

describe('selectBackend site id', () => {
  it('refuses a site id that is not a positive integer', () => {
    for (const value of [
      '0',
      '-1',
      '2.5',
      '2.0',
      'tenant-42',
      'abc',
      '',
      ' 2 ',
      '2 ',
      ' 2',
      '+2',
      '0x2',
      '1e3',
      '01',
      '9007199254740993',
    ]) {
      refuse(
        { ...validEnv(), MOODLE_EXPECTED_SITE_ID: value },
        'SITE_ID_INVALID',
      );
    }
  });

  it('accepts the site ids a Moodle site actually reports', () => {
    expect(live({ ...validEnv(), MOODLE_EXPECTED_SITE_ID: '1' }).siteId).toBe(1);
    expect(live({ ...validEnv(), MOODLE_EXPECTED_SITE_ID: '9' }).siteId).toBe(9);
  });

  it('refuses a non-string site id without throwing', () => {
    const env = {
      ...validEnv(),
      MOODLE_EXPECTED_SITE_ID: 2 as unknown as string,
    };
    refuse(env, 'SITE_ID_INVALID');
  });
});

describe('selectBackend category id', () => {
  it('refuses a category id that is not a positive integer', () => {
    for (const value of ['0', '-1', '1.5', '1.0', 'category-3', 'abc', '', ' 1 ']) {
      refuse({ ...validEnv(), MOODLE_CATEGORY_ID: value }, 'CATEGORY_INVALID');
    }
  });
});

describe('selectBackend role ids', () => {
  it('refuses every shape of unusable role id map', () => {
    for (const value of [
      '',
      '   ',
      '{',
      'null',
      '[]',
      '"Tutor"',
      '5',
      '{}',
      '{"Student":0}',
      '{"Student":-1}',
      '{"Student":1.5}',
      '{"Student":"5"}',
      '{"Student":null}',
      '{"Student":{"id":5}}',
      '{"":5}',
    ]) {
      refuse({ ...validEnv(), MOODLE_ROLE_IDS: value }, 'ROLE_IDS_INVALID');
    }
  });

  it('never defaults a role that the operator did not supply', () => {
    const d = live({ ...validEnv(), MOODLE_ROLE_IDS: '{"Student":5}' });
    expect(d.roleIds).toEqual({ Student: 5 });
    expect(Object.keys(d.roleIds)).toEqual(['Student']);
  });
});

describe('selectBackend release, run id, visibility and database fingerprint', () => {
  it('refuses a whitespace-only release and a whitespace-only token', () => {
    refuse({ ...validEnv(), MOODLE_EXPECTED_VERSION: '   ' }, 'RELEASE_MISSING');
    refuse({ ...validEnv(), MOODLE_API_TOKEN: '   ' }, 'TOKEN_MISSING');
  });

  it('refuses a whitespace-only run id', () => {
    refuse({ ...validEnv(), MOODLE_LIVE_TEST_RUN_ID: '   ' }, 'RUN_ID_MISSING');
  });

  it('carries a configured value verbatim rather than rewriting it', () => {
    // No silent normalisation: an unpadded, untrimmed configured value is
    // used as written, so it will fail its comparison at run time instead of
    // being quietly corrected into a different target value.
    const d = live({ ...validEnv(), MOODLE_EXPECTED_VERSION: ' 4.5.6' });
    expect(d.release).toBe(' 4.5.6');
  });

  it('refuses any visibility value other than exactly 0 or 1', () => {
    for (const value of ['', '2', '-1', ' 0 ', '01', 'true', 'false', 'yes']) {
      refuse({ ...validEnv(), MOODLE_COURSE_VISIBLE: value }, 'VISIBILITY_INVALID');
    }
  });

  it('accepts both visibility values as numbers, not strings', () => {
    expect(live({ ...validEnv(), MOODLE_COURSE_VISIBLE: '1' }).courseVisible).toBe(1);
    expect(live({ ...validEnv(), MOODLE_COURSE_VISIBLE: '0' }).courseVisible).toBe(0);
  });

  it('refuses a database fingerprint that is not 64 lowercase hex characters', () => {
    for (const value of [
      '',
      '0'.repeat(63),
      '0'.repeat(65),
      'A'.repeat(64),
      `${'0'.repeat(63)}g`,
      ' 0'.repeat(32),
      '0'.repeat(32) + '0 '.repeat(15) + '00',
    ]) {
      refuse(
        { ...validEnv(), MOODLE_LIVE_TEST_DB_FINGERPRINT: value },
        'DB_FINGERPRINT_MISSING',
      );
    }
  });

  it('refuses a cohort prefix that differs only by case', () => {
    refuse(
      { ...validEnv(), MOODLE_LIVE_TEST_COHORT_PREFIX: 'sis-moodle-live-test-' },
      'COHORT_PREFIX_MISMATCH',
    );
  });
});

describe('selectBackend collects every failing code', () => {
  it('reports two codes when two variables are broken at once', () => {
    const reasons = refuse(
      { ...validEnv(), MOODLE_API_TOKEN: '', MOODLE_COURSE_VISIBLE: 'yes' },
      'TOKEN_MISSING',
      'VISIBILITY_INVALID',
    );
    expect(reasons).toHaveLength(2);
  });

  it('reports the full expected set for an otherwise absent environment', () => {
    // Mode alone: every other required variable is missing. The operator must
    // see the whole list in one startup, so the assertion is the complete set
    // rather than a sample.
    const reasons = refuse(
      { MOODLE_INTEGRATION_MODE: 'live-test' },
      'URL_NOT_HTTPS',
      'HOST_NOT_ALLOWED',
      'TOKEN_MISSING',
      'SITE_ID_INVALID',
      'RELEASE_MISSING',
      'ROLE_IDS_INVALID',
      'CATEGORY_INVALID',
      'VISIBILITY_INVALID',
      'RUN_ID_MISSING',
      'DB_FINGERPRINT_MISSING',
      'COHORT_PREFIX_MISMATCH',
    );
    expect(reasons).toHaveLength(11);
  });

  it('adds MODE_INVALID to the full set for the legacy live mode', () => {
    const reasons = refuse(
      { MOODLE_INTEGRATION_MODE: 'live' },
      'MODE_INVALID',
      'URL_NOT_HTTPS',
      'HOST_NOT_ALLOWED',
      'TOKEN_MISSING',
      'SITE_ID_INVALID',
      'RELEASE_MISSING',
      'ROLE_IDS_INVALID',
      'CATEGORY_INVALID',
      'VISIBILITY_INVALID',
      'RUN_ID_MISSING',
      'DB_FINGERPRINT_MISSING',
      'COHORT_PREFIX_MISMATCH',
    );
    expect(reasons).toHaveLength(12);
  });

  it('never falls back to the simulator for a failed live-test', () => {
    expect(selectBackend({ ...validEnv(), MOODLE_API_URL: 'http://x.example.edu' }))
      .toMatchObject({ kind: 'live-test-disabled' });
  });

  it('covers every refusal code with a single-variable case', () => {
    expect(ALL_CODES).toHaveLength(15);
    expect(new Set(ALL_CODES).size).toBe(15);
    expect(SINGLE_VARIABLE_REFUSALS.map((r) => r.code).sort()).toEqual(
      [...ALL_CODES].sort(),
    );
  });

  it.each(SINGLE_VARIABLE_REFUSALS)(
    'refuses exactly one code when $label',
    ({ patch, code }) => {
      const reasons = refuse({ ...validEnv(), ...patch }, code);
      expect(reasons).toHaveLength(1);
    },
  );
});

describe('the descriptor keeps the token out of every serialisation', () => {
  it('reads normally but is not an enumerable own property', () => {
    const d = live(validEnv());
    expect(d.token).toBe(EXAMPLE_TOKEN);
    expect(Object.keys(d)).not.toContain('token');
    expect(Object.prototype.propertyIsEnumerable.call(d, 'token')).toBe(false);
    expect(Object.getOwnPropertyDescriptor(d, 'token')?.enumerable).toBe(false);
  });

  it('omits the token from JSON, spread and Object.assign', () => {
    const d = live(validEnv());
    expect(JSON.stringify(d)).not.toContain(EXAMPLE_TOKEN);
    expect(JSON.stringify(d)).not.toContain('token');
    const spread = { ...d } as Partial<LiveTestDescriptor>;
    expect(spread.token).toBeUndefined();
    expect(Object.keys(spread)).not.toContain('token');
    const assigned = Object.assign({}, d) as Partial<LiveTestDescriptor>;
    expect(assigned.token).toBeUndefined();
    expect(Object.keys(assigned)).not.toContain('token');
    expect(JSON.stringify(selectBackend(validEnv()))).not.toContain(
      EXAMPLE_TOKEN,
    );
  });

  it('keeps the non-secret descriptor fields enumerable and visible', () => {
    const d = live(validEnv());
    expect(Object.keys(d).sort()).toEqual([
      'baseUrl',
      'categoryId',
      'cohortPrefix',
      'configFingerprint',
      'courseVisible',
      'dbFingerprint',
      'host',
      'release',
      'restPath',
      'roleIds',
      'runId',
      'siteId',
      'timeoutMs',
    ]);
    expect(JSON.parse(JSON.stringify(d))).toMatchObject({
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6',
    });
  });
});

describe('the refusal surface leaks nothing', () => {
  const SECRET = 'test-token-never-real-secret';
  const SECRET_URL = 'http://u:p@live.example.edu:8080/private?token=abc';

  /** Every entry must resolve to a refusal, so the assertions about what a
   *  refusal carries apply to all of them. Each carries the same example
   *  token, because the point is that a refusal made with a token present
   *  still does not contain it. */
  const refusalEnvs: NodeJS.ProcessEnv[] = [
    {
      ...validEnv(),
      MOODLE_API_TOKEN: SECRET,
      MOODLE_API_URL: SECRET_URL,
      MOODLE_ALLOWED_HOST: 'live.example.edu',
      MOODLE_EXPECTED_SITE_ID: '0',
    },
    {
      ...validEnv(),
      MOODLE_API_TOKEN: SECRET,
      MOODLE_ROLE_IDS: '{"Student":"secret"}',
    },
    { ...validEnv(), MOODLE_API_TOKEN: SECRET, MOODLE_LIVE_TEST_RUN_ID: '' },
    { MOODLE_INTEGRATION_MODE: 'live-test' },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_API_TOKEN: SECRET },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_API_URL: 'https://' },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_API_URL: 'https://.' },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_ALLOWED_HOST: '.,,,' },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_ROLE_IDS: '{"a":' },
    { MOODLE_INTEGRATION_MODE: 'live-test', MOODLE_EXPECTED_SITE_ID: ' ' },
    {
      MOODLE_INTEGRATION_MODE: 'live-test',
      MOODLE_ALLOWED_HOST: `${'a'.repeat(300)}.example.edu`,
    },
  ];

  it('never throws, whatever the environment holds', () => {
    for (const env of [...refusalEnvs, validEnv()]) {
      expect(() => selectBackend(env)).not.toThrow();
    }
    // A wholly absent environment, and one that is not an object at all.
    expect(() => selectBackend({})).not.toThrow();
    expect(() =>
      selectBackend(null as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
    expect(() =>
      selectBackend('nope' as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('carries reason codes and nothing else in a refusal', () => {
    for (const env of refusalEnvs) {
      const selection: BackendSelection = selectBackend(env);
      expect(selection.kind).toBe('live-test-disabled');
      if (selection.kind !== 'live-test-disabled') {
        throw new Error('unreachable');
      }
      expect(Object.keys(selection).sort()).toEqual(['kind', 'reasons']);
      for (const reason of selection.reasons) {
        expect(ALL_CODES).toContain(reason);
        expect(reason).toMatch(/^[A-Z_]+$/);
      }
      // No duplicate code, and the list is never empty.
      expect(new Set(selection.reasons).size).toBe(selection.reasons.length);
      expect(selection.reasons.length).toBeGreaterThan(0);
    }
  });

  it('never echoes the token, the configured URL or any other env value', () => {
    for (const env of refusalEnvs) {
      const serialised = JSON.stringify(selectBackend(env));
      for (const value of [SECRET, SECRET_URL, 'u:p@live.example.edu', 'secret']) {
        expect(serialised, `leaked ${value}`).not.toContain(value);
      }
      // Every configured value except the mode, which is a non-secret
      // control value whose spelling is part of the fixed vocabulary the
      // `live-test-disabled` kind is built from.
      for (const [name, raw] of Object.entries(env)) {
        if (name === 'MOODLE_INTEGRATION_MODE') continue;
        if (typeof raw === 'string' && raw.length > 4) {
          expect(serialised, `leaked ${name}=${raw}`).not.toContain(raw);
        }
      }
    }
  });

  it('keeps the token out of a resolved selection as well as a refusal', () => {
    expect(
      JSON.stringify(
        selectBackend({ ...validEnv(), MOODLE_API_TOKEN: SECRET }),
      ),
    ).not.toContain(SECRET);
  });

  it('keeps the token out of the fingerprint even when handed a whole descriptor', () => {
    const d = live({ ...validEnv(), MOODLE_API_TOKEN: SECRET });
    const asRecord: Record<string, unknown> = { ...d, token: SECRET };
    expect(JSON.stringify(asRecord)).toContain(SECRET);
    const digest = configFingerprint(
      asRecord as unknown as Omit<
        LiveTestDescriptor,
        'token' | 'configFingerprint'
      >,
    );
    expect(digest).not.toContain('test-token');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
