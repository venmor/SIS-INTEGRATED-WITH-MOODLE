import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import {
  Prisma,
  type TimetableDemoMasterDraft,
  type TimetableDemoPublication,
} from '@prisma/client';
import type {
  DemoTimetablePublicationReceipt,
  DemoTimetablePublicationReview,
  TimetablePublishedSession,
  TimetableSourceContext,
} from '@sis/contracts';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  masterContentDigest,
  parseMasterCommand,
  validateMasterSources,
  type MasterCommand,
  type ResolvedMasterSession,
} from './master-validation.js';
import {
  lockTimetableAuthority,
  timetableAppointment,
} from './timetable-authority.js';
import {
  parsePublicationCommand,
  timetableUuid,
  TIMETABLE_PUBLICATION_POLICY,
} from './publication-policy.js';

type Db = Prisma.TransactionClient;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function commandFromDraft(row: TimetableDemoMasterDraft): MasterCommand {
  if (!Array.isArray(row.sessions))
    throw new ConflictException(
      'This saved master needs a new version before review.',
    );
  const fields = [
    'id',
    'sectionId',
    'venueId',
    'teacherAssignmentId',
    'registrationIds',
    'startAt',
    'endAt',
    'plannedSeats',
    'requiresStepFreeAccess',
  ];
  const sessions = row.sessions.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new ConflictException(
        'This saved master needs a new version before review.',
      );
    return Object.fromEntries(fields.map((field) => [field, raw[field]]));
  });
  const command = parseMasterCommand({
    clientRequestId: row.clientRequestId,
    expectedVersion: row.version - 1,
    periodId: row.periodId,
    ruleDraftId: row.ruleDraftId,
    sessions,
  });
  if (masterContentDigest(command) !== row.contentDigest)
    throw new ConflictException(
      'The saved master fingerprint changed. No timetable was published.',
    );
  return command;
}

@Injectable()
export class TimetablePublicationService {
  constructor(private readonly prisma: PrismaService) {}
  private latest(db: Db, periodId: string) {
    return db.timetableDemoPublication.findFirst({
      where: { periodId },
      orderBy: { version: 'desc' },
    });
  }
  private receipt(
    row: TimetableDemoPublication,
    accountId: string,
    currentId: string,
  ): DemoTimetablePublicationReceipt {
    return {
      publicationId: row.id,
      masterDraftId: row.masterDraftId,
      periodId: row.periodId,
      version: row.version,
      publishedAt: row.publishedAt.toISOString(),
      status: 'FICTIONAL_PUBLISHED',
      contentDigest: row.contentDigest,
      commandDigest: row.commandDigest,
      reason: row.reason,
      previousPublicationId: row.previousPublicationId,
      clientRequestId:
        row.approvedByAccountId === accountId ? row.clientRequestId : null,
      ownDecision: row.approvedByAccountId === accountId,
      isCurrent: currentId === row.id,
    };
  }
  private async sourceState(db: Db, draft: TimetableDemoMasterDraft) {
    const issues: Array<{ code: string; occurrenceIds: string[] }> = [];
    const latestDraft = await db.timetableDemoMasterDraft.findFirst({
      where: { periodId: draft.periodId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (latestDraft?.id !== draft.id)
      issues.push({ code: 'MASTER_SUPERSEDED', occurrenceIds: [] });
    if (
      !draft.createdByAssignmentId ||
      !draft.createdByPersonId ||
      !draft.sourceFingerprint
    )
      issues.push({ code: 'LEGACY_PROPOSER_PROOF_MISSING', occurrenceIds: [] });
    if (!draft.sourceContext)
      issues.push({ code: 'SOURCE_VERSION_PROOF_MISSING', occurrenceIds: [] });
    const rule = await db.timetableDemoRuleDraft.findUniqueOrThrow({
      where: { id: draft.ruleDraftId },
    });
    const latestRule = await db.timetableDemoRuleDraft.findFirst({
      where: { campusUnitId: rule.campusUnitId, periodId: draft.periodId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (latestRule?.id !== draft.ruleDraftId)
      issues.push({ code: 'RULE_SUPERSEDED', occurrenceIds: [] });
    const validated = await validateMasterSources(db, commandFromDraft(draft));
    issues.push(...validated.issues);
    if (draft.status !== 'CONFLICT_FREE_FOR_REVIEW')
      issues.push({ code: 'MASTER_BLOCKED', occurrenceIds: [] });
    if (draft.sourceFingerprint !== validated.sourceFingerprint)
      issues.push({ code: 'SOURCE_CHANGED', occurrenceIds: [] });
    return { ...validated, issues, currentReady: issues.length === 0 };
  }
  private async impact(
    db: Db,
    currentId: string | null,
    sessions: ResolvedMasterSession[],
  ) {
    const prior = currentId
      ? await db.timetableStudentSession.findMany({
          where: { publicationId: currentId },
          take: 10001,
        })
      : [];
    if (prior.length > 10000)
      throw new ConflictException(
        'This publication needs a larger impact review before replacement.',
      );
    const facts = (
      row: ResolvedMasterSession | (typeof prior)[number],
    ): TimetablePublishedSession => ({
      id: 'sessionId' in row ? row.sessionId : row.id,
      courseCode: row.courseCode,
      courseTitle: row.courseTitle,
      sectionCode: row.sectionCode,
      campusCode: row.campusCode,
      venueCode: row.venueCode,
      teacherName: row.teacherName ?? '',
      deliveryMode: row.deliveryMode ?? '',
      activityType: 'Teaching session',
      startAt: new Date(row.startAt).toISOString(),
      endAt: new Date(row.endAt).toISOString(),
    });
    const before = new Map(prior.map((row) => [row.sessionId, facts(row)]));
    const after = new Map(sessions.map((row) => [row.id, facts(row)]));
    const beforeMembers = new Map<string, Set<string>>();
    for (const row of prior) {
      const members = beforeMembers.get(row.sessionId) ?? new Set<string>();
      members.add(row.courseRegistrationId);
      beforeMembers.set(row.sessionId, members);
    }
    const afterMembers = new Map(
      sessions.map((row) => [row.id, new Set(row.registrationIds)]),
    );
    const affectedRegistrationIds = new Set<string>();
    const changes: DemoTimetablePublicationReview['impact']['changes'] = [];
    for (const [key, value] of after) {
      const previousMembers = beforeMembers.get(key) ?? new Set<string>();
      const nextMembers = afterMembers.get(key)!;
      const added = [...nextMembers].filter((id) => !previousMembers.has(id));
      const removed = [...previousMembers].filter((id) => !nextMembers.has(id));
      const membershipChanged = added.length > 0 || removed.length > 0;
      const factsChanged =
        JSON.stringify(before.get(key)) !== JSON.stringify(value);
      if (factsChanged)
        for (const id of [...previousMembers, ...nextMembers])
          affectedRegistrationIds.add(id);
      else
        for (const id of [...added, ...removed])
          affectedRegistrationIds.add(id);
      const membership = {
        membershipChanged,
        membershipAdded: added.length,
        membershipRemoved: removed.length,
      };
      if (!before.has(key))
        changes.push({
          kind: 'ADDED',
          sessionId: key,
          before: null,
          after: value,
          ...membership,
        });
      else if (factsChanged || membershipChanged)
        changes.push({
          kind: 'CHANGED',
          sessionId: key,
          before: before.get(key)!,
          after: value,
          ...membership,
        });
    }
    for (const [key, value] of before)
      if (!after.has(key)) {
        const previousMembers = beforeMembers.get(key)!;
        for (const id of previousMembers) affectedRegistrationIds.add(id);
        changes.push({
          kind: 'REMOVED',
          sessionId: key,
          before: value,
          after: null,
          membershipChanged: previousMembers.size > 0,
          membershipAdded: 0,
          membershipRemoved: previousMembers.size,
        });
      }
    const registrations = await db.courseRegistration.findMany({
      where: { id: { in: [...affectedRegistrationIds] } },
      select: { registration: { select: { attemptId: true } } },
    });
    const attempts = await db.programmeAttempt.findMany({
      where: {
        id: { in: registrations.map((row) => row.registration.attemptId) },
      },
      select: { studentId: true },
    });
    return {
      added: changes.filter((row) => row.kind === 'ADDED').length,
      changed: changes.filter((row) => row.kind === 'CHANGED').length,
      removed: changes.filter((row) => row.kind === 'REMOVED').length,
      affectedLearners: new Set(attempts.map((row) => row.studentId)).size,
      changes,
    };
  }

  async review(
    actor: ActiveAuthority,
    id: string,
    beforeVersion?: number,
    clientRequestId?: string,
  ): Promise<DemoTimetablePublicationReview> {
    await timetableAppointment(this.prisma, actor, 'read');
    if (!timetableUuid.test(id)) throw new NotFoundException();
    if (clientRequestId !== undefined && !timetableUuid.test(clientRequestId))
      throw new BadRequestException('Use the exact saved decision reference.');
    return this.prisma.$transaction(
      async (db) => {
        await lockTimetableAuthority(db, actor);
        const appointment = await timetableAppointment(db, actor, 'read');
        const draft = await db.timetableDemoMasterDraft.findUnique({
          where: { id },
          include: {
            period: true,
            createdBy: {
              select: { person: { select: { displayName: true } } },
            },
          },
        });
        if (!draft || !draft.period.code.startsWith('DEMO-'))
          throw new NotFoundException();
        const current = await this.latest(db, draft.periodId);
        const requestReceipt = clientRequestId
          ? await db.timetableDemoPublication.findFirst({
              where: {
                approvedByAccountId: actor.accountId,
                clientRequestId,
                masterDraftId: id,
              },
            })
          : null;
        const page = await db.timetableDemoPublication.findMany({
          where: {
            periodId: draft.periodId,
            ...(beforeVersion ? { version: { lt: beforeVersion } } : {}),
          },
          orderBy: { version: 'desc' },
          take: 21,
        });
        const history = page.slice(0, 20);
        let currentIssues: DemoTimetablePublicationReview['currentIssues'];
        let currentSources: Pick<
          Awaited<ReturnType<typeof validateMasterSources>>,
          'sourceFingerprint' | 'sourceContext'
        > | null = null;
        let sessions = draft.sessions as unknown as ResolvedMasterSession[];
        try {
          const validated = await this.sourceState(db, draft);
          currentIssues = validated.issues;
          sessions = validated.preview;
          currentSources = validated;
        } catch (error) {
          if (!(error instanceof HttpException)) throw error;
          currentIssues = [
            { code: 'CURRENT_SOURCE_UNAVAILABLE', occurrenceIds: [] },
          ];
        }
        if (draft.createdByAssignmentId) {
          try {
            await lockTimetableAuthority(db, {
              accountId: draft.createdByAccountId,
              assignmentId: draft.createdByAssignmentId,
              activeRole: 'TIMETABLE_COORDINATOR',
              scope: 'SYSTEM:DEMO-UNIVERSITY',
            });
            const proposer = await timetableAppointment(
              db,
              {
                accountId: draft.createdByAccountId,
                assignmentId: draft.createdByAssignmentId,
                activeRole: 'TIMETABLE_COORDINATOR',
                scope: 'SYSTEM:DEMO-UNIVERSITY',
              },
              'draft',
            );
            if (proposer.account.personId !== draft.createdByPersonId)
              currentIssues.push({
                code: 'PROPOSER_CHANGED',
                occurrenceIds: [],
              });
          } catch (error) {
            if (!(error instanceof HttpException)) throw error;
            currentIssues.push({
              code: 'PROPOSER_APPOINTMENT_INACTIVE',
              occurrenceIds: [],
            });
          }
        }
        const ownProposal =
          draft.createdByPersonId === appointment.account.personId;
        const canPublish =
          actor.activeRole === 'DOMAIN_ADMIN' &&
          !ownProposal &&
          currentIssues.length === 0 &&
          !(await db.timetableDemoPublication.findUnique({
            where: { masterDraftId: draft.id },
          }));
        const impact = await this.impact(db, current?.id ?? null, sessions);
        const rule = await db.timetableDemoRuleDraft.findUniqueOrThrow({
          where: { id: draft.ruleDraftId },
          include: {
            campusUnit: { select: { code: true } },
            period: { select: { code: true } },
          },
        });
        const savedSessions =
          draft.sessions as unknown as ResolvedMasterSession[];
        const savedContext =
          draft.sourceContext as unknown as TimetableSourceContext | null;
        await timetableAppointment(db, actor, 'read');
        return {
          mode: 'FICTIONAL_REHEARSAL',
          policyVersion: TIMETABLE_PUBLICATION_POLICY,
          canPublish,
          ownProposal,
          draft: {
            id: draft.id,
            periodId: draft.periodId,
            version: draft.version,
            contentDigest: draft.contentDigest,
            status: draft.status,
            createdAt: draft.createdAt.toISOString(),
            proposerName: draft.createdBy.person.displayName,
          },
          currentReady: currentIssues.length === 0,
          currentIssues,
          sourceCheckedAt: new Date().toISOString(),
          sources: {
            sourceFingerprint: draft.sourceFingerprint,
            currentFingerprint: currentSources?.sourceFingerprint ?? null,
            matchesReviewedSources:
              !!currentSources &&
              draft.sourceFingerprint === currentSources.sourceFingerprint,
            rule: {
              id: rule.id,
              version: rule.version,
              contentDigest: rule.contentDigest,
              campusCode: rule.campusUnit.code,
              periodCode: rule.period?.code ?? null,
              teachingStartDate:
                rule.teachingStartDate?.toISOString().slice(0, 10) ?? null,
              teachingEndDate:
                rule.teachingEndDate?.toISOString().slice(0, 10) ?? null,
              dailyStartTime: rule.dailyStartTime,
              dailyEndTime: rule.dailyEndTime,
              allowedWeekdays: Array.isArray(rule.allowedWeekdays)
                ? rule.allowedWeekdays.filter(
                    (day): day is number => typeof day === 'number',
                  )
                : [],
              maxSessionMinutes: rule.maxSessionMinutes,
              roomTurnaroundMinutes: rule.roomTurnaroundMinutes,
              maxOccurrences: rule.maxOccurrences,
              campusTravelMinutes:
                rule.campusTravelMinutes as DemoTimetablePublicationReview['sources']['rule']['campusTravelMinutes'],
            },
            calendar: currentSources?.sourceContext.calendar ?? null,
            units: currentSources?.sourceContext.units ?? [],
            savedCalendar: savedContext?.calendar ?? null,
            savedUnits: savedContext?.units ?? [],
            sessionVersions: savedSessions.map((session) => ({
              sessionId: session.id,
              sectionId: session.sectionId,
              offeringId: session.offeringId,
              courseVersionId: session.courseVersionId,
              teacherAssignmentId: session.teacherAssignmentId,
              venueId: session.venueId,
            })),
          },
          latestPublication: current
            ? this.receipt(current, actor.accountId, current.id)
            : null,
          requestReceipt: requestReceipt
            ? this.receipt(requestReceipt, actor.accountId, current?.id ?? '')
            : null,
          publications: history.map((row) =>
            this.receipt(row, actor.accountId, current?.id ?? ''),
          ),
          olderVersionCursor: page.length > 20 ? history.at(-1)!.version : null,
          impact,
          limits: [
            'Fictional isolated rehearsal only; password reconfirmation is not institutional staff MFA.',
            'Master: 100 sessions; 100 explicit roster links per occurrence; 20 decisions per history page.',
            'No Moodle changes or external delivery.',
          ],
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  private async lockSources(db: Db, command: MasterCommand) {
    // Lock parents before their children. This includes configured offerings
    // with no sessions yet, whose first section would change master coverage.
    await db.$queryRaw`SELECT "id" FROM "AcademicPeriod" WHERE "id" = ${command.periodId} FOR UPDATE`;
    await db.$queryRaw`SELECT "id" FROM "CourseDeliveryOffering" WHERE "periodId" = ${command.periodId} ORDER BY "id" FOR UPDATE`;
    await db.$queryRaw`SELECT "id" FROM "InstitutionalRegistration" WHERE "periodId" = ${command.periodId} ORDER BY "id" FOR UPDATE`;
    const sections = [
      ...new Set(command.sessions.map((row) => row.sectionId)),
    ].sort();
    const venues = [
      ...new Set(command.sessions.map((row) => row.venueId)),
    ].sort();
    const teachers = [
      ...new Set(command.sessions.map((row) => row.teacherAssignmentId)),
    ].sort();
    const registrations = [
      ...new Set(command.sessions.flatMap((row) => row.registrationIds)),
    ].sort();
    await db.$queryRaw(
      Prisma.sql`SELECT s."id" FROM "TeachingSection" s JOIN "CourseDeliveryOffering" o ON o."id" = s."offeringId" JOIN "CourseVersion" c ON c."id" = o."courseVersionId" WHERE s."id" IN (${Prisma.join(sections)}) ORDER BY s."id" FOR SHARE OF s FOR UPDATE OF o,c`,
    );
    await db.$queryRaw(
      Prisma.sql`SELECT v."id" FROM "TeachingVenue" v JOIN "TeachingBuilding" b ON b."id" = v."buildingId" WHERE v."id" IN (${Prisma.join(venues)}) ORDER BY v."id" FOR SHARE OF v,b`,
    );
    await db.$queryRaw(
      Prisma.sql`SELECT r."id" FROM "RoleAssignment" r JOIN "Account" a ON a."id" = r."accountId" JOIN "Person" p ON p."id" = a."personId" WHERE r."id" IN (${Prisma.join(teachers)}) ORDER BY r."id" FOR SHARE OF r,a,p`,
    );
    if (registrations.length)
      await db.$queryRaw(
        Prisma.sql`SELECT c."id" FROM "CourseRegistration" c JOIN "InstitutionalRegistration" r ON r."id" = c."registrationId" JOIN "ProgrammeAttempt" a ON a."id" = r."attemptId" JOIN "Student" s ON s."id" = a."studentId" JOIN "CurriculumVersion" v ON v."id" = a."curriculumVersionId" WHERE c."id" IN (${Prisma.join(registrations)}) ORDER BY c."id" FOR SHARE OF c,r,a,s,v`,
      );
  }
  async publish(
    actor: ActiveAuthority,
    id: string,
    raw: unknown,
  ): Promise<DemoTimetablePublicationReceipt> {
    await timetableAppointment(this.prisma, actor, 'publish');
    if (!timetableUuid.test(id)) throw new NotFoundException();
    const command = parsePublicationCommand(raw);
    const commandDigest = createHash('sha256')
      .update(
        JSON.stringify({
          id,
          contentDigest: command.contentDigest,
          expectedPublicationId: command.expectedPublicationId,
          reviewed: true,
          fictionalOnly: true,
          reason: command.reason,
          policyVersion: TIMETABLE_PUBLICATION_POLICY,
        }),
      )
      .digest('hex');
    try {
      return await this.prisma.$transaction(
        async (db) => {
          // Setup appends calendar/unit versions. Take its domain lock before
          // period-wide rule/master and authority/source locks in the same order.
          await db.$queryRaw`SELECT pg_advisory_xact_lock(260007, 3)::text`;
          const draft = await db.timetableDemoMasterDraft.findUnique({
            where: { id },
            include: { period: { select: { code: true } } },
          });
          if (!draft || !draft.period.code.startsWith('DEMO-'))
            throw new NotFoundException();
          await db.$queryRaw`SELECT pg_advisory_xact_lock(260008, hashtext(${draft.periodId}))::text`;
          await lockTimetableAuthority(db, actor);
          const appointment = await timetableAppointment(db, actor, 'publish');
          const credentials = await db.$queryRaw<
            { secretHash: string }[]
          >`SELECT "secretHash" FROM "Credential" WHERE "accountId" = ${actor.accountId} AND "kind" = 'PASSWORD' AND "status" = 'ACTIVE' AND "supersededAt" IS NULL FOR SHARE`;
          let verified = false;
          try {
            verified =
              credentials.length === 1 &&
              (await verify(credentials[0].secretHash, command.password));
          } catch {
            /* deny corrupted credentials */
          }
          if (!verified)
            throw new ForbiddenException(
              'Password reconfirmation failed. No timetable was published. Your saved master is preserved.',
            );
          const current = await this.latest(db, draft.periodId);
          const replay = await db.timetableDemoPublication.findUnique({
            where: {
              approvedByAccountId_clientRequestId: {
                approvedByAccountId: actor.accountId,
                clientRequestId: command.clientRequestId,
              },
            },
          });
          if (replay) {
            if (
              replay.commandDigest !== commandDigest ||
              replay.masterDraftId !== id
            )
              throw new ConflictException(
                'This decision reference belongs to different reviewed information. No timetable was replaced.',
              );
            await timetableAppointment(db, actor, 'publish');
            return this.receipt(replay, actor.accountId, current?.id ?? '');
          }
          if (
            draft.contentDigest !== command.contentDigest ||
            (current?.id ?? null) !== command.expectedPublicationId
          )
            throw new ConflictException(
              'The reviewed master or current publication changed. Keep your reason and reload before making a new decision.',
            );
          if (!draft.createdByAssignmentId || !draft.createdByPersonId)
            throw new ConflictException(
              'This legacy master has no original proposer appointment. Save a new reviewed version first.',
            );
          const proposer: ActiveAuthority = {
            accountId: draft.createdByAccountId,
            assignmentId: draft.createdByAssignmentId,
            activeRole: 'TIMETABLE_COORDINATOR',
            scope: 'SYSTEM:DEMO-UNIVERSITY',
          };
          await lockTimetableAuthority(db, proposer);
          const proposing = await timetableAppointment(db, proposer, 'draft');
          if (proposing.account.personId !== draft.createdByPersonId)
            throw new ConflictException(
              'The original proposer identity changed. Save a new reviewed version first.',
            );
          if (proposing.account.personId === appointment.account.personId)
            throw new ForbiddenException(
              'Another person must independently approve this timetable. No timetable was published.',
            );
          await this.lockSources(db, commandFromDraft(draft));
          let state: Awaited<
            ReturnType<TimetablePublicationService['sourceState']>
          >;
          try {
            state = await this.sourceState(db, draft);
          } catch (error) {
            if (!(error instanceof BadRequestException)) throw error;
            throw new ConflictException(
              'A current timetable source is unavailable. Save a corrected master and review it before publishing. Your prior publication is preserved.',
            );
          }
          if (!state.currentReady)
            throw new ConflictException({
              message:
                'The master is blocked or its source changed. Save and independently review a corrected version. No timetable was published.',
              issues: state.issues,
            });
          if (
            await db.timetableDemoPublication.findUnique({
              where: { masterDraftId: id },
            })
          )
            throw new ConflictException(
              'This master is already published. Check its recorded decision.',
            );
          const impact = await this.impact(
            db,
            current?.id ?? null,
            state.preview,
          );
          const publication = await db.timetableDemoPublication.create({
            data: {
              periodId: draft.periodId,
              masterDraftId: draft.id,
              version: (current?.version ?? 0) + 1,
              previousPublicationId: current?.id ?? null,
              approvedByAccountId: actor.accountId,
              approvedByAssignmentId: actor.assignmentId!,
              approvedByPersonId: appointment.account.personId,
              clientRequestId: command.clientRequestId,
              contentDigest: draft.contentDigest,
              commandDigest,
              sourceFingerprint: state.sourceFingerprint,
              reason: command.reason,
              policyVersion: TIMETABLE_PUBLICATION_POLICY,
              authenticationStrength: 'DEMO_PASSWORD_RECONFIRMATION',
              approvalMeaning:
                'Reviewed and approved for fictional rehearsal only',
              impact: json(impact),
            },
          });
          const byId = new Map(state.registrations.map((row) => [row.id, row]));
          const projections = state.preview.flatMap((session) =>
            session.registrationIds.map((registrationId) => ({
              publicationId: publication.id,
              courseRegistrationId: registrationId,
              attemptId: byId.get(registrationId)!.registration.attemptId,
              periodId: draft.periodId,
              sessionId: session.id,
              sectionId: session.sectionId,
              offeringId: session.offeringId,
              courseVersionId: session.courseVersionId,
              venueId: session.venueId,
              teacherAssignmentId: session.teacherAssignmentId,
              sectionCode: session.sectionCode,
              courseCode: session.courseCode,
              courseTitle: session.courseTitle,
              venueCode: session.venueCode,
              campusCode: session.campusCode,
              teacherName: session.teacherName,
              deliveryMode: session.deliveryMode,
              startAt: new Date(session.startAt),
              endAt: new Date(session.endAt),
            })),
          );
          await db.timetableStudentSession.createMany({ data: projections });
          // Row locks prevent edits, but cannot prevent a time-bound appointment
          // naturally expiring while Argon2/projections run. Repeat before commit.
          await timetableAppointment(db, actor, 'publish');
          await timetableAppointment(db, proposer, 'draft');
          await db.auditEvent.create({
            data: {
              action: 'DemoTimetablePublished',
              outcome: 'ALLOW',
              actorAccountId: actor.accountId,
              activeRole: actor.activeRole,
              scope: actor.scope,
              targetRef: publication.id,
              idempotencyRef: command.clientRequestId,
              purpose: 'fictional-timetable-publication',
              policyVersion: TIMETABLE_PUBLICATION_POLICY,
              correlationId: randomUUID(),
              metadata: {
                masterDraftId: draft.id,
                originalProposerAssignmentId: draft.createdByAssignmentId,
                assignmentId: actor.assignmentId!,
                authenticationStrength: publication.authenticationStrength,
                contentDigest: draft.contentDigest,
                commandDigest,
                reason: command.reason,
                previousPublicationId: current?.id ?? null,
                impact: json(impact),
              },
            },
          });
          await db.outboxEvent.create({
            data: {
              aggregate: 'DemoTimetable',
              aggregateId: publication.id,
              type: 'DemoTimetablePublished',
              payload: {
                publicationId: publication.id,
                masterDraftId: draft.id,
                periodId: draft.periodId,
                version: publication.version,
                policyVersion: TIMETABLE_PUBLICATION_POLICY,
                externalDelivery: 'NONE',
              },
            },
          });
          // Late writes may finish after a naturally expiring appointment.
          // Keep the final authority check immediately before returning success.
          const final = await this.sourceState(db, draft);
          if (
            final.sourceFingerprint !== state.sourceFingerprint ||
            final.issues.length
          )
            throw new ConflictException(
              'A timetable source became unavailable while publishing. No publication was completed. Check and review a corrected version.',
            );
          await timetableAppointment(db, actor, 'publish');
          await timetableAppointment(db, proposer, 'draft');
          return this.receipt(publication, actor.accountId, publication.id);
        },
        {
          // Explicit locks order the writers. Statement snapshots after a wait
          // must see source versions committed by the preceding owner.
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 25_000,
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        ['P2002', 'P2034'].includes(String(error.code))
      )
        throw new ConflictException(
          'Timetable information changed during the decision. Your saved master is preserved. Check the publication state before retrying.',
        );
      throw error;
    }
  }
}
