import { createServer, type Server, type IncomingMessage } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  LiveMoodleAdapter,
  MoodleApiError,
} from './moodle-live.js';

process.env.MOODLE_API_URL = 'http://127.0.0.1:0';
process.env.MOODLE_API_TOKEN = 'test-token-never-real';
process.env.MOODLE_ROLE_IDS = JSON.stringify({ Teacher: 3, Tutor: 5 });

interface Seen {
  wsfunction: string | null;
  token: string | null;
  body: unknown;
}

function stub(handler: (seen: Seen, body: unknown) => { status: number; json: unknown }) {
  const seen: Seen = { wsfunction: null, token: null, body: null };
  let lastBody: unknown = null;
  const server: Server = createServer((req: IncomingMessage, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    seen.wsfunction = url.searchParams.get('wsfunction');
    seen.token = url.searchParams.get('wstoken');
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        lastBody = JSON.parse(raw || '{}');
      } catch {
        lastBody = raw;
      }
      seen.body = lastBody;
      const out = handler(seen, lastBody);
      res.writeHead(out.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out.json));
    });
  });
  return { server, seen };
}

function prismaDouble() {
  return {
    student: { findUnique: vi.fn() },
    account: { findUnique: vi.fn() },
    tutorialGroup: { findUnique: vi.fn() },
  } as never;
}

describe('LiveMoodleAdapter contract', () => {
  let baseUrl = '';

  it('sends token as a parameter and names the WS function', async () => {
    const { server, seen } = stub(() => ({
      status: 200,
      json: { version: '4.5', sitename: 'Stub Moodle' },
    }));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    baseUrl = `http://127.0.0.1:${port}`;
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
      expect(seen.wsfunction).toBe('core_webservice_get_site_info');
      expect(seen.token).toBe('test-token-never-real');
    } finally {
      server.close();
    }
  });

  it('creates shells idempotently by shortname', async () => {
    const { server } = stub((seen) => {
      if (seen.wsfunction === 'core_course_get_courses_by_field')
        return { status: 200, json: [] };
      if (seen.wsfunction === 'core_course_create_courses')
        return { status: 200, json: [{ id: 42 }] };
      return { status: 400, json: { exception: 'nope', errorcode: 'invalidparameter', message: 'x' } };
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl: `http://127.0.0.1:${port}`,
        token: 't',
        timeoutMs: 5000,
        restPath: '/webservice/rest/server.php',
      });
      const created = await adapter.ensureShell({
        db: {} as never,
        shellRef: 'SIM-SH-SWE-2026S1',
        offeringId: 'o',
        periodId: 'p',
      });
      expect(created).toEqual({ id: '42', created: true });
      void baseUrl;
    } finally {
      server.close();
    }
  });

  it('maps Moodle exceptions to permanent failures', async () => {
    const { server } = stub(() => ({
      status: 200,
      json: { exception: 'x', errorcode: 'invalidparameter', message: 'bad' },
    }));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl: `http://127.0.0.1:${port}`,
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

  it('treats timeouts as retryable', async () => {
    const { server } = stub(() => ({ status: 200, json: {} }));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    server.close();
    try {
      const adapter = new LiveMoodleAdapter(prismaDouble(), {
        baseUrl: `http://127.0.0.1:${port}`,
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

  it('refuses unknown role shortnames instead of guessing ids', async () => {
    const { server } = stub(() => ({ status: 200, json: [] }));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    const old = process.env.MOODLE_ROLE_IDS;
    process.env.MOODLE_ROLE_IDS = '{}';
    try {
      const prisma = prismaDouble() as unknown as {
        student: { findUnique: ReturnType<typeof vi.fn> };
      };
      prisma.student.findUnique.mockResolvedValue({ studentNumber: 'STU-1' });
      const adapter = new LiveMoodleAdapter(prisma as never, {
        baseUrl: `http://127.0.0.1:${port}`,
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
