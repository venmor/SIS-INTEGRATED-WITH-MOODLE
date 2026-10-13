import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { SECURITY_V1 } from '@sis/config';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  timetableAppointment,
  lockTimetableAuthority,
} from './timetable-authority.js';
import { toPlanningRules } from './demo-rules-policy.js';

import { timetableUuid } from './publication-policy.js';
import {
  parseMasterCommand,
  masterContentDigest,
  validateMasterSources,
} from './master-validation.js';

@Injectable()
export class MasterPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async authority(
    actor: ActiveAuthority,
    db: Prisma.TransactionClient = this.prisma,
    action: 'read' | 'draft' = 'read',
  ) {
    return timetableAppointment(db, actor, action);
  }

  private async readWithAuthority<T>(
    actor: ActiveAuthority,
    read: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    await this.authority(actor);
    return this.prisma.$transaction(
      async (db) => {
        await lockTimetableAuthority(db, actor);
        await this.authority(actor, db);
        const result = await read(db);
        await this.authority(actor, db);
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async catalogue(actor: ActiveAuthority) {
    return this.readWithAuthority(actor, async (db) => {
      const periods = await db.academicPeriod.findMany({
        where: { code: { startsWith: 'DEMO-' } },
        select: { id: true, code: true },
        orderBy: { code: 'asc' },
        take: 30,
      });
      const rules = await db.timetableDemoRuleDraft.findMany({
        where: { periodId: { in: periods.map((p) => p.id) } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const offerings = await db.courseDeliveryOffering.findMany({
        where: {
          periodId: { in: periods.map((p) => p.id) },
          campusUnit: { code: { startsWith: 'DEMO-' } },
        },
        include: {
          courseVersion: { include: { course: { select: { code: true } } } },
          sections: { select: { id: true, code: true, capacity: true } },
          campusUnit: { select: { code: true } },
        },
        take: 100,
      });
      const venues = await db.teachingVenue.findMany({
        where: { building: { campusUnit: { code: { startsWith: 'DEMO-' } } } },
        include: {
          building: { select: { campusUnit: { select: { code: true } } } },
        },
        take: 100,
      });
      const sectionIds = offerings.flatMap((o) => o.sections.map((s) => s.id));
      const teachers = await db.roleAssignment.findMany({
        where: {
          scopeType: 'SECTION',
          scopeRef: { in: sectionIds },
          role: { in: ['LEC', 'TUT', 'COORDINATOR'] },
          capabilities: { has: 'teach' },
          revokedAt: null,
          startsAt: { lte: new Date() },
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
          account: { status: 'ACTIVE', person: { status: 'ACTIVE' } },
        },
        select: {
          id: true,
          scopeRef: true,
          role: true,
          account: { select: { person: { select: { displayName: true } } } },
        },
        take: 200,
      });
      const registrations = await db.courseRegistration.findMany({
        where: {
          status: 'ENROLLED',
          registration: {
            periodId: { in: periods.map((p) => p.id) },
            status: 'REGISTERED',
          },
        },
        select: {
          id: true,
          course: { select: { code: true } },
          registration: { select: { periodId: true } },
        },
        take: 100,
      });
      return {
        periods,
        rules: rules
          .filter((row) => toPlanningRules(row))
          .map((row) => ({
            id: row.id,
            periodId: row.periodId,
            version: row.version,
            campusCode:
              offerings.find((o) => o.campusUnitId === row.campusUnitId)
                ?.campusUnit.code ?? 'DEMO',
          })),
        sections: offerings.flatMap((o) =>
          o.sections.map((s) => ({
            id: s.id,
            code: `${o.courseVersion.course.code} · ${o.courseVersion.title} · ${s.code}`,
            courseCode: o.courseVersion.course.code,
            periodId: o.periodId,
            campusCode: o.campusUnit.code,
            capacity: s.capacity,
          })),
        ),
        venues: venues.map((v) => ({
          id: v.id,
          code: `${v.building.campusUnit.code} · ${v.code}`,
          campusCode: v.building.campusUnit.code,
          teachingCapacity: v.teachingCapacity,
          stepFreeAccess: v.stepFreeAccess,
        })),
        teachers: teachers.map((t) => ({
          id: t.id,
          sectionId: t.scopeRef,
          label: `${t.account.person.displayName} · ${t.role}`,
        })),
        registrations: registrations.map((r) => ({
          id: r.id,
          courseCode: r.course.code,
          periodId: r.registration.periodId,
          label: `Registered learner · ${r.id.slice(0, 8)}`,
        })),
      };
    });
  }

  async list(actor: ActiveAuthority) {
    return this.readWithAuthority(actor, async (db) => {
      const periods = await db.academicPeriod.findMany({
        where: { code: { startsWith: 'DEMO-' } },
        select: { id: true },
      });
      return db.timetableDemoMasterDraft.findMany({
        where: { periodId: { in: periods.map((p) => p.id) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          periodId: true,
          version: true,
          ruleDraftId: true,
          status: true,
          sessions: true,
          issues: true,
          createdAt: true,
          contentDigest: true,
        },
      });
    });
  }

  async draftHistory(
    actor: ActiveAuthority,
    periodId: string,
    beforeVersion?: number,
  ) {
    await this.authority(actor);
    if (!timetableUuid.test(periodId)) throw new NotFoundException();
    return this.prisma.$transaction(
      async (db) => {
        await lockTimetableAuthority(db, actor);
        await this.authority(actor, db);
        const period = await db.academicPeriod.findUnique({
          where: { id: periodId },
          select: { code: true },
        });
        if (!period?.code.startsWith('DEMO-')) throw new NotFoundException();
        const rows = await db.timetableDemoMasterDraft.findMany({
          where: {
            periodId,
            ...(beforeVersion ? { version: { lt: beforeVersion } } : {}),
          },
          orderBy: { version: 'desc' },
          take: 21,
          select: {
            id: true,
            periodId: true,
            version: true,
            ruleDraftId: true,
            status: true,
            sessions: true,
            issues: true,
            createdAt: true,
            contentDigest: true,
          },
        });
        const items = rows.slice(0, 20);
        await this.authority(actor, db);
        return {
          items,
          olderVersionCursor: rows.length > 20 ? items.at(-1)!.version : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async course(actor: ActiveAuthority, id: string, courseCode: string) {
    return this.readWithAuthority(actor, async (db) => {
      if (
        !timetableUuid.test(id) ||
        !/^([A-Z]{2,8}[0-9]{2,5})$/.test(courseCode)
      )
        throw new NotFoundException();
      const draft = await db.timetableDemoMasterDraft.findUnique({
        where: { id },
        include: { period: { select: { code: true } } },
      });
      if (!draft || !draft.period.code.startsWith('DEMO-'))
        throw new NotFoundException();
      const sessions = (
        draft.sessions as unknown as Array<{ id: string; courseCode: string }>
      ).filter((s) => s.courseCode === courseCode);
      const ids = new Set(sessions.map((s) => s.id));
      const issues = (
        draft.issues as unknown as Array<{
          code: string;
          occurrenceIds: string[];
        }>
      ).filter(
        (issue) =>
          issue.occurrenceIds.length === 0 ||
          issue.occurrenceIds.some((item) => ids.has(item)),
      );
      return {
        masterDraftId: draft.id,
        version: draft.version,
        status: draft.status,
        courseCode,
        sessions,
        issues,
        createdAt: draft.createdAt,
      };
    });
  }

  async create(actor: ActiveAuthority, raw: unknown) {
    await this.authority(actor, this.prisma, 'draft');
    const command = parseMasterCommand(raw);
    const digest = masterContentDigest(command);
    try {
      return await this.prisma.$transaction(
        async (db) => {
          await db.$queryRaw`SELECT pg_advisory_xact_lock(260007, 3)::text`;
          await db.$queryRaw`SELECT pg_advisory_xact_lock(260008, hashtext(${command.periodId}))::text`;
          await lockTimetableAuthority(db, actor);
          await this.authority(actor, db, 'draft');
          const replay = await db.timetableDemoMasterDraft.findUnique({
            where: {
              createdByAccountId_clientRequestId: {
                createdByAccountId: actor.accountId,
                clientRequestId: command.clientRequestId,
              },
            },
          });
          if (replay) {
            if (replay.contentDigest !== digest)
              throw new ConflictException(
                'This save reference was used for different sessions.',
              );
            await this.authority(actor, db, 'draft');
            return {
              id: replay.id,
              version: replay.version,
              status: replay.status,
            };
          }
          const latest = await db.timetableDemoMasterDraft.findFirst({
            where: { periodId: command.periodId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          if ((latest?.version ?? 0) !== command.expectedVersion)
            throw new ConflictException(
              'The master draft changed. Reload its latest version.',
            );
          const { preview, issues, status, sourceFingerprint, sourceContext } =
            await validateMasterSources(db, command);
          const proposer = await db.account.findUniqueOrThrow({
            where: { id: actor.accountId },
            select: { personId: true },
          });
          const row = await db.timetableDemoMasterDraft.create({
            data: {
              periodId: command.periodId,
              version: command.expectedVersion + 1,
              ruleDraftId: command.ruleDraftId,
              sessions: preview as unknown as Prisma.InputJsonValue,
              createdByAssignmentId: actor.assignmentId!,
              createdByPersonId: proposer.personId,
              sourceFingerprint,
              sourceContext: sourceContext as unknown as Prisma.InputJsonValue,
              issues: issues.map((issue) => ({
                code: issue.code,
                occurrenceIds: issue.occurrenceIds,
              })),
              status,
              createdByAccountId: actor.accountId,
              clientRequestId: command.clientRequestId,
              contentDigest: digest,
            },
            select: { id: true, version: true, status: true },
          });
          await db.auditEvent.create({
            data: {
              action: 'DemoMasterTimetableDraftSaved',
              outcome: 'ALLOW',
              actorAccountId: actor.accountId,
              activeRole: actor.activeRole,
              scope: actor.scope,
              targetRef: row.id,
              idempotencyRef: command.clientRequestId,
              purpose: 'fictional-timetable-planning',
              policyVersion: SECURITY_V1.version,
              correlationId: randomUUID(),
            },
          });
          await this.authority(actor, db, 'draft');
          return row;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'P2002' || error.code === 'P2034')
      )
        throw new ConflictException(
          'The master draft changed. Reload and try again.',
        );
      throw error;
    }
  }
}
