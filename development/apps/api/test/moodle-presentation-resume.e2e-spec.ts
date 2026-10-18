import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { key } from './helpers/assessment.js';
import { declaration } from './helpers/publication.js';

/** Explicit operator opt-in: this contacts the owner's named MoodleCloud
 * demonstration site. Default CI skips it. Never substitute mock provider
 * responses here or describe synthetic operator decisions as human signoff. */
describe.skipIf(process.env.MOODLE_PRESENTATION_RESUME !== '1')('resume actual Moodle presentation journey', () => {
  let app: INestApplication, db: PrismaService;
  const password = 'Review-2026-Moodle!';
  const evidence = '../../.evidence/moodle-completion-20261018';
  type Versioned = { id: string; version: number };
  async function post<T>(path: string, body: object, cookie: string): Promise<T> {
    const res = await request(app.getHttpServer()).post(path).set('Cookie', cookie).set('x-requested-with', 'XMLHttpRequest').send(body);
    if (res.status !== 201) throw Error(JSON.stringify({ path, status: res.status, code: res.body.code ?? res.body.message }));
    return res.body as T;
  }
  async function get<T>(path: string, cookie: string): Promise<T> {
    const res = await request(app.getHttpServer()).get(path).set('Cookie', cookie);
    if (res.status !== 200) throw Error(JSON.stringify({ path, status: res.status, code: res.body.code ?? res.body.message }));
    return res.body as T;
  }
  async function login(username: string) {
    const r = await request(app.getHttpServer()).post('/auth/sign-in').set('x-requested-with','XMLHttpRequest').send({ username, password });
    expect(r.status).toBe(200);
    const cookies = r.headers['set-cookie'] as unknown as string[];
    return { cookie: cookies.map(c => c.split(';')[0]).join('; ') };
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/sis_moodle_live_review_20261018' || process.env.MOODLE_API_URL !== 'https://sis-moodle.moodlecloud.com') throw Error('Exact owned local review database and MoodleCloud demonstration target required.');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
  });
  afterAll(async () => { await app?.close(); });
  it('resumes the registered and mapped class through real import, moderation and publication', async () => {
    const mappingId = process.env.MOODLE_PRESENTATION_MAPPING_ID;
    if (!mappingId) throw Error('Existing rehearsal mapping required; never substitute or duplicate its student binding.');
    const map = await db.gradeActivityMapping.findUniqueOrThrow({ where: { id: mappingId }, include: { component: { include: { plan: true } } } });
    const code = map.component.plan.offeringRef, periodCode = map.component.plan.periodCode;
    const suffix = code.slice('DEMO-PHY-'.length);
    const coordinator = await login(`academic.reviewer.${suffix}`);
    const lecturer = await login(`lecturer.physics.${suffix}`);
    const moderator = await login(`moderator.physics.${suffix}`);
    const examiner = await login(`exams.prepare.${suffix}`);
    const publisher = await login(`exams.release.${suffix}`);
    const learner = await login(`chanda.integration.${suffix}`);
    const student = await db.student.findFirstOrThrow({ where: { studentNumber: `DEMO-2026-${suffix}` } });
    const run = await db.moodleLiveTestRun.findFirstOrThrow({ where: { state: 'RUNNING' } });
    process.env.MOODLE_LIVE_TEST_RUN_ID = run.runId;
    process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT = run.dbFingerprint;
    await writeFile(`${evidence}/private/runtime.json`, JSON.stringify({ MOODLE_LIVE_TEST_RUN_ID: run.runId, MOODLE_LIVE_TEST_DB_FINGERPRINT: run.dbFingerprint }, null, 2), { mode: 0o600 });
    const gradeMap = map;
    const batch = await post<Versioned & { lines: Array<{ rawValue: number }> }>(`/assessment/mappings/${gradeMap.id}/import-moodle`, { idempotencyKey: key() }, lecturer.cookie);
    expect(batch.lines[0].rawValue).toBe(17);
    await post('/assessment/candidate-lists', { offeringRef: code, periodCode, studentRefs: [student.studentNumber], idempotencyKey: key() }, coordinator.cookie);
    const existingReview = await db.moderationCase.findUnique({ where: { batchId: batch.id } });
    if (existingReview?.status !== 'APPROVED') {
      await post(`/assessment/batches/${batch.id}/validate`, { idempotencyKey: key() }, examiner.cookie);
      let review = await post<Versioned>(`/assessment/batches/${batch.id}/submit`, { declaration: 'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.', idempotencyKey: key() }, lecturer.cookie);
      review = await post<Versioned>(`/assessment/moderation/${review.id}/begin`, { idempotencyKey: key() }, moderator.cookie);
      await post(`/assessment/moderation/${review.id}/decide`, { version: review.version, to: 'APPROVED', idempotencyKey: key() }, moderator.cookie);
    }
    let pkg = await post<Versioned>('/assessment/packages', { offeringRef: code, periodCode, declaration: 'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.', idempotencyKey: key() }, lecturer.cookie);
    pkg = await post<Versioned>(`/assessment/packages/${pkg.id}/decide`, { version: pkg.version, to: 'APPROVE_FOR_RELEASE', idempotencyKey: key() }, examiner.cookie);
    const policy = await post<Versioned>('/assessment/result-publication/demo-policies', { offeringRef: code, periodCode, releaseAt: new Date(Date.now() - 1000).toISOString(), showMarks: true, reviewInstructions: 'Request a review through the examinations office in Requests and support.', idempotencyKey: key() }, examiner.cookie);
    await post(`/assessment/result-publication/demo-policies/${policy.id}/approve`, {}, publisher.cookie);
    const proof = await post<{ proof: string }>('/assessment/result-publication/proofs', { targetId: pkg.id, version: pkg.version, declaration, action: 'ReleaseOfficialCourseResults', password }, publisher.cookie);
    const release = await post<{ id: string }>(`/assessment/packages/${pkg.id}/release`, { version: pkg.version, declaration, proof: proof.proof, idempotencyKey: key() }, publisher.cookie);
    const results = await get<{ items: unknown[] }>('/assessment/me/results', learner.cookie);
    expect(JSON.stringify(results)).toContain('85');
    await writeFile(`${evidence}/live-journey.json`, JSON.stringify({ source: 'ACTUAL_MOODLECLOUD', generatedOperators: true, humanAcceptance: false, courseId: 9, gradeItemId: 14, moodleUserId: 6, importedMark: 17, maximum: 20, publishedMark: 85, releaseId: release.id, batchId: batch.id, courseCode: code, runId: run.runId, verifiedAt: new Date().toISOString() }, null, 2));
    await writeFile(`${evidence}/private/runtime.json`, JSON.stringify({ MOODLE_LIVE_TEST_RUN_ID: run.runId, MOODLE_LIVE_TEST_DB_FINGERPRINT: run.dbFingerprint }, null, 2), { mode: 0o600 });
  }, 240000);
});
