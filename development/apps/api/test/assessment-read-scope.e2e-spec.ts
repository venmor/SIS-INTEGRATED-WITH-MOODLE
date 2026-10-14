import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { user } from './helpers/phase6.js';
import { assessGet } from './helpers/assessment.js';
describe('Assessment offering/period read boundary', () => {
  let app: INestApplication,
    db: PrismaService,
    get: ReturnType<typeof assessGet>;
  let lecturer: string,
    moderator: string,
    examiner: string,
    revoked: string,
    wrongScope: string;
  let coordinator: string;
  let coordinatorPlanId: string;
  const offering = `READ-${randomUUID()}`,
    foreignOffering = `FOREIGN-${randomUUID()}`,
    period = `P-${randomUUID().slice(0, 8)}`,
    foreignPeriod = `P2-${randomUUID().slice(0, 8)}`;
  type Fixture = {
    plan: string;
    component: string;
    mapping: string;
    batch: string;
    candidate: string;
  };
  let own: Fixture, foreign: Fixture, otherPeriod: Fixture;
  async function fixture(
    offeringRef: string,
    periodCode: string,
  ): Promise<Fixture> {
    const plan = await db.assessmentPlan.create({
      data: {
        offeringRef,
        periodCode,
        policyVersion: 'ASSESSMENT-DEMO-v1',
        createdByAccountId: randomUUID(),
        components: { create: { code: 'CA-QUIZ1', maxMark: 20, weight: 100 } },
      },
      include: { components: true },
    });
    const mapping = await db.gradeActivityMapping.create({
      data: {
        componentId: plan.components[0].id,
        moodleActivityId: randomUUID(),
        moodleCourseRef: 'SIM-READ',
        createdByAccountId: randomUUID(),
      },
    });
    const batch = await db.gradeBatch.create({
      data: {
        mappingId: mapping.id,
        sourceRevision: randomUUID(),
        createdByAccountId: randomUUID(),
        offeringRef,
        periodCode,
        lines: { create: { studentRef: 'FICTIONAL-READ', rawValue: 13 } },
      },
    });
    const candidate = await db.assessmentCandidateList.create({
      data: {
        offeringRef,
        periodCode,
        createdByAccountId: randomUUID(),
        studentRefs: ['FICTIONAL-READ'],
      },
    });
    return {
      plan: plan.id,
      component: plan.components[0].id,
      mapping: mapping.id,
      batch: batch.id,
      candidate: candidate.id,
    };
  }
  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL ||
      !/(test|review|ci)/i.test(new URL(process.env.DATABASE_URL).pathname)
    )
      throw Error('Isolated review DB required');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DocumentScanner)
      .useValue({
        scan: async () => ({ status: 'AwaitingQualityCheck', scanner: 'TEST' }),
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    get = assessGet(app);
    lecturer = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', offering))
      .cookie;
    moderator = (
      await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', offering)
    ).cookie;
    examiner = (
      await user(
        db,
        'EXAMINATIONS_OFFICER',
        ['validate-results'],
        'PERIOD',
        period,
      )
    ).cookie;
    const r = await user(db, 'LEC', ['stage-marks'], 'OFFERING', offering);
    revoked = r.cookie;
    await db.roleAssignment.updateMany({
      where: { accountId: r.accountId },
      data: { revokedAt: new Date() },
    });
    wrongScope = (await user(db, 'LEC', ['stage-marks'], 'SYSTEM', 'GLOBAL'))
      .cookie;
    coordinator = (
      await user(
        db,
        'COORDINATOR',
        ['approve-assessment'],
        'SCHOOL',
        'Computing',
      )
    ).cookie;
    coordinatorPlanId = (
      await db.assessmentPlan.create({
        data: {
          offeringRef: `COORD-${randomUUID()}`,
          periodCode: `COORD-${randomUUID().slice(0, 8)}`,
          version: 2147483000,
          policyVersion: 'ASSESSMENT-DEMO-v1',
          createdByAccountId: randomUUID(),
        },
      })
    ).id;
    own = await fixture(offering, period);
    foreign = await fixture(foreignOffering, period);
    otherPeriod = await fixture(offering, foreignPeriod);
    const bulk = Array.from({ length: 205 }, (_, i) => ({
      id: randomUUID(),
      offeringRef: foreignOffering,
      periodCode: foreignPeriod,
      version: i + 1000,
      policyVersion: 'ASSESSMENT-DEMO-v1',
      createdByAccountId: randomUUID(),
    }));
    await db.assessmentPlan.createMany({ data: bulk });
    const components = bulk.map((plan) => ({
      id: randomUUID(),
      planId: plan.id,
      code: 'CA-BULK',
      maxMark: 20,
      weight: 100,
    }));
    await db.assessmentComponent.createMany({ data: components });
    await db.gradeActivityMapping.createMany({
      data: components.map((component) => ({
        componentId: component.id,
        moodleActivityId: randomUUID(),
        moodleCourseRef: 'SIM-READ-BULK',
        createdByAccountId: randomUUID(),
        createdAt: new Date('2027-01-01Z'),
      })),
    });
  }, 30000);
  afterAll(async () => {
    try {
      if (db && own && foreign && otherPeriod) {
        const batches = [own.batch, foreign.batch, otherPeriod.batch];
        const plans = await db.assessmentPlan.findMany({
          where: {
            OR: [
              { offeringRef: { in: [offering, foreignOffering] } },
              { id: coordinatorPlanId },
            ],
          },
          select: { id: true },
        });
        const planIds = plans.map((p) => p.id);
        await db.$transaction(async (tx) => {
          await tx.gradeLine.deleteMany({
            where: { batchId: { in: batches } },
          });
          await tx.gradeBatch.deleteMany({ where: { id: { in: batches } } });
          await tx.gradeActivityMapping.deleteMany({
            where: { component: { planId: { in: planIds } } },
          });
          await tx.assessmentComponent.deleteMany({
            where: { planId: { in: planIds } },
          });
          await tx.assessmentPlan.deleteMany({
            where: { id: { in: planIds } },
          });
          await tx.assessmentCandidateList.deleteMany({
            where: { offeringRef: { in: [offering, foreignOffering] } },
          });
        });
      }
    } finally {
      if (app) await app.close();
    }
  });
  const ids = (body: any) => body.items.map((i: { id: string }) => i.id).sort();
  it('preserves legacy coordinator unfiltered listing when neither scope nor filters has coordinates', async () => {
    const result = await get('/plans', coordinator).expect(200);
    expect(
      result.body.items.some(
        (item: { id: string }) => item.id === coordinatorPlanId,
      ),
    ).toBe(true);
    const candidates = await get('/candidate-lists', coordinator).expect(200);
    expect(
      candidates.body.items.some(
        (item: { id: string }) => item.id === own.candidate,
      ),
    ).toBe(true);
  });
  it('loads exact authorized plan/mapping IDs beyond the registry window with neutral foreign404', async () => {
    expect(
      (await get('/plans', coordinator).expect(200)).body.items.some(
        (i: { id: string }) => i.id === own.plan,
      ),
    ).toBe(false);
    expect(
      (await get('/mappings', coordinator).expect(200)).body.items.some(
        (i: { id: string }) => i.id === own.mapping,
      ),
    ).toBe(false);
    for (const cookie of [lecturer, moderator, examiner, coordinator]) {
      expect(
        (await get(`/plans/${own.plan}`, cookie).expect(200)).body.id,
      ).toBe(own.plan);
      expect(
        (await get(`/mappings/${own.mapping}`, cookie).expect(200)).body.id,
      ).toBe(own.mapping);
    }
    for (const [kind, id, foreignId] of [
      ['plans', own.plan, foreign.plan],
      ['mappings', own.mapping, foreign.mapping],
    ]) {
      void id;
      const hidden = await get(`/${kind}/${foreignId}`, lecturer).expect(404);
      const missing = await get(`/${kind}/${randomUUID()}`, lecturer).expect(
        404,
      );
      expect(hidden.body.code).toBe(missing.body.code);
      expect(hidden.body.message).toBe(missing.body.message);
    }
    await get(`/plans/${otherPeriod.plan}`, examiner).expect(404);
    await get(`/mappings/${otherPeriod.mapping}`, examiner).expect(404);
  });
  it('scopes lecturer/moderator plans before200-row pagination and rejects forged filters with empty lists', async () => {
    for (const cookie of [lecturer, moderator]) {
      expect(ids((await get('/plans', cookie).expect(200)).body)).toEqual(
        [own.plan, otherPeriod.plan].sort(),
      );
      expect(
        (await get(`/plans?offeringRef=${foreignOffering}`, cookie).expect(200))
          .body.items,
      ).toEqual([]);
    }
  });
  it('scopes examiner plans by period', async () => {
    expect(ids((await get('/plans', examiner).expect(200)).body)).toEqual(
      [own.plan, foreign.plan].sort(),
    );
    expect(
      (await get(`/plans?periodCode=${foreignPeriod}`, examiner).expect(200))
        .body.items,
    ).toEqual([]);
  });
  it('joins mapping scope through component plan before accepting component filters', async () => {
    for (const cookie of [lecturer, moderator]) {
      expect(ids((await get('/mappings', cookie).expect(200)).body)).toEqual(
        [own.mapping, otherPeriod.mapping].sort(),
      );
      expect(
        (
          await get(
            `/mappings?componentId=${foreign.component}`,
            cookie,
          ).expect(200)
        ).body.items,
      ).toEqual([]);
    }
    expect(
      (
        await get(
          `/mappings?componentId=${otherPeriod.component}`,
          examiner,
        ).expect(200)
      ).body.items,
    ).toEqual([]);
  });
  it('scopes batch raw marks before listing and forged mapping filters', async () => {
    expect(ids((await get('/batches', lecturer).expect(200)).body)).toEqual(
      [own.batch, otherPeriod.batch].sort(),
    );
    expect(
      (await get(`/batches?mappingId=${foreign.mapping}`, lecturer).expect(200))
        .body.items,
    ).toEqual([]);
    expect(
      (
        await get(`/batches?mappingId=${otherPeriod.mapping}`, examiner).expect(
          200,
        )
      ).body.items,
    ).toEqual([]);
  });
  it('returns same neutral404 for foreign and absent batch details', async () => {
    expect(
      (await get(`/batches/${own.batch}`, lecturer).expect(200)).body.lines[0]
        .rawValue,
    ).toBe(13);
    for (const cookie of [lecturer, moderator])
      await get(`/batches/${foreign.batch}`, cookie).expect(404);
    await get(`/batches/${otherPeriod.batch}`, examiner).expect(404);
    const hidden = await get(`/batches/${foreign.batch}`, lecturer).expect(404),
      missing = await get(`/batches/${randomUUID()}`, lecturer).expect(404);
    expect(hidden.body.code).toBe(missing.body.code);
    expect(hidden.body.message).toBe(missing.body.message);
  });
  it('scopes candidate lists by offering and period', async () => {
    expect(
      ids((await get('/candidate-lists', lecturer).expect(200)).body),
    ).toEqual([own.candidate, otherPeriod.candidate].sort());
    expect(
      (
        await get(
          `/candidate-lists?offeringRef=${foreignOffering}`,
          moderator,
        ).expect(200)
      ).body.items,
    ).toEqual([]);
    expect(
      (
        await get(
          `/candidate-lists?periodCode=${foreignPeriod}`,
          examiner,
        ).expect(200)
      ).body.items,
    ).toEqual([]);
  });
  it('refuses revoked and wrong-scope-type assignments on every read surface', async () => {
    for (const cookie of [revoked, wrongScope])
      for (const path of [
        '/plans',
        '/mappings',
        '/batches',
        '/candidate-lists',
        `/batches/${own.batch}`,
        `/plans/${own.plan}`,
        `/mappings/${own.mapping}`,
      ])
        await get(path, cookie).expect(403);
  });
});
