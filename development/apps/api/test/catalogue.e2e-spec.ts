import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { AUTH_MESSAGES } from '@sis/config';

/**
 * TASK-PH2-001 catalogue e2e (discovery-search … discovery-mobile-reflow
 * packet IDs; a11y/keyboard covered by component contracts + manual
 * checklist, no runner per deferred Playwright decision).
 *
 * Requires a live dev database:
 *   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
 * Shared demo seed (3 programmes, 4 offerings, 9 rules) is never
 * structurally changed; only transient GuidanceSessions are swept.
 */
describe('catalogue (e2e)', () => {
  let app: INestApplication;
  let server: unknown;
  let prisma: PrismaService;
  let offerings: Array<{ id: string; availability: string }>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
    const all = await request(server as never)
      .get('/catalogue/programmes?take=50')
      .expect(HttpStatus.OK);
    offerings = (
      all.body as {
        items: Array<{ offeringId: string; availability: string }>;
      }
    ).items.map((i) => ({ id: i.offeringId, availability: i.availability }));
    expect(offerings).toHaveLength(4);
  });

  afterAll(async () => {
    await prisma.guidanceSession.deleteMany({});
    await app.close();
  });

  it('discovery-search: finds programmes by name with versioned detail link', async () => {
    const res = await request(server as never)
      .get('/catalogue/programmes?q=software')
      .expect(HttpStatus.OK);
    const body = res.body as {
      items: Array<{ programmeName: string; offeringId: string }>;
      total: number;
    };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(
      body.items.some((i) => i.programmeName === 'BSc Software Engineering'),
    ).toBe(true);
  });

  it('discovery-filters-url: school and availability filters narrow results', async () => {
    const business = await request(server as never)
      .get('/catalogue/programmes?school=Business')
      .expect(HttpStatus.OK);
    expect((business.body as { items: unknown[] }).items).toHaveLength(1);
    const open = await request(server as never)
      .get('/catalogue/programmes?availability=OPEN')
      .expect(HttpStatus.OK);
    expect((open.body as { items: unknown[] }).items).toHaveLength(2);
  });

  it('discovery-route-filter: route narrows to programmes defining that route', async () => {
    const intl = await request(server as never)
      .get('/catalogue/programmes?route=INTL')
      .expect(HttpStatus.OK);
    const names = (
      intl.body as { items: Array<{ programmeName: string }> }
    ).items.map((i) => i.programmeName);
    // Only SWE defines an INTL-route rule (ZAQA equivalency) — both its
    // offerings (search is offering-level) and nothing else.
    expect((intl.body as { items: unknown[] }).items).toHaveLength(2);
    expect(new Set(names)).toEqual(new Set(['BSc Software Engineering']));
  });

  it('discovery-detail: offering page carries requirements, checklist and version', async () => {
    const target = offerings.find((o) => o.availability === 'OPEN');
    const res = await request(server as never)
      .get(`/catalogue/offerings/${target?.id}`)
      .expect(HttpStatus.OK);
    const body = res.body as {
      programmeName: string;
      entryRequirements: Array<{ id: string; label: string }>;
      checklist: string[];
      feeScheduleRef: string;
      publishedVersion: string;
      owningOffice: string;
      canStart: boolean;
    };
    expect(body.entryRequirements.length).toBeGreaterThan(0);
    expect(body.checklist.length).toBeGreaterThan(0);
    expect(body.feeScheduleRef).toContain('DEMO-ACADEMIC-2026-v1');
    expect(body.publishedVersion).toBe('DEMO-ACADEMIC-2026-v1');
    expect(body.owningOffice).toBe('Admissions');
    expect(body.canStart).toBe(true);
  });

  it('discovery-closed-intake: closed offering explains itself and blocks start', async () => {
    const closed = offerings.find((o) => o.availability === 'CLOSED');
    const res = await request(server as never)
      .get(`/catalogue/offerings/${closed?.id}`)
      .expect(HttpStatus.OK);
    const body = res.body as {
      canStart: boolean;
      statusNote: string;
    };
    expect(body.canStart).toBe(false);
    expect(body.statusNote).toContain('not accepting applications');
  });

  it('unknown offering id gets a neutral 404 (no enumeration)', async () => {
    const res = await request(server as never)
      .get('/catalogue/offerings/00000000-0000-4000-8000-000000000000')
      .expect(HttpStatus.NOT_FOUND);
    expect((res.body as { message: string }).message).toBe(
      'Programme offering not found.',
    );
  });

  it('discovery-compare-limit: at most three offerings, excess flagged', async () => {
    const ids = offerings.map((o) => o.id).join(',');
    const res = await request(server as never)
      .get(`/catalogue/compare?ids=${ids}`)
      .expect(HttpStatus.OK);
    const body = res.body as { items: unknown[]; truncated: boolean };
    expect(body.items).toHaveLength(3);
    expect(body.truncated).toBe(true);
    const single = await request(server as never)
      .get(`/catalogue/compare?ids=${offerings[0]?.id}`)
      .expect(HttpStatus.OK);
    expect((single.body as { truncated: boolean }).truncated).toBe(false);
  });

  it('discovery-compare-robust: garbage dropped, dupes collapse, no 500', async () => {
    const res = await request(server as never)
      .get(
        `/catalogue/compare?ids=not-a-uuid,${offerings[0]?.id},${offerings[0]?.id},${offerings[1]?.id}`,
      )
      .expect(HttpStatus.OK);
    const body = res.body as { items: unknown[]; truncated: boolean };
    expect(body.items).toHaveLength(2);
    expect(body.truncated).toBe(false);
  });

  it('discovery-guidance-each-outcome: per-requirement verdicts plus disclaimer', async () => {
    const search = (
      await request(server as never)
        .get('/catalogue/programmes?q=software')
        .expect(HttpStatus.OK)
    ).body as {
      items: Array<{ offeringId: string; availability: string }>;
    };
    const target = search.items.find((i) => i.availability === 'OPEN');
    const detail = (
      await request(server as never)
        .get(`/catalogue/offerings/${target?.offeringId}`)
        .expect(HttpStatus.OK)
    ).body as { programmeCode: string };
    const session = await request(server as never)
      .post('/catalogue/guidance/sessions')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ offeringId: target?.offeringId, routeCode: 'ECZ' })
      .expect(HttpStatus.CREATED);
    const sessionId = (session.body as { sessionId: string }).sessionId;
    expect(sessionId).toBeDefined();
    expect(detail.programmeCode).toBeDefined();
    const met = await request(server as never)
      .post('/catalogue/guidance/evaluate')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({
        sessionId,
        facts: {
          math: { value: 4 },
          english: { value: 4 },
          'ecz-statement': { value: true },
        },
      })
      .expect(HttpStatus.OK);
    const metBody = met.body as {
      results: Array<{ ruleId: string; verdict: string; blocking: boolean }>;
      overall: string;
      disclaimer: string;
    };
    expect(metBody.results.find((r) => r.ruleId === 'math')?.verdict).toBe(
      'APPEARS_MET',
    );
    expect(
      metBody.results.find((r) => r.ruleId === 'ecz-statement')?.verdict,
    ).toBe('NEEDS_VERIFICATION');
    // Mandatory verification pending surfaces overall (§6.4) — never a pass.
    expect(metBody.overall).toBe('NEEDS_VERIFICATION');
    expect(metBody.disclaimer).toContain('initial guidance result');
    const poor = await request(server as never)
      .post('/catalogue/guidance/evaluate')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ sessionId, facts: { math: { value: 8 } } })
      .expect(HttpStatus.OK);
    const poorBody = poor.body as {
      results: Array<{ ruleId: string; verdict: string; blocking: boolean }>;
      overall: string;
    };
    expect(poorBody.results.find((r) => r.ruleId === 'math')?.verdict).toBe(
      'NOT_MET',
    );
    expect(poorBody.results.find((r) => r.ruleId === 'math')?.blocking).toBe(
      true,
    );
    expect(poorBody.overall).toBe('NOT_MET');
  });

  it('discovery-routes: qualification routes are listed for the wizard', async () => {
    const res = await request(server as never)
      .get('/catalogue/routes')
      .expect(HttpStatus.OK);
    const body = res.body as { routes: Array<{ code: string }> };
    const codes = body.routes.map((r) => r.code);
    expect(codes).toContain('ECZ');
    expect(codes).toContain('INTL');
  });

  it('discovery-pagination: take above the configured maximum is refused', async () => {
    const res = await request(server as never)
      .get('/catalogue/programmes?take=50')
      .expect(HttpStatus.OK);
    expect((res.body as { items: unknown[] }).items.length).toBeLessThanOrEqual(
      50,
    );
    await request(server as never)
      .get('/catalogue/programmes?take=51')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('discovery-rate-limit: sustained anonymous search hits 429 with Retry-After', async () => {
    let limited = false;
    for (let i = 0; i < 70; i++) {
      const res = await request(server as never).get(
        '/catalogue/programmes?q=rate',
      );
      if (res.status === HttpStatus.TOO_MANY_REQUESTS) {
        expect(res.headers['retry-after']).toBeDefined();
        expect((res.body as { message: string }).message).toBe(
          AUTH_MESSAGES.rateLimited.text,
        );
        limited = true;
        break;
      }
      expect(res.status).toBe(HttpStatus.OK);
    }
    expect(limited).toBe(true);
  });
});
