import { createServer, type Server, type IncomingMessage } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LiveMoodleAdapter,
  MoodleApiError,
} from './moodle-live.js';

process.env.MOODLE_API_URL = 'http://127.0.0.1:0';
process.env.MOODLE_API_TOKEN = 'test-token-never-real';
process.env.MOODLE_ROLE_IDS = JSON.stringify({
  Teacher: 3,
  Tutor: 4,
  'Non-editing Teacher': 4,
  Student: 5,
});

interface Seen {
  wsfunction: string | null;
  token: string | null;
  contentType: string | null;
  form: URLSearchParams;
  raw: string;
}

function stub(
  handler: (seen: Seen) => { status: number; json: unknown },
) {
  const calls: Seen[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const seen: Seen = {
        wsfunction: url.searchParams.get('wsfunction'),
        token: url.searchParams.get('wstoken'),
        contentType: req.headers['content-type'] ?? null,
        form: new URLSearchParams(raw),
        raw,
      };
      calls.push(seen);
      const out = handler(seen);
      res.writeHead(out.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out.json));
    });
  });
  return { server, calls };
}

function prismaDouble() {
  return {
    student: { findUnique: vi.fn() },
    account: { findUnique: vi.fn() },
    tutorialGroup: { findUnique: vi.fn() },
  } as never;
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  return `http://127.0.0.1:${port}`;
}

describe('LiveMoodleAdapter contract', () => {
  const oldWrites = process.env.MOODLE_LIVE_WRITES;

  beforeEach(() => {
    delete process.env.MOODLE_LIVE_WRITES;
  });

  afterEach(() => {
    process.env.MOODLE_LIVE_WRITES = oldWrites;
  });

  it('uses Moodle form encoding while keeping token and function in the request URL', async () => {
    const { server, calls } = stub(() => ({
      status: 200,
      json: { version: '4.5', sitename: 'Stub Moodle' },
    }));
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 'test-token-never-real',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      const out = await adapter.validateConnection();

      expect(out.ok).toBe(true);
      expect(out.backend).toBe('live');
      expect(calls[0].wsfunction).toBe('core_webservice_get_site_info');
      expect(calls[0].token).toBe('test-token-never-real');
      expect(calls[0].contentType).toMatch(
        /^application\/x-www-form-urlencoded/,
      );
      expect(calls[0].raw).toBe('');
    } finally {
      server.close();
    }
  });

  it('flattens nested Moodle parameters using bracket notation', async () => {
    process.env.MOODLE_LIVE_WRITES = 'true';
    const { server, calls } = stub((seen) => {
      if (seen.wsfunction === 'core_course_get_courses_by_field')
        return { status: 200, json: { courses: [] } };
      if (seen.wsfunction === 'core_course_create_courses')
        return { status: 200, json: [{ id: 42 }] };
      return {
        status: 400,
        json: {
          exception: 'nope',
          errorcode: 'invalidparameter',
          message: 'x',
        },
      };
    });
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      const created = await adapter.ensureShell({
        db: {} as never,
        shellRef: 'SWE-2026S1',
        offeringId: 'o',
        periodId: 'p',
      });

      expect(created).toEqual({ id: '42', created: true });
      const create = calls.find(
        (call) => call.wsfunction === 'core_course_create_courses',
      );
      expect(create?.form.get('courses[0][fullname]')).toBe('SWE-2026S1');
      expect(create?.form.get('courses[0][shortname]')).toBe('SWE-2026S1');
      expect(create?.form.get('courses[0][categoryid]')).toBe('1');
      expect(create?.form.get('courses[0][visible]')).toBe('0');
    } finally {
      server.close();
    }
  });

  it('keeps live mode read-only until writes are explicitly enabled', async () => {
    const { server, calls } = stub((seen) => {
      if (seen.wsfunction === 'core_course_get_courses_by_field')
        return { status: 200, json: { courses: [] } };
      return { status: 200, json: [] };
    });
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });

      await expect(
        adapter.ensureShell({
          db: {} as never,
          shellRef: 'SWE-2026S1',
          offeringId: 'o',
          periodId: 'p',
        }),
      ).rejects.toThrow(/live Moodle writes are disabled/i);
      expect(
        calls.some((call) => call.wsfunction === 'core_course_create_courses'),
      ).toBe(false);
    } finally {
      server.close();
    }
  });

  it('creates a Moodle group using the governed SIS tutorial-group name', async () => {
    process.env.MOODLE_LIVE_WRITES = 'true';
    const prisma = prismaDouble() as unknown as {
      student: { findUnique: ReturnType<typeof vi.fn> };
      tutorialGroup: { findUnique: ReturnType<typeof vi.fn> };
    };
    prisma.tutorialGroup.findUnique.mockResolvedValue({
      name: 'SWE Demo Tutorial A',
    });
    prisma.student.findUnique.mockResolvedValue({
      studentNumber: 'STU-DEMO-0001',
    });
    const { server, calls } = stub((seen) => {
      if (seen.wsfunction === 'core_group_get_course_groups')
        return { status: 200, json: [] };
      if (seen.wsfunction === 'core_group_create_groups')
        return { status: 200, json: [{ id: 90 }] };
      if (seen.wsfunction === 'core_user_get_users')
        return { status: 200, json: { users: [{ id: 77 }] } };
      if (seen.wsfunction === 'core_group_add_group_members')
        return { status: 200, json: null };
      return { status: 200, json: [] };
    });
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prisma as never, {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      await adapter.applyGroupMember({
        db: {} as never,
        shell: { id: '7', ref: 'SWE-2026S1' },
        groupId: 'sis-tg-row-id',
        studentId: 'student-row-id',
        scenario: 'SUCCESS',
      });

      const create = calls.find(
        (call) => call.wsfunction === 'core_group_create_groups',
      );
      expect(create?.form.get('groups[0][name]')).toBe(
        'SWE Demo Tutorial A',
      );
      expect(create?.form.get('groups[0][name]')).not.toBe('sis-tg-row-id');
    } finally {
      server.close();
    }
  });

  it('normalizes live student roles and excludes staff from student reconciliation', async () => {
    const { server } = stub((seen) => {
      if (seen.wsfunction === 'core_enrol_get_enrolled_users') {
        return {
          status: 200,
          json: [
            {
              id: 77,
              idnumber: 'STU-DEMO-0001',
              roles: [{ shortname: 'student' }],
            },
            {
              id: 88,
              idnumber: 'staff-mutinta.l',
              roles: [{ shortname: 'editingteacher' }],
            },
          ],
        };
      }
      return { status: 400, json: { exception: 'unexpected' } };
    });
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });

      await expect(
        adapter.listActualEnrolments({ id: '7', ref: 'SWE-2026S1' }),
      ).resolves.toEqual([
        {
          key: 'STU-DEMO-0001',
          role: 'Student',
          status: 'ACTIVE',
        },
      ]);
    } finally {
      server.close();
    }
  });

  it('resolves group member user ids back to Moodle idnumbers for reconciliation', async () => {
    const { server, calls } = stub((seen) => {
      if (seen.wsfunction === 'core_group_get_course_groups')
        return {
          status: 200,
          json: [{ id: 90, name: 'SWE Demo Tutorial A' }],
        };
      if (seen.wsfunction === 'core_group_get_group_members')
        return {
          status: 200,
          json: [{ groupid: 90, userids: [77, 78] }],
        };
      if (seen.wsfunction === 'core_enrol_get_enrolled_users')
        return {
          status: 200,
          json: [
            { id: 77, idnumber: 'STU-DEMO-0001' },
            { id: 78, idnumber: 'STU-DEMO-0002' },
          ],
        };
      return { status: 400, json: { exception: 'unexpected' } };
    });
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });

      await expect(
        adapter.listActualGroupMembers({ id: '7', ref: 'SWE-2026S1' }),
      ).resolves.toEqual([
        {
          groupKey: 'SWE Demo Tutorial A',
          studentKey: 'STU-DEMO-0001',
          status: 'ACTIVE',
        },
        {
          groupKey: 'SWE Demo Tutorial A',
          studentKey: 'STU-DEMO-0002',
          status: 'ACTIVE',
        },
      ]);
      const members = calls.find(
        (call) => call.wsfunction === 'core_group_get_group_members',
      );
      expect(members?.form.get('groupids[0]')).toBe('90');
    } finally {
      server.close();
    }
  });

  it('maps Moodle exceptions to permanent failures', async () => {
    const { server } = stub(() => ({
      status: 200,
      json: { exception: 'x', errorcode: 'invalidparameter', message: 'bad' },
    }));
    const baseUrl = await listen(server);
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      await expect(adapter.validateConnection()).resolves.toMatchObject({
        ok: false,
        backend: 'live',
      });
    } finally {
      server.close();
    }
  });

  it('treats timeouts and connection failures as retryable', async () => {
    const { server } = stub(() => ({ status: 200, json: {} }));
    const baseUrl = await listen(server);
    server.close();
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl,
        token: 't',
        timeoutMs: 50,
        restPath: '/webservice/rest/server.php',
      });
      const out = await adapter.validateConnection();
      expect(out.ok).toBe(false);
      expect(out.detail).toMatch(/failed/i);
    } catch (error) {
      expect(error).toBeInstanceOf(MoodleApiError);
    }
  });

  it('refuses unknown role labels instead of guessing ids', async () => {
    process.env.MOODLE_LIVE_WRITES = 'true';
    const { server } = stub((seen) => {
      if (seen.wsfunction === 'core_user_get_users')
        return { status: 200, json: { users: [{ id: 77 }] } };
      if (seen.wsfunction === 'core_enrol_get_enrolled_users')
        return { status: 200, json: [] };
      return { status: 200, json: null };
    });
    const baseUrl = await listen(server);
    const old = process.env.MOODLE_ROLE_IDS;
    process.env.MOODLE_ROLE_IDS = '{}';
    try {
      const prisma = prismaDouble() as unknown as {
        student: { findUnique: ReturnType<typeof vi.fn> };
      };
      prisma.student.findUnique.mockResolvedValue({ studentNumber: 'STU-1' });
      const adapter = new LiveMoodleAdapter(prisma as never, {
        baseUrl,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      await expect(
        adapter.applyEnrolment({
          db: {} as never,
          shell: { id: '7', ref: 'x' },
          studentId: 's',
          role: 'Mystery',
          scenario: 'SUCCESS',
        }),
      ).rejects.toMatchObject({ retryable: false });
    } finally {
      process.env.MOODLE_ROLE_IDS = old;
      server.close();
    }
  });
});
