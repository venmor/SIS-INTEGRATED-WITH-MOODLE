import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoodleLiveRunService } from './moodle-live-run.service.js';
afterEach(() => vi.unstubAllEnvs());
describe('bounded registered class custody', () => {
  function fixture(count = 200) {
    vi.stubEnv('DEMO_MODE', 'true'); vi.stubEnv('SIS_ENABLE_MOODLE_REGISTRATION_DELIVERY', 'true');
    const rows = Array.from({ length: count }, (_, i) => ({ id: `registration-${i}`, courseId: 'course', status: 'ENROLLED', registration: { status: 'REGISTERED', attemptId: `attempt-${i}` } }));
    const attempts = rows.map((_, i) => ({ id: `attempt-${i}`, studentId: `student-${i}`, offeringId: 'offering', curriculumVersionId: 'curriculum', student: { status: 'ACTIVE', person: { status: 'ACTIVE' } } }));
    const db = { courseRegistration: { findMany: vi.fn().mockResolvedValue(rows) }, programmeAttempt: { findMany: vi.fn().mockResolvedValue(attempts) }, curriculumCourse: { findMany: vi.fn().mockResolvedValue([{ curriculumId: 'curriculum', courseId: 'course' }]) } };
    const service = Object.create(MoodleLiveRunService.prototype) as MoodleLiveRunService;
    const permit = vi.spyOn(service, 'deliveryPermit').mockResolvedValue({ runId: 'review-run' } as never);
    return { rows, attempts, db, service, permit };
  }
  it('validates 200 registered students using three bulk queries and one manifest permit', async () => {
    const f = fixture();
    expect(await f.service.registrationBatchDeliveryPermit(f.db as never, f.rows.map((r) => r.id))).toEqual({ runId: 'review-run' });
    expect(f.db.courseRegistration.findMany).toHaveBeenCalledTimes(1);
    expect(f.db.programmeAttempt.findMany).toHaveBeenCalledTimes(1);
    expect(f.db.curriculumCourse.findMany).toHaveBeenCalledTimes(1);
    expect(f.permit).toHaveBeenCalledTimes(1);
    expect(f.permit.mock.calls[0][1]).toHaveLength(401);
  });
  it('rejects a draft course or missing attempt before granting a permit', async () => {
    const f = fixture(2); f.rows[0].status = 'PLANNED';
    await expect(f.service.registrationBatchDeliveryPermit(f.db as never, f.rows.map((r) => r.id))).rejects.toThrow();
    expect(f.permit).not.toHaveBeenCalled();
  });
  it('refuses an unbounded or empty class', async () => {
    const f = fixture();
    await expect(f.service.registrationBatchDeliveryPermit(f.db as never, [])).rejects.toThrow();
    await expect(f.service.registrationBatchDeliveryPermit(f.db as never, Array.from({ length: 201 }, (_, i) => `${i}`))).rejects.toThrow();
    expect(f.db.courseRegistration.findMany).not.toHaveBeenCalled();
  });
});
