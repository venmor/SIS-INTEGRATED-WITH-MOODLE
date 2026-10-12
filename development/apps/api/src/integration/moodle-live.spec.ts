import { createServer, type Server, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveMoodleAdapter } from './moodle-live.js';

const TEST_TOKEN = 'local-fixture-credential';
const RELEASE = '5.1.3 (Build: 20260608)';
const servers: Server[] = [];
interface Evidence {
  method?: string;
  contentType?: string;
  query: URLSearchParams;
  form: URLSearchParams;
}
async function fixture(
  handler: (request: Evidence, response: ServerResponse) => void,
) {
  const requests: Evidence[] = [];
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (body += chunk));
    request.on('end', () => {
      const evidence = {
        method: request.method,
        contentType: request.headers['content-type'],
        query: new URL(request.url ?? '/', 'http://127.0.0.1').searchParams,
        form: new URLSearchParams(body),
      };
      requests.push(evidence);
      handler(evidence, response);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    requests,
  };
}
function json(response: ServerResponse, body: unknown, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}
function adapter(baseUrl: string, timeoutMs = 250) {
  const prisma = {
    student: { findUnique: vi.fn() },
    account: { findUnique: vi.fn() },
    tutorialGroup: { findUnique: vi.fn() },
  };
  const instance = new LiveMoodleAdapter(prisma as never, {
    baseUrl,
    token: TEST_TOKEN,
    timeoutMs,
    restPath: '/webservice/rest/server.php',
    host: '127.0.0.1',
    siteId: 1,
    release: RELEASE,
  });
  return { instance, prisma };
}
// Exercise the existing private transport against actual HTTP without
// adding a production transport or authorization bypass API.
function transport(instance: LiveMoodleAdapter) {
  return instance as unknown as {
    call<T>(name: string, parameters: Record<string, unknown>): Promise<T>;
  };
}
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

describe('live Moodle read-only safety foundation', () => {
  it('sends deterministic nested PHP form parameters over POST', async () => {
    const server = await fixture((_request, response) => json(response, {}));
    await transport(adapter(server.baseUrl).instance).call(
      'core_webservice_get_site_info',
      {
        options: [{ name: 'unicode', value: 'Zambia & café' }],
        criteria: [{ value: 'SIS-TEST-1', key: 'idnumber' }],
        enabled: true,
      },
    );
    const request = server.requests[0];
    expect(request.method).toBe('POST');
    expect(request.contentType).toBe('application/x-www-form-urlencoded');
    expect(request.query.size).toBe(0);
    expect([...request.form]).toEqual([
      ['criteria[0][key]', 'idnumber'],
      ['criteria[0][value]', 'SIS-TEST-1'],
      ['enabled', '1'],
      ['options[0][name]', 'unicode'],
      ['options[0][value]', 'Zambia & café'],
      ['wstoken', TEST_TOKEN],
      ['wsfunction', 'core_webservice_get_site_info'],
      ['moodlewsrestformat', 'json'],
    ]);
  });
  it.each([
    { value: null },
    { value: undefined },
    { value: Number.NaN },
    { value: new Date() },
    { 'value[0]': 'ambiguous' },
    { value: Object.assign([], { length: 1 }) },
  ])('refuses unsupported form values before HTTP', async (parameters) => {
    const server = await fixture((_request, response) => json(response, {}));
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        parameters,
      ),
    ).rejects.toMatchObject({
      retryable: false,
      code: 'MOODLE_PARAMETERS_INVALID',
    });
    expect(server.requests).toHaveLength(0);
  });
  it.each(['wstoken', 'wsfunction', 'moodlewsrestformat'])(
    'refuses reserved selector %s before HTTP',
    async (selector) => {
      const server = await fixture((_request, response) => json(response, {}));
      await expect(
        transport(adapter(server.baseUrl).instance).call(
          'core_webservice_get_site_info',
          { [selector]: 'core_course_create_courses' },
        ),
      ).rejects.toMatchObject({
        retryable: false,
        code: 'MOODLE_PARAMETERS_INVALID',
      });
      expect(server.requests).toHaveLength(0);
    },
  );

  it('rejects recursive parameters before HTTP', async () => {
    const server = await fixture((_request, response) => json(response, {}));
    const parameters: Record<string, unknown> = {};
    parameters.self = parameters;
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        parameters,
      ),
    ).rejects.toMatchObject({
      retryable: false,
      code: 'MOODLE_PARAMETERS_INVALID',
    });
    expect(server.requests).toHaveLength(0);
  });
  it('rejects every function except the read-only identity preflight', async () => {
    const server = await fixture((_request, response) => json(response, null));
    const { instance } = adapter(server.baseUrl);
    for (const name of [
      'enrol_manual_enrol_users',
      'enrol_manual_unenrol_users',
      'core_course_create_courses',
      'core_user_get_users',
      'core_enrol_get_enrolled_users_with_capability',
    ]) {
      await expect(transport(instance).call(name, {})).rejects.toMatchObject({
        retryable: false,
      });
    }
    expect(server.requests).toHaveLength(0);
  });
  it('verifies canonical identity and reports the exact release', async () => {
    const server = await fixture((_request, response) =>
      json(response, { siteid: 1, release: RELEASE, version: '2025100603' }),
    );
    await expect(
      adapter(server.baseUrl).instance.validateConnection(),
    ).resolves.toEqual({
      ok: true,
      backend: 'live-test',
      version: RELEASE,
      detail:
        'Read-only Moodle target identity verified. Live operations remain disabled.',
    });
  });
  it.each([
    { siteid: 2, release: RELEASE },
    { siteid: 1, release: 'different release' },
    { version: '2025100603', sitename: TEST_TOKEN },
    { siteid: '1', release: RELEASE },
  ])('fails closed on mismatched or missing identity', async (body) => {
    const server = await fixture((_request, response) => json(response, body));
    const result = await adapter(server.baseUrl).instance.validateConnection();
    expect(result).toMatchObject({ ok: false, version: null });
    expect(result.detail).not.toContain(TEST_TOKEN);
  });
  it('never follows redirects or forwards its credential', async () => {
    const destination = await fixture((_request, response) =>
      json(response, { siteid: 1, release: RELEASE }),
    );
    const server = await fixture((_request, response) => {
      response.writeHead(307, { location: destination.baseUrl });
      response.end();
    });
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        {},
      ),
    ).rejects.toMatchObject({
      retryable: false,
      code: 'MOODLE_REDIRECT_REFUSED',
    });
    expect(destination.requests).toHaveLength(0);
  });
  it('keeps timeout active while waiting for the response body', async () => {
    const server = await fixture((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.flushHeaders();
      response.write('{');
    });
    const start = Date.now();
    await expect(
      transport(adapter(server.baseUrl, 40).instance).call(
        'core_webservice_get_site_info',
        {},
      ),
    ).rejects.toMatchObject({ retryable: true, code: 'MOODLE_TIMEOUT' });
    expect(Date.now() - start).toBeLessThan(1000);
  });
  it('limits streamed response size', async () => {
    const server = await fixture((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('x'.repeat(1024 * 1024 + 1));
    });
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        {},
      ),
    ).rejects.toMatchObject({
      retryable: false,
      code: 'MOODLE_RESPONSE_TOO_LARGE',
    });
  });
  it('classifies an interrupted response stream as a network failure', async () => {
    const server = await fixture((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.flushHeaders();
      response.write('{');
      setImmediate(() => response.destroy());
    });
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        {},
      ),
    ).rejects.toMatchObject({
      retryable: true,
      code: 'MOODLE_CONNECTION_FAILURE',
    });
  });

  it('routes an unknown transport failure to manual review without exposing it', async () => {
    const server = await fixture((_request, response) => json(response, {}));
    // A library exception has no reproducible HTTP response; inject only this
    // unclassified transport failure, keeping all protocol tests on real HTTP.
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error(TEST_TOKEN));
    await expect(
      transport(adapter(server.baseUrl).instance).call(
        'core_webservice_get_site_info',
        {},
      ),
    ).rejects.toMatchObject({
      retryable: false,
      code: 'MOODLE_TRANSPORT_UNCLASSIFIED',
    });
    expect(server.requests).toHaveLength(0);
  });

  it.each([408, 429, 500, 503])(
    'classifies HTTP %s as retryable',
    async (status) => {
      const server = await fixture((_request, response) =>
        json(response, {}, status),
      );
      await expect(
        transport(adapter(server.baseUrl).instance).call(
          'core_webservice_get_site_info',
          {},
        ),
      ).rejects.toMatchObject({ retryable: true, code: 'MOODLE_HTTP_FAILURE' });
    },
  );
  it.each([
    { exception: 'remote', errorcode: TEST_TOKEN, message: TEST_TOKEN },
    { errorcode: 'servicenotavailable', message: TEST_TOKEN },
    { warnings: [{ message: TEST_TOKEN }] },
  ])(
    'refuses remote errors or warnings without exposing their text',
    async (body) => {
      const server = await fixture((_request, response) =>
        json(response, body),
      );
      const result = await adapter(
        server.baseUrl,
      ).instance.validateConnection();
      expect(result.ok).toBe(false);
      expect(result.detail).not.toContain(TEST_TOKEN);
      expect(result.detail).not.toContain('servicenotavailable');
    },
  );
  it('sanitizes malformed JSON errors', async () => {
    const server = await fixture((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(TEST_TOKEN);
    });
    const result = await adapter(server.baseUrl).instance.validateConnection();
    expect(result).toMatchObject({ ok: false, version: null });
    expect(result.detail).not.toContain(TEST_TOKEN);
  });
  it('refuses writes and unscoped reconciliation before DB or HTTP', async () => {
    const server = await fixture((_request, response) => json(response, []));
    const { instance, prisma } = adapter(server.baseUrl);
    const common = {
      db: {} as never,
      shell: { id: '7', ref: 'SIS-MOODLE-LIVE-TEST-SH' },
    };
    const operations = [
      () =>
        instance.ensureShell({
          db: common.db,
          shellRef: common.shell.ref,
          offeringId: 'o',
          periodId: 'p',
        }),
      () =>
        instance.applyEnrolment({
          ...common,
          studentId: 's',
          role: 'student',
          scenario: 'SUCCESS',
        }),
      () =>
        instance.applyRemoval({
          ...common,
          studentId: 's',
          scenario: 'SUCCESS',
        }),
      () =>
        instance.applyStaffRole({
          ...common,
          accountId: 'a',
          moodleRole: 'teacher',
          quizScope: {},
          scenario: 'SUCCESS',
        }),
      () =>
        instance.applyGroupMember({
          ...common,
          groupId: 'g',
          studentId: 's',
          scenario: 'SUCCESS',
        }),
      () =>
        instance.applyGroupMember({
          ...common,
          groupId: 'g',
          studentId: 's',
          scenario: 'SUCCESS',
          remove: true,
        }),
      () => instance.suspendAccess({ ...common, studentKey: 'SIS-TEST-1' }),
      () => instance.listActualEnrolments(common.shell),
      () => instance.listActualGroupMembers(common.shell),
    ];
    for (const operation of operations) {
      await expect(operation()).rejects.toMatchObject({
        retryable: false,
        code: 'LIVE_SCOPE_PREREQUISITES_MISSING',
      });
    }
    expect(prisma.student.findUnique).not.toHaveBeenCalled();
    expect(prisma.account.findUnique).not.toHaveBeenCalled();
    expect(prisma.tutorialGroup.findUnique).not.toHaveBeenCalled();
    expect(server.requests).toHaveLength(0);
  });
  it('cannot construct live mode from only a URL and credential', () => {
    vi.stubEnv('MOODLE_INTEGRATION_MODE', 'simulator');
    vi.stubEnv('MOODLE_API_URL', 'https://example.test');
    vi.stubEnv('MOODLE_API_TOKEN', TEST_TOKEN);
    expect(() => new LiveMoodleAdapter({} as never)).toThrow(
      'LIVE_CONFIGURATION_REFUSED',
    );
  });
  it('restricts explicit transport fixtures to test-mode loopback', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => adapter('http://127.0.0.1:1234')).toThrow(
      'LIVE_CONFIGURATION_REFUSED',
    );
    vi.stubEnv('NODE_ENV', 'test');
    expect(() => adapter('https://example.test')).toThrow(
      'LIVE_CONFIGURATION_REFUSED',
    );
  });
});
