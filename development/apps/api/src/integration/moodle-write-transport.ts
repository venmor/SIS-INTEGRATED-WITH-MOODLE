import type { LiveTestDescriptor } from './moodle-live-config.js';
import { MOODLE_LIVE_V1 } from '@sis/config';
import { assertTargetIdentity, parseSiteInfo } from './moodle-target.js';

/** Internal transport. Only a committed, run-scoped claim may construct this
 * object. It owns no SIS authority and never receives a student's SIS secret.
 * Unknown mutation outcomes are reconciled by exact identity on the next claim.
 */
export class MoodleWriteTransport {
  constructor(
    private readonly target: LiveTestDescriptor,
    private readonly transport: typeof fetch = fetch,
  ) {}

  private async request(fn: string, fields: Record<string, string | number>) {
    if (
      !(MOODLE_LIVE_V1.authorisedFunctions as readonly string[]).includes(fn)
    )
      throw new Error('MOODLE_FUNCTION_NOT_AUTHORISED');
    const body = new URLSearchParams({
      wstoken: this.target.token,
      wsfunction: fn,
      moodlewsrestformat: 'json',
    });
    for (const [key, value] of Object.entries(fields))
      body.set(key, String(value));
    let response: Response;
    try {
      response = await this.transport(
        new URL(this.target.restPath, this.target.baseUrl),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          redirect: 'manual',
          signal: AbortSignal.timeout(this.target.timeoutMs),
        },
      );
    } catch {
      throw new Error('MOODLE_OUTCOME_UNKNOWN');
    }
    if (!response.ok)
      throw new Error(
        response.status >= 500 || response.status === 429
          ? 'MOODLE_OUTCOME_UNKNOWN'
          : 'MOODLE_REMOTE_REFUSAL',
      );
    // Read with a hard byte bound rather than buffering an untrusted response.
    const reader = response.body?.getReader();
    let content = '',
      bytes = 0;
    const decoder = new TextDecoder();
    if (!reader) throw new Error('MOODLE_RESPONSE_INVALID');
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > 1024 * 1024) {
          await reader.cancel();
          throw new Error('MOODLE_RESPONSE_INVALID');
        }
        content += decoder.decode(chunk.value, { stream: true });
      }
      content += decoder.decode();
    } catch {
      throw new Error('MOODLE_OUTCOME_UNKNOWN');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('MOODLE_RESPONSE_INVALID');
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      ('exception' in parsed ||
        ('warnings' in parsed &&
          Array.isArray(parsed.warnings) &&
          parsed.warnings.length))
    )
      throw new Error('MOODLE_REMOTE_REFUSAL');
    return parsed;
  }

  async verifyTarget() {
    const info = await this.request('core_webservice_get_site_info', {});
    const parsed = parseSiteInfo(info);
    if (
      !assertTargetIdentity(this.target, { ...parsed, host: this.target.host })
        .ok
    )
      throw new Error('MOODLE_TARGET_MISMATCH');
  }

  async courseIdentity(id: number) {
    const response = await this.request('core_course_get_courses_by_field', {
      field: 'id',
      value: id,
    });
    const courses =
      response && typeof response === 'object' && 'courses' in response
        ? response.courses
        : null;
    if (
      !Array.isArray(courses) ||
      courses.length !== 1 ||
      courses[0]?.id !== id ||
      courses[0]?.categoryid !== this.target.categoryId ||
      id === 1
    )
      throw new Error('COURSE_IDENTITY_CONFLICT');
    // get_course_enrolment_methods exposes each plugin's get_enrol_info().
    // Manual enrolment does not supply that self-enrolment projection: an
    // empty result cannot prove that manual enrolment is disabled. The manual
    // write endpoint checks its actual enabled instance, and delivery is only
    // confirmed after a successful read of the enrolled user and role.
    return {
      id,
      shortname: String(courses[0].shortname),
      idnumber: String(courses[0].idnumber ?? ''),
    };
  }

  async userIdentity(id: number) {
    const users = await this.request('core_user_get_users_by_field', {
      field: 'id',
      'values[0]': id,
    });
    if (
      !Array.isArray(users) ||
      users.length !== 1 ||
      users[0]?.id !== id ||
      typeof users[0]?.idnumber !== 'string' ||
      !users[0].idnumber ||
      users[0]?.suspended
    )
      throw new Error('IDENTITY_CONFLICT');
    return {
      id,
      idnumber: String(users[0].idnumber),
      username: String(users[0].username),
    };
  }

  async verifyBoundUser(userId: number, expectedIdnumber: string) {
    const users = await this.request('core_user_get_users_by_field', {
      field: 'id',
      'values[0]': userId,
    });
    if (
      !Array.isArray(users) ||
      users.length !== 1 ||
      users[0]?.id !== userId ||
      users[0]?.idnumber !== expectedIdnumber ||
      users[0]?.suspended === true ||
      users[0]?.suspended === 1
    )
      throw new Error('IDENTITY_CONFLICT');
  }

  async usersByIdnumber(idnumber: string) {
    const users = await this.request('core_user_get_users_by_field', {
      field: 'idnumber',
      'values[0]': idnumber,
    });
    if (!Array.isArray(users)) throw new Error('MOODLE_RESPONSE_INVALID');
    return users as Record<string, unknown>[];
  }

  async listEnrolments(courseId: number) {
    const result = await this.request('core_enrol_get_enrolled_users', {
      courseid: courseId,
      'options[0][name]': 'onlyactive',
      'options[0][value]': 1,
    });
    if (!Array.isArray(result)) throw new Error('MOODLE_RESPONSE_INVALID');
    return result as Record<string, unknown>[];
  }

  async verifySuspended(userId: number, courseId: number) {
    const users = await this.request('core_enrol_get_enrolled_users', {
      courseid: courseId,
      'options[0][name]': 'onlyactive',
      'options[0][value]': 1,
    });
    if (
      !Array.isArray(users) ||
      users.some((user: Record<string, unknown>) => user.id === userId)
    )
      throw new Error('MOODLE_SUSPENSION_NOT_CONFIRMED');
  }

  async ensureUser(input: {
    idnumber: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    bootstrapPassword?: string;
    allowCreate?: boolean;
  }) {
    const found = await this.request('core_user_get_users_by_field', {
      field: 'idnumber',
      'values[0]': input.idnumber,
    });
    if (!Array.isArray(found) || found.length > 1)
      throw new Error('IDENTITY_CONFLICT');
    if (found.length === 1) {
      const user = found[0] as Record<string, unknown>;
      if (
        !Number.isSafeInteger(user.id) ||
        Number(user.id) < 1 ||
        user.idnumber !== input.idnumber ||
        user.username !== input.username
      )
        throw new Error('IDENTITY_CONFLICT');
      return Number(user.id);
    }
    if (input.allowCreate === false) throw new Error('IDENTITY_CONFLICT');
    // Moodle owns initial-password delivery. There is no shared SIS password.
    // A usable, verified contact is checked by the source claim before this call.
    const created = await this.request('core_user_create_users', {
      'users[0][username]': input.username,
      'users[0][idnumber]': input.idnumber,
      'users[0][firstname]': input.firstName,
      'users[0][lastname]': input.lastName,
      'users[0][email]': input.email,
      'users[0][auth]': 'manual',
      'users[0][createpassword]': input.bootstrapPassword ? 0 : 1,
      ...(input.bootstrapPassword
        ? {
            'users[0][password]': input.bootstrapPassword,
            'users[0][preferences][0][type]': 'auth_forcepasswordchange',
            'users[0][preferences][0][value]': 1,
          }
        : {}),
    });
    if (
      !Array.isArray(created) ||
      created.length !== 1 ||
      !Number.isSafeInteger(created[0]?.id) ||
      Number(created[0]?.id) < 1
    )
      throw new Error('MOODLE_RESPONSE_INVALID');
    return Number(created[0].id);
  }

  async ensureCourse(input: {
    idnumber: string;
    shortname: string;
    fullname: string;
  }) {
    const result = await this.request('core_course_get_courses_by_field', {
      field: 'idnumber',
      value: input.idnumber,
    });
    const courses =
      result && typeof result === 'object' && 'courses' in result
        ? result.courses
        : null;
    if (!Array.isArray(courses) || courses.length > 1)
      throw new Error('COURSE_IDENTITY_CONFLICT');
    if (courses.length === 1) {
      const course = courses[0] as Record<string, unknown>;
      if (
        !Number.isSafeInteger(course.id) ||
        Number(course.id) < 2 ||
        course.idnumber !== input.idnumber ||
        course.shortname !== input.shortname ||
        course.categoryid !== this.target.categoryId
      )
        throw new Error('COURSE_IDENTITY_CONFLICT');
      return Number(course.id);
    }
    const created = await this.request('core_course_create_courses', {
      'courses[0][idnumber]': input.idnumber,
      'courses[0][shortname]': input.shortname,
      'courses[0][fullname]': input.fullname,
      'courses[0][categoryid]': this.target.categoryId,
      'courses[0][visible]': this.target.courseVisible,
    });
    if (
      !Array.isArray(created) ||
      created.length !== 1 ||
      !Number.isSafeInteger(created[0]?.id) ||
      Number(created[0]?.id) < 2
    )
      throw new Error('MOODLE_RESPONSE_INVALID');
    return Number(created[0].id);
  }

  async setEnrolment(
    userId: number,
    courseId: number,
    roleId: number,
    suspend: boolean,
  ) {
    if (
      ![userId, courseId, roleId].every(
        (id) => Number.isSafeInteger(id) && id > 0,
      ) ||
      courseId === 1
    )
      throw new Error('MOODLE_IDENTIFIERS_INVALID');
    const result = await this.request('enrol_manual_enrol_users', {
      'enrolments[0][userid]': userId,
      'enrolments[0][courseid]': courseId,
      'enrolments[0][roleid]': roleId,
      'enrolments[0][suspend]': suspend ? 1 : 0,
    });
    if (result !== null) throw new Error('MOODLE_RESPONSE_INVALID');
  }

  async verifyEnrolment(userId: number, courseId: number, roleId: number) {
    const result = await this.request('core_enrol_get_enrolled_users', {
      courseid: courseId,
      'options[0][name]': 'onlyactive',
      'options[0][value]': 1,
    });
    if (!Array.isArray(result)) throw new Error('MOODLE_RESPONSE_INVALID');
    const user = result.filter((v: Record<string, unknown>) => v.id === userId);
    if (
      user.length !== 1 ||
      !Array.isArray(user[0].roles) ||
      !user[0].roles.some((v: Record<string, unknown>) => v.roleid === roleId)
    )
      throw new Error('MOODLE_ENROLMENT_NOT_CONFIRMED');
  }
}
