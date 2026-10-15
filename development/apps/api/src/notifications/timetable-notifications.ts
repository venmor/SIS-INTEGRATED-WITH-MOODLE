import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../identity-access/prisma.service.js';
import { TIMETABLE_PUBLICATION_POLICY } from '../timetabling/publication-policy.js';
import { timetableDemoDraftsEnabled } from '../timetabling/demo-rules.service.js';

export const TIMETABLE_NOTIFICATION_POLICY = 'NOTIFY-TIMETABLE-v1';
const PAGE_SIZE = 50;
type Db = Prisma.TransactionClient;
interface SourceNotice {
  templateId: string;
  templateVersion: number;
  event: string;
  title: string;
  body: string;
  actionPath: string;
  office: string;
  category: string;
  mandatory: boolean;
  recipientAccountId: string;
  dedupeKey: string;
  channels: string[];
}

/** One bounded owner page. No OutboxEvent payload contains trusted recipients.
 * The event lock, records and cursor commit together; failed pages are replayable.
 * Do not acknowledge another owner's use of the same event via deliveredAt.
 */
export async function consumeTimetableNotifications(
  prisma: PrismaService,
  createNotice: (
    db: Db,
    input: SourceNotice,
  ) => Promise<{ id: string; deduped: boolean }>,
): Promise<{ events: number; recipients: number }> {
  if (!timetableDemoDraftsEnabled()) return { events: 0, recipients: 0 };
  return prisma.$transaction(
    async (db) => {
      const pending: Array<{ id: string; aggregateId: string }> =
        await db.$queryRaw`
      SELECT e."id", e."aggregateId" FROM "OutboxEvent" e
      LEFT JOIN "TimetableNotificationDispatch" d ON d."eventId" = e."id"
      WHERE e."type" = 'DemoTimetablePublished' AND e."aggregate" = 'DemoTimetable'
        AND (d."eventId" IS NULL OR d."state" = 'PENDING')
      ORDER BY e."occurredAt", e."id" LIMIT 1
      FOR UPDATE OF e SKIP LOCKED`;
      const source = pending[0];
      if (!source) return { events: 0, recipients: 0 };
      // Duplicate durable events may have different event row locks but share
      // one publication/account notice key. Serialize that source before the
      // dedupe read/create; the immutable publication itself is never updated.
      await db.$queryRaw`SELECT "id" FROM "TimetableDemoPublication"
        WHERE "id" = ${source.aggregateId} FOR UPDATE`;
      const publication = await db.timetableDemoPublication.findUnique({
        where: { id: source.aggregateId },
        include: { period: true },
      });
      if (
        !publication ||
        publication.policyVersion !== TIMETABLE_PUBLICATION_POLICY
      ) {
        await db.timetableNotificationDispatch.upsert({
          where: { eventId: source.id },
          create: {
            eventId: source.id,
            policyVersion: TIMETABLE_NOTIFICATION_POLICY,
            state: 'BLOCKED',
            failureCode: 'SOURCE_PUBLICATION_UNAVAILABLE',
          },
          update: {
            state: 'BLOCKED',
            failureCode: 'SOURCE_PUBLICATION_UNAVAILABLE',
          },
        });
        await db.auditEvent.create({
          data: {
            action: 'TimetableNotificationSourceBlocked',
            outcome: 'DENY',
            scope: 'NOTIFICATIONS',
            targetRef: source.id,
            correlationId: randomUUID(),
            policyVersion: TIMETABLE_NOTIFICATION_POLICY,
            purpose: 'timetable-notification-handoff',
            metadata: {
              errorCategory: 'ERR-RULE',
              reason: 'source-publication-unavailable',
            },
          },
        });
        return { events: 1, recipients: 0 };
      }
      const dispatch = await db.timetableNotificationDispatch.upsert({
        where: { eventId: source.id },
        create: {
          eventId: source.id,
          publicationId: publication.id,
          policyVersion: TIMETABLE_NOTIFICATION_POLICY,
        },
        update: {},
      });
      const now = new Date();
      // The source is the publication's immutable current/previous projection,
      // intersected with the same current academic entitlement as timetable reads.
      // Accounts added after publication are not retroactive notice recipients.
      const recipients: Array<{ id: string; attemptId: string }> =
        await db.$queryRaw`
      SELECT a."id", MIN(pa."id") AS "attemptId"
      FROM "Account" a JOIN "Person" p ON p."id" = a."personId"
      JOIN "Student" st ON st."personId" = p."id"
      JOIN "ProgrammeAttempt" pa ON pa."studentId" = st."id"
      JOIN "CurriculumVersion" cv ON cv."id" = pa."curriculumVersionId"
      JOIN "InstitutionalRegistration" r ON r."attemptId" = pa."id"
      JOIN "CourseRegistration" cr ON cr."registrationId" = r."id"
      JOIN "TimetableStudentSession" ts ON ts."courseRegistrationId" = cr."id"
        AND ts."attemptId" = pa."id" AND ts."periodId" = r."periodId"
      WHERE a."status" = 'ACTIVE' AND p."status" = 'ACTIVE' AND st."status" = 'ACTIVE'
        AND pa."status" = 'ACTIVE' AND cv."status" = 'PUBLISHED'
        AND r."status" = 'REGISTERED' AND cr."status" = 'ENROLLED'
        AND r."periodId" = ${publication.periodId}
        AND ts."publicationId" IN (${publication.id}, ${publication.previousPublicationId})
        AND a."createdAt" <= ${publication.publishedAt}
        AND ${publication.period.status} NOT IN ('CANCELLED', 'CLOSED', 'ARCHIVED', 'SUSPENDED')
        AND (${dispatch.lastAccountId}::text IS NULL OR a."id" > ${dispatch.lastAccountId})
        AND EXISTS (SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId" = a."id"
          AND ra."role" = 'STUDENT' AND ra."capabilities" @> ARRAY['study']::text[]
          AND ra."revokedAt" IS NULL AND ra."startsAt" <= ${now}
          AND (ra."endsAt" IS NULL OR ra."endsAt" > ${now}))
      GROUP BY a."id" ORDER BY a."id" LIMIT ${PAGE_SIZE + 1}`;
      const page = recipients.slice(0, PAGE_SIZE);
      const event = publication.previousPublicationId
        ? 'TIMETABLE_UPDATED'
        : 'TIMETABLE_PUBLISHED';
      const title = publication.previousPublicationId
        ? 'Timetable updated'
        : 'Timetable available';
      // NotificationRecord has a real SQL foreign key to its pinned versioned
      // template. A policy label alone is not a template record.
      const template = page.length
        ? await db.notificationTemplate.upsert({
            where: {
              event_version: {
                event: `${TIMETABLE_NOTIFICATION_POLICY}:${event}`,
                version: 1,
              },
            },
            create: {
              event: `${TIMETABLE_NOTIFICATION_POLICY}:${event}`,
              version: 1,
              title,
              body: 'A published timetable version is available for {{periodCode}}. Review your classes in the student portal.',
              actionLabel: 'View timetable',
              office: 'Timetabling',
              category: 'TIMETABLE',
              mandatory: true,
            },
            update: {},
          })
        : null;
      let created = 0;
      for (const recipient of page) {
        const context = new URLSearchParams({
          attemptId: recipient.attemptId,
          period: publication.period.code,
        });
        const result = await createNotice(db, {
          templateId: template!.id,
          templateVersion: 1,
          event,
          title,
          body: `A published timetable version is available for ${publication.period.code}. Review your classes in the student portal.`,
          actionPath: `/student/timetable?${context.toString()}`,
          office: 'Timetabling',
          category: 'TIMETABLE',
          mandatory: true,
          recipientAccountId: recipient.id,
          dedupeKey: `timetable:${publication.id}:${recipient.id}`,
          channels: ['IN_SYSTEM'],
        });
        if (!result.deduped) created++;
      }
      const complete = recipients.length <= PAGE_SIZE;
      await db.timetableNotificationDispatch.update({
        where: { eventId: source.id },
        data: {
          lastAccountId: page.at(-1)?.id ?? dispatch.lastAccountId,
          recipientCount: { increment: page.length },
          notificationCount: { increment: created },
          state: complete ? 'COMPLETE' : 'PENDING',
          completedAt: complete ? new Date() : null,
        },
      });
      await db.auditEvent.create({
        data: {
          action: 'TimetableNotificationPageRecorded',
          outcome: 'ALLOW',
          scope: `PERIOD:${publication.periodId}`,
          targetRef: source.id,
          correlationId: randomUUID(),
          policyVersion: TIMETABLE_NOTIFICATION_POLICY,
          purpose: 'timetable-notification-handoff',
          metadata: {
            publicationId: publication.id,
            processedRecipients: page.length,
            createdNotifications: created,
            complete,
          },
        },
      });
      return { events: 1, recipients: page.length };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 25_000,
    },
  );
}
