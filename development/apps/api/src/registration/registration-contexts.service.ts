import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { STUDENT_DEMO_V1 as policy } from '@sis/config';
import type {
  RegistrationContextsResponse,
  RegistrationContextItem,
} from '@sis/contracts';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';

const pageSize = 20;
interface Cursor {
  kind: 'OWN_REGISTRATION_CONTEXTS';
  v: 1;
  accountId: string;
  assignmentId: string;
  studentId: string;
  current: string;
  period: string;
  attemptId: string;
}
@Injectable()
export class RegistrationContextsService {
  constructor(private readonly prisma: PrismaService) {}
  private invalid(): never {
    throw new HttpException(
      {
        code: 'CONTEXT_CURSOR_INVALID',
        message:
          'Restart academic period selection from the first page. No registration was changed.',
      },
      400,
    );
  }
  private sign(payload: string) {
    const secret = process.env.QUEUE_CURSOR_SECRET;
    if (
      process.env.NODE_ENV === 'production' &&
      (!secret || secret.length < 32)
    )
      throw new HttpException(
        {
          message:
            'Academic period selection is temporarily unavailable. No registration was changed.',
        },
        503,
      );
    return createHmac(
      'sha256',
      secret || 'registration-context-cursor-development-only',
    )
      .update(payload)
      .digest('base64url');
  }
  private encode(cursor: Cursor) {
    const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }
  private decode(
    token: string,
    expected: Omit<Cursor, 'period' | 'attemptId'>,
  ): Cursor {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) this.invalid();
    const wanted = Buffer.from(this.sign(payload), 'base64url');
    const actual = Buffer.from(signature, 'base64url');
    if (wanted.length !== actual.length || !timingSafeEqual(wanted, actual))
      this.invalid();
    try {
      const cursor = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Cursor;
      if (
        Object.entries(expected).some(
          ([key, value]) => cursor[key as keyof Cursor] !== value,
        ) ||
        typeof cursor.period !== 'string' ||
        !cursor.period ||
        cursor.period.length > 64 ||
        cursor.period
          .split('')
          .some(
            (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
          ) ||
        typeof cursor.attemptId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(cursor.attemptId)
      )
        this.invalid();
      return cursor;
    } catch {
      return this.invalid();
    }
  }
  async list(
    auth: ActiveAuthority,
    token?: string,
  ): Promise<RegistrationContextsResponse> {
    if (auth.activeRole !== 'STUDENT' || !auth.assignmentId)
      throw new HttpException(
        { message: 'This student workspace is unavailable.' },
        403,
      );
    return this.prisma.$transaction(
      async (db) => {
        const now = new Date();
        const assignment = await db.roleAssignment.findFirst({
          where: {
            id: auth.assignmentId!,
            accountId: auth.accountId,
            role: 'STUDENT',
            scopeType: { in: ['STUDENT', 'PERSON'] },
            capabilities: { has: 'study' },
            startsAt: { lte: now },
            revokedAt: null,
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            account: { status: 'ACTIVE', person: { status: 'ACTIVE' } },
          },
          include: {
            account: { include: { person: { include: { student: true } } } },
          },
        });
        const student = assignment?.account.person.student;
        if (
          !assignment ||
          !student ||
          student.status !== 'ACTIVE' ||
          !(
            (assignment.scopeType === 'STUDENT' &&
              [student.id, student.studentNumber].includes(
                assignment.scopeRef,
              )) ||
            (assignment.scopeType === 'PERSON' &&
              ['SELF', student.personId].includes(assignment.scopeRef))
          )
        )
          throw new HttpException(
            { message: 'This student workspace is unavailable.' },
            403,
          );
        const current = policy.currentPeriod as string;
        const context = {
          kind: 'OWN_REGISTRATION_CONTEXTS' as const,
          v: 1 as const,
          accountId: auth.accountId,
          assignmentId: assignment.id,
          studentId: student.id,
          current,
        };
        const cursor = token ? this.decode(token, context) : null;
        // UNION eliminates duplicate plan/registration/default pairs. Inner joins
        // exclude orphan legacy IDs before any rows or aggregate are projected.
        const cte = Prisma.sql`WITH own_attempts AS (
        SELECT a.id, a.status, a.intake, p.code AS "programmeCode", p.name AS "programmeName"
        FROM "ProgrammeAttempt" a JOIN "ProgrammeOffering" o ON o.id=a."offeringId"
        JOIN "Programme" p ON p.id=o."programmeId"
        WHERE a."studentId"=${student.id} AND a.status IN ('ACTIVE','ADMITTED')
      ), pairs AS (
        SELECT a.id AS "attemptId", p.id AS "periodId" FROM own_attempts a CROSS JOIN "AcademicPeriod" p WHERE p.code=${current}
        UNION SELECT c."attemptId", c."periodId" FROM "CoursePlan" c JOIN own_attempts a ON a.id=c."attemptId"
        UNION SELECT r."attemptId", r."periodId" FROM "InstitutionalRegistration" r JOIN own_attempts a ON a.id=r."attemptId"
      ), contexts AS (
        SELECT a.id AS "attemptId", a.status AS "attemptStatus", a.intake, a."programmeCode", a."programmeName", p.code AS period,
          p.code=${current} AS "configuredCurrent",
          CASE WHEN r.status='REGISTERED' THEN 'REGISTERED' WHEN r.id IS NOT NULL THEN 'REVIEW_REQUIRED'
            WHEN c.status='DRAFT' THEN 'DRAFT' WHEN c.id IS NOT NULL THEN 'REVIEW_REQUIRED' ELSE 'NOT_STARTED' END AS "registrationStatus",
          calendar.name AS "periodName", to_char(calendar."startDate",'YYYY-MM-DD') AS "startDate", to_char(calendar."endDate",'YYYY-MM-DD') AS "endDate"
        FROM pairs x JOIN own_attempts a ON a.id=x."attemptId" JOIN "AcademicPeriod" p ON p.id=x."periodId"
        LEFT JOIN "CoursePlan" c ON c."attemptId"=a.id AND c."periodId"=p.id
        LEFT JOIN "InstitutionalRegistration" r ON r."attemptId"=a.id AND r."periodId"=p.id
        LEFT JOIN LATERAL (
          SELECT v.name,v."startDate",v."endDate" FROM "AcademicPeriodVersion" v
          JOIN "DemoInstitutionSetupActivation" activation ON activation."setupVersionId"=v."setupVersionId"
          WHERE v."periodId"=p.id AND NOT EXISTS(SELECT 1 FROM "DemoInstitutionSetupActivation" successor WHERE successor."previousActivationId"=activation.id)
          ORDER BY activation."approvedAt" DESC,v.version DESC LIMIT 1
        ) calendar ON true
      )`;
        const rows = await db.$queryRaw<
          RegistrationContextItem[]
        >(Prisma.sql`${cte} SELECT * FROM contexts
        ${cursor ? Prisma.sql`WHERE (period COLLATE "C", "attemptId" COLLATE "C") > (${cursor.period},${cursor.attemptId})` : Prisma.empty}
        ORDER BY period COLLATE "C", "attemptId" COLLATE "C" LIMIT ${pageSize + 1}`);
        const registered = await db.$queryRaw<
          { attemptId: string; period: string }[]
        >(
          Prisma.sql`${cte} SELECT "attemptId",period FROM contexts WHERE "attemptStatus"='ACTIVE' AND "registrationStatus"='REGISTERED' AND EXISTS(SELECT 1 FROM "AcademicPeriod" p WHERE p.code=contexts.period AND p.status<>'CANCELLED') LIMIT 2`,
        );
        const items = rows.slice(0, pageSize);
        const last = items.at(-1);
        return {
          source: 'OWN_REGISTRATION_CONTEXTS',
          checkedAt: now.toISOString(),
          configuredPeriod: { code: current },
          items,
          soleRegisteredContext: registered.length === 1 ? registered[0] : null,
          nextCursor:
            rows.length > pageSize && last
              ? this.encode({
                  ...context,
                  period: last.period,
                  attemptId: last.attemptId,
                })
              : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
