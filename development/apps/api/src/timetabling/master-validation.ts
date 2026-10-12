import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { TimetableSourceContext } from '@sis/contracts';
import { toPlanningRules } from './demo-rules-policy.js';
import {
  validateTeachingOccurrences,
  type TeachingOccurrence,
  type TimetableIssue,
} from './conflicts.js';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export interface SessionInput {
  id: string;
  sectionId: string;
  venueId: string;
  teacherAssignmentId: string;
  registrationIds: string[];
  startAt: string;
  endAt: string;
  plannedSeats: number;
  requiresStepFreeAccess: boolean;
}
export interface MasterCommand {
  clientRequestId: string;
  expectedVersion: number;
  periodId: string;
  ruleDraftId: string;
  sessions: SessionInput[];
}
export function parseMasterCommand(raw: unknown): MasterCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new BadRequestException('Enter a master timetable draft.');
  const value = raw as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'clientRequestId',
          'expectedVersion',
          'periodId',
          'ruleDraftId',
          'sessions',
        ].includes(key),
    ) ||
    ![value.clientRequestId, value.periodId, value.ruleDraftId].every(
      (item) => typeof item === 'string' && uuid.test(item),
    ) ||
    !Number.isSafeInteger(value.expectedVersion) ||
    (value.expectedVersion as number) < 0 ||
    !Array.isArray(value.sessions) ||
    value.sessions.length === 0 ||
    value.sessions.length > 100
  )
    throw new BadRequestException(
      'Check the period, rule and 1–100 draft sessions.',
    );
  const ids = new Set<string>();
  const sessions = value.sessions
    .map((rawSession) => {
      if (
        !rawSession ||
        typeof rawSession !== 'object' ||
        Array.isArray(rawSession)
      )
        throw new BadRequestException('Check each draft session.');
      const row = rawSession as Record<string, unknown>;
      if (
        Object.keys(row).some(
          (key) =>
            ![
              'id',
              'sectionId',
              'venueId',
              'teacherAssignmentId',
              'registrationIds',
              'startAt',
              'endAt',
              'plannedSeats',
              'requiresStepFreeAccess',
            ].includes(key),
        ) ||
        ![row.id, row.sectionId, row.venueId, row.teacherAssignmentId].every(
          (item) => typeof item === 'string' && uuid.test(item),
        ) ||
        typeof row.startAt !== 'string' ||
        typeof row.endAt !== 'string' ||
        !instant.test(row.startAt) ||
        !instant.test(row.endAt) ||
        !Number.isFinite(Date.parse(row.startAt)) ||
        !Number.isFinite(Date.parse(row.endAt)) ||
        Date.parse(row.startAt) >= Date.parse(row.endAt) ||
        !Number.isSafeInteger(row.plannedSeats) ||
        (row.plannedSeats as number) < 1 ||
        (row.plannedSeats as number) > 500 ||
        typeof row.requiresStepFreeAccess !== 'boolean' ||
        !Array.isArray(row.registrationIds) ||
        row.registrationIds.length > 100 ||
        row.registrationIds.some(
          (id) => typeof id !== 'string' || !uuid.test(id),
        ) ||
        new Set(row.registrationIds).size !== row.registrationIds.length ||
        ids.has(row.id as string)
      )
        throw new BadRequestException(
          'Check session identifiers, times, seats and roster links.',
        );
      ids.add(row.id as string);
      return {
        id: row.id as string,
        sectionId: row.sectionId as string,
        venueId: row.venueId as string,
        teacherAssignmentId: row.teacherAssignmentId as string,
        registrationIds: [...(row.registrationIds as string[])].sort(),
        startAt: row.startAt,
        endAt: row.endAt,
        plannedSeats: row.plannedSeats as number,
        requiresStepFreeAccess: row.requiresStepFreeAccess,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    clientRequestId: value.clientRequestId as string,
    expectedVersion: value.expectedVersion as number,
    periodId: value.periodId as string,
    ruleDraftId: value.ruleDraftId as string,
    sessions,
  };
}

export interface ResolvedMasterSession extends SessionInput {
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  campusCode: string;
  venueCode: string;
  teacherAccountId: string;
  teacherName: string;
  offeringId: string;
  courseVersionId: string;
  deliveryMode: string;
}
export function masterContentDigest(command: MasterCommand) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        periodId: command.periodId,
        ruleDraftId: command.ruleDraftId,
        sessions: command.sessions,
      }),
    )
    .digest('hex');
}
export async function validateMasterSources(
  db: Prisma.TransactionClient,
  command: MasterCommand,
) {
  const period = await db.academicPeriod.findUnique({
    where: { id: command.periodId },
    select: { code: true, status: true },
  });
  const ruleRow = await db.timetableDemoRuleDraft.findUnique({
    where: { id: command.ruleDraftId },
    include: { campusUnit: { select: { code: true } } },
  });
  const rules = ruleRow && toPlanningRules(ruleRow);
  if (
    !period?.code.startsWith('DEMO-') ||
    ['CANCELLED', 'CLOSED', 'ARCHIVED', 'SUSPENDED'].includes(period.status) ||
    !ruleRow?.campusUnit.code.startsWith('DEMO-') ||
    !rules ||
    rules.periodId !== command.periodId
  )
    throw new BadRequestException(
      'Select a complete fictional rule for this academic period.',
    );
  const sectionIds = [...new Set(command.sessions.map((s) => s.sectionId))];
  const venueIds = [...new Set(command.sessions.map((s) => s.venueId))];
  const teacherIds = [
    ...new Set(command.sessions.map((s) => s.teacherAssignmentId)),
  ];
  const registrationIds = [
    ...new Set(command.sessions.flatMap((s) => s.registrationIds)),
  ];
  const sections = await db.teachingSection.findMany({
    where: { id: { in: sectionIds } },
    include: {
      offering: {
        include: {
          courseVersion: {
            include: { course: { select: { id: true, code: true } } },
          },
          campusUnit: { select: { code: true } },
        },
      },
    },
  });
  const venues = await db.teachingVenue.findMany({
    where: { id: { in: venueIds } },
    include: {
      building: { include: { campusUnit: { select: { code: true } } } },
    },
  });
  const unitIds = [
    ...new Set([
      ...sections.flatMap((section) => [
        section.offering.campusUnitId,
        section.offering.deliveryUnitId,
      ]),
      ...venues.map((venue) => venue.building.campusUnitId),
    ]),
  ];
  const units = await db.institutionUnit.findMany({
    where: { id: { in: unitIds } },
    select: {
      id: true,
      code: true,
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          id: true,
          name: true,
          unitKind: true,
          unitType: true,
          status: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
    },
  });
  const calendars = await db.academicPeriodVersion.findMany({
    where: { periodId: command.periodId },
    orderBy: { version: 'desc' },
    take: 1,
    select: { id: true, version: true, startDate: true, endDate: true },
  });
  if (
    units.length !== unitIds.length ||
    units.some(
      (unit) =>
        !unit.versions[0] ||
        !['DRAFT', 'DEMO_ACTIVE', 'ACTIVE', 'APPROVED'].includes(
          unit.versions[0].status,
        ),
    )
  )
    throw new BadRequestException(
      'A fictional campus or delivery unit is inactive. Save a corrected master.',
    );
  const campuses = new Set([
    ...sections.map((section) => section.offering.campusUnitId),
    ...venues.map((venue) => venue.building.campusUnitId),
  ]);
  for (const unit of units)
    if (
      campuses.has(unit.id) &&
      !(
        unit.versions[0].unitKind === 'CAMPUS' ||
        unit.versions[0].unitType === 'CAMPUS'
      )
    )
      throw new BadRequestException(
        'A delivery or venue campus is no longer configured as a campus. Save a corrected master.',
      );
  const now = new Date();
  const teachers = await db.roleAssignment.findMany({
    where: {
      id: { in: teacherIds },
      role: { in: ['LEC', 'TUT', 'COORDINATOR'] },
      capabilities: { has: 'teach' },
      scopeType: 'SECTION',
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      account: { status: 'ACTIVE', person: { status: 'ACTIVE' } },
    },
    select: {
      id: true,
      accountId: true,
      scopeRef: true,
      startsAt: true,
      endsAt: true,
      role: true,
      capabilities: true,
      account: {
        select: { personId: true, person: { select: { displayName: true } } },
      },
    },
  });
  const registrations = await db.courseRegistration.findMany({
    where: { id: { in: registrationIds }, status: 'ENROLLED' },
    include: {
      registration: {
        select: {
          id: true,
          attemptId: true,
          periodId: true,
          status: true,
          version: true,
        },
      },
    },
  });
  const attempts = await db.programmeAttempt.findMany({
    where: { id: { in: registrations.map((r) => r.registration.attemptId) } },
    select: {
      id: true,
      studentId: true,
      status: true,
      curriculumVersionId: true,
      student: { select: { status: true } },
      curriculumVersion: {
        select: { status: true, courses: { select: { courseId: true } } },
      },
    },
  });
  if (
    sections.length !== sectionIds.length ||
    venues.length !== venueIds.length ||
    teachers.length !== teacherIds.length ||
    registrations.length !== registrationIds.length ||
    attempts.length !==
      new Set(registrations.map((r) => r.registration.attemptId)).size
  )
    throw new BadRequestException(
      'A section, venue, teacher appointment or enrolled roster link is no longer available.',
    );
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const registrationById = new Map(registrations.map((r) => [r.id, r]));
  const studentByAttempt = new Map(attempts.map((a) => [a.id, a.studentId]));
  const preview: ResolvedMasterSession[] = [];
  const occurrences: TeachingOccurrence[] = [];
  const extra: TimetableIssue[] = [];
  const courseSessions = new Map<string, string[]>();
  const mappedRegistrationIds = new Map<string, Set<string>>();
  const membershipBySection = new Map<string, string[]>();
  const sectionByStudentCourse = new Map<
    string,
    { sectionId: string; sessionId: string }
  >();
  for (const input of command.sessions) {
    const section = sectionById.get(input.sectionId)!;
    const venue = venueById.get(input.venueId)!;
    const teacher = teacherById.get(input.teacherAssignmentId)!;
    if (
      teacher.startsAt > new Date(input.startAt) ||
      (teacher.endsAt && teacher.endsAt < new Date(input.endAt))
    )
      throw new BadRequestException(
        'The teaching appointment does not cover the session dates. Save a corrected master.',
      );
    for (const unit of units.filter((unit) =>
      [
        section.offering.campusUnitId,
        section.offering.deliveryUnitId,
        venue.building.campusUnitId,
      ].includes(unit.id),
    )) {
      const version = unit.versions[0];
      if (
        (version.effectiveFrom &&
          version.effectiveFrom > new Date(input.startAt)) ||
        (version.effectiveTo && version.effectiveTo < new Date(input.endAt))
      )
        throw new BadRequestException(
          'A campus or delivery unit is outside its effective dates. Save a corrected master.',
        );
    }
    if (
      calendars[0] &&
      (new Date(Date.parse(input.startAt) + 2 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10) < calendars[0].startDate.toISOString().slice(0, 10) ||
        new Date(Date.parse(input.endAt) + 2 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10) > calendars[0].endDate.toISOString().slice(0, 10))
    )
      throw new BadRequestException(
        'A session is outside its configured source calendar. Save a corrected master.',
      );
    const linked = input.registrationIds.map((id) => registrationById.get(id)!);
    const priorMembers = membershipBySection.get(section.id);
    if (
      priorMembers &&
      JSON.stringify(priorMembers) !== JSON.stringify(input.registrationIds)
    )
      extra.push({ code: 'ROSTER_UNVERIFIED', occurrenceIds: [input.id] });
    membershipBySection.set(section.id, input.registrationIds);
    const allowed = new Set([
      'DRAFT',
      'DEMO_ACTIVE',
      'ACTIVE',
      'APPROVED',
      'OPEN_FOR_REGISTRATION',
      'REGISTRATION_CLOSED',
      'IN_PROGRESS',
    ]);
    if (
      ![
        section.status,
        section.offering.status,
        section.offering.courseVersion.status,
        venue.status,
        venue.building.status,
      ].every((status) => allowed.has(status))
    )
      throw new BadRequestException(
        'A configured offering, section, course version or venue is inactive. Save a corrected master version.',
      );
    if (
      (section.offering.courseVersion.effectiveFrom &&
        section.offering.courseVersion.effectiveFrom >
          new Date(input.startAt)) ||
      (section.offering.courseVersion.effectiveTo &&
        section.offering.courseVersion.effectiveTo <= new Date(input.endAt))
    )
      throw new BadRequestException(
        'A course version is outside its effective dates. Save a corrected master version.',
      );
    for (const registration of linked) {
      const attempt = attempts.find(
        (a) => a.id === registration.registration.attemptId,
      )!;
      if (
        attempt.status !== 'ACTIVE' ||
        attempt.student.status !== 'ACTIVE' ||
        attempt.curriculumVersion?.status !== 'PUBLISHED' ||
        !attempt.curriculumVersion.courses.some(
          (course) => course.courseId === registration.courseId,
        )
      )
        throw new BadRequestException(
          'An enrolled learner no longer has an active, published-curriculum course entitlement. Save a corrected master version.',
        );
    }
    if (
      section.offering.periodId !== command.periodId ||
      !section.offering.campusUnit.code.startsWith('DEMO-') ||
      !venue.building.campusUnit.code.startsWith('DEMO-') ||
      teacher.scopeRef !== section.id ||
      venue.building.campusUnit.code !== section.offering.campusUnit.code ||
      linked.some(
        (r) =>
          r.courseId !== section.offering.courseVersion.course.id ||
          r.registration.periodId !== command.periodId ||
          r.registration.status !== 'REGISTERED',
      )
    )
      throw new BadRequestException(
        'A draft session is linked to a different course, period, section or appointment.',
      );
    const courseId = section.offering.courseVersion.course.id;
    courseSessions.set(courseId, [
      ...(courseSessions.get(courseId) ?? []),
      input.id,
    ]);
    const mapped = mappedRegistrationIds.get(courseId) ?? new Set<string>();
    for (const registration of linked) {
      mapped.add(registration.id);
      const studentId = studentByAttempt.get(
        registration.registration.attemptId,
      )!;
      const key = `${courseId}:${studentId}`;
      const prior = sectionByStudentCourse.get(key);
      if (prior && prior.sectionId !== section.id)
        extra.push({
          code: 'SECTION_MEMBERSHIP_CONFLICT',
          occurrenceIds: [prior.sessionId, input.id],
        });
      else if (!prior)
        sectionByStudentCourse.set(key, {
          sectionId: section.id,
          sessionId: input.id,
        });
    }
    mappedRegistrationIds.set(courseId, mapped);
    if (input.plannedSeats > section.capacity)
      extra.push({ code: 'VENUE_CAPACITY', occurrenceIds: [input.id] });
    if (linked.length > input.plannedSeats)
      extra.push({ code: 'SEAT_PLAN_INSUFFICIENT', occurrenceIds: [input.id] });
    if (linked.length === 0)
      extra.push({ code: 'ROSTER_UNVERIFIED', occurrenceIds: [input.id] });
    preview.push({
      ...input,
      courseCode: section.offering.courseVersion.course.code,
      courseTitle: section.offering.courseVersion.title,
      sectionCode: section.code,
      campusCode: venue.building.campusUnit.code,
      venueCode: venue.code,
      teacherAccountId: teacher.accountId,
      teacherName: teacher.account.person.displayName,
      offeringId: section.offeringId,
      courseVersionId: section.offering.courseVersionId,
      deliveryMode: section.deliveryMode,
    });
    occurrences.push({
      id: input.id,
      startAt: input.startAt,
      endAt: input.endAt,
      campusCode: venue.building.campusUnit.code,
      venueId: venue.id,
      teacherIds: [teacher.accountId],
      studentIds: linked.map((r) =>
        studentByAttempt.get(r.registration.attemptId)!,
      ),
      expectedSeats: Math.max(input.plannedSeats, linked.length),
      venueCapacity: venue.teachingCapacity,
      requiresStepFreeAccess: input.requiresStepFreeAccess,
      venueStepFreeAccess: venue.stepFreeAccess,
    });
  }
  const allSections = await db.teachingSection.findMany({
    where: {
      offering: {
        periodId: command.periodId,
        campusUnit: { code: { startsWith: 'DEMO-' } },
      },
    },
    select: { id: true },
    take: 101,
  });
  if (
    allSections.length > 100 ||
    allSections.some((section) => !sectionIds.includes(section.id))
  )
    extra.push({ code: 'COVERAGE_INCOMPLETE', occurrenceIds: [] });
  for (const [courseId, ids] of courseSessions) {
    const total = await db.courseRegistration.count({
      where: {
        courseId,
        status: 'ENROLLED',
        registration: { periodId: command.periodId, status: 'REGISTERED' },
      },
    });
    if (total !== mappedRegistrationIds.get(courseId)?.size)
      extra.push({ code: 'ROSTER_UNVERIFIED', occurrenceIds: ids });
  }
  const issues = [
    ...validateTeachingOccurrences(occurrences, rules),
    ...extra,
  ].sort(
    (a, b) =>
      a.occurrenceIds.join('|').localeCompare(b.occurrenceIds.join('|')) ||
      a.code.localeCompare(b.code),
  );
  const status = issues.length ? 'BLOCKED' : 'CONFLICT_FREE_FOR_REVIEW';
  for (const attempt of attempts)
    attempt.curriculumVersion?.courses.sort((a, b) =>
      a.courseId.localeCompare(b.courseId),
    );
  const sourceFingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        ruleId: ruleRow.id,
        ruleDigest: ruleRow.contentDigest,
        period,
        units: units.sort((a, b) => a.id.localeCompare(b.id)),
        calendars,
        sections: sections.sort((a, b) => a.id.localeCompare(b.id)),
        venues: venues.sort((a, b) => a.id.localeCompare(b.id)),
        teachers: teachers.sort((a, b) => a.id.localeCompare(b.id)),
        registrations: registrations.sort((a, b) => a.id.localeCompare(b.id)),
        attempts: attempts.sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest('hex');
  const sourceContext: TimetableSourceContext = {
    rule: {
      id: ruleRow.id,
      version: ruleRow.version,
      contentDigest: ruleRow.contentDigest,
      campusCode: ruleRow.campusUnit.code,
      periodCode: period.code,
      teachingStartDate:
        ruleRow.teachingStartDate?.toISOString().slice(0, 10) ?? null,
      teachingEndDate:
        ruleRow.teachingEndDate?.toISOString().slice(0, 10) ?? null,
      dailyStartTime: ruleRow.dailyStartTime,
      dailyEndTime: ruleRow.dailyEndTime,
      allowedWeekdays: rules.teachingWindow!.allowedWeekdays,
      maxSessionMinutes: ruleRow.maxSessionMinutes,
      roomTurnaroundMinutes: ruleRow.roomTurnaroundMinutes,
      maxOccurrences: ruleRow.maxOccurrences,
      campusTravelMinutes:
        ruleRow.campusTravelMinutes as TimetableSourceContext['rule']['campusTravelMinutes'],
    },
    calendar: calendars[0]
      ? {
          ...calendars[0],
          startDate: calendars[0].startDate.toISOString().slice(0, 10),
          endDate: calendars[0].endDate.toISOString().slice(0, 10),
        }
      : null,
    units: units.map((unit) => ({
      id: unit.id,
      code: unit.code,
      versionId: unit.versions[0].id,
      kind: unit.versions[0].unitKind ?? unit.versions[0].unitType,
      status: unit.versions[0].status,
    })),
  };
  return {
    preview,
    issues,
    status,
    sourceFingerprint,
    registrations,
    sourceContext,
  };
}
