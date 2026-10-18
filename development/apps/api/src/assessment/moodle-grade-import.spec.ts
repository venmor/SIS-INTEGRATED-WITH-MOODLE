import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { MoodleGradeImportService } from './moodle-grade-import.service.js';

describe('live grade import authority and custody', () => {
  it('refuses a student before reading mappings or contacting Moodle', async () => {
    const prisma = { gradeActivityMapping: { findUnique: vi.fn() } };
    const service = new MoodleGradeImportService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.import(
        {
          accountId: 'student',
          assignmentId: 'student-role',
          activeRole: 'STUDENT',
          scope: null,
        },
        'request',
        'mapping',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.gradeActivityMapping.findUnique).not.toHaveBeenCalled();
  });
  it('refuses a revoked or wrong-offering lecturer before any provider read', async () => {
    const prisma = {
      gradeActivityMapping: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'ACTIVE',
          component: { plan: { offeringRef: 'CSC101' } },
        }),
      },
      roleAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new MoodleGradeImportService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.import(
        {
          accountId: 'lecturer',
          assignmentId: 'revoked',
          activeRole: 'LEC',
          scope: null,
        },
        'request',
        'mapping',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('requires an active mapping even for the appointed lecturer', async () => {
    const prisma = {
      gradeActivityMapping: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'DRAFT',
          component: { plan: { offeringRef: 'CSC101' } },
        }),
      },
      roleAssignment: { findFirst: vi.fn().mockResolvedValue({ id: 'valid' }) },
      $queryRaw: vi.fn().mockResolvedValue([]),
      session: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            activeAssignment: { scopeType: 'OFFERING', scopeRef: 'CSC101' },
          }),
      },
    };
    const service = new MoodleGradeImportService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.import(
        {
          accountId: 'lecturer',
          assignmentId: 'valid',
          activeRole: 'LEC',
          scope: 'OFFERING:CSC101',
          sessionToken: 'current-test-session',
        },
        'request',
        'mapping',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
