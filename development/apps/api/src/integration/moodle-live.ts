import { MOODLE_LIVE_V1 } from '@sis/config';
import type { PrismaService } from '../identity-access/prisma.service.js';
import type { MoodleAdapter, MoodleBackend } from './moodle-adapter.js';
import {
  selectBackend,
  type LiveTestDescriptor,
} from './moodle-live-config.js';
import {
  assertTargetIdentity,
  normalizeHost,
  parseSiteInfo,
} from './moodle-target.js';

/** Stable, secret-free failure. Unknown remote errors require manual review. */
export class MoodleApiError extends Error {
  constructor(
    public readonly retryable: boolean,
    message: string,
    public readonly code = 'MOODLE_FAILURE',
  ) {
    super(message);
    this.name = 'MoodleApiError';
  }
}

type LiveConfig = Pick<
  LiveTestDescriptor,
  'baseUrl' | 'token' | 'timeoutMs' | 'restPath' | 'host' | 'siteId' | 'release'
>;

const MAX_RESPONSE_BYTES = 1024 * 1024;
const PARAMETER_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const RESERVED_PARAMETERS = new Set([
  MOODLE_LIVE_V1.tokenParam,
  'wsfunction',
  ...Object.keys(MOODLE_LIVE_V1.formatParam),
]);
const NETWORK_FAILURE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

/** Inspect native Node/Undici codes only; never surface error text or cause. */
function isNetworkFailure(error: unknown, depth = 0): boolean {
  if (depth > 4 || typeof error !== 'object' || error === null) return false;
  const record = error as { code?: unknown; cause?: unknown };
  return (
    (typeof record.code === 'string' &&
      NETWORK_FAILURE_CODES.has(record.code)) ||
    isNetworkFailure(record.cause, depth + 1)
  );
}

function parametersInvalid(): never {
  throw new MoodleApiError(
    false,
    'Moodle parameters are invalid.',
    'MOODLE_PARAMETERS_INVALID',
  );
}

/** PHP bracket encoding is deterministic and refuses ambiguous JS values. */
function formParameters(parameters: Record<string, unknown>): URLSearchParams {
  const form = new URLSearchParams();
  const parents = new Set<object>();
  function encode(path: string, value: unknown, depth: number): void {
    if (depth > 16) parametersInvalid();
    if (typeof value === 'string') {
      form.append(path, value);
    } else if (typeof value === 'boolean') {
      form.append(path, value ? '1' : '0');
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      form.append(path, String(value));
    } else if (typeof value === 'object' && value !== null) {
      if (parents.has(value)) parametersInvalid();
      parents.add(value);
      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
          if (!Object.hasOwn(value, index)) parametersInvalid();
          encode(`${path}[${index}]`, value[index], depth + 1);
        }
      } else {
        const prototype: unknown = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null)
          parametersInvalid();
        for (const key of Object.keys(value).sort()) {
          if (!PARAMETER_KEY.test(key)) parametersInvalid();
          if (path === '' && RESERVED_PARAMETERS.has(key)) parametersInvalid();
          encode(
            path === '' ? key : `${path}[${key}]`,
            (value as Record<string, unknown>)[key],
            depth + 1,
          );
        }
      }
      parents.delete(value);
    } else {
      parametersInvalid();
    }
  }
  encode('', parameters, 0);
  return form;
}

/**
 * Runtime uses the canonical fail-closed configuration resolver. The old
 * explicit transport argument is restricted to loopback tests and cannot
 * select a real host or permit a live mutation.
 */
function resolveConfig(fixture?: LiveConfig | null): LiveConfig {
  if (fixture !== undefined) {
    let valid = false;
    try {
      const url = new URL(fixture?.baseUrl ?? '');
      valid =
        process.env.NODE_ENV === 'test' &&
        fixture !== null &&
        url.protocol === 'http:' &&
        url.hostname === '127.0.0.1' &&
        url.username === '' &&
        url.password === '' &&
        url.pathname === '/' &&
        url.search === '' &&
        url.hash === '' &&
        fixture.host === '127.0.0.1' &&
        fixture.restPath === MOODLE_LIVE_V1.restPath &&
        Number.isSafeInteger(fixture.timeoutMs) &&
        fixture.timeoutMs > 0 &&
        fixture.timeoutMs <= MOODLE_LIVE_V1.timeoutMs &&
        Number.isSafeInteger(fixture.siteId) &&
        fixture.siteId > 0 &&
        typeof fixture.release === 'string' &&
        fixture.release.trim() !== '' &&
        typeof fixture.token === 'string' &&
        fixture.token.trim() !== '';
    } catch {
      valid = false;
    }
    if (valid && fixture !== null) return { ...fixture };
  } else {
    const selection = selectBackend();
    if (selection.kind === 'live-test') return selection.descriptor;
  }
  throw new MoodleApiError(
    false,
    'LIVE_CONFIGURATION_REFUSED',
    'LIVE_CONFIGURATION_REFUSED',
  );
}

/**
 * Read-only Moodle identity preflight. Static configuration and successful
 * site identity are not authorization to provision, enrol or reconcile.
 * Persisted RUNNING approvals, synthetic manifest/identity bindings, active
 * mapping versions and delivery claims are still absent. Consequently every
 * domain operation fails before touching Prisma or Moodle; only site-info is
 * callable. Suspension must eventually use verified manual-enrolment
 * suspend=1, never permanent unenrolment, with a target-verified role/instance.
 * Provisioning must use the approved descriptor category/visibility and
 * manifest, never hard-coded defaults. Neither operation is implemented here.
 */
export class LiveMoodleAdapter implements MoodleAdapter {
  readonly backend: MoodleBackend = 'live-test';
  private readonly config: LiveConfig;

  constructor(_prisma: PrismaService, config?: LiveConfig | null) {
    this.config = resolveConfig(config);
  }

  private async call<T>(
    wsfunction: string,
    parameters: Record<string, unknown>,
  ): Promise<T> {
    // This secondary guard also blocks an accidental future public-method
    // bypass: the approved baseline allowlist alone does not authorize writes.
    if (
      wsfunction !== 'core_webservice_get_site_info' ||
      !(MOODLE_LIVE_V1.authorisedFunctions as readonly string[]).includes(
        wsfunction,
      )
    ) {
      throw new MoodleApiError(
        false,
        'LIVE_SCOPE_PREREQUISITES_MISSING',
        'LIVE_SCOPE_PREREQUISITES_MISSING',
      );
    }
    const body = formParameters(parameters);
    const url = new URL(this.config.restPath, this.config.baseUrl + '/');
    // Moodle accepts form selectors. Add trusted values only after caller
    // validation so a parameter cannot override the function or credential;
    // keep the URL free of secrets. Never log this body, remote response text,
    // underlying fetch error, or a complete descriptor.
    body.set(MOODLE_LIVE_V1.tokenParam, this.config.token);
    body.set('wsfunction', wsfunction);
    for (const [key, value] of Object.entries(MOODLE_LIVE_V1.formatParam)) {
      body.set(key, value);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response | undefined;
    try {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          redirect: 'manual',
          signal: controller.signal,
        });
      } catch (error) {
        if (!isNetworkFailure(error)) {
          throw new MoodleApiError(
            false,
            'Moodle transport failed without a classified cause.',
            'MOODLE_TRANSPORT_UNCLASSIFIED',
          );
        }
        throw new MoodleApiError(
          true,
          'Moodle connection failed.',
          'MOODLE_CONNECTION_FAILURE',
        );
      }
      if (response.status >= 300 && response.status < 400) {
        throw new MoodleApiError(
          false,
          'Moodle redirects are refused.',
          'MOODLE_REDIRECT_REFUSED',
        );
      }
      if (!response.ok) {
        throw new MoodleApiError(
          response.status === 408 ||
            response.status === 429 ||
            response.status >= 500,
          'Moodle HTTP request failed.',
          'MOODLE_HTTP_FAILURE',
        );
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new MoodleApiError(
          false,
          'Moodle response is invalid.',
          'MOODLE_RESPONSE_INVALID',
        );
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new MoodleApiError(
              false,
              'Moodle response exceeded the limit.',
              'MOODLE_RESPONSE_TOO_LARGE',
            );
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const record = data as Record<string, unknown>;
        if (
          'exception' in record ||
          'errorcode' in record ||
          'error' in record
        ) {
          // No target-version transient Moodle error contract is verified yet.
          throw new MoodleApiError(
            false,
            'Moodle rejected the request.',
            'MOODLE_API_REJECTED',
          );
        }
        if (
          'warnings' in record &&
          (!Array.isArray(record.warnings) || record.warnings.length !== 0)
        ) {
          throw new MoodleApiError(
            false,
            'Moodle response has unverified warnings.',
            'MOODLE_RESPONSE_WARNINGS',
          );
        }
      }
      return data as T;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new MoodleApiError(
          true,
          'Moodle request timed out.',
          'MOODLE_TIMEOUT',
        );
      }
      if (error instanceof MoodleApiError) throw error;
      if (isNetworkFailure(error)) {
        throw new MoodleApiError(
          true,
          'Moodle connection failed.',
          'MOODLE_CONNECTION_FAILURE',
        );
      }
      throw new MoodleApiError(
        false,
        'Moodle response is invalid.',
        'MOODLE_RESPONSE_INVALID',
      );
    } finally {
      clearTimeout(timer);
      // Release unread redirect/error bodies without retaining their text.
      if (response?.body && !response.body.locked) {
        void response.body.cancel().catch(() => undefined);
      }
    }
  }

  private refuseScope<T>(): Promise<T> {
    return Promise.reject(
      new MoodleApiError(
        false,
        'LIVE_SCOPE_PREREQUISITES_MISSING',
        'LIVE_SCOPE_PREREQUISITES_MISSING',
      ),
    );
  }

  ensureShell(
    _input: Parameters<MoodleAdapter['ensureShell']>[0],
  ): ReturnType<MoodleAdapter['ensureShell']> {
    return this.refuseScope();
  }
  applyEnrolment(
    _input: Parameters<MoodleAdapter['applyEnrolment']>[0],
  ): ReturnType<MoodleAdapter['applyEnrolment']> {
    return this.refuseScope();
  }
  applyRemoval(
    _input: Parameters<MoodleAdapter['applyRemoval']>[0],
  ): ReturnType<MoodleAdapter['applyRemoval']> {
    return this.refuseScope();
  }
  applyStaffRole(
    _input: Parameters<MoodleAdapter['applyStaffRole']>[0],
  ): ReturnType<MoodleAdapter['applyStaffRole']> {
    return this.refuseScope();
  }
  applyGroupMember(
    _input: Parameters<MoodleAdapter['applyGroupMember']>[0],
  ): ReturnType<MoodleAdapter['applyGroupMember']> {
    return this.refuseScope();
  }
  suspendAccess(
    _input: Parameters<MoodleAdapter['suspendAccess']>[0],
  ): ReturnType<MoodleAdapter['suspendAccess']> {
    return this.refuseScope();
  }
  listActualEnrolments(
    _shell: Parameters<MoodleAdapter['listActualEnrolments']>[0],
  ): ReturnType<MoodleAdapter['listActualEnrolments']> {
    return this.refuseScope();
  }
  listActualGroupMembers(
    _shell: Parameters<MoodleAdapter['listActualGroupMembers']>[0],
  ): ReturnType<MoodleAdapter['listActualGroupMembers']> {
    return this.refuseScope();
  }

  async validateConnection(): Promise<{
    ok: boolean;
    backend: MoodleBackend;
    version: string | null;
    numericVersion: string | null;
    detail: string;
  }> {
    try {
      const site = parseSiteInfo(
        await this.call<unknown>('core_webservice_get_site_info', {}),
      );
      const identity = assertTargetIdentity(this.config, {
        host: normalizeHost(new URL(this.config.baseUrl).hostname),
        siteId: site.siteId,
        release: site.release,
      });
      if (!identity.ok) {
        throw new MoodleApiError(
          false,
          'Moodle target identity differs.',
          'MOODLE_IDENTITY_MISMATCH',
        );
      }
      return {
        ok: true,
        backend: this.backend,
        version: site.release,
        numericVersion: site.numericVersion || null,
        detail:
          'Read-only Moodle target identity verified. Live operations remain disabled.',
      };
    } catch (error) {
      // parseSiteInfo and all unknown errors are reduced to a stable code;
      // neither the server's sitename nor arbitrary Error.message is exposed.
      const code =
        error instanceof MoodleApiError
          ? error.code
          : 'MOODLE_IDENTITY_INVALID';
      return {
        ok: false,
        backend: this.backend,
        version: null,
        numericVersion: null,
        detail: `Read-only Moodle validation failed: ${code}.`,
      };
    }
  }
}
