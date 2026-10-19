import { describe, expect, it, vi } from 'vitest';
import { MoodleWriteTransport } from './moodle-write-transport.js';
import type { LiveTestDescriptor } from './moodle-live-config.js';
const descriptor = {
  baseUrl: 'https://example.moodlecloud.com',
  restPath: '/webservice/rest/server.php',
  token: 'private-token',
  timeoutMs: 1000,
  host: 'example.moodlecloud.com',
  siteId: 1,
  release: '5.2',
  categoryId: 3,
  courseVisible: 1,
  roleIds: { Student: 5 },
  runId: 'run',
  dbFingerprint: '0'.repeat(64),
  cohortPrefix: 'SIS-MOODLE-LIVE-TEST-',
  configFingerprint: '1'.repeat(64),
} satisfies LiveTestDescriptor;
const response = (v: unknown) =>
  new Response(JSON.stringify(v), {
    headers: { 'content-type': 'application/json' },
  });
describe('Moodle write transport', () => {
  it('does not mistake the self-enrolment projection for proof that manual enrolment is disabled', async () => {
    const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => {
      const fn = (options?.body as URLSearchParams).get('wsfunction');
      return response(fn === 'core_course_get_courses_by_field' ? { courses: [{ id: 9, categoryid: 3, idnumber: 'course-9', shortname: 'Physics' }] } : []);
    });
    const api = new MoodleWriteTransport(descriptor, fetcher as typeof fetch);
    expect(await api.courseIdentity(9)).toMatchObject({ id: 9, idnumber: 'course-9' });
  });
  it('finds an exact existing identity and never creates a duplicate', async () => {
    const fetcher = vi.fn(async (_url: unknown, _options?: RequestInit) =>
      response([
        { id: 9, idnumber: 'sis-student:1', username: 'sis.student.1' },
      ]),
    );
    const api = new MoodleWriteTransport(descriptor, fetcher as typeof fetch);
    expect(
      await api.ensureUser({
        idnumber: 'sis-student:1',
        username: 'sis.student.1',
        firstName: 'Lombe',
        lastName: 'Banda',
        email: 'lombe@example.invalid',
      }),
    ).toBe(9);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((fetcher.mock.calls[0]![0] as URL).href).not.toContain(
      'private-token',
    );
  });
  it('refuses identity collisions instead of picking a first match', async () => {
    const api = new MoodleWriteTransport(
      descriptor,
      vi.fn(async (_url: unknown, _options?: RequestInit) =>
        response([{ id: 9 }, { id: 10 }]),
      ) as typeof fetch,
    );
    await expect(
      api.ensureUser({
        idnumber: 'sis-student:1',
        username: 'sis.student.1',
        firstName: 'Lombe',
        lastName: 'Banda',
        email: 'lombe@example.invalid',
      }),
    ).rejects.toThrow('IDENTITY_CONFLICT');
  });
  it('suspends rather than deleting Moodle enrolments', async () => {
    const fetcher = vi.fn(async (_url: unknown, _options?: RequestInit) =>
      response(null),
    );
    const api = new MoodleWriteTransport(descriptor, fetcher as typeof fetch);
    await api.setEnrolment(9, 4, 5, true);
    const options = fetcher.mock.calls[0]?.[1] as RequestInit;
    const body = new URLSearchParams(
      (options.body as URLSearchParams).toString(),
    );
    expect(body.get('wsfunction')).toBe('enrol_manual_enrol_users');
    expect(body.get('enrolments[0][suspend]')).toBe('1');
  });
  it('never exposes Moodle exception text or token in errors', async () => {
    const api = new MoodleWriteTransport(
      descriptor,
      vi.fn(async (_url: unknown, _options?: RequestInit) =>
        response({ exception: 'bad', message: 'private-token secret' }),
      ) as typeof fetch,
    );
    await expect(api.setEnrolment(9, 4, 5, false)).rejects.toThrow(
      /^MOODLE_REMOTE_REFUSAL$/,
    );
  });
});
