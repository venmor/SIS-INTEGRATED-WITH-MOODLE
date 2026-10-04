import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../../src/identity-access/prisma.service.js';
import { user } from './phase6.js';
import { assessPost, key } from './assessment.js';
export const declaration =
  'I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.';
export async function publicationFixture(
  app: INestApplication,
  db: PrismaService,
  candidateCount = 1,
) {
  const offeringRef = `RESULT-${key().slice(0, 8)}`;
  const periodCode = `PERIOD-${key().slice(0, 8)}`;
  const lecturer = await user(
    db,
    'LEC',
    ['stage-marks'],
    'OFFERING',
    offeringRef,
  );
  const examiner = await user(
    db,
    'EXAMINATIONS_OFFICER',
    ['validate-results'],
    'PERIOD',
    periodCode,
  );
  const publisher = await user(
    db,
    'EXAMINATIONS_OFFICER',
    ['validate-results', 'release-results'],
    'PERIOD',
    periodCode,
  );
  const student = await user(db, 'STUDENT', ['study'], 'STUDENT', 'SELF');
  const account = await db.account.findUniqueOrThrow({
    where: { id: student.accountId },
  });
  const record = await db.student.create({
    data: { personId: account.personId, studentNumber: `STU-${key()}` },
  });
  const period = await db.academicPeriod.create({
    data: { code: periodCode, status: 'OPEN' },
  });
  const course = await db.course.create({
    data: {
      code: offeringRef,
      title: 'Fictional result course',
      credits: 10,
      courseType: 'HALF',
      capacity: 10,
    },
  });
  const offering = await db.programmeOffering.findFirstOrThrow();
  const attempt = await db.programmeAttempt.create({
    data: {
      studentId: record.id,
      applicationId: key(),
      offeringId: offering.id,
      intake: periodCode,
    },
  });
  const registration = await db.institutionalRegistration.create({
    data: {
      attemptId: attempt.id,
      periodId: period.id,
      snapshot: {},
      receipt: key(),
      roster: { create: { courseId: course.id } },
    },
  });
  const records = [record];
  for (let n = 1; n < candidateCount; n++) {
    const peer = await user(db, 'STUDENT', ['study'], 'STUDENT', 'SELF');
    const peerAccount = await db.account.findUniqueOrThrow({
      where: { id: peer.accountId },
    });
    const peerRecord = await db.student.create({
      data: { personId: peerAccount.personId, studentNumber: `STU-${key()}` },
    });
    const peerAttempt = await db.programmeAttempt.create({
      data: {
        studentId: peerRecord.id,
        applicationId: key(),
        offeringId: offering.id,
        intake: periodCode,
      },
    });
    await db.institutionalRegistration.create({
      data: {
        attemptId: peerAttempt.id,
        periodId: period.id,
        snapshot: {},
        receipt: key(),
        roster: { create: { courseId: course.id } },
      },
    });
    records.push(peerRecord);
  }
  const list = await db.assessmentCandidateList.create({
    data: {
      offeringRef,
      periodCode,
      studentRefs: records.map((r) => r.studentNumber),
      createdByAccountId: examiner.accountId,
    },
  });
  const plan = await db.assessmentPlan.create({
    data: {
      offeringRef,
      periodCode,
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
  const post = assessPost(app);
  async function packageAt(mark = 70) {
    for (const component of plan.components) {
      const mapping =
        (await db.gradeActivityMapping.findFirst({
          where: { componentId: component.id },
        })) ??
        (await db.gradeActivityMapping.create({
          data: {
            componentId: component.id,
            moodleActivityId: key(),
            moodleCourseRef: key(),
            createdByAccountId: lecturer.accountId,
            status: 'ACTIVE',
          },
        }));
      const batch = await db.gradeBatch.create({
        data: {
          mappingId: mapping.id,
          sourceRevision: key(),
          offeringRef,
          periodCode,
          componentCode: component.code,
          createdByAccountId: lecturer.accountId,
          lockedAt: new Date(),
        },
      });
      const mc = await db.moderationCase.create({
        data: {
          batchId: batch.id,
          status: 'APPROVED',
          declaration: 'test',
          submittedByAccountId: lecturer.accountId,
          decidedByAccountId: examiner.accountId,
        },
      });
      for (const candidate of records) {
        const previous = await db.officialCARecord.count({
          where: {
            offeringRef,
            componentCode: component.code,
            studentRef: candidate.studentNumber,
          },
        });
        await db.officialCARecord.create({
          data: {
            offeringRef,
            periodCode,
            componentCode: component.code,
            studentRef: candidate.studentNumber,
            resolvedStudentId: candidate.id,
            mark: (component.maxMark * mark) / 100,
            caseId: mc.id,
            version: previous + 1,
          },
        });
      }
    }
    const assembled = await post(
      '/packages',
      {
        idempotencyKey: key(),
        offeringRef,
        periodCode,
        declaration:
          'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.',
      },
      lecturer.cookie,
    ).expect(201);
    const approved = await post(
      `/packages/${assembled.body.id}/decide`,
      {
        idempotencyKey: key(),
        version: assembled.body.version,
        to: 'APPROVE_FOR_RELEASE',
      },
      examiner.cookie,
    ).expect(201);
    return approved.body as { id: string; version: number };
  }
  return {
    offeringRef,
    periodCode,
    lecturer,
    examiner,
    publisher,
    student,
    record,
    records,
    course,
    registration,
    list,
    packageAt,
  };
}
