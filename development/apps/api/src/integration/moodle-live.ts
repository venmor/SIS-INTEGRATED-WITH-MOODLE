import { MOODLE_DEMO_V1 as policy } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  liveWritesEnabled,
  type ActualEnrolment,
  type ActualGroupMember,
  type MoodleAdapter,
  type MoodleBackend,
  type ShellHandle,
} from './moodle-adapter.js';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Permanent vs retryable delivery failure from the live API. */
export class MoodleApiError extends Error {
  constructor(
    public readonly retryable: boolean,
    message: string,
  ) {
    super(message);
  }
}

interface LiveConfig {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  restPath: string;
}

function liveConfig(): LiveConfig | null {
  const baseUrl = (process.env.MOODLE_API_URL ?? '').trim().replace(/\/+$/, '');
  const token = (process.env.MOODLE_API_TOKEN ?? '').trim();
  if (baseUrl === '' || token === '') return null;
  const live = policy.live as unknown as {
    timeoutMs: number;
    restPath: string;
  };
  return { baseUrl, token, timeoutMs: live.timeoutMs, restPath: live.restPath };
}

function roleIds(): Record<string, number> {
  try {
    return JSON.parse(process.env.MOODLE_ROLE_IDS ?? '{}') as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function appendFormValue(
  form: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendFormValue(form, `${key}[${index}]`, item),
    );
    return;
  }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      appendFormValue(form, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  if (typeof value === 'boolean') {
    form.append(key, value ? '1' : '0');
    return;
  }
  form.append(key, String(value));
}

function moodleForm(params: Record<string, unknown>): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendFormValue(form, key, value);
  }
  return form;
}

/**
 * Live Moodle adapter (External Services REST). Engages only with
 * explicit URL + token configuration; otherwise the factory never
 * constructs it. Identity mapping: SIS studentNumber <-> Moodle
 * idnumber; staff account <-> idnumber(account username).
 *
 * Mapping decisions (documented, reviewable):
 * - suspend maps to manual unenrol with the reason retained in the
 *   delivery evidence (Moodle manual enrolment exposes no suspend flag
 *   through supported web services).
 * - role shortnames resolve through MOODLE_ROLE_IDS (instance-specific
 *   numeric ids differ per Moodle site and cannot be guessed).
 */
export class LiveMoodleAdapter implements MoodleAdapter {
  readonly backend: MoodleBackend = 'live';
  private readonly config: LiveConfig;

  constructor(
    private readonly prisma: PrismaService,
    config?: LiveConfig | null,
  ) {
    const resolved = config ?? liveConfig();
    if (!resolved) {
      throw new MoodleApiError(false, 'Live Moodle is not configured.');
    }
    this.config = resolved;
  }

  /** SIS student row id -> Moodle idnumber (student number, never name). */
  private async studentIdnumber(studentId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new MoodleApiError(false, 'SIS student vanished mid-delivery.');
    }
    return student.studentNumber;
  }

  /** SIS TG row id -> Moodle group name (TG name, stable per offering). */
  private async groupName(groupId: string): Promise<string> {
    const group = await this.prisma.tutorialGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new MoodleApiError(false, 'SIS tutorial group vanished.');
    }
    return group.name;
  }

  /** Staff account id -> Moodle idnumber (username, never email). */
  private async staffIdnumber(accountId: string): Promise<string> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new MoodleApiError(false, 'SIS staff account vanished.');
    }
    return `staff-${account.username}`;
  }

  private async call<T>(
    wsfunction: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const live = policy.live as unknown as {
      tokenParam: string;
      formatParam: Record<string, string>;
    };
    const url = new URL(
      this.config.restPath,
      this.config.baseUrl + '/',
    );
    // Keep the credential out of the request URL so reverse-proxy and APM
    // access logs do not capture it. Moodle REST merges GET + POST params.
    for (const [k, v] of Object.entries(live.formatParam)) {
      url.searchParams.set(k, v);
    }
    url.searchParams.set('wsfunction', wsfunction);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let res: Response;
    try {
      const form = moodleForm(params);
      form.set(live.tokenParam, this.config.token);
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: form.toString(),
        signal: controller.signal,
      });
    } catch (error) {
      throw new MoodleApiError(
        true,
        `Moodle request failed: ${(error as Error).name === 'AbortError' ? 'timeout' : 'connection'}.`,
      );
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new MoodleApiError(
        res.status >= 500 || res.status === 429,
        `Moodle HTTP ${res.status}.`,
      );
    }
    const data = (await res.json()) as
      | { exception?: string; errorcode?: string; message?: string }
      | T;
    if (
      typeof data === 'object' &&
      data !== null &&
      'exception' in data &&
      typeof (data as { exception?: unknown }).exception === 'string'
    ) {
      const err = data as { errorcode?: string; message?: string };
      const transient = ['servicenotavailable', 'dmlwriteexception'].includes(
        err.errorcode ?? '',
      );
      throw new MoodleApiError(
        transient,
        `Moodle ${err.errorcode ?? 'error'}.`,
      );
    }
    return data as T;
  }

  private assertWritesEnabled(): void {
    if (!liveWritesEnabled()) {
      throw new MoodleApiError(
        false,
        'Live Moodle writes are disabled. Set MOODLE_LIVE_WRITES=true only after connection validation and mapping review.',
      );
    }
  }

  private async courseIdByShortname(shortname: string): Promise<number | null> {
    const found = await this.call<
      | Array<{ id: number; shortname?: string }>
      | { courses?: Array<{ id: number; shortname?: string }> }
    >('core_course_get_courses_by_field', {
      field: 'shortname',
      value: shortname,
    });
    const courses = Array.isArray(found) ? found : found.courses ?? [];
    const exact = courses.find((course) => course.shortname === shortname);
    return exact?.id ?? null;
  }

  private async userIdByIdnumber(idnumber: string): Promise<number | null> {
    const found = await this.call<{ users?: Array<{ id: number }> }>(
      'core_user_get_users',
      { criteria: [{ key: 'idnumber', value: idnumber }] },
    );
    const users = found.users ?? [];
    return users.length > 0 ? users[0].id : null;
  }

  async ensureShell(input: {
    db: Tx;
    shellRef: string;
    offeringId: string;
    periodId: string;
  }): Promise<{ id: string; created: boolean }> {
    void input.db;
    void input.offeringId;
    void input.periodId;
    const existing = await this.courseIdByShortname(input.shellRef);
    if (existing !== null) return { id: String(existing), created: false };
    this.assertWritesEnabled();
    const categoryId = Number(process.env.MOODLE_CATEGORY_ID ?? '1');
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new MoodleApiError(false, 'MOODLE_CATEGORY_ID must be a positive integer.');
    }
    const created = await this.call<Array<{ id: number }>>(
      'core_course_create_courses',
      {
        courses: [
          {
            fullname: input.shellRef,
            shortname: input.shellRef,
            categoryid: categoryId,
            visible: 0,
          },
        ],
      },
    );
    if (!Array.isArray(created) || created.length === 0) {
      throw new MoodleApiError(false, 'Moodle shell creation returned nothing.');
    }
    return { id: String(created[0].id), created: true };
  }

  async applyEnrolment(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    role: string;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS' | 'MISMATCHED'> {
    void input.db;
    void input.scenario;
    const courseId = Number(input.shell.id);
    const userId = await this.userIdByIdnumber(
      await this.studentIdnumber(input.studentId),
    );
    if (userId === null) {
      throw new MoodleApiError(false, 'Moodle user missing for student.');
    }
    const expectedRoleId = this.roleId(input.role);
    const enrolled = await this.call<
      Array<{ id: number; roles?: Array<{ roleid?: number }> }>
    >('core_enrol_get_enrolled_users', { courseid: courseId });
    const current = enrolled.find((user) => user.id === userId);
    if (
      current?.roles?.some((role) => role.roleid === expectedRoleId)
    ) {
      return 'EXISTS';
    }

    this.assertWritesEnabled();
    await this.call('enrol_manual_enrol_users', {
      enrolments: [
        { roleid: expectedRoleId, userid: userId, courseid: courseId },
      ],
    });
    return 'CREATED';
  }

  async applyRemoval(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    scenario: string;
  }): Promise<'SUSPENDED' | 'ABSENT'> {
    void input.db;
    void input.scenario;
    const courseId = Number(input.shell.id);
    const userId = await this.userIdByIdnumber(
      await this.studentIdnumber(input.studentId),
    );
    if (userId === null) return 'ABSENT';
    const enrolled = await this.call<Array<{ id: number }>>(
      'core_enrol_get_enrolled_users',
      { courseid: courseId },
    );
    if (!enrolled.some((u) => u.id === userId)) return 'ABSENT';
    this.assertWritesEnabled();
    await this.call('enrol_manual_unenrol_users', {
      enrolments: [{ userid: userId, courseid: courseId }],
    });
    return 'SUSPENDED';
  }

  async applyStaffRole(input: {
    db: Tx;
    shell: ShellHandle;
    accountId: string;
    moodleRole: string;
    quizScope: unknown;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS'> {
    void input.db;
    void input.quizScope;
    void input.scenario;
    const courseId = Number(input.shell.id);
    const userId = await this.userIdByIdnumber(
      await this.staffIdnumber(input.accountId),
    );
    if (userId === null) {
      throw new MoodleApiError(false, 'Moodle user missing for staff.');
    }
    const expectedRoleId = this.roleId(input.moodleRole);
    const enrolled = await this.call<
      Array<{ id: number; roles?: Array<{ roleid?: number }> }>
    >('core_enrol_get_enrolled_users', { courseid: courseId });
    const current = enrolled.find((user) => user.id === userId);
    if (
      current?.roles?.some((role) => role.roleid === expectedRoleId)
    ) {
      return 'EXISTS';
    }
    this.assertWritesEnabled();
    await this.call('enrol_manual_enrol_users', {
      enrolments: [
        {
          roleid: expectedRoleId,
          userid: userId,
          courseid: courseId,
        },
      ],
    });
    return 'CREATED';
  }

  async applyGroupMember(input: {
    db: Tx;
    shell: ShellHandle;
    groupId: string;
    studentId: string;
    scenario: string;
    remove?: boolean;
  }): Promise<'CREATED' | 'EXISTS' | 'SUSPENDED' | 'ABSENT'> {
    void input.db;
    void input.scenario;
    const courseId = Number(input.shell.id);
    const wanted = await this.groupName(input.groupId);
    const groups = await this.call<Array<{ id: number; name: string }>>(
      'core_group_get_course_groups',
      { courseid: courseId },
    );
    let group = groups.find((g) => g.name === wanted);
    if (!group) {
      if (input.remove) return 'ABSENT';
      this.assertWritesEnabled();
      const created = await this.call<Array<{ id: number }>>(
        'core_group_create_groups',
        { groups: [{ courseid: courseId, name: wanted }] },
      );
      group = { id: created[0].id, name: wanted };
    }
    const userId = await this.userIdByIdnumber(
      await this.studentIdnumber(input.studentId),
    );
    if (userId === null) return 'ABSENT';

    const memberships = await this.call<
      Array<{ groupid: number; userids: number[] }>
    >('core_group_get_group_members', { groupids: [group.id] });
    const alreadyMember =
      memberships.find((membership) => membership.groupid === group.id)
        ?.userids.includes(userId) ?? false;

    if (input.remove) {
      if (!alreadyMember) return 'ABSENT';
      this.assertWritesEnabled();
      await this.call('core_group_delete_group_members', {
        members: [{ groupid: group.id, userid: userId }],
      });
      return 'SUSPENDED';
    }
    if (alreadyMember) return 'EXISTS';

    this.assertWritesEnabled();
    await this.call('core_group_add_group_members', {
      members: [{ groupid: group.id, userid: userId }],
    });
    return 'CREATED';
  }

  async suspendAccess(input: {
    db: Tx;
    shell: ShellHandle;
    studentKey: string;
  }): Promise<'SUSPENDED' | 'ABSENT'> {
    void input.db;
    // Live mapping decision (documented): Moodle manual enrolment
    // exposes no suspend flag through supported web services, so
    // governed suspension unenrols while the SIS case preserves the
    // full history and reason.
    const userId = await this.userIdByIdnumber(input.studentKey);
    if (userId === null) return 'ABSENT';
    this.assertWritesEnabled();
    await this.call('enrol_manual_unenrol_users', {
      enrolments: [{ userid: userId, courseid: Number(input.shell.id) }],
    });
    return 'SUSPENDED';
  }

  async listActualEnrolments(
    shell: ShellHandle,
  ): Promise<ActualEnrolment[]> {
    const courseId = Number(shell.id);
    const enrolled = await this.call<
      Array<{
        id: number;
        idnumber?: string;
        roles?: Array<{ shortname?: string }>;
      }>
    >('core_enrol_get_enrolled_users', { courseid: courseId });

    return enrolled
      .filter(
        (user) =>
          typeof user.idnumber === 'string' &&
          user.idnumber !== '' &&
          (user.roles ?? []).some(
            (role) => (role.shortname ?? '').toLowerCase() === 'student',
          ),
      )
      .map((user) => ({
        key: user.idnumber as string,
        role: 'Student',
        status: 'ACTIVE' as const,
      }));
  }

  async listActualGroupMembers(
    shell: ShellHandle,
  ): Promise<ActualGroupMember[]> {
    const courseId = Number(shell.id);
    const groups = await this.call<Array<{ id: number; name: string }>>(
      'core_group_get_course_groups',
      { courseid: courseId },
    );
    if (groups.length === 0) return [];

    const memberships = await this.call<
      Array<{ groupid: number; userids: number[] }>
    >('core_group_get_group_members', {
      groupids: groups.map((group) => group.id),
    });
    const enrolled = await this.call<Array<{ id: number; idnumber?: string }>>(
      'core_enrol_get_enrolled_users',
      { courseid: courseId },
    );
    const idnumberByUserId = new Map(
      enrolled
        .filter(
          (user) =>
            typeof user.idnumber === 'string' &&
            user.idnumber !== '' &&
            !user.idnumber.startsWith('staff-'),
        )
        .map((user) => [user.id, user.idnumber as string]),
    );
    const groupNameById = new Map(
      groups.map((group) => [group.id, group.name]),
    );

    const out: ActualGroupMember[] = [];
    for (const membership of memberships) {
      const groupName = groupNameById.get(membership.groupid);
      if (!groupName) continue;
      for (const userId of membership.userids) {
        const idnumber = idnumberByUserId.get(userId);
        if (!idnumber) continue;
        out.push({
          groupKey: groupName,
          studentKey: idnumber,
          status: 'ACTIVE',
        });
      }
    }
    return out;
  }

  async validateConnection(): Promise<{
    ok: boolean;
    backend: MoodleBackend;
    version: string | null;
    detail: string;
  }> {
    try {
      const site = await this.call<{ version?: string; sitename?: string }>(
        'core_webservice_get_site_info',
        {},
      );
      return {
        ok: true,
        backend: 'live',
        version: site.version ?? null,
        detail: `Connected to ${site.sitename ?? 'Moodle'}. Live writes are ${liveWritesEnabled() ? 'enabled' : 'disabled'}.`,
      };
    } catch (error) {
      return {
        ok: false,
        backend: 'live',
        version: null,
        detail: `Live connection failed: ${(error as Error).message}`,
      };
    }
  }

  private roleId(shortname: string): number {
    const ids = roleIds();
    const id = ids[shortname];
    if (!Number.isInteger(id)) {
      throw new MoodleApiError(
        false,
        `No MOODLE_ROLE_IDS entry for "${shortname}".`,
      );
    }
    return id;
  }

}
