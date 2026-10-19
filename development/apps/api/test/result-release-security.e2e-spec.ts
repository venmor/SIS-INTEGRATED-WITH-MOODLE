import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { hash } from 'argon2';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { publicationFixture, declaration } from './helpers/publication.js';
import { assessGet, assessPost, key } from './helpers/assessment.js';
import { user } from './helpers/phase6.js';

describe('configured result release with actual password proof and PostgreSQL', () => {
  let app: INestApplication, db: PrismaService;
  let post: ReturnType<typeof assessPost>, get: ReturnType<typeof assessGet>;
  const password = 'Connected-result-review-2026!';
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/(test|review|ci)/i.test(target.pathname)) throw Error('isolated review database required');
    vi.stubEnv('SIS_ENABLE_RESULT_DEMO_POLICY', 'true');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService); post = assessPost(app); get = assessGet(app);
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => { vi.unstubAllEnvs(); await app?.close(); });
  async function fixture() {
    const f = await publicationFixture(app, db);
    await db.credential.create({ data: { accountId: f.publisher.accountId, kind: 'PASSWORD', secretHash: await hash(password), status: 'ACTIVE' } });
    const pkg = await f.packageAt();
    const policyBody = { idempotencyKey: key(), offeringRef: f.offeringRef, periodCode: f.periodCode, releaseAt: '2026-01-01T00:00:00.000Z', showMarks: true, reviewInstructions: 'Contact the examinations office to request review.' };
    const draft = await post('/result-publication/demo-policies', policyBody, f.examiner.cookie).expect(201);
    const proofBody = { targetId: pkg.id, version: pkg.version, declaration, action: 'ReleaseOfficialCourseResults', password };
    return { ...f, pkg, draft: draft.body as { id: string }, policyBody, proofBody };
  }
  it('approves a configured policy, consumes a real proof, publishes once and exposes only the owner result', async () => {
    const f = await fixture();
    await post(`/result-publication/demo-policies/${f.draft.id}/approve`, {}, f.publisher.cookie).expect(201);
    await post(`/packages/${f.pkg.id}/release`, { idempotencyKey: key(), version: f.pkg.version, declaration }, f.publisher.cookie).expect(403);
    await post('/result-publication/proofs', { ...f.proofBody, password: 'incorrect' }, f.publisher.cookie).expect(403);
    const issued = await post('/result-publication/proofs', f.proofBody, f.publisher.cookie).expect(201);
    const stored = await db.resultReleaseProof.findFirstOrThrow({ where: { accountId: f.publisher.accountId } });
    expect(stored.tokenHash).not.toBe(issued.body.proof);
    const payload = { idempotencyKey: key(), version: f.pkg.version, declaration, proof: issued.body.proof };
    const release = await post(`/packages/${f.pkg.id}/release`, payload, f.publisher.cookie).expect(201);
    const replay = await post(`/packages/${f.pkg.id}/release`, payload, f.publisher.cookie).expect(201);
    expect(replay.body).toEqual(release.body);
    expect(await db.resultRelease.count({ where: { packageId: f.pkg.id } })).toBe(1);
    expect((await db.resultReleaseProof.findUniqueOrThrow({ where: { id: stored.id } })).consumedAt).not.toBeNull();
    const mine = await get('/me/results', f.student.cookie).expect(200);
    expect(JSON.stringify(mine.body)).toContain(f.offeringRef);
    const outsider = await user(db, 'STUDENT', ['study'], 'STUDENT', 'SELF');
    const other = await get('/me/results', outsider.cookie).expect(200);
    expect(JSON.stringify(other.body)).not.toContain(f.offeringRef);
  });
  it('rejects a foreign session and an expired proof without publishing', async () => {
    const f = await fixture();
    await post(`/result-publication/demo-policies/${f.draft.id}/approve`, {}, f.publisher.cookie).expect(201);
    const issued = await post('/result-publication/proofs', f.proofBody, f.publisher.cookie).expect(201);
    const foreign = await user(db, 'EXAMINATIONS_OFFICER', ['release-results'], 'PERIOD', f.periodCode);
    await post(`/packages/${f.pkg.id}/release`, { idempotencyKey: key(), version: f.pkg.version, declaration, proof: issued.body.proof }, foreign.cookie).expect(403);
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(Date.now() + 121000));
    await post(`/packages/${f.pkg.id}/release`, { idempotencyKey: key(), version: f.pkg.version, declaration, proof: issued.body.proof }, f.publisher.cookie).expect(403);
    expect(await db.resultRelease.count({ where: { packageId: f.pkg.id } })).toBe(0);
  });
  it('preserves the policy draft on replay and refuses changed payload or the same approving person', async () => {
    const f = await fixture();
    const replay = await post('/result-publication/demo-policies', f.policyBody, f.examiner.cookie).expect(201);
    expect(replay.body.id).toBe(f.draft.id);
    await post('/result-publication/demo-policies', { ...f.policyBody, showMarks: false }, f.examiner.cookie).expect(409);
    const author = await db.account.findUniqueOrThrow({ where: { id: f.examiner.accountId } });
    await db.account.update({ where: { id: f.publisher.accountId }, data: { personId: author.personId } });
    await post(`/result-publication/demo-policies/${f.draft.id}/approve`, {}, f.publisher.cookie).expect(403);
  });
  it('refuses approval after the original policy author loses authority', async () => {
    const f = await fixture();
    await db.roleAssignment.updateMany({ where: { accountId: f.examiner.accountId }, data: { revokedAt: new Date() } });
    await post(`/result-publication/demo-policies/${f.draft.id}/approve`, {}, f.publisher.cookie).expect(403);
  });
  it('protects proof evidence against SQL rewriting or deletion', async () => {
    const f = await fixture();
    const issued = await post('/result-publication/proofs', f.proofBody, f.publisher.cookie).expect(201);
    expect(issued.body.proof).toBeTruthy();
    const stored = await db.resultReleaseProof.findFirstOrThrow({ where: { accountId: f.publisher.accountId } });
    await expect(db.resultReleaseProof.update({ where: { id: stored.id }, data: { commandDigest: 'rewritten' } })).rejects.toThrow();
    await expect(db.resultReleaseProof.delete({ where: { id: stored.id } })).rejects.toThrow();
  });
});
