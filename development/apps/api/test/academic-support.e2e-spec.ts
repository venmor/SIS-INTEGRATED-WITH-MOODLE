import { createHash, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('Academic support request and receiver', () => {
  let app: INestApplication;
  let db: PrismaService;
  let student: {
    cookie: string;
    accountId: string;
    personId: string;
    assignmentId: string;
  };
  let adviser: {
    cookie: string;
    accountId: string;
    personId: string;
    assignmentId: string;
  };
  let studentId: string;
  let serviceId: string;
  let adviserLinkId: string;
  let requestId: string;
  const originalDemoMode = process.env.DEMO_MODE;
  const key = () => randomUUID();
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };

  async function actor(
    role: string,
    capabilities: string[],
    scopeType: string,
    scopeRef: string,
  ) {
    const person = await db.person.create({
      data: { displayName: `Fictional ${role} ${key().slice(0, 6)}` },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: `support.${key()}` },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType,
        scopeRef,
        capabilities,
        reason: 'isolated synthetic support test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const token = key();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return {
      cookie: `sid=${token}`,
      accountId: account.id,
      personId: person.id,
      assignmentId: assignment.id,
    };
  }

  const get = (path: string, cookie: string) =>
    request(app.getHttpServer()).get(`/support${path}`).set('Cookie', cookie);
  const post = (path: string, body: object, cookie: string) =>
    request(app.getHttpServer())
      .post(`/support${path}`)
      .set(csrf)
      .set('Cookie', cookie)
      .send(body);

  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error(
        'Use an isolated test/review database for support tests.',
      );
    process.env.DEMO_MODE = 'true';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
      include: { programme: true },
    });
    student = await actor('STUDENT', ['study'], 'STUDENT', key());
    adviser = await actor(
      'ADVISER',
      ['academic.support.receive'],
      'PROGRAMME',
      offering.programme.code,
    );
    const record = await db.student.create({
      data: { personId: student.personId, studentNumber: `SYN-${key()}` },
    });
    studentId = record.id;
    await db.programmeAttempt.create({
      data: {
        studentId,
        applicationId: key(),
        offeringId: offering.id,
        intake: offering.intake,
        status: 'ADMITTED',
      },
    });
    const link = await db.studentAdviserAssignment.create({
      data: {
        studentId,
        adviserAssignmentId: adviser.assignmentId,
        effectiveFrom: new Date('2020-01-01'),
        sourceRef: 'SYNTHETIC-REVIEW',
      },
    });
    adviserLinkId = link.id;
    const service = await db.academicSupportService.create({
      data: {
        programmeId: offering.programmeId,
        campus: offering.campus,
        name: 'Fictional programme academic advising',
        ownerAssignmentId: adviser.assignmentId,
        status: 'ACTIVE',
        demoOnly: true,
        effectiveFrom: new Date('2020-01-01'),
        approvalRef: 'SYNTHETIC-REVIEW',
      },
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = originalDemoMode;
    await app.close();
  });

  it('shows the receiving adviser before submission and persists the owned request, event and audit once', async () => {
    const readiness = await get('/me', student.cookie).expect(200);
    expect(readiness.body.available).toBe(true);
    expect(readiness.body.receiver.name).toContain('Fictional ADVISER');
    const idempotencyKey = key();
    const body = {
      category: 'ACADEMIC_ADVISING',
      contactMethod: 'PORTAL',
      details: 'I need help choosing courses.',
      acknowledged: true,
      idempotencyKey,
    };
    const first = await post('/me/requests', body, student.cookie).expect(201);
    requestId = first.body.id as string;
    expect(first.body.status).toBe('RECEIVED');
    expect(first.body.owner.name).toBe(readiness.body.receiver.name);
    expect(
      (await post('/me/requests', body, student.cookie).expect(201)).body.id,
    ).toBe(first.body.id);
    await post(
      '/me/requests',
      { ...body, details: 'A different concern.' },
      student.cookie,
    ).expect(409);
    expect(
      await db.academicSupportRequest.count({ where: { idempotencyKey } }),
    ).toBe(1);
    expect(
      await db.academicSupportRequestEvent.count({
        where: { requestId: first.body.id },
      }),
    ).toBe(1);
    expect(
      await db.auditEvent.count({
        where: {
          action: 'StudentSupportRequestCreated',
          targetRef: first.body.id,
        },
      }),
    ).toBe(1);
    const mine = await get('/me/requests', student.cookie).expect(200);
    expect(
      mine.body.items.some((item: { id: string }) => item.id === first.body.id),
    ).toBe(true);
    const assigned = await get('/assigned', adviser.cookie).expect(200);
    expect(
      assigned.body.items.some(
        (item: { id: string }) => item.id === first.body.id,
      ),
    ).toBe(true);
  });

  it('lets the appointed adviser reply in the portal and the student view and answer the same case', async () => {
    const replyKey = key();
    const reply = {
      body: 'I can help you review your course plan. Please reply with a suitable meeting day.',
      idempotencyKey: replyKey,
    };
    const sent = await post(
      `/assigned/${requestId}/replies`,
      reply,
      adviser.cookie,
    ).expect(201);
    expect(sent.body.status).toBe('ADVISER_REPLIED');
    await post(`/assigned/${requestId}/replies`, reply, adviser.cookie).expect(
      201,
    );
    expect(
      await db.academicSupportMessage.count({
        where: { idempotencyKey: replyKey },
      }),
    ).toBe(1);
    const mine = await get(`/me/requests/${requestId}`, student.cookie).expect(
      200,
    );
    expect(mine.body.messages[0].body).toContain('review your course plan');
    expect(mine.body.status).toBe('ADVISER_REPLIED');
    const response = await post(
      `/me/requests/${requestId}/replies`,
      {
        body: 'Tuesday afternoon would be suitable.',
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(201);
    expect(response.body.status).toBe('STUDENT_REPLIED');
    const assigned = await get(`/assigned/${requestId}`, adviser.cookie).expect(
      200,
    );
    expect(assigned.body.messages).toHaveLength(2);
    expect(
      await db.auditEvent.count({
        where: { targetRef: requestId, action: 'AcademicSupportReplySent' },
      }),
    ).toBe(1);
  });

  it('agrees and confirms a student-visible academic follow-up without granting other roles access', async () => {
    const created = await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(201);
    const requestId = created.body.id as string;
    const dueOn = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const proposal = {
      title: 'Review your course plan',
      explanation:
        'Open your registered courses and note any questions for your adviser.',
      routeKey: 'COURSES',
      dueOn,
      idempotencyKey: key(),
    };
    const proposed = await post(
      `/assigned/${requestId}/actions`,
      proposal,
      adviser.cookie,
    ).expect(201);
    const actionId = proposed.body.id as string;
    expect(proposed.body.status).toBe('PROPOSED');
    expect(
      (
        await post(
          `/assigned/${requestId}/actions`,
          proposal,
          adviser.cookie,
        ).expect(201)
      ).body.id,
    ).toBe(actionId);
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, title: 'Different title' },
      adviser.cookie,
    ).expect(409);
    const mine = await get(`/me/requests/${requestId}`, student.cookie).expect(
      200,
    );
    expect(mine.body.actions[0]).toMatchObject({
      id: actionId,
      dueOn,
      routeKey: 'COURSES',
      status: 'PROPOSED',
    });
    const unrelated = await actor('SYSADMIN', [], 'SYSTEM', 'GLOBAL');
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, idempotencyKey: key() },
      unrelated.cookie,
    ).expect(403);
    const otherStudent = await actor('STUDENT', ['study'], 'STUDENT', key());
    await post(
      `/me/requests/${requestId}/actions/${actionId}/response`,
      { accept: true, idempotencyKey: key() },
      otherStudent.cookie,
    ).expect(403);
    const response = { accept: true, idempotencyKey: key() };
    await post(
      `/me/requests/${requestId}/actions/${actionId}/response`,
      response,
      student.cookie,
    ).expect(201);
    await post(
      `/me/requests/${requestId}/actions/${actionId}/response`,
      response,
      student.cookie,
    ).expect(201);
    await post(
      `/me/requests/${requestId}/actions/${actionId}/response`,
      { accept: false, idempotencyKey: key() },
      student.cookie,
    ).expect(409);
    const claim = { idempotencyKey: key() };
    await post(
      `/me/requests/${requestId}/actions/${actionId}/claim`,
      claim,
      student.cookie,
    ).expect(201);
    expect(
      (await get(`/assigned/${requestId}`, adviser.cookie).expect(200)).body
        .actions[0].status,
    ).toBe('CLAIMED_COMPLETE');
    const confirm = { idempotencyKey: key() };
    await post(
      `/assigned/${requestId}/actions/${actionId}/confirm`,
      confirm,
      adviser.cookie,
    ).expect(201);
    await post(
      `/assigned/${requestId}/actions/${actionId}/confirm`,
      confirm,
      adviser.cookie,
    ).expect(201);
    expect(
      (await get(`/me/requests/${requestId}`, student.cookie).expect(200)).body
        .actions[0].status,
    ).toBe('COMPLETE');
    expect(
      await db.academicSupportActionEvent.count({ where: { actionId } }),
    ).toBe(4);
    expect(await db.auditEvent.count({ where: { targetRef: actionId } })).toBe(
      4,
    );
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, dueOn: '2020-01-01', idempotencyKey: key() },
      adviser.cookie,
    ).expect(400);
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, routeKey: 'EXTERNAL_URL', idempotencyKey: key() },
      adviser.cookie,
    ).expect(400);
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: new Date('2021-01-01') },
    });
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, idempotencyKey: key() },
      adviser.cookie,
    ).expect(409);
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: null },
    });
    const declinedProposal = await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, idempotencyKey: key() },
      adviser.cookie,
    ).expect(201);
    const declinedActionId = declinedProposal.body.id as string;
    await post(
      `/me/requests/${requestId}/actions/${declinedActionId}/response`,
      { accept: false, idempotencyKey: key() },
      student.cookie,
    ).expect(201);
    expect(
      (await get(`/me/requests/${requestId}`, student.cookie).expect(200)).body
        .actions[0].status,
    ).toBe('DECLINED');
    await post(
      `/me/requests/${requestId}/actions/${declinedActionId}/claim`,
      { idempotencyKey: key() },
      student.cookie,
    ).expect(409);
    process.env.DEMO_MODE = 'false';
    await post(
      `/assigned/${requestId}/actions`,
      { ...proposal, idempotencyKey: key() },
      adviser.cookie,
    ).expect(403);
    process.env.DEMO_MODE = 'true';
  });

  it('filters only this appointment by reply need and exact case reference', async () => {
    const second = await post(
      '/me/requests',
      {
        category: 'COURSE_DIFFICULTY',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(201);
    const needsReply = await get(
      '/assigned?status=NEEDS_REPLY',
      adviser.cookie,
    ).expect(200);
    expect(
      needsReply.body.items.map((item: { id: string }) => item.id),
    ).toContain(requestId);
    expect(
      needsReply.body.items.map((item: { id: string }) => item.id),
    ).toContain(second.body.id);
    const received = await get(
      '/assigned?status=RECEIVED',
      adviser.cookie,
    ).expect(200);
    expect(
      received.body.items.map((item: { id: string }) => item.id),
    ).toContain(second.body.id);
    expect(
      received.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(requestId);
    const exact = await get(
      `/assigned?reference=${second.body.reference}`,
      adviser.cookie,
    ).expect(200);
    expect(exact.body.items.map((item: { id: string }) => item.id)).toEqual([
      second.body.id,
    ]);
    const lowerCase = await get(
      `/assigned?reference=${String(second.body.reference).toLowerCase()}`,
      adviser.cookie,
    ).expect(200);
    expect(lowerCase.body.items[0].id).toBe(second.body.id);
    const firstPage = await get(
      '/assigned?status=NEEDS_REPLY&take=1',
      adviser.cookie,
    ).expect(200);
    expect(firstPage.body.nextCursor).toBeTruthy();
    await get(
      `/assigned?status=ADVISER_REPLIED&take=1&cursor=${firstPage.body.nextCursor}`,
      adviser.cookie,
    ).expect(400);
    await get('/assigned?reference=SUP-00000000', adviser.cookie)
      .expect(200)
      .then((result) => expect(result.body.items).toEqual([]));
    await get('/assigned?status=COUNSELLING', adviser.cookie).expect(400);
  });

  it('lists only assigned active follow-ups by target date and next step', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const makeAction = async (dueOn: string) => {
      const created = await post(
        '/me/requests',
        {
          category: 'ACADEMIC_ADVISING',
          contactMethod: 'PORTAL',
          acknowledged: true,
          idempotencyKey: key(),
        },
        student.cookie,
      ).expect(201);
      const action = await post(
        `/assigned/${created.body.id}/actions`,
        {
          title: 'Review course choices',
          explanation:
            'Check your own registered courses before the next discussion.',
          routeKey: 'COURSES',
          dueOn,
          idempotencyKey: key(),
        },
        adviser.cookie,
      ).expect(201);
      return {
        requestId: created.body.id as string,
        actionId: action.body.id as string,
      };
    };
    const pastTarget = await makeAction(tomorrow);
    const confirm = await makeAction(nextWeek);
    await db.academicSupportAction.update({
      where: { id: pastTarget.actionId },
      data: { dueOn: '2020-01-01' },
    });
    await post(
      `/me/requests/${confirm.requestId}/actions/${confirm.actionId}/response`,
      { accept: true, idempotencyKey: key() },
      student.cookie,
    ).expect(201);
    await post(
      `/me/requests/${confirm.requestId}/actions/${confirm.actionId}/claim`,
      { idempotencyKey: key() },
      student.cookie,
    ).expect(201);
    const all = await get('/assigned/actions?take=1', adviser.cookie).expect(
      200,
    );
    expect(all.body.items[0]).toMatchObject({
      id: pastTarget.actionId,
      nextStep: 'STUDENT',
    });
    const next = await get(
      `/assigned/actions?take=1&cursor=${all.body.nextCursor}`,
      adviser.cookie,
    ).expect(200);
    expect(next.body.items[0]).toMatchObject({
      id: confirm.actionId,
      nextStep: 'ADVISER',
    });
    const overdue = await get(
      '/assigned/actions?view=PAST_TARGET',
      adviser.cookie,
    ).expect(200);
    expect(overdue.body.items.map((item: { id: string }) => item.id)).toContain(
      pastTarget.actionId,
    );
    expect(
      overdue.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(confirm.actionId);
    const awaiting = await get(
      '/assigned/actions?view=NEEDS_CONFIRMATION',
      adviser.cookie,
    ).expect(200);
    expect(
      awaiting.body.items.map((item: { id: string }) => item.id),
    ).toContain(confirm.actionId);
    await get(
      `/assigned/actions?view=NEEDS_CONFIRMATION&cursor=${all.body.nextCursor}`,
      adviser.cookie,
    ).expect(400);
    await get('/assigned/actions?view=HIGH_RISK', adviser.cookie).expect(400);
    const other = await actor(
      'ADVISER',
      ['academic.support.receive'],
      'PROGRAMME',
      'OTHER',
    );
    expect(
      (await get('/assigned/actions', other.cookie).expect(200)).body.items,
    ).toEqual([]);
    await get(
      `/assigned/actions?cursor=${all.body.nextCursor}`,
      other.cookie,
    ).expect(400);
    await get('/assigned/actions', student.cookie).expect(403);
    await post(
      `/assigned/${confirm.requestId}/actions/${confirm.actionId}/confirm`,
      { idempotencyKey: key() },
      adviser.cookie,
    ).expect(201);
    await get(
      `/assigned/actions?view=NEEDS_CONFIRMATION&cursor=${confirm.actionId}`,
      adviser.cookie,
    ).expect(400);
    const admin = await actor('SYSADMIN', [], 'SYSTEM', 'GLOBAL');
    await get('/assigned/actions', admin.cookie).expect(403);
  });

  it('closes an evidenced academic case once and blocks new work after closure', async () => {
    const created = await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(201);
    const id = created.body.id as string;
    const close = {
      reason: 'AGREED_ACTION_COMPLETED',
      idempotencyKey: key(),
    };
    await post(`/assigned/${id}/close`, close, adviser.cookie).expect(409);
    await post(
      `/assigned/${id}/replies`,
      {
        body: 'Let us review your course choices together.',
        idempotencyKey: key(),
      },
      adviser.cookie,
    ).expect(201);
    const proposed = await post(
      `/assigned/${id}/actions`,
      {
        title: 'Review course choices',
        explanation: 'Open your own course list and note any questions.',
        routeKey: 'COURSES',
        dueOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        idempotencyKey: key(),
      },
      adviser.cookie,
    ).expect(201);
    const actionId = proposed.body.id as string;
    await post(`/assigned/${id}/close`, close, adviser.cookie).expect(409);
    await post(
      `/me/requests/${id}/actions/${actionId}/response`,
      { accept: true, idempotencyKey: key() },
      student.cookie,
    ).expect(201);
    await post(
      `/me/requests/${id}/actions/${actionId}/claim`,
      { idempotencyKey: key() },
      student.cookie,
    ).expect(201);
    await post(`/assigned/${id}/close`, close, adviser.cookie).expect(409);
    await post(
      `/assigned/${id}/actions/${actionId}/confirm`,
      { idempotencyKey: key() },
      adviser.cookie,
    ).expect(201);
    await post(`/assigned/${id}/close`, close, student.cookie).expect(403);
    const unrelatedAdviser = await actor(
      'ADVISER',
      ['academic.support.receive'],
      'PROGRAMME',
      'OTHER',
    );
    await post(`/assigned/${id}/close`, close, unrelatedAdviser.cookie).expect(
      404,
    );
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: new Date('2021-01-01') },
    });
    await post(`/assigned/${id}/close`, close, adviser.cookie).expect(409);
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: null },
    });
    process.env.DEMO_MODE = 'false';
    await post(`/assigned/${id}/close`, close, adviser.cookie).expect(403);
    process.env.DEMO_MODE = 'true';
    const first = await post(
      `/assigned/${id}/close`,
      close,
      adviser.cookie,
    ).expect(201);
    expect(first.body).toMatchObject({
      status: 'CLOSED',
      reason: close.reason,
    });
    expect(
      (await post(`/assigned/${id}/close`, close, adviser.cookie).expect(201))
        .body.id,
    ).toBe(first.body.id);
    await post(
      `/assigned/${id}/close`,
      { ...close, reason: 'GUIDANCE_GIVEN' },
      adviser.cookie,
    ).expect(409);
    await post(
      `/me/requests/${id}/replies`,
      { body: 'A later reply', idempotencyKey: key() },
      student.cookie,
    ).expect(409);
    await post(
      `/assigned/${id}/replies`,
      { body: 'A later adviser reply', idempotencyKey: key() },
      adviser.cookie,
    ).expect(409);
    await post(
      `/assigned/${id}/actions`,
      {
        title: 'Another task',
        explanation: 'This should not be added to a closed case.',
        routeKey: 'COURSES',
        dueOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        idempotencyKey: key(),
      },
      adviser.cookie,
    ).expect(409);
    expect(
      (await get(`/me/requests/${id}`, student.cookie).expect(200)).body,
    ).toMatchObject({ status: 'CLOSED', closure: { reason: close.reason } });
    expect(
      await db.academicSupportClosure.count({ where: { requestId: id } }),
    ).toBe(1);
    expect(
      await db.academicSupportRequestEvent.count({
        where: { requestId: id, event: 'CLOSED' },
      }),
    ).toBe(1);
    expect(
      await db.auditEvent.count({
        where: { targetRef: id, action: 'AcademicSupportCaseClosed' },
      }),
    ).toBe(1);
    const guidance = await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(201);
    await post(
      `/assigned/${guidance.body.id}/replies`,
      {
        body: 'Please review your course plan with me.',
        idempotencyKey: key(),
      },
      adviser.cookie,
    ).expect(201);
    await post(
      `/assigned/${guidance.body.id}/close`,
      { reason: 'GUIDANCE_GIVEN', idempotencyKey: key() },
      adviser.cookie,
    ).expect(201);
    const closedQueue = await get(
      '/assigned?status=CLOSED',
      adviser.cookie,
    ).expect(200);
    expect(
      closedQueue.body.items.map((item: { id: string }) => item.id),
    ).toContain(guidance.body.id);
  });

  it('fails closed when the service, adviser relationship or demo boundary is unavailable', async () => {
    await db.academicSupportService.update({
      where: { id: serviceId },
      data: { status: 'DRAFT' },
    });
    expect((await get('/me', student.cookie).expect(200)).body.available).toBe(
      false,
    );
    await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(409);
    await db.academicSupportService.update({
      where: { id: serviceId },
      data: { status: 'ACTIVE' },
    });
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: new Date('2021-01-01') },
    });
    expect((await get('/me', student.cookie).expect(200)).body.available).toBe(
      false,
    );
    await db.studentAdviserAssignment.update({
      where: { id: adviserLinkId },
      data: { effectiveTo: null },
    });
    process.env.DEMO_MODE = 'false';
    expect((await get('/me', student.cookie).expect(200)).body.available).toBe(
      false,
    );
    await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(409);
    process.env.DEMO_MODE = 'true';
  });

  it('denies other roles, unassigned staff and restricted service categories', async () => {
    const outsider = await actor(
      'ADVISER',
      ['academic.support.receive'],
      'PROGRAMME',
      'OTHER',
    );
    await get('/assigned', outsider.cookie)
      .expect(200)
      .then((r) => expect(r.body.items).toEqual([]));
    const admin = await actor('SYSADMIN', [], 'SYSTEM', 'GLOBAL');
    await get('/assigned', admin.cookie).expect(403);
    await get('/me/requests', admin.cookie).expect(403);
    await post(
      '/me/requests',
      {
        category: 'COUNSELLING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      student.cookie,
    ).expect(400);
    await post(
      '/me/requests',
      {
        category: 'ACADEMIC_ADVISING',
        contactMethod: 'PORTAL',
        acknowledged: true,
        idempotencyKey: key(),
      },
      admin.cookie,
    ).expect(403);
  });
});
