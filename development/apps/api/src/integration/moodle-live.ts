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
import { MoodleWriteTransport } from './moodle-write-transport.js';

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
> &
  Partial<
    Pick<
      LiveTestDescriptor,
      'roleIds' | 'categoryId' | 'courseVisible' | 'runId' | 'dbFingerprint'
    >
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
  private readonly writeTarget: LiveTestDescriptor | null;

  constructor(_prisma: PrismaService, config?: LiveConfig | null) {
    this.config = resolveConfig(config);
    const candidate = this.config as Partial<LiveTestDescriptor>;
    this.writeTarget =
      candidate.roleIds &&
      Number.isSafeInteger(candidate.categoryId) &&
      (candidate.courseVisible === 0 || candidate.courseVisible === 1)
        ? (this.config as LiveTestDescriptor)
        : null;
  }

  /**
   * The write transport is created only from a complete validated descriptor.
   * A read-only fixture (loopback test or missing role/category settings)
   * cannot write, and every write method refuses before touching Prisma or
   * the network.
   */
  private remote(): MoodleWriteTransport {
    if (!this.writeTarget) {
      throw new MoodleApiError(
        false,
        'LIVE_SCOPE_PREREQUISITES_MISSING',
        'LIVE_SCOPE_PREREQUISITES_MISSING',
      );
    }
    return new MoodleWriteTransport(this.writeTarget);
  }

  private async remoteRun<T>(
    operation: (remote: MoodleWriteTransport) => Promise<T>,
  ): Promise<T> {
    const remote = this.remote();
    try {
      return await operation(remote);
    } catch (error) {
      if (error instanceof MoodleApiError) throw error;
      const raw = error instanceof Error ? error.message : '';
      const code = /^[A-Z][A-Z0-9_]*$/.test(raw)
        ? raw
        : 'MOODLE_OPERATION_FAILED';
      throw new MoodleApiError(
        code === 'MOODLE_OUTCOME_UNKNOWN',
        `Moodle operation failed: ${code}.`,
        code,
      );
    }
  }

  private roleId(role: string): number {
    const map = this.writeTarget?.roleIds ?? {};
    const aliases: Record<string, string[]> = {
      student: ['Student', 'student'],
      teacher: ['Teacher', 'teacher', 'editingteacher'],
      tutor: ['Tutor', 'tutor', 'editingteacher'],
      editingteacher: ['editingteacher', 'Teacher'],
    };
    const key = role.trim();
    const candidates = [
      key,
      key.toLowerCase(),
      ...(aliases[key.toLowerCase()] ?? []),
    ];
    for (const candidate of candidates) {
      const id = map[candidate];
      if (Number.isSafeInteger(id) && id > 0) return id;
    }
    throw new MoodleApiError(
      false,
      `MOODLE_ROLE_ID_REQUIRED:${key || 'unknown'}`,
      'MOODLE_ROLE_ID_REQUIRED',
    );
  }

  private courseId(shell: { id: string }): number {
    if (!/^[1-9][0-9]*$/.test(shell.id)) {
      throw new MoodleApiError(
        false,
        'MOODLE_SHELL_ID_INVALID',
        'MOODLE_SHELL_ID_INVALID',
      );
    }
    const id = Number(shell.id);
    if (!Number.isSafeInteger(id) || id < 2) {
      throw new MoodleApiError(
        false,
        'MOODLE_SHELL_ID_INVALID',
        'MOODLE_SHELL_ID_INVALID',
      );
    }
    return id;
  }

  private personName(displayName: string): { first: string; last: string } {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      throw new MoodleApiError(
        false,
        'SRC_NAME_MISSING',
        'SRC_NAME_MISSING',
      );
    }
    return {
      first: parts[0]!,
      last: parts.slice(1).join(' ') || parts[0]!,
    };
  }

  private demoPassword(): string | undefined {
    return process.env.DEMO_MODE === 'true' &&
      (process.env.MOODLE_DEMO_INITIAL_PASSWORD?.length ?? 0) >= 12
      ? process.env.MOODLE_DEMO_INITIAL_PASSWORD
      : undefined;
  }

  private async call<T>(
    wsfunction: string,
    parameters: Record<string, unknown>,
    gradeRead = false,
  ): Promise<T> {
    // This secondary guard also blocks an accidental future public-method
    // bypass: the approved baseline allowlist alone does not authorize writes.
    if (
      !(gradeRead && wsfunction === 'gradereport_user_get_grade_items') &&
      (wsfunction !== 'core_webservice_get_site_info' ||
        !(MOODLE_LIVE_V1.authorisedFunctions as readonly string[]).includes(
          wsfunction,
        ))
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

  /** Caller must authorize the lecturer, persisted run and exact participant
   * bindings before invoking this transport. No broad userid=0 grade export.
   * This method cannot provision users, enrol anyone or publish results. */
  async readGradeItems(courseId: number, userIds: number[]): Promise<unknown> {
    if (
      !Number.isSafeInteger(courseId) ||
      courseId < 1 ||
      !userIds.length ||
      userIds.length > 200 ||
      new Set(userIds).size !== userIds.length ||
      userIds.some((id) => !Number.isSafeInteger(id) || id < 1)
    )
      parametersInvalid();
    const raw = await this.call<Record<string, unknown>>(
      'core_webservice_get_site_info',
      {},
    );
    const site = parseSiteInfo(raw);
    if (
      !assertTargetIdentity(this.config, {
        host: this.config.host,
        siteId: site.siteId,
        release: site.release,
      }).ok
    )
      throw new MoodleApiError(
        false,
        'Moodle target identity differs.',
        'MOODLE_IDENTITY_MISMATCH',
      );
    if (
      !Array.isArray(raw.functions) ||
      !raw.functions.some(
        (f: unknown) =>
          typeof f === 'object' &&
          f !== null &&
          (f as { name?: unknown }).name === 'gradereport_user_get_grade_items',
      )
    )
      throw new MoodleApiError(
        false,
        'Add gradereport_user_get_grade_items to the Moodle external service.',
        'MOODLE_GRADE_FUNCTION_REQUIRED',
      );
    const usergrades: unknown[] = [];
    // Bound concurrency and avoid a partial snapshot if any user read fails.
    for (let start = 0; start < userIds.length; start += 4) {
      const pages = await Promise.all(
        userIds.slice(start, start + 4).map(async (userid) => {
          const data = await this.call<Record<string, unknown>>(
            'gradereport_user_get_grade_items',
            { courseid: courseId, userid, groupid: 0 },
            true,
          );
          if (
            !Array.isArray(data.usergrades) ||
            data.usergrades.length !== 1 ||
            typeof data.usergrades[0] !== 'object' ||
            data.usergrades[0] === null ||
            (data.usergrades[0] as { userid?: unknown }).userid !== userid ||
            (data.usergrades[0] as { courseid?: unknown }).courseid !== courseId
          )
            throw new MoodleApiError(
              false,
              'Moodle returned an incomplete participant grade report.',
              'MOODLE_GRADE_RESPONSE_INCOMPLETE',
            );
          return data.usergrades;
        }),
      );
      usergrades.push(...pages.flat());
    }
    return { usergrades, warnings: [] };
  }

  ensureShell(
    input: Parameters<MoodleAdapter['ensureShell']>[0],
  ): ReturnType<MoodleAdapter['ensureShell']> {
    return this.remoteRun(async (remote) => {
      const offering = await input.db.programmeOffering.findUnique({
        where: { id: input.offeringId },
        include: { programme: true },
      });
      if (!offering) {
        throw new MoodleApiError(
          false,
          'SRC_OFFERING_GONE',
          'SRC_OFFERING_GONE',
        );
      }
      const period = await input.db.academicPeriod.findUnique({
        where: { id: input.periodId },
      });
      if (!period) {
        throw new MoodleApiError(false, 'SRC_PERIOD_GONE', 'SRC_PERIOD_GONE');
      }
      const id = await remote.ensureCourse({
        idnumber: input.shellRef,
        shortname: input.shellRef,
        fullname: `${offering.programme.name} — ${period.code}`,
      });
      return { id: String(id), created: false };
    });
  }

  applyEnrolment(
    input: Parameters<MoodleAdapter['applyEnrolment']>[0],
  ): ReturnType<MoodleAdapter['applyEnrolment']> {
    return this.remoteRun(async (remote) => {
      const student = await input.db.student.findUnique({
        where: { id: input.studentId },
        include: { person: true },
      });
      if (!student) {
        throw new MoodleApiError(false, 'SRC_STUDENT_GONE', 'SRC_STUDENT_GONE');
      }
      if (
        student.status !== 'ACTIVE' ||
        student.person.status !== 'ACTIVE'
      ) {
        throw new MoodleApiError(
          false,
          'SRC_STUDENT_INACTIVE',
          'SRC_STUDENT_INACTIVE',
        );
      }
      const courseId = this.courseId(input.shell);
      const roleId = this.roleId(input.role || 'Student');
      const names = this.personName(student.person.displayName);
      const idnumber = `SIS-STUDENT-${student.id}`;
      const username = `sis.${student.id.toLowerCase()}`;
      const email =
        student.person.email ?? `${student.id}@sis-demo.invalid`;
      const bootstrapPassword = this.demoPassword();
      const userId = await remote.ensureUser({
        idnumber,
        username,
        firstName: names.first,
        lastName: names.last,
        email,
        ...(bootstrapPassword ? { bootstrapPassword } : {}),
      });
      const current = await remote.listEnrolments(courseId);
      const prior = current.find((user) => user.id === userId);
      const hadRole =
        prior &&
        Array.isArray(prior.roles) &&
        prior.roles.some(
          (role: Record<string, unknown>) => role.roleid === roleId,
        );
      if (hadRole) return 'EXISTS';
      await remote.setEnrolment(userId, courseId, roleId, false);
      await remote.verifyEnrolment(userId, courseId, roleId);
      return prior ? 'EXISTS' : 'CREATED';
    });
  }

  applyRemoval(
    input: Parameters<MoodleAdapter['applyRemoval']>[0],
  ): ReturnType<MoodleAdapter['applyRemoval']> {
    return this.suspendAccess({
      db: input.db,
      shell: input.shell,
      studentKey: input.studentId,
    });
  }

  applyStaffRole(
    input: Parameters<MoodleAdapter['applyStaffRole']>[0],
  ): ReturnType<MoodleAdapter['applyStaffRole']> {
    return this.remoteRun(async (remote) => {
      const account = await input.db.account.findUnique({
        where: { id: input.accountId },
        include: { person: true },
      });
      if (!account) {
        throw new MoodleApiError(false, 'SRC_ACCOUNT_GONE', 'SRC_ACCOUNT_GONE');
      }
      const courseId = this.courseId(input.shell);
      const roleId = this.roleId(input.moodleRole || 'Teacher');
      const names = this.personName(account.person.displayName);
      const idnumber = `SIS-STAFF-${account.id}`;
      const username = `sis.staff.${account.id.toLowerCase()}`;
      const email = account.person.email ?? `${account.id}@sis-demo.invalid`;
      const bootstrapPassword = this.demoPassword();
      const userId = await remote.ensureUser({
        idnumber,
        username,
        firstName: names.first,
        lastName: names.last,
        email,
        ...(bootstrapPassword ? { bootstrapPassword } : {}),
      });
      const current = await remote.listEnrolments(courseId);
      const prior = current.find((user) => user.id === userId);
      const hadRole =
        prior &&
        Array.isArray(prior.roles) &&
        prior.roles.some(
          (role: Record<string, unknown>) => role.roleid === roleId,
        );
      if (hadRole) return 'EXISTS';
      await remote.setEnrolment(userId, courseId, roleId, false);
      await remote.verifyEnrolment(userId, courseId, roleId);
      return prior ? 'EXISTS' : 'CREATED';
    });
  }

  applyGroupMember(
    _input: Parameters<MoodleAdapter['applyGroupMember']>[0],
  ): ReturnType<MoodleAdapter['applyGroupMember']> {
    if (!this.writeTarget) return this.refuseScope();
    return Promise.reject(
      new MoodleApiError(
        false,
        'Moodle group functions are not authorised on this token.',
        'MOODLE_GROUP_FUNCTION_REQUIRED',
      ),
    );
  }

  suspendAccess(
    input: Parameters<MoodleAdapter['suspendAccess']>[0],
  ): ReturnType<MoodleAdapter['suspendAccess']> {
    return this.remoteRun(async (remote) => {
      const courseId = this.courseId(input.shell);
      const users = await remote.usersByIdnumber(
        `SIS-STUDENT-${input.studentKey}`,
      );
      if (!users.length) return 'ABSENT';
      const userId = Number(users[0]?.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new MoodleApiError(
          false,
          'MOODLE_IDENTIFIERS_INVALID',
          'MOODLE_IDENTIFIERS_INVALID',
        );
      }
      const current = await remote.listEnrolments(courseId);
      const enrolled = current.find((user) => user.id === userId);
      if (!enrolled) {
        try {
          await remote.verifySuspended(userId, courseId);
          return 'SUSPENDED';
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'MOODLE_SUSPENSION_NOT_CONFIRMED'
          )
            return 'ABSENT';
          throw error;
        }
      }
      const existingRole =
        Array.isArray(enrolled.roles) && enrolled.roles[0]
          ? Number((enrolled.roles[0] as Record<string, unknown>).roleid)
          : NaN;
      const roleId =
        Number.isSafeInteger(existingRole) && existingRole > 0
          ? existingRole
          : this.roleId('Student');
      await remote.setEnrolment(userId, courseId, roleId, true);
      await remote.verifySuspended(userId, courseId);
      return 'SUSPENDED';
    });
  }

  listActualEnrolments(
    shell: Parameters<MoodleAdapter['listActualEnrolments']>[0],
  ): ReturnType<MoodleAdapter['listActualEnrolments']> {
    if (!this.writeTarget) return this.refuseScope();
    return this.remoteRun(async (remote) => {
      const courseId = this.courseId(shell);
      const users = await remote.listEnrolments(courseId);
      const result: {
        key: string;
        role: string;
        status: 'ACTIVE' | 'SUSPENDED';
      }[] = [];
      for (const user of users) {
        const idnumber =
          typeof user.idnumber === 'string' ? user.idnumber : '';
        if (!idnumber) continue;
        const role =
          Array.isArray(user.roles) &&
          user.roles[0] &&
          typeof (user.roles[0] as Record<string, unknown>).shortname ===
            'string'
            ? String((user.roles[0] as Record<string, unknown>).shortname)
            : '';
        result.push({
          key: idnumber.startsWith('SIS-STUDENT-')
            ? idnumber.slice('SIS-STUDENT-'.length)
            : idnumber,
          role,
          status: 'ACTIVE',
        });
      }
      return result;
    });
  }

  listActualGroupMembers(
    _shell: Parameters<MoodleAdapter['listActualGroupMembers']>[0],
  ): ReturnType<MoodleAdapter['listActualGroupMembers']> {
    if (!this.writeTarget) return this.refuseScope();
    return Promise.resolve([]);
  }

  async validateConnection(): Promise<{
    ok: boolean;
    backend: MoodleBackend;
    version: string | null;
    numericVersion: string | null;
    detail: string;
  }> {
    try {
      const raw = await this.call<unknown>('core_webservice_get_site_info', {});
      const site = parseSiteInfo(raw);
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
      if (this.writeTarget) {
        const required = [
          'core_course_get_courses_by_field',
          'core_course_create_courses',
          'core_user_get_users_by_field',
          'core_user_create_users',
          'enrol_manual_enrol_users',
          'core_enrol_get_enrolled_users',
        ];
        const functions =
          raw &&
          typeof raw === 'object' &&
          Array.isArray((raw as { functions?: unknown }).functions)
            ? new Set(
                (
                  (raw as { functions: { name?: unknown }[] }).functions
                ).map((fn) => fn?.name),
              )
            : new Set<unknown>();
        const missing = required.filter((name) => !functions.has(name));
        if (missing.length) {
          return {
            ok: false,
            backend: this.backend,
            version: site.release,
            numericVersion: site.numericVersion || null,
            detail: `Live write functions are missing: ${missing.join(', ')}.`,
          };
        }
        return {
          ok: true,
          backend: this.backend,
          version: site.release,
          numericVersion: site.numericVersion || null,
          detail:
            'Live Moodle target identity verified. Provisioning writes are enabled.',
        };
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
