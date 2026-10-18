import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { user } from './helpers/phase6.js';
import { assessPost, key } from './helpers/assessment.js';

describe('result assembly follows the approved course assessment scheme', () => {
  let app: INestApplication, db: PrismaService;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/(test|review|ci)/i.test(target.pathname)) throw Error('isolated database required');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
  });
  afterAll(async () => { await app?.close(); });
  it('freezes one approved 20-point component weighted 100%, producing 85 from 17/20', async () => {
    const offeringRef = `PLAN-${key().slice(0,8)}`, periodCode = `TERM-${key().slice(0,8)}`, studentRef = key();
    const lecturer = await user(db, 'LEC', ['stage-marks'], 'OFFERING', offeringRef);
    const plan = await db.assessmentPlan.create({ data: { offeringRef, periodCode, status: 'APPROVED', policyVersion: 'ASSESSMENT-DEMO-v1', createdByAccountId: lecturer.accountId, components: { create: { code: 'CA-ASSIGN', maxMark: 20, weight: 100 } } }, include: { components: true } });
    const mapping = await db.gradeActivityMapping.create({ data: { componentId: plan.components[0].id, moodleActivityId: '14', moodleCourseRef: '9', createdByAccountId: lecturer.accountId, status: 'ACTIVE' } });
    const batch = await db.gradeBatch.create({ data: { mappingId: mapping.id, sourceRevision: key(), offeringRef, periodCode, componentCode: 'CA-ASSIGN', createdByAccountId: lecturer.accountId } });
    const review = await db.moderationCase.create({ data: { batchId: batch.id, status: 'APPROVED', declaration: 'Generated fixture approval', submittedByAccountId: lecturer.accountId } });
    await db.officialCARecord.create({ data: { offeringRef, periodCode, componentCode: 'CA-ASSIGN', studentRef, mark: 17, caseId: review.id } });
    await db.assessmentCandidateList.create({ data: { offeringRef, periodCode, studentRefs: [studentRef], createdByAccountId: lecturer.accountId } });
    const r = await assessPost(app)('/packages', { offeringRef, periodCode, idempotencyKey: key(), declaration: 'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.' }, lecturer.cookie);
    if (r.status !== 201) throw Error(JSON.stringify(r.body));
    expect(JSON.stringify(r.body)).toContain('85');
  });
});
