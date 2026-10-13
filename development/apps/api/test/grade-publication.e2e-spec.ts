import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { publicationFixture, declaration } from './helpers/publication.js';
import { user } from './helpers/phase6.js';
import { assessPost, assessGet, key } from './helpers/assessment.js';

// Real database regressions: missing query scoping leaks marks; a component
// missing for one candidate must not be converted into a partial numeric total.
describe('publication prerequisites', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  beforeAll(async () => {
    if (!/(test|review|ci)/i.test(new URL(process.env.DATABASE_URL!).pathname))
      throw Error('isolated database required');
    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    post = assessPost(app);
    get = assessGet(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('hides another offering package and denies technical access to academic evidence', async () => {
    const owner = await user(
      db,
      'LEC',
      ['stage-marks'],
      'OFFERING',
      `OWN-${key()}`,
    );
    const outsider = await user(
      db,
      'LEC',
      ['stage-marks'],
      'OFFERING',
      `OTHER-${key()}`,
    );
    const technical = await user(db, 'MOODLE_ADMIN', ['manage-mapping']);
    const pkg = await db.resultPackage.create({
      data: {
        offeringRef: `OWN-${key()}`,
        periodCode: '2026S1',
        packageHash: 'fixture',
        candidateListId: key(),
        declaration: 'fixture',
        preparedByAccountId: owner.accountId,
      },
    });
    const list = await get('/packages', outsider.cookie).expect(200);
    expect(list.body.items.map((r: { id: string }) => r.id)).not.toContain(
      pkg.id,
    );
    await get(`/packages/${pkg.id}`, outsider.cookie).expect(404);
    await get(`/packages/${pkg.id}`, technical.cookie).expect(403);
  });

  it('refuses an incomplete student even if every component has an approved batch', async () => {
    const offeringRef = `PUB-${key()}`;
    const lecturer = await user(
      db,
      'LEC',
      ['stage-marks'],
      'OFFERING',
      offeringRef,
    );
    const refs = [`STU-${key()}`, `STU-${key()}`];
    const plan = await db.assessmentPlan.create({
      data: {
        offeringRef,
        periodCode: '2026S1',
        status: 'APPROVED',
        policyVersion: 'ASSESSMENT-DEMO-v1',
        createdByAccountId: lecturer.accountId,
        components: {
          create: [
            { code: 'CA-QUIZ1', maxMark: 20, weight: 20 },
            { code: 'CA-ASSIGN', maxMark: 30, weight: 20 },
            { code: 'FINAL-EXAM', maxMark: 100, weight: 60 },
          ],
        },
      },
      include: { components: true },
    });
    await db.assessmentCandidateList.create({
      data: {
        offeringRef,
        periodCode: '2026S1',
        studentRefs: refs,
        createdByAccountId: lecturer.accountId,
      },
    });
    for (const component of plan.components) {
      const mapping = await db.gradeActivityMapping.create({
        data: {
          componentId: component.id,
          moodleActivityId: key(),
          moodleCourseRef: key(),
          status: 'ACTIVE',
          createdByAccountId: lecturer.accountId,
        },
      });
      const batch = await db.gradeBatch.create({
        data: {
          mappingId: mapping.id,
          sourceRevision: key(),
          offeringRef,
          periodCode: '2026S1',
          createdByAccountId: lecturer.accountId,
          lockedAt: new Date(),
        },
      });
      const mc = await db.moderationCase.create({
        data: {
          batchId: batch.id,
          status: 'APPROVED',
          declaration: 'fixture',
          submittedByAccountId: lecturer.accountId,
        },
      });
      for (const studentRef of component.code === 'FINAL-EXAM'
        ? refs.slice(0, 1)
        : refs) {
        await db.officialCARecord.create({
          data: {
            offeringRef,
            periodCode: '2026S1',
            componentCode: component.code,
            studentRef,
            mark: 10,
            caseId: mc.id,
          },
        });
      }
    }
    const response = await post(
      '/packages',
      {
        idempotencyKey: key(),
        offeringRef,
        periodCode: '2026S1',
        declaration:
          'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.',
      },
      lecturer.cookie,
    ).expect(409);
    expect(response.body.code).toBe('INCOMPLETE_COMPONENTS');
    expect(await db.resultPackage.count({ where: { offeringRef } })).toBe(0);
  });

  it('default publication policy refuses an otherwise approved complete package', async () => {
    const f = await publicationFixture(app, db);
    const pkg = await f.packageAt();
    const response = await post(
      `/packages/${pkg.id}/release`,
      {
        idempotencyKey: key(),
        version: pkg.version,
        declaration,
        proof: 'not-trusted',
      },
      f.publisher.cookie,
    ).expect(409);
    expect(response.body.code).toBe('PUBLICATION_POLICY_REQUIRED');
    expect(await db.resultRelease.count({ where: { packageId: pkg.id } })).toBe(
      0,
    );
  });
  it('default step-up refuses even when an isolated test supplies publication policy', async () => {
    let courseId = '';
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('RESULT_PUBLICATION_POLICY')
      .useValue({
        resolve: async () => ({
          version: 'TEST',
          courseId,
          releaseAt: '2020-01-01',
          showMarks: true,
          restrictionsSatisfied: true,
          reviewInstructions: 'Contact examinations.',
        }),
      })
      .compile();
    const guarded = mod.createNestApplication();
    guarded.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await guarded.init();
    try {
      const f = await publicationFixture(guarded, guarded.get(PrismaService));
      courseId = f.course.id;
      const pkg = await f.packageAt();
      const response = await assessPost(guarded)(
        `/packages/${pkg.id}/release`,
        {
          idempotencyKey: key(),
          version: pkg.version,
          declaration,
          proof: 'not-trusted',
        },
        f.publisher.cookie,
      ).expect(403);
      expect(response.body.code).toBe('STEP_UP_REQUIRED');
    } finally {
      await guarded.close();
    }
  });
});
