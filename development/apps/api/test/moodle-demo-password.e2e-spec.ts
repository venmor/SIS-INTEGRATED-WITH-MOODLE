import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { IntegrationService } from '../src/integration/integration.service.js';
import { MoodleLiveDeliveryService } from '../src/integration/moodle-live-delivery.service.js';
import { user, key } from './helpers/phase6.js';

describe('own generated Moodle initial demo credential', () => {
  let app: INestApplication, db: PrismaService;
  let learner: Awaited<ReturnType<typeof user>>, stranger: Awaited<ReturnType<typeof user>>, registrationId: string;
  const initial = 'Generated-initial-demo-only-2026!', username = 'sis.demo.review.student';
  const path = '/integration/me/moodle-demo-password';
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost','127.0.0.1'].includes(target.hostname) || !/(test|review|ci)/.test(target.pathname)) throw Error('isolated database required');
    const values = { DEMO_MODE:'true', SIS_ENABLE_MOODLE_DEMO_CREDENTIALS:'true', MOODLE_DEMO_CREDENTIALS_JSON:JSON.stringify({[username]:{password:initial,moodleUserId:6,host:'moodle.example.invalid'}}), MOODLE_INTEGRATION_MODE:'live-test',MOODLE_API_URL:'https://moodle.example.invalid',MOODLE_API_TOKEN:'fixture-only',MOODLE_ALLOWED_HOST:'moodle.example.invalid',MOODLE_EXPECTED_SITE_ID:'1',MOODLE_EXPECTED_VERSION:'5.2',MOODLE_ROLE_IDS:'{"student":5}',MOODLE_CATEGORY_ID:'3',MOODLE_COURSE_VISIBLE:'1',MOODLE_LIVE_TEST_RUN_ID:'DEMO-PASSWORD-REVIEW',MOODLE_LIVE_TEST_DB_FINGERPRINT:'0'.repeat(64),MOODLE_LIVE_TEST_COHORT_PREFIX:'SIS-MOODLE-LIVE-TEST-' };
    Object.entries(values).forEach(([k,v]) => vi.stubEnv(k,v));
    const module = await Test.createTestingModule({imports:[AppModule]})
      .overrideProvider(MoodleLiveDeliveryService).useValue({ confirmedStudentIdentity:async () => ({moodleUserId:6}) })
      .overrideProvider(IntegrationService).useValue({ liveRegistrationAccess:async () => ({username,confirmedCount:1}) }).compile();
    app=module.createNestApplication();app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();db=app.get(PrismaService);
    learner=await user(db,'STUDENT',['study'],'PERSON','SELF');stranger=await user(db,'STUDENT',['study'],'PERSON','SELF');
    const account=await db.account.findUniqueOrThrow({where:{id:learner.accountId}});
    const student=await db.student.create({data:{personId:account.personId,studentNumber:key()}});
    const other=await db.account.findUniqueOrThrow({where:{id:stranger.accountId}});
    await db.student.create({data:{personId:other.personId,studentNumber:key()}});
    const offering=await db.programmeOffering.findFirstOrThrow();
    const attempt=await db.programmeAttempt.create({data:{studentId:student.id,applicationId:key(),offeringId:offering.id,intake:'2026'}});
    const period=await db.academicPeriod.create({data:{code:key()}});
    const course=await db.course.findFirstOrThrow();
    registrationId=(await db.institutionalRegistration.create({data:{attemptId:attempt.id,periodId:period.id,snapshot:{},receipt:key(),roster:{create:{courseId:course.id}}}})).id;
  });
  afterAll(async()=>{vi.unstubAllEnvs();await app?.close();});
  const post = (cookie:string,body:object={registrationId}) => request(app.getHttpServer()).post(path).set('Cookie',cookie).set('x-requested-with','XMLHttpRequest').send(body);
  it('returns only an explicitly configured own initial password without caching or storing it in audit',async()=>{
    const r=await post(learner.cookie);expect(r.status).toBe(201);expect(r.body).toEqual({username,initialPassword:initial});expect(r.headers['cache-control']).toContain('no-store');
    const events=await db.auditEvent.findMany({where:{action:'MoodleInitialDemoPasswordViewed',actorAccountId:learner.accountId}});expect(events.length).toBe(1);expect(JSON.stringify(events)).not.toContain(initial);
  });
  it('refuses another student and staff, and never accepts a caller-supplied Moodle username',async()=>{
    expect((await post(stranger.cookie)).status).toBe(404);
    const staff=await user(db,'MOODLE_ADMIN',['manage-mapping'],'SYSTEM','MOODLE');expect((await post(staff.cookie)).status).toBe(403);
    expect((await post(learner.cookie,{registrationId,username:'admin'})).status).toBe(400);
  });
  it('requires a session and same-origin command protection',async()=>{
    expect((await request(app.getHttpServer()).post(path).send({registrationId})).status).toBe(401);
    expect((await request(app.getHttpServer()).post(path).set('Cookie',learner.cookie).send({registrationId})).status).toBe(403);
  });
  it('hides the credential when disabled or the Moodle identity no longer matches',async()=>{
    vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_CREDENTIALS','false');expect((await post(learner.cookie)).status).toBe(404);
    vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_CREDENTIALS','true');vi.stubEnv('MOODLE_DEMO_CREDENTIALS_JSON',JSON.stringify({[username]:{password:initial,moodleUserId:99,host:'moodle.example.invalid'}}));expect((await post(learner.cookie)).status).toBe(404);
  });
});
