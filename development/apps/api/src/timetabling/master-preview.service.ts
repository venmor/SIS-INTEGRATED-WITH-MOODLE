import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { SECURITY_V1 } from '@sis/config';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { timetableDemoDraftsEnabled } from './demo-rules.service.js';
import { toPlanningRules } from './demo-rules-policy.js';
import { validateTeachingOccurrences, type TeachingOccurrence, type TimetableIssue } from './conflicts.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
interface SessionInput {
  id: string; sectionId: string; venueId: string; teacherAssignmentId: string;
  registrationIds: string[]; startAt: string; endAt: string;
  plannedSeats: number; requiresStepFreeAccess: boolean;
}
interface MasterCommand {
  clientRequestId: string; expectedVersion: number; periodId: string; ruleDraftId: string;
  sessions: SessionInput[];
}
function parseCommand(raw: unknown): MasterCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Enter a master timetable draft.');
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !['clientRequestId', 'expectedVersion', 'periodId', 'ruleDraftId', 'sessions'].includes(key)) ||
    ![value.clientRequestId, value.periodId, value.ruleDraftId].every((item) => typeof item === 'string' && uuid.test(item)) ||
    !Number.isSafeInteger(value.expectedVersion) || (value.expectedVersion as number) < 0 ||
    !Array.isArray(value.sessions) || value.sessions.length === 0 || value.sessions.length > 100)
    throw new BadRequestException('Check the period, rule and 1–100 draft sessions.');
  const ids = new Set<string>();
  const sessions = value.sessions.map((rawSession) => {
    if (!rawSession || typeof rawSession !== 'object' || Array.isArray(rawSession)) throw new BadRequestException('Check each draft session.');
    const row = rawSession as Record<string, unknown>;
    if (Object.keys(row).some((key) => !['id', 'sectionId', 'venueId', 'teacherAssignmentId', 'registrationIds', 'startAt', 'endAt', 'plannedSeats', 'requiresStepFreeAccess'].includes(key)) ||
      ![row.id, row.sectionId, row.venueId, row.teacherAssignmentId].every((item) => typeof item === 'string' && uuid.test(item)) ||
      typeof row.startAt !== 'string' || typeof row.endAt !== 'string' || !instant.test(row.startAt) || !instant.test(row.endAt) ||
      !Number.isFinite(Date.parse(row.startAt)) || !Number.isFinite(Date.parse(row.endAt)) || Date.parse(row.startAt) >= Date.parse(row.endAt) ||
      !Number.isSafeInteger(row.plannedSeats) || (row.plannedSeats as number) < 1 || (row.plannedSeats as number) > 500 ||
      typeof row.requiresStepFreeAccess !== 'boolean' || !Array.isArray(row.registrationIds) || row.registrationIds.length > 100 ||
      row.registrationIds.some((id) => typeof id !== 'string' || !uuid.test(id)) ||
      new Set(row.registrationIds).size !== row.registrationIds.length || ids.has(row.id as string))
      throw new BadRequestException('Check session identifiers, times, seats and roster links.');
    ids.add(row.id as string);
    return { id: row.id as string, sectionId: row.sectionId as string, venueId: row.venueId as string,
      teacherAssignmentId: row.teacherAssignmentId as string, registrationIds: [...row.registrationIds as string[]].sort(),
      startAt: row.startAt, endAt: row.endAt, plannedSeats: row.plannedSeats as number,
      requiresStepFreeAccess: row.requiresStepFreeAccess };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return { clientRequestId: value.clientRequestId as string, expectedVersion: value.expectedVersion as number,
    periodId: value.periodId as string, ruleDraftId: value.ruleDraftId as string, sessions };
}

@Injectable()
export class MasterPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async authority(actor: ActiveAuthority, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    if (!timetableDemoDraftsEnabled()) throw new NotFoundException();
    if (actor.activeRole !== 'TIMETABLE_COORDINATOR' || !actor.assignmentId)
      throw new ForbiddenException('Use the fictional central timetable workspace.');
    const now = new Date();
    const appointment = await db.roleAssignment.findFirst({ where: {
      id: actor.assignmentId, accountId: actor.accountId, role: 'TIMETABLE_COORDINATOR',
      scopeType: 'SYSTEM', scopeRef: 'DEMO-UNIVERSITY', capabilities: { has: 'timetable-demo-master-draft' },
      startsAt: { lte: now }, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      account: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
    }, select: { id: true } });
    if (!appointment) throw new ForbiddenException('The fictional timetable appointment is inactive.');
  }

  async catalogue(actor: ActiveAuthority) {
    await this.authority(actor);
    const periods = await this.prisma.academicPeriod.findMany({ where: { code: { startsWith: 'DEMO-' } },
      select: { id: true, code: true }, orderBy: { code: 'asc' }, take: 30 });
    const rules = await this.prisma.timetableDemoRuleDraft.findMany({ where: { periodId: { in: periods.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' }, take: 50 });
    const offerings = await this.prisma.courseDeliveryOffering.findMany({
      where: { periodId: { in: periods.map((p) => p.id) }, campusUnit: { code: { startsWith: 'DEMO-' } } },
      include: { courseVersion: { include: { course: { select: { code: true } } } },
        sections: { select: { id: true, code: true, capacity: true } }, campusUnit: { select: { code: true } } }, take: 100,
    });
    const venues = await this.prisma.teachingVenue.findMany({ where: { building: { campusUnit: { code: { startsWith: 'DEMO-' } } } },
      include: { building: { select: { campusUnit: { select: { code: true } } } } }, take: 100 });
    const sectionIds = offerings.flatMap((o) => o.sections.map((s) => s.id));
    const teachers = await this.prisma.roleAssignment.findMany({ where: { scopeType: 'SECTION', scopeRef: { in: sectionIds },
      role: { in: ['LEC', 'TUT', 'COORDINATOR'] }, revokedAt: null, startsAt: { lte: new Date() },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }], account: { status: 'ACTIVE' } },
      select: { id: true, scopeRef: true, role: true, account: { select: { person: { select: { displayName: true } } } } }, take: 200 });
    const registrations = await this.prisma.courseRegistration.findMany({ where: { status: 'ENROLLED',
      registration: { periodId: { in: periods.map((p) => p.id) }, status: 'REGISTERED' } },
      select: { id: true, course: { select: { code: true } }, registration: { select: { periodId: true } } }, take: 100 });
    return { periods, rules: rules.filter((row) => toPlanningRules(row)).map((row) => ({ id: row.id, periodId: row.periodId, version: row.version,
      campusCode: offerings.find((o) => o.campusUnitId === row.campusUnitId)?.campusUnit.code ?? 'DEMO' })),
      sections: offerings.flatMap((o) => o.sections.map((s) => ({ id: s.id, code: `${o.courseVersion.course.code} · ${s.code}`,
        courseCode: o.courseVersion.course.code, periodId: o.periodId, campusCode: o.campusUnit.code, capacity: s.capacity }))),
      venues: venues.map((v) => ({ id: v.id, code: `${v.building.campusUnit.code} · ${v.code}`, campusCode: v.building.campusUnit.code,
        teachingCapacity: v.teachingCapacity, stepFreeAccess: v.stepFreeAccess })),
      teachers: teachers.map((t) => ({ id: t.id, sectionId: t.scopeRef, label: `${t.account.person.displayName} · ${t.role}` })),
      registrations: registrations.map((r) => ({ id: r.id, courseCode: r.course.code,
        periodId: r.registration.periodId, label: `Registered learner · ${r.id.slice(0, 8)}` })),
    };
  }

  async list(actor: ActiveAuthority) {
    await this.authority(actor);
    const periods = await this.prisma.academicPeriod.findMany({ where: { code: { startsWith: 'DEMO-' } }, select: { id: true } });
    return this.prisma.timetableDemoMasterDraft.findMany({ where: { periodId: { in: periods.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' }, take: 20,
      select: { id: true, periodId: true, version: true, ruleDraftId: true, status: true, sessions: true, issues: true, createdAt: true } });
  }

  async course(actor: ActiveAuthority, id: string, courseCode: string) {
    await this.authority(actor);
    if (!uuid.test(id) || !/^([A-Z]{2,8}[0-9]{2,5})$/.test(courseCode)) throw new NotFoundException();
    const draft = await this.prisma.timetableDemoMasterDraft.findUnique({ where: { id },
      include: { period: { select: { code: true } } } });
    if (!draft || !draft.period.code.startsWith('DEMO-')) throw new NotFoundException();
    const sessions = (draft.sessions as unknown as Array<{ id: string; courseCode: string }>).filter((s) => s.courseCode === courseCode);
    const ids = new Set(sessions.map((s) => s.id));
    const issues = (draft.issues as unknown as Array<{ code: string; occurrenceIds: string[] }>).filter((issue) =>
      issue.occurrenceIds.length === 0 || issue.occurrenceIds.some((item) => ids.has(item)));
    return { masterDraftId: draft.id, version: draft.version, status: draft.status, courseCode, sessions, issues, createdAt: draft.createdAt };
  }

  async create(actor: ActiveAuthority, raw: unknown) {
    await this.authority(actor);
    const command = parseCommand(raw);
    const digest = createHash('sha256').update(JSON.stringify({ periodId: command.periodId, ruleDraftId: command.ruleDraftId, sessions: command.sessions })).digest('hex');
    const replay = await this.prisma.timetableDemoMasterDraft.findUnique({ where: { createdByAccountId_clientRequestId: {
      createdByAccountId: actor.accountId, clientRequestId: command.clientRequestId } } });
    if (replay) {
      if (replay.contentDigest !== digest) throw new ConflictException('This save reference was used for different sessions.');
      return { id: replay.id, version: replay.version, status: replay.status };
    }
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.authority(actor, db);
        const period = await db.academicPeriod.findUnique({ where: { id: command.periodId }, select: { code: true } });
        const ruleRow = await db.timetableDemoRuleDraft.findUnique({ where: { id: command.ruleDraftId },
          include: { campusUnit: { select: { code: true } } } });
        const rules = ruleRow && toPlanningRules(ruleRow);
        if (!period?.code.startsWith('DEMO-') || !ruleRow?.campusUnit.code.startsWith('DEMO-') || !rules || rules.periodId !== command.periodId)
          throw new BadRequestException('Select a complete fictional rule for this academic period.');
        const latest = await db.timetableDemoMasterDraft.findFirst({ where: { periodId: command.periodId },
          orderBy: { version: 'desc' }, select: { version: true } });
        if ((latest?.version ?? 0) !== command.expectedVersion)
          throw new ConflictException('The master draft changed. Reload its latest version.');
        const sectionIds = [...new Set(command.sessions.map((s) => s.sectionId))];
        const venueIds = [...new Set(command.sessions.map((s) => s.venueId))];
        const teacherIds = [...new Set(command.sessions.map((s) => s.teacherAssignmentId))];
        const registrationIds = [...new Set(command.sessions.flatMap((s) => s.registrationIds))];
        const sections = await db.teachingSection.findMany({ where: { id: { in: sectionIds } }, include: {
          offering: { include: { courseVersion: { include: { course: { select: { id: true, code: true } } } },
            campusUnit: { select: { code: true } } } } } });
        const venues = await db.teachingVenue.findMany({ where: { id: { in: venueIds } }, include: {
          building: { include: { campusUnit: { select: { code: true } } } } } });
        const now = new Date();
        const teachers = await db.roleAssignment.findMany({ where: { id: { in: teacherIds },
          role: { in: ['LEC', 'TUT', 'COORDINATOR'] }, scopeType: 'SECTION', startsAt: { lte: now }, revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gt: now } }], account: { status: 'ACTIVE' } },
          select: { id: true, accountId: true, scopeRef: true } });
        const registrations = await db.courseRegistration.findMany({ where: { id: { in: registrationIds }, status: 'ENROLLED' },
          include: { registration: { select: { attemptId: true, periodId: true, status: true } } } });
        const attempts = await db.programmeAttempt.findMany({ where: { id: { in: registrations.map((r) => r.registration.attemptId) } },
          select: { id: true, studentId: true } });
        if (sections.length !== sectionIds.length || venues.length !== venueIds.length || teachers.length !== teacherIds.length ||
          registrations.length !== registrationIds.length || attempts.length !== new Set(registrations.map((r) => r.registration.attemptId)).size)
          throw new BadRequestException('A section, venue, teacher appointment or enrolled roster link is no longer available.');
        const sectionById = new Map(sections.map((s) => [s.id, s]));
        const venueById = new Map(venues.map((v) => [v.id, v]));
        const teacherById = new Map(teachers.map((t) => [t.id, t]));
        const registrationById = new Map(registrations.map((r) => [r.id, r]));
        const studentByAttempt = new Map(attempts.map((a) => [a.id, a.studentId]));
        const preview: Array<SessionInput & { courseCode: string; sectionCode: string; campusCode: string; venueCode: string; teacherAccountId: string }> = [];
        const occurrences: TeachingOccurrence[] = [];
        const extra: TimetableIssue[] = [];
        const courseSessions = new Map<string, string[]>();
        const mappedRegistrationIds = new Map<string, Set<string>>();
        const sectionByStudentCourse = new Map<string, { sectionId: string; sessionId: string }>();
        for (const input of command.sessions) {
          const section = sectionById.get(input.sectionId)!;
          const venue = venueById.get(input.venueId)!;
          const teacher = teacherById.get(input.teacherAssignmentId)!;
          const linked = input.registrationIds.map((id) => registrationById.get(id)!);
          if (section.offering.periodId !== command.periodId || !section.offering.campusUnit.code.startsWith('DEMO-') ||
            !venue.building.campusUnit.code.startsWith('DEMO-') || teacher.scopeRef !== section.id ||
            venue.building.campusUnit.code !== section.offering.campusUnit.code ||
            linked.some((r) => r.courseId !== section.offering.courseVersion.course.id || r.registration.periodId !== command.periodId || r.registration.status !== 'REGISTERED'))
            throw new BadRequestException('A draft session is linked to a different course, period, section or appointment.');
          const courseId = section.offering.courseVersion.course.id;
          courseSessions.set(courseId, [...(courseSessions.get(courseId) ?? []), input.id]);
          const mapped = mappedRegistrationIds.get(courseId) ?? new Set<string>();
          for (const registration of linked) {
            mapped.add(registration.id);
            const studentId = studentByAttempt.get(registration.registration.attemptId)!;
            const key = `${courseId}:${studentId}`;
            const prior = sectionByStudentCourse.get(key);
            if (prior && prior.sectionId !== section.id)
              extra.push({ code: 'SECTION_MEMBERSHIP_CONFLICT', occurrenceIds: [prior.sessionId, input.id] });
            else if (!prior) sectionByStudentCourse.set(key, { sectionId: section.id, sessionId: input.id });
          }
          mappedRegistrationIds.set(courseId, mapped);
          if (input.plannedSeats > section.capacity)
            extra.push({ code: 'VENUE_CAPACITY', occurrenceIds: [input.id] });
          if (linked.length > input.plannedSeats)
            extra.push({ code: 'SEAT_PLAN_INSUFFICIENT', occurrenceIds: [input.id] });
          if (linked.length === 0)
            extra.push({ code: 'ROSTER_UNVERIFIED', occurrenceIds: [input.id] });
          preview.push({ ...input, courseCode: section.offering.courseVersion.course.code, sectionCode: section.code,
            campusCode: venue.building.campusUnit.code, venueCode: venue.code, teacherAccountId: teacher.accountId });
          occurrences.push({ id: input.id, startAt: input.startAt, endAt: input.endAt,
            campusCode: venue.building.campusUnit.code, venueId: venue.id, teacherIds: [teacher.accountId],
            studentIds: linked.map((r) => studentByAttempt.get(r.registration.attemptId)!),
            expectedSeats: Math.max(input.plannedSeats, linked.length), venueCapacity: venue.teachingCapacity,
            requiresStepFreeAccess: input.requiresStepFreeAccess, venueStepFreeAccess: venue.stepFreeAccess });
        }
        const allSections = await db.teachingSection.findMany({ where: {
          offering: { periodId: command.periodId, campusUnit: { code: { startsWith: 'DEMO-' } } },
        }, select: { id: true } });
        if (allSections.some((section) => !sectionIds.includes(section.id)))
          extra.push({ code: 'COVERAGE_INCOMPLETE', occurrenceIds: [] });
        for (const [courseId, ids] of courseSessions) {
          const total = await db.courseRegistration.count({ where: { courseId, status: 'ENROLLED',
            registration: { periodId: command.periodId, status: 'REGISTERED' } } });
          if (total !== mappedRegistrationIds.get(courseId)?.size)
            extra.push({ code: 'ROSTER_UNVERIFIED', occurrenceIds: ids });
        }
        const issues = [...validateTeachingOccurrences(occurrences, rules), ...extra].sort((a, b) =>
          a.occurrenceIds.join('|').localeCompare(b.occurrenceIds.join('|')) || a.code.localeCompare(b.code));
        const status = issues.length ? 'BLOCKED' : 'CONFLICT_FREE_FOR_REVIEW';
        const row = await db.timetableDemoMasterDraft.create({ data: { periodId: command.periodId,
          version: command.expectedVersion + 1, ruleDraftId: command.ruleDraftId,
          sessions: preview.map((s) => ({ id: s.id, sectionId: s.sectionId, venueId: s.venueId,
            teacherAssignmentId: s.teacherAssignmentId, registrationIds: s.registrationIds,
            startAt: s.startAt, endAt: s.endAt, plannedSeats: s.plannedSeats,
            requiresStepFreeAccess: s.requiresStepFreeAccess, courseCode: s.courseCode,
            sectionCode: s.sectionCode, campusCode: s.campusCode, venueCode: s.venueCode,
            teacherAccountId: s.teacherAccountId })),
          issues: issues.map((issue) => ({ code: issue.code, occurrenceIds: issue.occurrenceIds })),
          status, createdByAccountId: actor.accountId,
          clientRequestId: command.clientRequestId, contentDigest: digest }, select: { id: true, version: true, status: true } });
        await db.auditEvent.create({ data: { action: 'DemoMasterTimetableDraftSaved', outcome: 'ALLOW',
          actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope, targetRef: row.id,
          idempotencyRef: command.clientRequestId, purpose: 'fictional-timetable-planning',
          policyVersion: SECURITY_V1.version, correlationId: randomUUID() } });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error && typeof error === 'object' && 'code' in error && (error.code === 'P2002' || error.code === 'P2034'))
        throw new ConflictException('The master draft changed. Reload and try again.');
      throw error;
    }
  }
}
