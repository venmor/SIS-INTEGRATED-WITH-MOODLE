import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { auditAuth } from '../identity-access/audit.js';
import type {
  AcademicActionKeyDto,
  AcademicActionPageDto,
  AcademicRequestPageDto,
  AcademicReplyDto,
  CreateAcademicRequestDto,
  CloseAcademicRequestDto,
  ProposeAcademicActionDto,
  RespondAcademicActionDto,
} from './dto.js';

type Db = Prisma.TransactionClient;
const noticeVersion = 'SYNTHETIC-ACADEMIC-SUPPORT-v1';
const actionRoutes = {
  COURSES: '/student/courses',
  REGISTRATION: '/student/register',
  SUPPORT: '/student/support',
} as const;

@Injectable()
export class AcademicSupportService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeAssignment(
    db: Db,
    auth: ActiveAuthority,
    role: 'STUDENT' | 'ADVISER',
    capability: string,
  ) {
    if (!auth.assignmentId || auth.activeRole !== role)
      throw new ForbiddenException(
        'Select the appropriate workspace to continue.',
      );
    const now = new Date();
    const assignment = await db.roleAssignment.findFirst({
      where: {
        id: auth.assignmentId,
        accountId: auth.accountId,
        role,
        capabilities: { has: capability },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
        scopeType: { not: 'BREAK_GLASS' },
      },
      select: { id: true, scopeType: true, scopeRef: true },
    });
    if (!assignment)
      throw new ForbiddenException(
        'This workspace is no longer authorized. Switch workspace or contact support.',
      );
    return assignment;
  }

  private async ownStudent(db: Db, auth: ActiveAuthority) {
    await this.activeAssignment(db, auth, 'STUDENT', 'study');
    const account = await db.account.findUnique({
      where: { id: auth.accountId },
      select: { personId: true },
    });
    if (!account)
      throw new ForbiddenException(
        'Student record unavailable in this workspace.',
      );
    const student = await db.student.findUnique({
      where: { personId: account.personId },
      select: { id: true, status: true, studentNumber: true },
    });
    if (!student)
      throw new ForbiddenException(
        'Student record unavailable in this workspace.',
      );
    return student;
  }

  private async route(db: Db, studentId: string) {
    const unavailable = (reason: string) => ({
      available: false as const,
      reason,
      receiver: null,
      context: null,
    });
    if (process.env.DEMO_MODE !== 'true')
      return unavailable(
        'Academic support routing is not yet approved for this institution.',
      );
    const now = new Date();
    const attempts = await db.programmeAttempt.findMany({
      where: { studentId, status: { in: ['ADMITTED', 'ACTIVE'] } },
      select: {
        offering: {
          select: {
            campus: true,
            programmeId: true,
            programme: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    });
    if (attempts.length !== 1)
      return unavailable(
        'Your current programme needs review before an adviser can be identified.',
      );
    const offering = attempts[0].offering;
    const advisers = await db.studentAdviserAssignment.findMany({
      where: {
        studentId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      select: { adviserAssignmentId: true },
      take: 2,
    });
    if (advisers.length !== 1)
      return unavailable(
        'An academic adviser has not yet been assigned. Ask your programme office for the current contact route.',
      );
    const services = await db.academicSupportService.findMany({
      where: {
        programmeId: offering.programmeId,
        campus: offering.campus,
        ownerAssignmentId: advisers[0].adviserAssignmentId,
        status: 'ACTIVE',
        demoOnly: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      select: {
        id: true,
        name: true,
        ownerAssignmentId: true,
        ownerAssignment: {
          select: {
            id: true,
            role: true,
            scopeType: true,
            scopeRef: true,
            capabilities: true,
            startsAt: true,
            endsAt: true,
            revokedAt: true,
            account: {
              select: {
                status: true,
                person: { select: { displayName: true } },
              },
            },
          },
        },
      },
      take: 2,
    });
    if (services.length !== 1)
      return unavailable(
        'No approved academic-support receiving route is available for this programme and campus.',
      );
    const service = services[0];
    const owner = service.ownerAssignment;
    if (
      owner.role !== 'ADVISER' ||
      owner.scopeType !== 'PROGRAMME' ||
      owner.scopeRef !== offering.programme.code ||
      !owner.capabilities.includes('academic.support.receive') ||
      owner.startsAt > now ||
      (owner.endsAt && owner.endsAt <= now) ||
      owner.revokedAt ||
      owner.account.status !== 'ACTIVE'
    )
      return unavailable(
        'The assigned academic adviser is unavailable. Ask your programme office for the current contact route.',
      );
    return {
      available: true as const,
      reason: null,
      receiver: {
        name: owner.account.person.displayName,
        service: service.name,
      },
      context: {
        studentId,
        serviceId: service.id,
        ownerAssignmentId: owner.id,
        programmeName: offering.programme.name,
        campus: offering.campus,
      },
    };
  }

  async readiness(auth: ActiveAuthority) {
    const student = await this.ownStudent(this.prisma, auth);
    const result =
      student.status === 'ACTIVE'
        ? await this.route(this.prisma, student.id)
        : {
            available: false as const,
            reason:
              'Your student record is not active. Contact Student Records before requesting academic help.',
            receiver: null,
            context: null,
          };
    await auditAuth(this.prisma, {
      action: 'StudentSupportReadinessViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: student.id,
    });
    return {
      available: result.available,
      reason: result.reason,
      receiver: result.receiver,
      programmeName: result.context?.programmeName ?? null,
      campus: result.context?.campus ?? null,
      noticeVersion: result.available ? noticeVersion : null,
    };
  }

  private fingerprint(body: CreateAcademicRequestDto, details: string | null) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          category: body.category,
          contactMethod: body.contactMethod,
          details,
          acknowledged: body.acknowledged,
        }),
      )
      .digest('hex');
  }

  async create(auth: ActiveAuthority, body: CreateAcademicRequestDto) {
    const student = await this.ownStudent(this.prisma, auth);
    const details = body.details?.trim() || null;
    const fingerprint = this.fingerprint(body, details);
    const existing = await this.prisma.academicSupportRequest.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: {
        service: true,
        ownerAssignment: {
          include: { account: { include: { person: true } } },
        },
      },
    });
    if (existing) {
      if (
        existing.studentId !== student.id ||
        existing.fingerprint !== fingerprint
      )
        throw new ConflictException(
          'This request key was already used for a different request. Refresh and try again.',
        );
      return this.receipt(existing);
    }
    if (!body.acknowledged)
      throw new BadRequestException(
        'Read and accept the academic-support routing notice before sending.',
      );
    if (student.status !== 'ACTIVE')
      throw new ConflictException(
        'Your student record is not active. Contact Student Records before requesting academic help.',
      );
    try {
      return await this.prisma.$transaction(async (db) => {
        const route = await this.route(db, student.id);
        if (!route.available || !route.context)
          throw new ConflictException(
            route.reason ??
              'The receiving route is unavailable. Refresh before trying again.',
          );
        const supportId = randomUUID();
        const created = await db.academicSupportRequest.create({
          data: {
            id: supportId,
            reference: `SUP-${supportId.slice(0, 8).toUpperCase()}`,
            studentId: student.id,
            serviceId: route.context.serviceId,
            ownerAssignmentId: route.context.ownerAssignmentId,
            category: body.category,
            contactMethod: body.contactMethod,
            details,
            noticeVersion,
            idempotencyKey: body.idempotencyKey,
            fingerprint,
          },
          include: {
            service: true,
            ownerAssignment: {
              include: { account: { include: { person: true } } },
            },
          },
        });
        await db.academicSupportRequestEvent.create({
          data: {
            requestId: created.id,
            event: 'REQUEST_RECEIVED',
            actorAccountId: auth.accountId,
          },
        });
        await db.auditEvent.create({
          data: {
            action: 'StudentSupportRequestCreated',
            outcome: 'ALLOW',
            actorAccountId: auth.accountId,
            activeRole: auth.activeRole,
            scope: auth.scope,
            targetRef: created.id,
            idempotencyRef: body.idempotencyKey,
            correlationId: randomUUID(),
            policyVersion: noticeVersion,
            metadata: {
              serviceId: created.serviceId,
              ownerAssignmentId: created.ownerAssignmentId,
              category: created.category,
            },
          },
        });
        return this.receipt(created);
      });
    } catch (error) {
      const replay = await this.prisma.academicSupportRequest.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
        include: {
          service: true,
          ownerAssignment: {
            include: { account: { include: { person: true } } },
          },
        },
      });
      if (replay) {
        if (
          replay.studentId !== student.id ||
          replay.fingerprint !== fingerprint
        )
          throw new ConflictException(
            'This request key was already used for a different request. Refresh and try again.',
          );
        return this.receipt(replay);
      }
      throw error;
    }
  }

  private receipt(row: {
    id: string;
    reference: string;
    status: string;
    createdAt: Date;
    service: { name: string };
    ownerAssignment: { account: { person: { displayName: string } } };
  }) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      owner: {
        service: row.service.name,
        name: row.ownerAssignment.account.person.displayName,
      },
    };
  }

  private async pageCursor(
    db: Db,
    where: Prisma.AcademicSupportRequestWhereInput,
    cursor?: string,
  ) {
    if (!cursor) return null;
    const row = await db.academicSupportRequest.findFirst({
      where: { ...where, id: cursor },
      select: { id: true, createdAt: true },
    });
    if (!row)
      throw new BadRequestException(
        'This request page is no longer available. Refresh the list.',
      );
    return row;
  }

  private pageWhere(
    base: Prisma.AcademicSupportRequestWhereInput,
    cursor: { id: string; createdAt: Date } | null,
  ): Prisma.AcademicSupportRequestWhereInput {
    return cursor
      ? {
          AND: [
            base,
            {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            },
          ],
        }
      : base;
  }

  async mine(auth: ActiveAuthority, query: AcademicRequestPageDto) {
    const student = await this.ownStudent(this.prisma, auth);
    const base = { studentId: student.id };
    const cursor = await this.pageCursor(this.prisma, base, query.cursor);
    const take = query.take ?? 20;
    const rows = await this.prisma.academicSupportRequest.findMany({
      where: this.pageWhere(base, cursor),
      select: {
        id: true,
        reference: true,
        category: true,
        status: true,
        createdAt: true,
        service: { select: { name: true } },
        ownerAssignment: {
          select: {
            account: { select: { person: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    await auditAuth(this.prisma, {
      action: 'StudentSupportRequestsViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: student.id,
    });
    const items = rows.slice(0, take).map((row) => ({
      id: row.id,
      reference: row.reference,
      category: row.category,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      service: row.service.name,
      owner: row.ownerAssignment.account.person.displayName,
    }));
    return {
      items,
      nextCursor: rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async assigned(auth: ActiveAuthority, query: AcademicRequestPageDto) {
    const assignment = await this.activeAssignment(
      this.prisma,
      auth,
      'ADVISER',
      'academic.support.receive',
    );
    if (assignment.scopeType !== 'PROGRAMME')
      throw new ForbiddenException(
        'This adviser appointment has no programme scope.',
      );
    const base: Prisma.AcademicSupportRequestWhereInput = {
      ownerAssignmentId: assignment.id,
      ...(query.status && query.status !== 'ALL'
        ? {
            status:
              query.status === 'NEEDS_REPLY'
                ? { in: ['RECEIVED', 'STUDENT_REPLIED'] }
                : query.status,
          }
        : {}),
      ...(query.reference ? { reference: query.reference.toUpperCase() } : {}),
    };
    const cursor = await this.pageCursor(this.prisma, base, query.cursor);
    const take = query.take ?? 20;
    const rows = await this.prisma.academicSupportRequest.findMany({
      where: this.pageWhere(base, cursor),
      select: {
        id: true,
        reference: true,
        category: true,
        contactMethod: true,
        details: true,
        status: true,
        createdAt: true,
        student: {
          select: {
            studentNumber: true,
            person: { select: { displayName: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    await auditAuth(this.prisma, {
      action: 'AcademicSupportAssignedQueueViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: assignment.id,
    });
    const items = rows.slice(0, take).map((row) => ({
      id: row.id,
      reference: row.reference,
      category: row.category,
      contactMethod: row.contactMethod,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      student: {
        number: row.student.studentNumber,
        name: row.student.person.displayName,
      },
    }));
    return {
      items,
      nextCursor: rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async assignedActions(auth: ActiveAuthority, query: AcademicActionPageDto) {
    const assignment = await this.activeAssignment(
      this.prisma,
      auth,
      'ADVISER',
      'academic.support.receive',
    );
    if (assignment.scopeType !== 'PROGRAMME')
      throw new ForbiddenException(
        'This adviser appointment has no programme scope.',
      );
    const today = this.lusakaToday();
    const base: Prisma.AcademicSupportActionWhereInput = {
      request: { ownerAssignmentId: assignment.id },
      status:
        query.view === 'NEEDS_CONFIRMATION'
          ? 'CLAIMED_COMPLETE'
          : { in: ['PROPOSED', 'ACCEPTED', 'CLAIMED_COMPLETE'] },
      ...(query.view === 'PAST_TARGET' ? { dueOn: { lt: today } } : {}),
    };
    let cursor: { id: string; dueOn: string } | null = null;
    if (query.cursor) {
      cursor = await this.prisma.academicSupportAction.findFirst({
        where: { ...base, id: query.cursor },
        select: { id: true, dueOn: true },
      });
      if (!cursor)
        throw new BadRequestException(
          'This follow-up page is no longer available. Refresh the list.',
        );
    }
    const where: Prisma.AcademicSupportActionWhereInput = cursor
      ? {
          AND: [
            base,
            {
              OR: [
                { dueOn: { gt: cursor.dueOn } },
                { dueOn: cursor.dueOn, id: { gt: cursor.id } },
              ],
            },
          ],
        }
      : base;
    const take = query.take ?? 20;
    const rows = await this.prisma.academicSupportAction.findMany({
      where,
      select: {
        id: true,
        title: true,
        dueOn: true,
        status: true,
        request: {
          select: {
            id: true,
            reference: true,
            student: {
              select: {
                studentNumber: true,
                person: { select: { displayName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueOn: 'asc' }, { id: 'asc' }],
      take: take + 1,
    });
    await auditAuth(this.prisma, {
      action: 'AcademicSupportActionQueueViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: assignment.id,
    });
    const items = rows.slice(0, take).map((row) => ({
      id: row.id,
      requestId: row.request.id,
      reference: row.request.reference,
      student: {
        number: row.request.student.studentNumber,
        name: row.request.student.person.displayName,
      },
      title: row.title,
      dueOn: row.dueOn,
      pastTarget: row.dueOn < today,
      status: row.status,
      nextStep: row.status === 'CLAIMED_COMPLETE' ? 'ADVISER' : 'STUDENT',
    }));
    return {
      items,
      nextCursor: rows.length > take ? (items.at(-1)?.id ?? null) : null,
      asOf: today,
    };
  }

  private async ownedCase(
    db: Db,
    auth: ActiveAuthority,
    id: string,
    role: 'STUDENT' | 'ADVISER',
  ) {
    const ownerWhere =
      role === 'STUDENT'
        ? { studentId: (await this.ownStudent(db, auth)).id }
        : {
            ownerAssignmentId: (
              await this.activeAssignment(
                db,
                auth,
                'ADVISER',
                'academic.support.receive',
              )
            ).id,
          };
    const row = await db.academicSupportRequest.findFirst({
      where: { id, ...ownerWhere },
      include: {
        service: { select: { name: true, demoOnly: true } },
        ownerAssignment: {
          select: {
            account: { select: { person: { select: { displayName: true } } } },
          },
        },
        student: {
          select: {
            studentNumber: true,
            person: { select: { displayName: true } },
          },
        },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, authorRole: true, body: true, createdAt: true },
        },
        actions: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          select: {
            id: true,
            title: true,
            explanation: true,
            dueOn: true,
            routeKey: true,
            status: true,
            createdAt: true,
          },
        },
        closure: {
          select: { id: true, reason: true, createdAt: true },
        },
      },
    });
    if (!row)
      throw new NotFoundException(
        'This academic-support request is not available in your workspace.',
      );
    return row;
  }

  private caseView(
    row: Awaited<ReturnType<AcademicSupportService['ownedCase']>>,
  ) {
    return {
      id: row.id,
      reference: row.reference,
      category: row.category,
      contactMethod: row.contactMethod,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      service: row.service.name,
      owner: row.ownerAssignment.account.person.displayName,
      student: {
        number: row.student.studentNumber,
        name: row.student.person.displayName,
      },
      messages: row.messages.map((message) => ({
        id: message.id,
        authorRole: message.authorRole,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
      actions: row.actions.map((action) => ({
        id: action.id,
        title: action.title,
        explanation: action.explanation,
        dueOn: action.dueOn,
        routeKey: action.routeKey,
        href:
          actionRoutes[action.routeKey as keyof typeof actionRoutes] ?? null,
        status: action.status,
        createdAt: action.createdAt.toISOString(),
      })),
      closure: row.closure
        ? {
            id: row.closure.id,
            reason: row.closure.reason,
            closedAt: row.closure.createdAt.toISOString(),
          }
        : null,
    };
  }

  async myCase(auth: ActiveAuthority, id: string) {
    const row = await this.ownedCase(this.prisma, auth, id, 'STUDENT');
    await auditAuth(this.prisma, {
      action: 'StudentSupportRequestViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: id,
    });
    return this.caseView(row);
  }

  async assignedCase(auth: ActiveAuthority, id: string) {
    const row = await this.ownedCase(this.prisma, auth, id, 'ADVISER');
    await auditAuth(this.prisma, {
      action: 'AcademicSupportAssignedCaseViewed',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope,
      targetRef: id,
    });
    return this.caseView(row);
  }

  private messageFingerprint(
    id: string,
    body: string,
    role: string,
    accountId: string,
  ) {
    return createHash('sha256')
      .update(JSON.stringify({ id, body, role, accountId }))
      .digest('hex');
  }

  async reply(
    auth: ActiveAuthority,
    id: string,
    input: AcademicReplyDto,
    role: 'STUDENT' | 'ADVISER',
  ) {
    const body = input.body.trim();
    if (!body) throw new BadRequestException('Write a message before sending.');
    await this.writableCase(this.prisma, auth, id, role);
    const fingerprint = this.messageFingerprint(id, body, role, auth.accountId);
    const existing = await this.prisma.academicSupportMessage.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (
        existing.requestId !== id ||
        existing.authorAccountId !== auth.accountId ||
        existing.fingerprint !== fingerprint
      )
        throw new ConflictException(
          'This message key was already used for a different message. Refresh and try again.',
        );
      return {
        id: existing.id,
        status: role === 'ADVISER' ? 'ADVISER_REPLIED' : 'STUDENT_REPLIED',
        createdAt: existing.createdAt.toISOString(),
      };
    }
    try {
      return await this.prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM "AcademicSupportRequest" WHERE id = ${id} FOR UPDATE`;
        await this.writableCase(db, auth, id, role);
        const message = await db.academicSupportMessage.create({
          data: {
            requestId: id,
            authorAccountId: auth.accountId,
            authorRole: role,
            body,
            idempotencyKey: input.idempotencyKey,
            fingerprint,
          },
        });
        const status =
          role === 'ADVISER' ? 'ADVISER_REPLIED' : 'STUDENT_REPLIED';
        await db.academicSupportRequest.update({
          where: { id },
          data: { status },
        });
        await db.academicSupportRequestEvent.create({
          data: {
            requestId: id,
            event: status,
            actorAccountId: auth.accountId,
          },
        });
        await db.auditEvent.create({
          data: {
            action:
              role === 'ADVISER'
                ? 'AcademicSupportReplySent'
                : 'StudentSupportReplySent',
            outcome: 'ALLOW',
            actorAccountId: auth.accountId,
            activeRole: auth.activeRole,
            scope: auth.scope,
            targetRef: id,
            idempotencyRef: input.idempotencyKey,
            correlationId: randomUUID(),
            policyVersion: noticeVersion,
            metadata: { messageId: message.id },
          },
        });
        return {
          id: message.id,
          status,
          createdAt: message.createdAt.toISOString(),
        };
      });
    } catch (error) {
      const replay = await this.prisma.academicSupportMessage.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (replay) {
        if (
          replay.requestId !== id ||
          replay.authorAccountId !== auth.accountId ||
          replay.fingerprint !== fingerprint
        )
          throw new ConflictException(
            'This message key was already used for a different message. Refresh and try again.',
          );
        return {
          id: replay.id,
          status: role === 'ADVISER' ? 'ADVISER_REPLIED' : 'STUDENT_REPLIED',
          createdAt: replay.createdAt.toISOString(),
        };
      }
      throw error;
    }
  }

  private async writableCase(
    db: Db,
    auth: ActiveAuthority,
    id: string,
    role: 'STUDENT' | 'ADVISER',
    allowClosed = false,
  ) {
    const row = await this.ownedCase(db, auth, id, role);
    if (process.env.DEMO_MODE !== 'true' || !row.service.demoOnly)
      throw new ForbiddenException(
        'Academic follow-up is not yet approved for this institution.',
      );
    const current = await this.route(db, row.studentId);
    if (
      !current.available ||
      current.context?.ownerAssignmentId !== row.ownerAssignmentId ||
      current.context?.serviceId !== row.serviceId
    )
      throw new ConflictException(
        'The receiving adviser or service changed. Review the current support route before continuing.',
      );
    if (!allowClosed && row.status === 'CLOSED')
      throw new ConflictException(
        'This academic-support request is closed. Start a new request if you need more help.',
      );
    return row;
  }

  async closeCase(
    auth: ActiveAuthority,
    id: string,
    input: CloseAcademicRequestDto,
  ) {
    await this.writableCase(this.prisma, auth, id, 'ADVISER', true);
    const fingerprint = this.actionFingerprint({
      id,
      reason: input.reason,
      actor: auth.accountId,
    });
    const replay = async () => {
      const prior = await this.prisma.academicSupportClosure.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!prior) return null;
      if (
        prior.requestId !== id ||
        prior.actorAccountId !== auth.accountId ||
        prior.fingerprint !== fingerprint
      )
        throw new ConflictException(
          'This closure key was used for another outcome. Refresh the case before trying again.',
        );
      return {
        id: prior.id,
        status: 'CLOSED',
        reason: prior.reason,
        closedAt: prior.createdAt.toISOString(),
      };
    };
    const previous = await replay();
    if (previous) return previous;
    try {
      return await this.prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM "AcademicSupportRequest" WHERE id = ${id} FOR UPDATE`;
        const row = await this.writableCase(db, auth, id, 'ADVISER', true);
        if (row.status === 'CLOSED')
          throw new ConflictException(
            'This case is already closed. Review its closure outcome.',
          );
        const active = await db.academicSupportAction.findFirst({
          where: {
            requestId: id,
            status: { in: ['PROPOSED', 'ACCEPTED', 'CLAIMED_COMPLETE'] },
          },
          select: { id: true },
        });
        if (active)
          throw new ConflictException(
            'Finish or resolve the open student action before closing this case.',
          );
        if (input.reason === 'AGREED_ACTION_COMPLETED') {
          const completed = await db.academicSupportAction.findFirst({
            where: { requestId: id, status: 'COMPLETE' },
            select: { id: true },
          });
          if (!completed)
            throw new ConflictException(
              'A confirmed student action is required for this closure reason.',
            );
        } else {
          const guidance = await db.academicSupportMessage.findFirst({
            where: { requestId: id, authorRole: 'ADVISER' },
            select: { id: true },
          });
          if (!guidance)
            throw new ConflictException(
              'Record academic guidance in the secure conversation before closing this case.',
            );
        }
        const closure = await db.academicSupportClosure.create({
          data: {
            requestId: id,
            reason: input.reason,
            actorAccountId: auth.accountId,
            idempotencyKey: input.idempotencyKey,
            fingerprint,
          },
        });
        await db.academicSupportRequest.update({
          where: { id },
          data: { status: 'CLOSED' },
        });
        await db.academicSupportRequestEvent.create({
          data: {
            requestId: id,
            event: 'CLOSED',
            actorAccountId: auth.accountId,
          },
        });
        await db.auditEvent.create({
          data: {
            action: 'AcademicSupportCaseClosed',
            outcome: 'ALLOW',
            actorAccountId: auth.accountId,
            activeRole: auth.activeRole,
            scope: auth.scope,
            targetRef: id,
            idempotencyRef: input.idempotencyKey,
            correlationId: randomUUID(),
            policyVersion: noticeVersion,
            metadata: { reason: input.reason, closureId: closure.id },
          },
        });
        return {
          id: closure.id,
          status: 'CLOSED',
          reason: closure.reason,
          closedAt: closure.createdAt.toISOString(),
        };
      });
    } catch (error) {
      const previous = await replay();
      if (previous) return previous;
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This case is already closed. Review its closure outcome.',
        );
      throw error;
    }
  }

  private actionFingerprint(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private lusakaToday() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Lusaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  private validateDueOn(dueOn: string) {
    const parsed = new Date(`${dueOn}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== dueOn
    )
      throw new BadRequestException('Choose a valid follow-up date.');
    const today = this.lusakaToday();
    if (dueOn < today)
      throw new BadRequestException('Choose today or a future follow-up date.');
  }

  async proposeAction(
    auth: ActiveAuthority,
    id: string,
    input: ProposeAcademicActionDto,
  ) {
    await this.writableCase(this.prisma, auth, id, 'ADVISER');
    const title = input.title.trim();
    const explanation = input.explanation.trim();
    if (!title || !explanation)
      throw new BadRequestException('Add a short action and explanation.');
    this.validateDueOn(input.dueOn);
    const fingerprint = this.actionFingerprint({
      id,
      title,
      explanation,
      routeKey: input.routeKey,
      dueOn: input.dueOn,
      actor: auth.accountId,
    });
    const replay = async () => {
      const prior = await this.prisma.academicSupportAction.findUnique({
        where: { proposalKey: input.idempotencyKey },
      });
      if (!prior) return null;
      if (
        prior.requestId !== id ||
        prior.proposerAccountId !== auth.accountId ||
        prior.fingerprint !== fingerprint
      )
        throw new ConflictException(
          'This action key was used for different details. Refresh before trying again.',
        );
      return { id: prior.id, status: prior.status, dueOn: prior.dueOn };
    };
    const previous = await replay();
    if (previous) return previous;
    try {
      return await this.prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM "AcademicSupportRequest" WHERE id = ${id} FOR UPDATE`;
        await this.writableCase(db, auth, id, 'ADVISER');
        const active = await db.academicSupportAction.findFirst({
          where: {
            requestId: id,
            status: { in: ['PROPOSED', 'ACCEPTED', 'CLAIMED_COMPLETE'] },
          },
          select: { id: true },
        });
        if (active)
          throw new ConflictException(
            'This request already has an active action. Review it before proposing another.',
          );
        const action = await db.academicSupportAction.create({
          data: {
            requestId: id,
            title,
            explanation,
            routeKey: input.routeKey,
            dueOn: input.dueOn,
            proposerAccountId: auth.accountId,
            proposalKey: input.idempotencyKey,
            fingerprint,
          },
        });
        await db.academicSupportActionEvent.create({
          data: {
            actionId: action.id,
            event: 'PROPOSED',
            status: 'PROPOSED',
            actorAccountId: auth.accountId,
            idempotencyKey: input.idempotencyKey,
            fingerprint,
          },
        });
        await db.auditEvent.create({
          data: {
            action: 'AcademicSupportActionProposed',
            outcome: 'ALLOW',
            actorAccountId: auth.accountId,
            activeRole: auth.activeRole,
            scope: auth.scope,
            targetRef: action.id,
            idempotencyRef: input.idempotencyKey,
            correlationId: randomUUID(),
            policyVersion: noticeVersion,
            metadata: {
              requestId: id,
              dueOn: input.dueOn,
              routeKey: input.routeKey,
            },
          },
        });
        return { id: action.id, status: action.status, dueOn: action.dueOn };
      });
    } catch (error) {
      const prior = await replay();
      if (prior) return prior;
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This request already has an active action. Refresh and review it.',
        );
      throw error;
    }
  }

  private async changeAction(
    auth: ActiveAuthority,
    requestId: string,
    actionId: string,
    idempotencyKey: string,
    transition: {
      event:
        | 'STUDENT_ACCEPTED'
        | 'STUDENT_DECLINED'
        | 'STUDENT_CLAIMED'
        | 'ADVISER_CONFIRMED';
      role: 'STUDENT' | 'ADVISER';
      expected: string;
      next: string;
    },
  ) {
    await this.writableCase(this.prisma, auth, requestId, transition.role);
    const fingerprint = this.actionFingerprint({
      requestId,
      actionId,
      event: transition.event,
      actor: auth.accountId,
    });
    const replay = async () => {
      const prior = await this.prisma.academicSupportActionEvent.findUnique({
        where: { idempotencyKey },
      });
      if (!prior) return null;
      if (
        prior.actionId !== actionId ||
        prior.actorAccountId !== auth.accountId ||
        prior.fingerprint !== fingerprint
      )
        throw new ConflictException(
          'This action key was used for another response. Refresh before trying again.',
        );
      return { id: actionId, status: prior.status };
    };
    const previous = await replay();
    if (previous) return previous;
    try {
      return await this.prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM "AcademicSupportAction" WHERE id = ${actionId} FOR UPDATE`;
        await this.writableCase(db, auth, requestId, transition.role);
        const action = await db.academicSupportAction.findFirst({
          where: { id: actionId, requestId },
        });
        if (!action)
          throw new NotFoundException(
            'This follow-up action is not available in your request.',
          );
        if (action.status !== transition.expected)
          throw new ConflictException(
            'This follow-up changed. Refresh to see its current state before continuing.',
          );
        await db.academicSupportAction.update({
          where: { id: actionId },
          data: { status: transition.next },
        });
        await db.academicSupportActionEvent.create({
          data: {
            actionId,
            event: transition.event,
            status: transition.next,
            actorAccountId: auth.accountId,
            idempotencyKey,
            fingerprint,
          },
        });
        await db.auditEvent.create({
          data: {
            action: `AcademicSupportAction${transition.event}`,
            outcome: 'ALLOW',
            actorAccountId: auth.accountId,
            activeRole: auth.activeRole,
            scope: auth.scope,
            targetRef: actionId,
            idempotencyRef: idempotencyKey,
            correlationId: randomUUID(),
            policyVersion: noticeVersion,
            metadata: { requestId, status: transition.next },
          },
        });
        return { id: actionId, status: transition.next };
      });
    } catch (error) {
      const prior = await replay();
      if (prior) return prior;
      throw error;
    }
  }

  respondAction(
    auth: ActiveAuthority,
    requestId: string,
    actionId: string,
    input: RespondAcademicActionDto,
  ) {
    return this.changeAction(auth, requestId, actionId, input.idempotencyKey, {
      event: input.accept ? 'STUDENT_ACCEPTED' : 'STUDENT_DECLINED',
      role: 'STUDENT',
      expected: 'PROPOSED',
      next: input.accept ? 'ACCEPTED' : 'DECLINED',
    });
  }

  transitionAction(
    auth: ActiveAuthority,
    requestId: string,
    actionId: string,
    input: AcademicActionKeyDto,
    event: 'STUDENT_CLAIMED' | 'ADVISER_CONFIRMED',
  ) {
    return this.changeAction(auth, requestId, actionId, input.idempotencyKey, {
      event,
      role: event === 'STUDENT_CLAIMED' ? 'STUDENT' : 'ADVISER',
      expected: event === 'STUDENT_CLAIMED' ? 'ACCEPTED' : 'CLAIMED_COMPLETE',
      next: event === 'STUDENT_CLAIMED' ? 'CLAIMED_COMPLETE' : 'COMPLETE',
    });
  }
}
