import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { demoPublicationPolicy } from './publication-ports.js';

const courseLookup = vi.fn(async () => ({ id: 'course-demo' }));
const periodLookup = vi.fn(async () => ({ status: 'OPEN' }));
const db = {
  course: { findUnique: courseLookup },
  academicPeriod: { findUnique: periodLookup },
} as unknown as Prisma.TransactionClient;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('fictional result publication policy boundary', () => {
  it('refuses release unless explicitly enabled on an isolated database', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://x:x@localhost:5432/sis_review');
    expect(await demoPublicationPolicy.resolve(db, 'RESULT-DEMO-MTH111', 'DEMO-2026S1')).toBeNull();
    vi.stubEnv('SIS_ENABLE_RESULT_DEMO_POLICY', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://x:x@localhost:5432/sis_production');
    expect(await demoPublicationPolicy.resolve(db, 'RESULT-DEMO-MTH111', 'DEMO-2026S1')).toBeNull();
    vi.stubEnv('DATABASE_URL', 'postgresql://x:x@db.example.org:5432/sis_review');
    expect(await demoPublicationPolicy.resolve(db, 'RESULT-DEMO-MTH111', 'DEMO-2026S1')).toBeNull();
    expect(courseLookup).not.toHaveBeenCalled();
  });

  it('requires exact fictional period and course mapping', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('SIS_ENABLE_RESULT_DEMO_POLICY', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://x:x@localhost:5432/sis_review');
    expect(await demoPublicationPolicy.resolve(db, 'SWE111', 'DEMO-2026S1')).toBeNull();
    expect(await demoPublicationPolicy.resolve(db, 'RESULT-DEMO-MTH111', '2026S1')).toBeNull();
    expect(await demoPublicationPolicy.resolve(db, 'RESULT-DEMO-MTH111', 'DEMO-2026S1')).toMatchObject({
      version: 'RESULT-PUBLICATION-DEMO-v1',
      courseId: 'course-demo',
      showMarks: true,
      restrictionsSatisfied: true,
    });
    expect(courseLookup).toHaveBeenCalledWith({ where: { code: 'RESULT-DEMO-MTH111' } });
  });
});
