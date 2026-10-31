import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { Prisma } from '@prisma/client';

export type EntitlementReason =
  | 'OK'
  | 'NO_ITEM'
  | 'NOT_DELIVERED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'WITHDRAWN'
  | 'PERIOD_CLOSED'
  | 'COURSE_DROPPED';

export interface Entitlement {
  entitled: boolean;
  reason: EntitlementReason;
  itemId?: string;
  moodleRole?: string;
  validityPolicy?: string;
  validUntil?: Date | null;
  moodleCourseRef?: string | null;
}

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Resolves whether a student may access a specific registered course in
 * Moodle. Entitlement is derived from SIS state, not from token age:
 * a delivered provisioning item, a live registration for the course, an
 * active student, a valid period, and no revocation or policy expiry.
 */
@Injectable()
export class MoodleEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    db: Db,
    input: { studentId: string; courseRegistrationId: string },
  ): Promise<Entitlement> {
    const now = new Date();

    const student = await (db as any).student.findUnique({
      where: { id: input.studentId },
      select: { status: true },
    });
    if (!student || student.status !== 'ACTIVE') {
      return { entitled: false, reason: 'WITHDRAWN' };
    }

    const course = await (db as any).courseRegistration.findUnique({
      where: { id: input.courseRegistrationId },
      select: { status: true, registrationId: true },
    });
    if (!course) return { entitled: false, reason: 'NO_ITEM' };
    if (course.status !== 'ENROLLED') {
      return { entitled: false, reason: 'COURSE_DROPPED' };
    }

    const registration = await (db as any).institutionalRegistration.findUnique({
      where: { id: course.registrationId },
      select: { attemptId: true, periodId: true, status: true },
    });
    if (!registration || registration.status !== 'REGISTERED') {
      return { entitled: false, reason: 'PERIOD_CLOSED' };
    }

    // AcademicPeriod carries no dates; the latest period version does.
    const periodVersion = await (db as any).academicPeriodVersion.findFirst({
      where: { periodId: registration.periodId },
      orderBy: { version: 'desc' },
      select: { endDate: true },
    });
    if (periodVersion?.endDate && periodVersion.endDate < now) {
      return { entitled: false, reason: 'PERIOD_CLOSED' };
    }

    const item = await (db as any).moodleProvisionRequestItem.findFirst({
      where: { studentId: input.studentId, courseRegistrationId: input.courseRegistrationId },
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { state: true } } },
    });
    if (!item) return { entitled: false, reason: 'NO_ITEM' };
    if (item.state === 'REVOKED' || item.request?.state === 'REVOKED') {
      return { entitled: false, reason: 'REVOKED', itemId: item.id };
    }
    if (item.validUntil && item.validUntil < now) {
      return { entitled: false, reason: 'EXPIRED', itemId: item.id };
    }
    if (item.state !== 'DELIVERED') {
      return { entitled: false, reason: 'NOT_DELIVERED', itemId: item.id };
    }

    // Resolve the Moodle course behind the delivered item.
    //
    // The live path keys its SHELL mapping by `offeringId:periodCode` and
    // rewrites `moodleId` from the shell shortname to the numeric Moodle
    // course id once the shell exists (integration.service.ts ensureShellFor),
    // while the provisioning item keeps the shortname. Matching the item
    // against `moodleId` therefore never resolves on a live site, so the
    // mapping is found by the same key the shell was created with. The direct
    // shortname match is kept for the simulator, whose shell reference is the
    // stored id.
    const period = await (db as any).academicPeriod.findUnique({
      where: { id: registration.periodId },
      select: { code: true },
    });
    const mapping =
      (item.offeringId && period?.code
        ? await (db as any).moodleMapping.findFirst({
            where: {
              kind: 'SHELL',
              sisType: 'OFFERING',
              sisId: `${item.offeringId}:${period.code}`,
              status: 'ACTIVE',
            },
            select: { moodleId: true },
          })
        : null) ??
      (item.shellRef
        ? await (db as any).moodleMapping.findFirst({
            where: { kind: 'SHELL', moodleId: item.shellRef, status: 'ACTIVE' },
            select: { moodleId: true },
          })
        : null);

    return {
      entitled: true,
      reason: 'OK',
      itemId: item.id,
      moodleRole: item.moodleRole,
      validityPolicy: item.validityPolicy,
      validUntil: item.validUntil,
      moodleCourseRef: mapping?.moodleId ?? item.shellRef ?? null,
    };
  }
}
