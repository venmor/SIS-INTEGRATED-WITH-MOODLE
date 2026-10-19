import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { MoodleLiveRunService } from './moodle-live-run.service.js';

describe('Moodle live delivery permits', () => {
  const required = [{ entity: 'Student' as const, entityId: 'student-1' }];
  function setup(state = 'RUNNING', entries = required) {
    const run = {
      id: 'run-db',
      runId: 'run-1',
      state,
      nonProductionConfirmed: true,
      syntheticOnlyConfirmed: true,
      identityStatus: 'VERIFIED',
      manifest: { entries },
    };
    const db = {
      moodleLiveTestRun: { findUnique: vi.fn(async () => run) },
      $queryRaw: vi.fn(async () => []),
    };
    const service = Object.create(
      MoodleLiveRunService.prototype,
    ) as MoodleLiveRunService;
    Object.defineProperty(service, 'runtimeBinding', {
      value: vi.fn(async () => undefined),
    });
    return { service, db, run };
  }
  it('rejects paused runs before network work', async () => {
    const { service, db } = setup('PAUSED');
    await expect(service.deliveryPermit(db as never, required)).rejects.toThrow(
      'RUNNING_RUN_REQUIRED',
    );
  });
  it('rejects a foreign student within a running run', async () => {
    const { service, db } = setup('RUNNING', []);
    await expect(service.deliveryPermit(db as never, required)).rejects.toThrow(
      'MANIFEST_SCOPE_REQUIRED',
    );
  });
  it('rejects an empty entitlement rather than issuing unrestricted authority', async () => {
    const { service, db } = setup();
    await expect(service.deliveryPermit(db as never, [])).rejects.toThrow(
      'MANIFEST_SCOPE_REQUIRED',
    );
  });
});

describe('derived synthetic registration custody', () => {
  function setup(
    studentId = 'approved-student',
    offeringId = 'approved-offering',
    status = 'ENROLLED',
  ) {
    const entries = [
      { entity: 'Student', entityId: 'approved-student' },
      { entity: 'ProgrammeAttempt', entityId: 'approved-attempt' },
      { entity: 'ProgrammeOffering', entityId: 'approved-offering' },
    ];
    const run = {
      id: 'run',
      state: 'RUNNING',
      nonProductionConfirmed: true,
      syntheticOnlyConfirmed: true,
      identityStatus: 'VERIFIED',
      manifest: { entries },
    };
    const db = {
      courseRegistration: {
        findUnique: vi.fn(async () => ({
          id: 'new-row',
          courseId: 'course',
          status,
          registration: { attemptId: 'approved-attempt', status: 'REGISTERED' },
        })),
      },
      programmeAttempt: {
        findUnique: vi.fn(async () => ({
          id: 'approved-attempt',
          studentId,
          offeringId,
          curriculumVersionId: 'published',
          student: { status: 'ACTIVE', person: { status: 'ACTIVE' } },
        })),
      },
      curriculumCourse: {
        findFirst: vi.fn(async () => ({ id: 'curriculum-course' })),
      },
      moodleLiveTestRun: { findUnique: vi.fn(async () => run) },
      $queryRaw: vi.fn(async () => []),
    };
    const service = Object.create(
      MoodleLiveRunService.prototype,
    ) as MoodleLiveRunService;
    return { service, db };
  }
  it('derives only the three exact sealed parents, without requiring a future row ID', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('SIS_ENABLE_MOODLE_REGISTRATION_DELIVERY', 'true');
    const { service, db } = setup();
    const permit = vi
      .spyOn(service, 'deliveryPermit')
      .mockResolvedValue({ runId: 'approved-run' } as never);
    expect(
      await service.registrationDeliveryPermit(db as never, 'new-row'),
    ).toEqual({ runId: 'approved-run' });
    expect(permit).toHaveBeenCalledWith(db, [
      { entity: 'Student', entityId: 'approved-student' },
      { entity: 'ProgrammeAttempt', entityId: 'approved-attempt' },
      { entity: 'ProgrammeOffering', entityId: 'approved-offering' },
    ]);
    vi.unstubAllEnvs();
  });
  for (const [name, student, offering] of [
    ['student', 'foreign-student', 'approved-offering'],
    ['offering', 'approved-student', 'foreign-offering'],
  ])
    it(`refuses a foreign ${name} even when its row is officially registered`, async () => {
      vi.stubEnv('DEMO_MODE', 'true');
      vi.stubEnv('SIS_ENABLE_MOODLE_REGISTRATION_DELIVERY', 'true');
      const { service, db } = setup(student, offering);
      await expect(
        service.registrationDeliveryPermit(db as never, 'new-row'),
      ).rejects.toThrow('MANIFEST_SCOPE_REQUIRED');
      vi.unstubAllEnvs();
    });
  it('refuses a planned course that was not officially submitted', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('SIS_ENABLE_MOODLE_REGISTRATION_DELIVERY', 'true');
    const { service, db } = setup(undefined, undefined, 'PLANNED');
    await expect(
      service.registrationDeliveryPermit(db as never, 'new-row'),
    ).rejects.toThrow('OFFICIAL_COURSE_REGISTRATION_REQUIRED');
    vi.unstubAllEnvs();
  });
  it('refuses derived custody unless the explicit synthetic policy is enabled', async () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('SIS_ENABLE_MOODLE_REGISTRATION_DELIVERY', 'true');
    const { service, db } = setup();
    await expect(
      service.registrationDeliveryPermit(db as never, 'new-row'),
    ).rejects.toThrow('DEMO_REGISTRATION_DELIVERY_NOT_ENABLED');
    expect(db.courseRegistration.findUnique).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
