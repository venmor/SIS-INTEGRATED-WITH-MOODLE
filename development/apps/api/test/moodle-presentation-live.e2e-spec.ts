import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash } from 'argon2';
import { mkdir, writeFile } from 'node:fs/promises';
import request from 'supertest';
import type { MoodleLiveRunView } from '@sis/contracts/moodle-live-run';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { MoodleLiveDeliveryService } from '../src/integration/moodle-live-delivery.service.js';
import { user } from './helpers/phase6.js';
import { key } from './helpers/assessment.js';
import { declaration } from './helpers/publication.js';

/** Explicit operator opt-in: this contacts the owner's named MoodleCloud
 * demonstration site. Default CI skips it. Never substitute mock provider
 * responses here or describe synthetic operator decisions as human signoff. */
describe.skipIf(process.env.MOODLE_PRESENTATION_LIVE !== '1')('actual Moodle presentation journey', () => {
  let app: INestApplication, db: PrismaService;
  const password = 'Review-2026-Moodle!';
  const evidence = '../../.evidence/moodle-completion-20261018';
  const credentials: Array<{ username: string; password: string; role: string }> = [];
  type Versioned = { id: string; version: number };
  type Principal = Awaited<ReturnType<typeof user>>;
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
  async function actor(username: string, role: string, caps: string[], scopeType: string, scopeRef: string) {
    const person = await user(db, role, caps, scopeType, scopeRef);
    await db.account.update({ where: { id: person.accountId }, data: { username } });
    await db.credential.create({ data: { accountId: person.accountId, kind: 'PASSWORD', status: 'ACTIVE', secretHash: await hash(password) } });
    credentials.push({ username, password, role });
    return person;
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/sis_moodle_live_review_20261018' || process.env.MOODLE_API_URL !== 'https://sis-moodle.moodlecloud.com') throw Error('Exact owned local review database and MoodleCloud demonstration target required.');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
    await mkdir(`${evidence}/private`, { recursive: true, mode: 0o700 });
  });
  afterAll(async () => {
    if (credentials.length) await writeFile(`${evidence}/private/sis-logins.json`, JSON.stringify(credentials, null, 2), { mode: 0o600 });
    await app?.close();
  });
  it('registers, verifies real Moodle access, imports 17/20, independently moderates and publishes 85 to the owning student', async () => {
    const suffix = key().slice(0, 6), code = `DEMO-PHY-${suffix}`, periodCode = '2026S1';
    const author = await actor(`moodle.author.${suffix}`, 'MOODLE_ADMIN', ['manage-mapping', 'sync-moodle'], 'SYSTEM', 'MOODLE');
    const technician = await actor(`moodle.reviewer.${suffix}`, 'MOODLE_ADMIN', ['manage-mapping', 'sync-moodle'], 'SYSTEM', 'MOODLE');
    const operations = await actor(`moodle.operations.${suffix}`, 'INTEGRATION_SUPPORT', ['replay-event', 'manage-incident'], 'SYSTEM', 'MOODLE');
    const priorRun = await get<MoodleLiveRunView | null>('/integration/live-test/runs/current', operations.cookie);
    if (priorRun && ['PREPARED', 'RUNNING', 'PAUSED'].includes(priorRun.state)) await post(`/integration/live-test/runs/${priorRun.id}/fail`, { version: priorRun.version, idempotencyKey: key(), reason: 'Retain an earlier incomplete generated rehearsal before retrying; no record or Moodle work is deleted.' }, operations.cookie);
    const coordinator = await actor(`academic.reviewer.${suffix}`, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Natural Sciences');
    const lecturer = await actor(`lecturer.physics.${suffix}`, 'LEC', ['stage-marks'], 'OFFERING', code);
    const moderator = await actor(`moderator.physics.${suffix}`, 'MODERATOR', ['moderate-results'], 'OFFERING', code);
    const examiner = await actor(`exams.prepare.${suffix}`, 'EXAMINATIONS_OFFICER', ['validate-results'], 'PERIOD', periodCode);
    const publisher = await actor(`exams.release.${suffix}`, 'EXAMINATIONS_OFFICER', ['validate-results', 'release-results'], 'PERIOD', periodCode);
    const learner = await actor(`chanda.integration.${suffix}`, 'STUDENT', ['study'], 'PERSON', 'SELF');
    const account = await db.account.findUniqueOrThrow({ where: { id: learner.accountId } });
    await db.person.update({ where: { id: account.personId }, data: { displayName: 'Chanda Mulenga' } });
    const student = await db.student.create({ data: { personId: account.personId, studentNumber: `DEMO-2026-${suffix}` } });
    const programme = await db.programme.create({ data: { code, name: 'Bachelor of Science — Natural Sciences', awardLevel: 'BSc', school: 'Natural Sciences', duration: '4 years', overview: 'Generated presentation structure using a public course title.', feeScheduleRef: 'DEMO-ACADEMIC-2026-v1/Natural-Sciences', publishedVersion: '1', effectiveDate: new Date(), owningOffice: 'Registry' } });
    const offering = await db.programmeOffering.create({ data: { programmeId: programme.id, intake: '2026', studyMode: 'FULLTIME', campus: 'MAIN', availability: 'CLOSED' } });
    const application = await db.application.create({ data: { accountId: learner.accountId, offeringId: offering.id, reference: key(), policyVersion: 'DEMO', requirementVersion: '1' } });
    const course = await db.course.create({ data: { code, title: 'Introduction to Physics', credits: 30, courseType: 'full', capacity: 50 } });
    const curriculum = await db.curriculumVersion.create({ data: { programmeId: programme.id, version: 1, courses: { create: { courseId: course.id, semester: periodCode } } } });
    const attempt = await db.programmeAttempt.create({ data: { studentId: student.id, applicationId: application.id, offeringId: offering.id, curriculumVersionId: curriculum.id, intake: '2026', status: 'ACTIVE' } });
    const period = await db.academicPeriod.upsert({ where: { code: periodCode }, update: { status: 'OPEN', registrationOpen: new Date(Date.now() - 86400000), registrationClose: new Date(Date.now() + 86400000 * 30) }, create: { code: periodCode, status: 'OPEN', registrationOpen: new Date(Date.now() - 86400000), registrationClose: new Date(Date.now() + 86400000 * 30) } });
    await db.coursePlan.create({ data: { attemptId: attempt.id, periodId: period.id, items: { create: { courseId: course.id } } } });
    const run = await post<MoodleLiveRunView>('/integration/live-test/runs', { idempotencyKey: key(), reason: 'Generated-actor final-year-project rehearsal; not human or institutional acceptance.', nonProductionConfirmed: true, syntheticOnlyConfirmed: true }, author.cookie);
    process.env.MOODLE_LIVE_TEST_RUN_ID = run.requiredBinding.runId;
    process.env.MOODLE_LIVE_TEST_DB_FINGERPRINT = run.requiredBinding.dbFingerprint;
    let current = run;
    for (const entry of [{ entity: 'Student', entityId: student.id }, { entity: 'ProgrammeAttempt', entityId: attempt.id }, { entity: 'ProgrammeOffering', entityId: offering.id }]) current = await post<MoodleLiveRunView>(`/integration/live-test/runs/${run.id}/manifest/entries`, { ...entry, version: current.version, reason: 'Generated demonstration source parents', idempotencyKey: key() }, author.cookie);
    current = await post<MoodleLiveRunView>(`/integration/live-test/runs/${run.id}/manifest/seal`, { version: current.version, reason: 'Seal the exact generated demonstration cohort.', idempotencyKey: key() }, author.cookie);
    async function confirm(action: 'technical-approval' | 'start', who: Principal) {
      const view = await get<MoodleLiveRunView>(`/integration/live-test/runs/${run.id}`, who.cookie);
      const receipt = await post<{ receiptToken: string }>(`/integration/live-test/runs/${run.id}/reauthenticate`, { action, version: view.version, evidenceChecksum: view.actionEvidence[action], password }, who.cookie);
      current = await post<MoodleLiveRunView>(`/integration/live-test/runs/${run.id}/${action}`, { version: view.version, reason: 'Independent generated operator; synthetic rehearsal only.', idempotencyKey: key(), receiptToken: receipt.receiptToken }, who.cookie);
    }
    await confirm('technical-approval', technician); await confirm('start', operations);
    expect(current.state).toBe('RUNNING');
    const plan = await get<{ version: number }>(`/registration/plan?attemptId=${attempt.id}&period=${periodCode}`, learner.cookie);
    const registration = await post<{ id: string }>(`/registration/submit?attemptId=${attempt.id}&period=${periodCode}`, { version: plan.version, attemptId: attempt.id, period: periodCode, declarations: ['PLAN_ACCURATE', 'RULES_UNDERSTOOD', 'FINANCE_UNDERSTOOD'], idempotencyKey: key() }, learner.cookie);
    const row = await db.courseRegistration.findFirstOrThrow({ where: { registrationId: registration.id } });
    for (const [kind, moodleId] of [['SHELL', 9], ['USER', 6]] as const) {
      const mapping = await post<Versioned>('/integration/live-bindings', { idempotencyKey: key(), courseRegistrationId: row.id, kind, moodleId }, author.cookie);
      if (kind === 'SHELL') await post(`/integration/live-bindings/${mapping.id}/attest`, { version: mapping.version, idempotencyKey: key() }, coordinator.cookie);
      await post(`/integration/live-bindings/${mapping.id}/activate`, { version: mapping.version, idempotencyKey: key(), password }, technician.cookie);
    }
    const event = await db.outboxEvent.findFirstOrThrow({ where: { aggregateId: registration.id, type: 'MoodleEnrolmentQueued' } });
    expect(await app.get(MoodleLiveDeliveryService).deliver(event.id, row.id)).toBe('DELIVERED');
    const status = await get<{ moodle: { state: string } }>(`/registration/status?attemptId=${attempt.id}&period=${periodCode}`, learner.cookie);
    expect(status.moodle.state).toBe('Synced');
    const scheme = await post<Versioned & { components: Array<{ id: string }> }>('/assessment/plans', { offeringRef: code, periodCode, components: [{ code: 'CA-ASSIGN', maxMark: 20, weight: 100 }], idempotencyKey: key() }, lecturer.cookie);
    await post(`/assessment/plans/${scheme.id}/approve`, { version: scheme.version, idempotencyKey: key() }, coordinator.cookie);
    const gradeMap = await post<Versioned>('/assessment/mappings', { componentId: scheme.components[0].id, moodleCourseRef: '9', moodleActivityId: '14', idempotencyKey: key() }, lecturer.cookie);
    await post(`/assessment/mappings/${gradeMap.id}/test`, { idempotencyKey: key() }, lecturer.cookie);
    await post(`/assessment/mappings/${gradeMap.id}/activate`, { idempotencyKey: key() }, coordinator.cookie);
    const batch = await post<Versioned & { lines: Array<{ rawValue: number }> }>(`/assessment/mappings/${gradeMap.id}/import-moodle`, { idempotencyKey: key() }, lecturer.cookie);
    expect(batch.lines[0].rawValue).toBe(17);
    await post('/assessment/candidate-lists', { offeringRef: code, periodCode, studentRefs: [student.studentNumber], idempotencyKey: key() }, coordinator.cookie);
    await post(`/assessment/batches/${batch.id}/validate`, { idempotencyKey: key() }, examiner.cookie);
    let review = await post<Versioned>(`/assessment/batches/${batch.id}/submit`, { declaration: 'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.', idempotencyKey: key() }, lecturer.cookie);
    review = await post<Versioned>(`/assessment/moderation/${review.id}/begin`, { idempotencyKey: key() }, moderator.cookie);
    await post(`/assessment/moderation/${review.id}/decide`, { version: review.version, to: 'APPROVED', idempotencyKey: key() }, moderator.cookie);
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
