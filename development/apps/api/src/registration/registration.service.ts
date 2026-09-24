import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { APPLICATION_DEMO_V1 as applications } from '@sis/config';
import { STUDENT_DEMO_V1 as policy } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import { FinanceService } from '../finance/finance.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface RegistrationAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

export interface ReadinessCondition {
  key: string;
  label: string;
  status:
    | 'READY'
    | 'ACTION_REQUIRED'
    | 'AWAITING_INSTITUTION'
    | 'BLOCKED'
    | 'NOT_APPLICABLE'
    | 'COMPLETE';
  owner: string;
  detail: string;
  next: string;
}

export interface ReadinessAssessment {
  attemptId: string;
  period: string;
  overall: string;
  pendingRegulations: string[];
  conditions: ReadinessCondition[];
  assessedAt: string;
}

// Phase 4 slice 3: registration eligibility summary (TASK-PH4-003). The
// assessment is computed on demand from authoritative rows and audited; it
// writes nothing except the audit event. Finance clearance and holds are
// read as status + expiry only (Phase 5 owns the ledger). Open regulation
// boundaries (DEC-PROG-001/002, DEC-FIN-001) surface as decision-required
// information, never inferred outcomes.
@Injectable()
export class RegistrationService {
  constructor(private readonly prisma: PrismaService, private readonly finance: FinanceService) {}

  private fail(
    code: string,
    message: string,
    status = 409,
    extra: Record<string, unknown> = {},
  ): never {
    throw new HttpException(
      {
        code,
        message,
        saved: false,
        supportReference: randomUUID(),
        nextAction:
          'Review the registration readiness state, or contact the registry.',
        ...extra,
      },
      status,
    );
  }

  private async liveAssignment(
    auth: RegistrationAuthority,
    role: string,
    capability: string,
  ) {
    if (!auth.assignmentId) return null;
    const now = new Date();
    return this.prisma.roleAssignment.findFirst({
      where: {
        id: auth.assignmentId,
        accountId: auth.accountId,
        role,
        capabilities: { has: capability },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
    });
  }

  private async audit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    id: string,
    key: string,
    outcome = 'ALLOW',
    metadata: unknown = {},
  ) {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole ?? 'STUDENT',
        scope: `REGISTRATION:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Registration eligibility',
        metadata: json(metadata),
      },
    });
  }

  async readiness(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
  ): Promise<ReadinessAssessment> {
    const studentSession = await this.liveAssignment(auth, 'STUDENT', 'study');
    const recordsSession =
      studentSession === null
        ? await this.liveAssignment(auth, 'RECORDS_OFFICER', 'convert-student')
        : null;
    if (!studentSession && !recordsSession) {
      throw new HttpException(
        { message: 'This registration workspace is unavailable.' },
        403,
      );
    }
    const account = await this.prisma.account.findUnique({
      where: { id: auth.accountId },
      include: { person: true },
    });
    if (!account)
      this.fail('NOT_FOUND', 'Student record not found.', 404);
    let attempt;
    if (attemptId) {
      attempt = await this.prisma.programmeAttempt.findUnique({
        where: { id: attemptId },
        include: {
          student: true,
          offering: { include: { programme: true } },
        },
      });
      if (!attempt) this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
      if (studentSession && attempt.student.personId !== account.personId)
        this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    } else {
      if (!studentSession)
        this.fail(
          'ATTEMPT_REQUIRED',
          'Name the programme attempt to review.',
          400,
        );
      const own = await this.prisma.student.findUnique({
        where: { personId: account.personId },
      });
      if (!own) this.fail('NOT_FOUND', 'Student record not found.', 404);
      attempt = await this.prisma.programmeAttempt.findFirst({
        where: { studentId: own.id },
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          offering: { include: { programme: true } },
        },
      });
      if (!attempt)
        this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    }
    const period = await this.prisma.academicPeriod.findUnique({
      where: { code: periodCode ?? (policy.currentPeriod as string) },
    });
    if (!period)
      this.fail('NOT_FOUND', 'Academic period not found.', 404);
    const student = attempt.student;
    const now = new Date();
    const conditions: ReadinessCondition[] = [];
    // 1. Record active.
    conditions.push({
      key: 'record-active',
      label: 'Student record active',
      status: student.status === 'ACTIVE' ? 'READY' : 'BLOCKED',
      owner: 'Registry',
      detail:
        student.status === 'ACTIVE'
          ? `Student number ${student.studentNumber}.`
          : `Record status is ${student.status}.`,
      next:
        student.status === 'ACTIVE'
          ? 'No action needed.'
          : 'Contact the registry office.',
    });
    // 2. Programme and intake correct.
    conditions.push({
      key: 'programme-intake',
      label: 'Programme and intake',
      status: 'READY',
      owner: 'Registry',
      detail: `${attempt.offering.programme.name} · ${attempt.offering.intake}.`,
      next: 'No action needed.',
    });
    // 3. Period open.
    const open =
      period.registrationOpen != null &&
      period.registrationClose != null &&
      period.registrationOpen <= now &&
      now <= period.registrationClose;
    conditions.push({
      key: 'period-open',
      label: 'Registration period open',
      status: open ? 'READY' : 'BLOCKED',
      owner: 'Registry',
      detail: open
        ? `Period ${period.code} is open.`
        : `Period ${period.code}: ${period.registrationOpen ? (period.registrationOpen as Date).toISOString() : 'unopened'} to ${period.registrationClose ? (period.registrationClose as Date).toISOString() : 'unclosed'}.`,
      next: open
        ? 'No action needed.'
        : 'Wait for the registration window or contact the registry.',
    });
    // 4. Progression: first-time path now; open regulation boundaries travel
    // along so academic decisions route correctly once results exist.
    conditions.push({
      key: 'progression',
      label: 'Progression available',
      status: 'READY',
      owner: 'Admissions',
      detail:
        'First registration — no prior outcomes. Open boundaries DEC-PROG-001 and DEC-PROG-002 route to an academic decision when prior outcomes exist; nothing is inferred from grades here.',
      next: 'No action needed.',
    });
    // 5. Finance clearance: explicit rows beat the demo default; the demo fee
    // is NOT_REQUIRED, which implies clearance (versioned demo policy).
    const clearance = await this.prisma.financeClearance.findUnique({
      where: { studentId_periodId: { studentId: student.id, periodId: period.id } },
    });
    if (clearance) {
      const expired =
        clearance.expiresAt != null && clearance.expiresAt <= now;
      if (clearance.status === 'CLEARED' && !expired) {
        conditions.push({
          key: 'clearance',
          label: 'Financial clearance',
          status: 'READY',
          owner: 'Finance',
          detail: `Cleared${clearance.expiresAt ? ` until ${(clearance.expiresAt as Date).toISOString()}` : ''}.`,
          next: 'No action needed.',
        });
      } else if (clearance.status === 'MANUAL_REVIEW') {
        conditions.push({
          key: 'clearance',
          label: 'Financial clearance',
          status: 'AWAITING_INSTITUTION',
          owner: 'Finance',
          detail: 'Clearance is under manual review.',
          next: 'Wait for the finance office; do not pay again blindly.',
        });
      } else {
        conditions.push({
          key: 'clearance',
          label: 'Financial clearance',
          status: 'BLOCKED',
          owner: 'Finance',
          detail:
            clearance.status === 'HELD'
              ? 'A finance hold applies to this period.'
              : 'Clearance has expired for this period.',
          next: 'Contact the finance office for the blocking reason and route.',
        });
      }
    } else if (
      (applications.fee as { status: string }).status === 'NOT_REQUIRED'
    ) {
      conditions.push({
        key: 'clearance',
        label: 'Financial clearance',
        status: 'READY',
        owner: 'Finance',
        detail: 'No fee applies in this demonstration; clearance implied.',
        next: 'No action needed.',
      });
    } else {
      conditions.push({
        key: 'clearance',
        label: 'Financial clearance',
        status: 'BLOCKED',
        owner: 'Finance',
        detail: 'Clearance has not been assessed for this period.',
        next: 'Contact the finance office.',
      });
    }
    // 6. Programme conditions from the released decision.
    const attemptApp = await this.prisma.application.findUnique({
      where: { id: attempt.applicationId },
    });
    const decision = attemptApp
      ? await this.prisma.applicationDecision.findUnique({
          where: { applicationId: attemptApp.id },
        })
      : null;
    const blocking = (
      Array.isArray(decision?.conditions)
        ? (decision?.conditions as Array<Record<string, unknown>>)
        : []
    ).filter((c) => c.blocksMatriculation === true);
    if (blocking.length === 0) {
      conditions.push({
        key: 'programme-conditions',
        label: 'Programme conditions',
        status: 'READY',
        owner: 'Admissions',
        detail: 'No outstanding programme conditions.',
        next: 'No action needed.',
      });
    } else {
      conditions.push({
        key: 'programme-conditions',
        label: 'Programme conditions',
        status: 'ACTION_REQUIRED',
        owner: 'Admissions',
        detail: blocking
          .map((c) => (typeof c.text === 'string' ? c.text : 'A condition'))
          .join('; '),
        next: 'Provide the listed evidence through a clarification or correction.',
      });
    }
    // 7. Holds: every active hold blocks with office and route.
    const holds = await this.prisma.hold.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
    });
    if (holds.length === 0) {
      conditions.push({
        key: 'holds-clear',
        label: 'No blocking holds',
        status: 'READY',
        owner: 'Registry',
        detail: 'No active holds on this record.',
        next: 'No action needed.',
      });
    } else {
      conditions.push({
        key: 'holds-clear',
        label: 'No blocking holds',
        status: 'BLOCKED',
        owner: holds[0].office,
        detail: `${holds.length} active hold(s). First: ${holds[0].reason} (${holds[0].office}).`,
        next: 'Follow the holding office route; registration cannot finalize meanwhile.',
      });
    }
    // 8-9. Selection and declarations arrive in later slices.
    conditions.push({
      key: 'selection-complete',
      label: 'Course selection complete',
      status: 'ACTION_REQUIRED',
      owner: 'Student',
      detail: 'Course selection opens in the next step.',
      next: 'Complete course selection when it opens.',
    });
    conditions.push({
      key: 'declarations',
      label: 'Registration declarations accepted',
      status: 'ACTION_REQUIRED',
      owner: 'Student',
      detail: 'Declarations are accepted at formal submission.',
      next: 'Review and accept declarations when submitting.',
    });
    const blocked = conditions.filter((c) => c.status === 'BLOCKED');
    const needsAction = conditions.filter(
      (c) => c.status === 'ACTION_REQUIRED',
    );
    const awaitingInstitution = conditions.filter(
      (c) => c.status === 'AWAITING_INSTITUTION',
    );
    const financial = blocked.some(
      (c) => c.key === 'holds-clear' || c.key === 'clearance',
    );
    const overall =
      blocked.length > 0
        ? financial
          ? 'AWAITING_FINANCIAL_CLEARANCE'
          : 'AWAITING_ACADEMIC_APPROVAL'
        : awaitingInstitution.length > 0
          ? 'AWAITING_FINANCIAL_CLEARANCE'
          : needsAction.length > 0
            ? 'AWAITING_STUDENT_INPUT'
            : 'READY';
    await this.audit(
      this.prisma,
      auth,
      'RegistrationReadinessAssessed',
      attempt.id,
      randomUUID(),
      'ALLOW',
      {
        overall,
        period: period.code,
      },
    );
    return {
      attemptId: attempt.id,
      period: period.code,
      overall,
      pendingRegulations: ['DEC-PROG-001', 'DEC-PROG-002', 'DEC-FIN-001'],
      conditions,
      assessedAt: new Date().toISOString(),
    };
  }

  private async command(
    actor: ActiveAuthority,
    key: string,
    action: string,
    payload: unknown,
    fn: (db: Tx) => Promise<{ status?: number; body: unknown }>,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    try {
      const result = await this.prisma.$transaction(
        async (db) => {
          await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
          const prior = await db.applicationCommand.findUnique({
            where: { key },
          });
          if (prior) {
            if (
              prior.accountId !== actor.accountId ||
              prior.action !== action ||
              prior.digest !== hash
            )
              this.fail(
                'IDEMPOTENCY_CONFLICT',
                'This request reference belongs to a different action. Review the current state.',
              );
            return { status: prior.status, body: prior.response };
          }
          const outcome = await fn(db);
          await db.applicationCommand.create({
            data: {
              key,
              accountId: actor.accountId,
              action,
              digest: hash,
              status: outcome.status ?? 200,
              response: json(outcome.body),
            },
          });
          return outcome;
        },
        { timeout: 20000 },
      );
      if ((result.status ?? 200) >= 400)
        throw new HttpException(result.body as object, result.status!);
      return result.body;
    } catch (error) {
      if (error instanceof HttpException) {
        const target =
          typeof payload === 'object' &&
          payload !== null &&
          'attemptId' in payload &&
          typeof (payload as { attemptId?: unknown }).attemptId === 'string'
            ? (payload as { attemptId: string }).attemptId
            : 'registration';
        await this.audit(this.prisma, actor, action, target, key, 'DENY', {
          status: error.getStatus(),
        }).catch(() => {});
        throw error;
      }
      this.fail(
        'SERVICE_UNAVAILABLE',
        'The registration service could not confirm this action. Check the current state before retrying the same request.',
        503,
      );
    }
  }

  private async resolveAttempt(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
    ownerOnly = false,
  ) {
    const studentSession = await this.liveAssignment(auth, 'STUDENT', 'study');
    const recordsSession =
      studentSession === null
        ? await this.liveAssignment(auth, 'RECORDS_OFFICER', 'convert-student')
        : null;
    if (!studentSession && !recordsSession) {
      throw new HttpException(
        { message: 'This registration workspace is unavailable.' },
        403,
      );
    }
    const account = await this.prisma.account.findUnique({
      where: { id: auth.accountId },
    });
    if (!account)
      this.fail('NOT_FOUND', 'Student record not found.', 404);
    // Change requests and waitlist joins are student self-service: staff
    // review and decide, but never file on a student's behalf.
    if (ownerOnly && !studentSession) {
      throw new HttpException(
        { message: 'Students file their own changes.' },
        403,
      );
    }
    let attempt;
    if (attemptId) {
      attempt = await this.prisma.programmeAttempt.findUnique({
        where: { id: attemptId },
        include: {
          student: true,
          offering: { include: { programme: true } },
        },
      });
      if (!attempt)
        this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
      if (
        studentSession &&
        attempt.student.personId !== account.personId
      )
        this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    } else {
      if (!studentSession)
        this.fail(
          'ATTEMPT_REQUIRED',
          'Name the programme attempt to review.',
          400,
        );
      const own = await this.prisma.student.findUnique({
        where: { personId: account.personId },
      });
      if (!own) this.fail('NOT_FOUND', 'Student record not found.', 404);
      attempt = await this.prisma.programmeAttempt.findFirst({
        where: { studentId: own.id },
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          offering: { include: { programme: true } },
        },
      });
      if (!attempt)
        this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    }
    const period = await this.prisma.academicPeriod.findUnique({
      where: { code: periodCode ?? (policy.currentPeriod as string) },
    });
    if (!period)
      this.fail('NOT_FOUND', 'Academic period not found.', 404);
    return { attempt, period };
  }

  private async planBoard(attemptId: string, periodId: string) {
    const attempt = await this.prisma.programmeAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { offering: true },
    });
    const period = await this.prisma.academicPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });
    const curriculum = await this.prisma.curriculumVersion.findFirst({
      where: {
        programmeId: attempt.offering.programmeId,
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
      include: {
        courses: {
          include: {
            course: {
              include: {
                prerequisites: { include: { requires: true } },
              },
            },
          },
        },
      },
    });
    const plan = await this.prisma.coursePlan.findUnique({
      where: { attemptId_periodId: { attemptId, periodId } },
      include: { items: { include: { course: true } } },
    });
    const selectedIds = new Set(
      (plan?.items ?? []).map((i) => i.courseId),
    );
    const weights = policy.courseTypeWeights as Record<string, number>;
    const items = (plan?.items ?? []).map((i) => ({
      courseId: i.course.id,
      code: i.course.code,
      title: i.course.title,
      credits: i.course.credits,
      courseType: i.course.courseType,
      semester: i.course.semester,
      required: false,
      capacity: i.course.capacity,
      seatsRemaining: null as number | null,
      prerequisites: [] as string[],
    }));
    const available = (curriculum?.courses ?? []).map((link) => ({
      courseId: link.course.id,
      code: link.course.code,
      title: link.course.title,
      credits: link.course.credits,
      courseType: link.course.courseType,
      semester: link.course.semester,
      required: link.required,
      capacity: link.course.capacity,
      seatsRemaining: null as number | null,
      prerequisites: link.course.prerequisites.map((p) => p.requires.code),
    }));
    const byId = new Map(available.map((c) => [c.courseId, c]));
    for (const item of items) {
      const full = byId.get(item.courseId);
      if (full) {
        item.required = full.required;
        item.prerequisites = full.prerequisites;
      }
    }
    const holdMessage = await this.holdBlock(attempt.studentId);
    const validation = this.validateItems(items, available);
    const loadHalves = items.reduce(
      (sum, i) => sum + (weights[i.courseType] ?? 1),
      0,
    );
    const bands = policy.loadBands as { minHalves: number; maxHalves: number };
    const notices: string[] = [];
    if (holdMessage !== null) notices.push(holdMessage);
    if (loadHalves > 0 && loadHalves < bands.minHalves)
      notices.push(
        `Planned load is ${loadHalves} half-course equivalents, below the full-time minimum of ${bands.minHalves}.`,
      );
    if (loadHalves > bands.maxHalves)
      notices.push(
        `Planned load is ${loadHalves} half-course equivalents, above the maximum of ${bands.maxHalves}. Remove courses before submitting.`,
      );
    for (const required of available.filter(
      (c) => c.required && !selectedIds.has(c.courseId),
    )) {
      validation.push({
        courseId: required.courseId,
        code: required.code,
        result: 'WARNING',
        resultCode: 'REQUIRED_MISSING',
        explanation:
          'A required course is not in the plan. Add it or seek academic advice.',
      });
    }
    return {
      planId: plan?.id ?? null,
      attemptId,
      period: period.code,
      version: plan?.version ?? 0,
      status: plan?.status ?? 'NONE',
      items,
      available: available.filter((c) => !selectedIds.has(c.courseId)),
      validation,
      loadHalves,
      notices,
    };
  }

  async getPlan(auth: RegistrationAuthority, attemptId?: string, periodCode?: string) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      attemptId,
      periodCode,
    );
    const board = await this.planBoard(attempt.id, period.id);
    await this.audit(
      this.prisma,
      auth,
      'CoursePlanViewed',
      attempt.id,
      randomUUID(),
      'ALLOW',
      {
        period: period.code,
      },
    );
    return board;
  }

  async savePlan(
    auth: RegistrationAuthority,
    key: string,
    input: { attemptId?: string; period?: string; version: number; courseCodes: string[] },
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      input.attemptId,
      input.period,
      true,
    );
    const codes = [...new Set(input.courseCodes.map((c) => c.trim()))].filter(
      (c) => c.length > 0,
    );
    const result = await this.command(
      auth,
      key,
      'SaveCoursePlan',
      { attemptId: attempt.id, period: period.code, version: input.version, courseCodes: codes },
      async (db) => {
        const curriculum = await db.curriculumVersion.findFirst({
          where: {
            programmeId: attempt.offering.programmeId,
            status: 'PUBLISHED',
          },
          orderBy: { version: 'desc' },
          include: { courses: { select: { courseId: true } } },
        });
        const inCurriculum = new Set(
          (curriculum?.courses ?? []).map((c) => c.courseId),
        );
        const rows = await db.course.findMany({
          where: { code: { in: codes } },
        });
        const byCode = new Map(rows.map((r) => [r.code, r]));
        for (const code of codes) {
          const row = byCode.get(code);
          if (!row || !inCurriculum.has(row.id)) {
            this.fail(
              'UNKNOWN_COURSE',
              `Course ${code} is not in the published curriculum for this programme.`,
              400,
            );
          }
        }
        const existing = await db.coursePlan.findUnique({
          where: {
            attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
          },
        });
        if (existing?.status === 'SUBMITTED') {
          this.fail(
            'PLAN_SUBMITTED',
            'This plan is submitted; further changes go through the course-change flow.',
            409,
          );
        }
        if (existing && existing.version !== input.version) {
          this.fail(
            'VERSION_CONFLICT',
            'This plan changed since it was reviewed. Reload and save again with the current version.',
            409,
            { currentVersion: existing.version },
          );
        }
        let planId: string;
        if (existing) {
          await db.coursePlanItem.deleteMany({
            where: { planId: existing.id },
          });
          const updated = await db.coursePlan.update({
            where: { id: existing.id },
            data: { version: { increment: 1 } },
          });
          planId = updated.id;
        } else {
          const created = await db.coursePlan.create({
            data: {
              attemptId: attempt.id,
              periodId: period.id,
              status: 'DRAFT',
              version: 1,
            },
          });
          planId = created.id;
        }
        for (const code of codes) {
          await db.coursePlanItem.create({
            data: {
              planId,
              courseId: (byCode.get(code) as { id: string }).id,
              status: 'PLANNED',
            },
          });
        }
        await this.audit(db, auth, 'CoursePlanSaved', attempt.id, key, 'ALLOW', {
          period: period.code,
          courses: codes.length,
        });
        return { body: { planId } };
      },
    );
    const saved = result as { planId: string };
    void saved;
    return this.planBoard(attempt.id, period.id);
  }

  private async holdBlock(studentId: string): Promise<string | null> {
    const hold = await this.prisma.hold.findFirst({
      where: { studentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    return hold
      ? `A hold applies (${hold.holdType}): ${hold.reason} See ${hold.office}.`
      : null;
  }

  private validateItems(
    items: Array<{
      courseId: string;
      code: string;
      courseType: string;
      prerequisites: string[];
    }>,
    available: Array<{
      courseId: string;
      code: string;
      required: boolean;
      capacity: number;
      prerequisites: string[];
    }>,
  ) {
    const out: Array<{
      courseId: string;
      code: string;
      result: 'PASS' | 'WARNING' | 'BLOCK' | 'APPROVAL_REQUIRED';
      resultCode: string;
      explanation: string;
    }> = [];
    const availableById = new Map(available.map((c) => [c.courseId, c]));
    for (const item of items) {
      const full = availableById.get(item.courseId);
      if (!full) {
      out.push({
        courseId: item.courseId,
        code: item.code,
        result: 'BLOCK',
        resultCode: 'NOT_IN_CURRICULUM',
          explanation:
            'This course is not in the published curriculum for this programme.',
        });
        continue;
      }
      if (full.capacity <= 0) {
      out.push({
        courseId: item.courseId,
        code: item.code,
        result: 'BLOCK',
        resultCode: 'CAPACITY_FULL',
          explanation:
            'This course is full. Choose an alternative or contact the registry.',
        });
        continue;
      }
      // No completed results exist yet (Phase 7 owns results), so any listed
      // prerequisite counts as unmet. The rule and the reason stay explicit
      // instead of guessing from grades.
      if (item.prerequisites.length > 0) {
      out.push({
        courseId: item.courseId,
        code: item.code,
        result: 'BLOCK',
        resultCode: 'PREREQ_UNMET',
          explanation: `Requires ${item.prerequisites.join(', ')} (no completed result on record).`,
        });
        continue;
      }
      out.push({
        courseId: item.courseId,
        code: item.code,
        result: 'PASS',
        resultCode: 'ELIGIBLE',
        explanation: 'Eligible under the published curriculum.',
      });
    }
    return out;
  }

  private receiptView(
    registration: {
      id: string;
      attemptId: string;
      version: number;
      status: string;
      receipt: string;
      createdAt: Date;
      snapshot: unknown;
    },
    periodCode: string,
  ) {
    const snapshot = registration.snapshot as {
      courses?: Array<{
        code: string;
        title: string;
        credits: number;
        courseType: string;
        semester: string | null;
      }>;
      loadHalves?: number;
      clearance?: string;
      submittedAt?: string;
    };
    return {
      id: registration.id,
      receipt: registration.receipt,
      attemptId: registration.attemptId,
      period: periodCode,
      version: registration.version,
      status: registration.status,
      courses: snapshot.courses ?? [],
      loadHalves: snapshot.loadHalves ?? 0,
      clearance: snapshot.clearance ?? 'UNKNOWN',
      decidedAt: snapshot.submittedAt ?? registration.createdAt.toISOString(),
    };
  }

  async submitRegistration(
    auth: RegistrationAuthority,
    key: string,
    input: {
      attemptId?: string;
      period?: string;
      version: number;
      declarations: string[];
    },
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      input.attemptId,
      input.period,
      true,
    );
    // Validate the draft outside the transaction (rules are static); the
    // transaction re-checks version, holds, clearance, capacity and window.
    const preview = await this.planBoard(attempt.id, period.id);
    const result = await this.command(
      auth,
      key,
      'SubmitStudentRegistration',
      {
        attemptId: attempt.id,
        period: period.code,
        version: input.version,
        declarations: input.declarations,
      },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "ProgrammeAttempt" WHERE id = ${attempt.id} FOR UPDATE`;
        const live = await db.programmeAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          include: { student: true },
        });
        if (live.student.status !== 'ACTIVE' || live.status === 'WITHDRAWN') {
          this.fail(
            'RECORD_NOT_ACTIVE',
            'This student record cannot register in its current state.',
            409,
          );
        }
        const now = new Date();
        if (
          period.registrationOpen == null ||
          period.registrationClose == null ||
          period.registrationOpen > now ||
          now > period.registrationClose
        ) {
          this.fail(
            'PERIOD_CLOSED',
            `Registration for ${period.code} is not open.`,
            409,
          );
        }
        const existing = await db.institutionalRegistration.findUnique({
          where: {
            attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
          },
        });
        // Resource-idempotent: a submitted registration returns as stored.
        if (existing) {
          return {
            body: this.receiptView(existing, period.code),
          };
        }
        const plan = await db.coursePlan.findUnique({
          where: {
            attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
          },
          include: { items: { include: { course: true } } },
        });
        if (!plan || plan.status !== 'DRAFT') {
          this.fail(
            'PLAN_NOT_READY',
            'Save a draft course plan before submitting.',
            409,
          );
        }
        if (plan.version !== input.version) {
          this.fail(
            'VERSION_CONFLICT',
            'This plan changed since it was reviewed. Reload and submit again with the current version.',
            409,
            { currentVersion: plan.version },
          );
        }
        const blocked = preview.validation.filter((v) => v.result === 'BLOCK');
        if (blocked.length > 0) {
          this.fail(
            'VALIDATION_FAILED',
            `Course validation blocks submission: ${blocked[0].code} — ${blocked[0].explanation}`,
            409,
          );
        }
        // Required-but-missing courses stay WARNINGs, not blockers:
        // registration is per period, and later-semester required courses
        // register in their own period.
        const bands = policy.loadBands as { minHalves: number; maxHalves: number };
        if (
          preview.loadHalves < bands.minHalves ||
          preview.loadHalves > bands.maxHalves
        ) {
          this.fail(
            'LOAD_INVALID',
            `Planned load is ${preview.loadHalves} half-course equivalents; the band is ${bands.minHalves} to ${bands.maxHalves}.`,
            409,
          );
        }
        const holds = await db.hold.findMany({
          where: { studentId: live.studentId, status: 'ACTIVE' },
        });
        if (holds.length > 0) {
          this.fail(
            'HOLDS_BLOCKING',
            `Registration cannot finalize while a hold applies (${holds[0].office}). Selections are saved.`,
            409,
          );
        }
        const clearance = await this.clearanceState(
          db,
          live.studentId,
          period.id,
        );
        if (clearance !== 'CLEARED') {
          this.fail(
            'CLEARANCE_INCOMPLETE',
            'Registration cannot finalize because financial clearance is still under review. Selections are saved.',
            409,
          );
        }
        const required = (
          policy.registration as unknown as {
            version: string;
            declarations: Array<{ key: string }>;
          }
        ).declarations.map((d) => d.key);
        const accepted = new Set(input.declarations);
        if (!required.every((k) => accepted.has(k))) {
          this.fail(
            'DECLARATIONS_INCOMPLETE',
            'Accept every registration declaration before submitting.',
            400,
          );
        }
        // Serialize seat allocation per course.
        const courseIds = plan.items.map((i) => i.courseId);
        if (courseIds.length > 0) {
          await db.$queryRaw`SELECT id FROM "Course" WHERE id IN (${Prisma.join(courseIds)}) FOR UPDATE`;
        }
        for (const item of plan.items) {
          const enrolled = await db.courseRegistration.count({
            where: { courseId: item.courseId, status: 'ENROLLED' },
          });
          if (enrolled + 1 > item.course.capacity) {
            this.fail(
              'CAPACITY_EXCEEDED',
              `${item.course.code} filled before this submission completed. Adjust the plan and retry.`,
              409,
            );
          }
        }
        const seq = await db.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('"RegistrationNumberSeq"') AS n`;
        const receipt = `REG-${new Date().getUTCFullYear()}-${String(Number(seq[0].n)).padStart(4, '0')}`;
        const submittedAt = new Date().toISOString();
        const snapshot = {
          registrationNumber: receipt,
          attemptId: attempt.id,
          studentNumber: live.student.studentNumber,
          period: period.code,
          courses: plan.items.map((i) => ({
            code: i.course.code,
            title: i.course.title,
            credits: i.course.credits,
            courseType: i.course.courseType,
            semester: i.course.semester,
          })),
          loadHalves: preview.loadHalves,
          clearance: 'CLEARED',
          conditions: [],
          declarations: required.map((k) => ({
            id: k,
            version: (policy.registration as unknown as { version: string }).version,
          })),
          policyVersion: policy.version,
          curriculumVersion: attempt.curriculumVersionId,
          submittedAt,
        };
        const registration = await db.institutionalRegistration.create({
          data: {
            attemptId: attempt.id,
            periodId: period.id,
            version: 1,
            status: 'REGISTERED',
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            receipt,
            declarations: required as unknown as Prisma.InputJsonValue,
          },
        });
        for (const item of plan.items) {
          await db.courseRegistration.create({
            data: {
              registrationId: registration.id,
              courseId: item.courseId,
              status: 'ENROLLED',
            },
          });
        }
        await db.coursePlan.update({
          where: { id: plan.id },
          data: { status: 'SUBMITTED' },
        });
        if (live.status === 'ADMITTED') {
          await db.programmeAttempt.update({
            where: { id: attempt.id },
            data: { status: 'ACTIVE' },
          });
        }
        await db.outboxEvent.create({
          data: {
            aggregate: 'InstitutionalRegistration',
            aggregateId: registration.id,
            type: 'MoodleEnrolmentQueued',
            payload: json({
              registrationId: registration.id,
              attemptId: attempt.id,
              period: period.code,
              courses: plan.items.map((i) => i.course.code),
            }),
          },
        });
        await this.audit(
          db,
          auth,
          'StudentRegistrationSubmitted',
          registration.id,
          key,
          'ALLOW',
          { receipt, courses: plan.items.length, loadHalves: preview.loadHalves },
        );
        return { body: this.receiptView(registration, period.code) };
      },
    );
    return result;
  }

  private async clearanceState(
    db: Tx,
    studentId: string,
    periodId: string,
  ): Promise<string> {
    const clearance = await db.financeClearance.findUnique({
      where: { studentId_periodId: { studentId, periodId } },
    });
    if (clearance) {
      const now = new Date();
      if (clearance.status === 'CLEARED') {
        if (clearance.expiresAt != null && clearance.expiresAt <= now)
          return 'EXPIRED';
        return 'CLEARED';
      }
      return clearance.status;
    }
    if (
      (applications.fee as { status: string }).status === 'NOT_REQUIRED'
    )
      return 'CLEARED';
    return 'NOT_ASSESSED';
  }

  async registrationStatus(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      attemptId,
      periodCode,
    );
    const registration =
      await this.prisma.institutionalRegistration.findUnique({
        where: {
          attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
        },
      });
    if (!registration) {
      return {
        registration: null,
        moodle: {
          state: 'NotAvailable',
          detail: 'No registration submitted for this period yet.',
        },
      };
    }
    const outbox = await this.prisma.outboxEvent.findFirst({
      where: {
        aggregateId: registration.id,
        type: 'MoodleEnrolmentQueued',
      },
      orderBy: { occurredAt: 'desc' },
    });
    const synced = outbox?.deliveredAt != null;
    const amendments = await this.prisma.registrationAmendment.findMany({
      where: { registrationId: registration.id },
      orderBy: { version: 'asc' },
      include: { course: true },
    });
    return {
      registration: this.receiptView(registration, period.code),
      amendments: amendments.map((r) => this.amendmentView(r)),
      moodle: synced
        ? {
            state: 'Synced',
            detail: 'Enrolment handoff confirmed by the worker.',
          }
        : {
            state: 'Queued',
            detail:
              'Enrolment is queued for handoff. Registration stays valid meanwhile.',
          },
    };
  }

  async timetable(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      attemptId,
      periodCode,
    );
    // Derived from the authoritative registration: courses grouped by
    // semester. No slot times exist in this phase, so none are invented —
    // the view says when times arrive instead of showing false precision.
    const registration =
      await this.prisma.institutionalRegistration.findUnique({
        where: {
          attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
        },
        include: {
          roster: {
            where: { status: 'ENROLLED' },
            include: { course: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    if (!registration) {
      this.fail(
        'TIMETABLE_NOT_AVAILABLE',
        'The timetable appears after registration completes.',
        404,
      );
    }
    const groups = new Map<string, Array<{ code: string; title: string }>>();
    for (const row of registration.roster) {
      const semester = row.course.semester ?? 'Unscheduled';
      const list = groups.get(semester) ?? [];
      list.push({ code: row.course.code, title: row.course.title });
      groups.set(semester, list);
    }
    return {
      attemptId: attempt.id,
      period: period.code,
      groups: [...groups.entries()].map(([semester, courses]) => ({
        semester,
        courses,
      })),
      note: 'Session times arrive with the teaching timetable; courses below are the registered set.',
    };
  }

  private async recordsGate(auth: RegistrationAuthority): Promise<void> {
    const assignment = await this.liveAssignment(
      auth,
      'RECORDS_OFFICER',
      'convert-student',
    );
    if (!assignment || auth.activeRole !== 'RECORDS_OFFICER') {
      throw new HttpException(
        { message: 'This records workspace is unavailable.' },
        403,
      );
    }
  }

  private amendmentView(row: {
    id: string;
    version: number;
    kind: string;
    courseId: string;
    reason: string;
    evidenceNote: string | null;
    status: string;
    createdAt: Date;
    course: { code: string; title: string };
  }) {
    return {
      id: row.id,
      version: row.version,
      kind: row.kind,
      courseCode: row.course.code,
      courseTitle: row.course.title,
      reason: row.reason,
      evidenceNote: row.evidenceNote,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async requestChange(
    auth: RegistrationAuthority,
    key: string,
    input: {
      attemptId?: string;
      period?: string;
      kind: string;
      courseCode: string;
      reason: string;
      evidenceNote?: string;
    },
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      input.attemptId,
      input.period,
      true,
    );
    if (input.kind !== 'ADD' && input.kind !== 'DROP') {
      this.fail('UNKNOWN_KIND', 'Course changes are additions or drops.', 400);
    }
    if (!input.reason.trim()) {
      this.fail('EMPTY_REASON', 'Explain why this change is needed.', 400);
    }
    const result = await this.command(
      auth,
      key,
      input.kind === 'ADD' ? 'RequestCourseAddition' : 'RequestCourseDrop',
      { attemptId: attempt.id, period: period.code, ...input },
      async (db) => {
        const registration =
          await db.institutionalRegistration.findUnique({
            where: {
              attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
            },
          });
        if (!registration) {
          this.fail(
            'NO_REGISTRATION',
            'There is no submitted registration to change for this period.',
            409,
          );
        }
        const course = await db.course.findUnique({
          where: { code: input.courseCode.trim() },
          include: {
            curriculumLinks: {
              where: {
                curriculum: {
                  programmeId: attempt.offering.programmeId,
                  status: 'PUBLISHED',
                },
              },
            },
          },
        });
        if (!course || course.curriculumLinks.length === 0) {
          this.fail(
            'UNKNOWN_COURSE',
            `Course ${input.courseCode.trim()} is not in the published curriculum for this programme.`,
            400,
          );
        }
        if (input.kind === 'DROP') {
          const enrolled = await db.courseRegistration.findFirst({
            where: {
              registrationId: registration.id,
              courseId: course.id,
              status: 'ENROLLED',
            },
          });
          if (!enrolled) {
            this.fail(
              'NOT_ENROLLED',
              'Only enrolled courses can be dropped.',
              409,
            );
          }
          const link = course.curriculumLinks[0];
          if (link.required) {
            this.fail(
              'NON_DROPPABLE',
              'Required courses cannot be dropped here. Request academic advice through a support ticket.',
              409,
            );
          }
        }
        const open = await db.registrationAmendment.findFirst({
          where: {
            registrationId: registration.id,
            courseId: course.id,
            kind: input.kind,
            status: { in: ['PENDING', 'LATE'] },
          },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open change request already covers this course.',
            409,
            { amendmentId: open.id },
          );
        }
        const now = new Date();
        const windowOpen =
          period.addDropClose == null || period.addDropClose > now;
        const maxVersion = await db.registrationAmendment.aggregate({
          where: { registrationId: registration.id },
          _max: { version: true },
        });
        const created = await db.registrationAmendment.create({
          data: {
            registrationId: registration.id,
            version: (maxVersion._max.version ?? 0) + 1,
            kind: input.kind,
            courseId: course.id,
            reason: input.reason.trim(),
            evidenceNote:
              input.evidenceNote?.trim() !== undefined &&
              input.evidenceNote?.trim() !== ''
                ? input.evidenceNote.trim()
                : null,
            status: windowOpen ? 'PENDING' : 'LATE',
          },
        });
        await this.audit(
          db,
          auth,
          windowOpen
            ? input.kind === 'ADD'
              ? 'RequestCourseAddition'
              : 'RequestCourseDrop'
            : 'RequestLateRegistrationChange',
          registration.id,
          key,
          'ALLOW',
          { amendmentId: created.id, kind: input.kind },
        );
        return {
          body: {
            id: created.id,
            version: created.version,
            status: created.status,
          },
        };
      },
    );
    return result as { id: string; version: number; status: string };
  }

  async listAmendments(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      attemptId,
      periodCode,
    );
    const registration =
      await this.prisma.institutionalRegistration.findUnique({
        where: {
          attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
        },
      });
    if (!registration) return { items: [] };
    const rows = await this.prisma.registrationAmendment.findMany({
      where: { registrationId: registration.id },
      orderBy: { version: 'asc' },
      include: { course: true },
    });
    return { items: rows.map((r) => this.amendmentView(r)) };
  }

  async decideAmendment(
    auth: RegistrationAuthority,
    amendmentId: string,
    key: string,
    approve: boolean,
    note?: string,
  ): Promise<{ id: string; status: string }> {
    await this.recordsGate(auth);
    const result = await this.command(
      auth,
      key,
      approve ? 'ApproveRegistrationAmendment' : 'DeclineRegistrationAmendment',
      { amendmentId, approve, note },
      async (db) => {
        await this.recordsGate(auth);
        const amendment = await db.registrationAmendment.findFirst({
          where: { id: amendmentId },
          include: { registration: true, course: true },
        });
        if (!amendment)
          this.fail('NOT_FOUND', 'Change request not found.', 404);
        if (amendment.status !== 'PENDING' && amendment.status !== 'LATE') {
          this.fail(
            'REQUEST_CLOSED',
            'This change request is already decided.',
            409,
          );
        }
        if (approve) {
          if (amendment.kind === 'ADD') {
            await db.$queryRaw`SELECT id FROM "Course" WHERE id = ${amendment.courseId} FOR UPDATE`;
            const existingRoster = await db.courseRegistration.findMany({
              where: { registrationId: amendment.registrationId, status: 'ENROLLED' },
              include: { course: true },
            });
            if (existingRoster.some((row) => row.courseId === amendment.courseId)) {
              this.fail('ALREADY_ENROLLED', 'This course is already registered.', 409);
            }
            const prerequisites = await db.coursePrerequisite.findMany({
              where: { courseId: amendment.courseId },
              include: { requires: true },
            });
            // The MVP has no released prior-result source yet. Never infer
            // completed prerequisites from an enrolled course or Moodle.
            if (prerequisites.length > 0) {
              this.fail('PREREQ_UNMET', `A verified prior result is required for ${prerequisites.map((row) => row.requires.code).join(', ')}.`, 409);
            }
            const weights = policy.courseTypeWeights as Record<string, number>;
            const load = existingRoster.reduce((sum, row) => sum + (weights[row.course.courseType] ?? 1), 0)
              + (weights[amendment.course.courseType] ?? 1);
            const band = policy.loadBands as { maxHalves: number };
            if (load > band.maxHalves) {
              this.fail('LOAD_INVALID', `Adding this course would exceed the ${band.maxHalves} half-course limit.`, 409);
            }
            const groups = policy.demoCollisionGroups as Record<string, string>;
            const requestedGroup = groups[amendment.course.code];
            if (process.env.DEMO_MODE !== 'true' || !requestedGroup || existingRoster.some((row) => !groups[row.course.code])) {
              this.fail('TIMETABLE_UNVERIFIED', 'A timetable compatibility check is unavailable. Registry cannot complete this addition yet.', 409);
            }
            if (existingRoster.some((row) => groups[row.course.code] === requestedGroup)) {
              this.fail('TIMETABLE_CONFLICT', 'This course overlaps an enrolled course in the demo timetable.', 409);
            }
            const enrolled = await db.courseRegistration.count({
              where: {
                courseId: amendment.courseId,
                status: 'ENROLLED',
              },
            });
            const capacity = (
              await db.course.findUniqueOrThrow({
                where: { id: amendment.courseId },
              })
            ).capacity;
            if (enrolled + 1 > capacity) {
              this.fail(
                'CAPACITY_EXCEEDED',
                `${amendment.course.code} filled before this change completed.`,
                409,
              );
            }
            await db.courseRegistration.upsert({
              where: {
                registrationId_courseId: {
                  registrationId: amendment.registrationId,
                  courseId: amendment.courseId,
                },
              },
              update: { status: 'ENROLLED' },
              create: {
                registrationId: amendment.registrationId,
                courseId: amendment.courseId,
                status: 'ENROLLED',
              },
            });
          } else {
            const roster = await db.courseRegistration.findFirst({
              where: {
                registrationId: amendment.registrationId,
                courseId: amendment.courseId,
                status: 'ENROLLED',
              },
            });
            if (!roster) {
              this.fail(
                'NOT_ENROLLED',
                'This course is no longer enrolled.',
                409,
              );
            }
            await db.courseRegistration.update({
              where: { id: roster.id },
              data: { status: 'DROPPED' },
            });
          }
          const financeStatus = await this.finance.reassessRegistrationAmendment(db, amendment.registrationId, amendment.id);
          const nextVersion =
            (
              await db.registrationAmendment.aggregate({
                where: { registrationId: amendment.registrationId },
                _max: { version: true },
              })
            )._max.version ?? amendment.version;
          await db.institutionalRegistration.update({
            where: { id: amendment.registrationId },
            data: { version: { increment: 1 } },
          });
          await db.outboxEvent.create({
            data: {
              aggregate: 'InstitutionalRegistration',
              aggregateId: amendment.registrationId,
              type:
                amendment.kind === 'ADD'
                  ? 'MoodleCourseAdded'
                  : 'MoodleCourseRemoved',
              payload: json({
                registrationId: amendment.registrationId,
                courseCode: amendment.course.code,
                amendmentVersion: nextVersion,
                financeStatus,
              }),
            },
          });
        }
        const decided = await db.registrationAmendment.update({
          where: { id: amendment.id },
          data: {
            status: approve ? 'APPROVED' : 'REJECTED',
            decidedByAccountId: auth.accountId,
            decidedAt: new Date(),
          },
        });
        await this.audit(
          db,
          auth,
          approve
            ? 'RegistrationAmendmentApproved'
            : 'RegistrationAmendmentDeclined',
          amendment.registrationId,
          key,
          'ALLOW',
          {
            amendmentId: amendment.id,
            kind: amendment.kind,
            chargeNote:
              'Charge effects recalculate in Finance; no postings happen here.',
            note: note?.trim() ?? null,
          },
        );
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result as { id: string; status: string };
  }

  async joinWaitlist(
    auth: RegistrationAuthority,
    key: string,
    input: { attemptId?: string; period?: string; courseCode: string },
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      input.attemptId,
      input.period,
      true,
    );
    const result = await this.command(
      auth,
      key,
      'JoinCourseWaitlist',
      { attemptId: attempt.id, period: period.code, ...input },
      async (db) => {
        const course = await db.course.findUnique({
          where: { code: input.courseCode.trim() },
        });
        if (!course)
          this.fail(
            'UNKNOWN_COURSE',
            `Course ${input.courseCode.trim()} does not exist.`,
            400,
          );
        const open = await db.waitlistEntry.findFirst({
          where: {
            attemptId: attempt.id,
            periodId: period.id,
            courseId: course.id,
            status: { in: ['WAITING', 'OFFERED'] },
          },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open waitlist entry already covers this course.',
            409,
            { entryId: open.id },
          );
        }
        const position =
          (await db.waitlistEntry.count({
            where: {
              courseId: course.id,
              periodId: period.id,
              status: { in: ['WAITING', 'OFFERED'] },
            },
          })) + 1;
        const created = await db.waitlistEntry.create({
          data: {
            attemptId: attempt.id,
            periodId: period.id,
            courseId: course.id,
            position,
            status: 'WAITING',
            expiresAt: period.addDropClose,
          },
        });
        await this.audit(db, auth, 'CourseWaitlistJoined', attempt.id, key, 'ALLOW', {
          entryId: created.id,
          courseCode: course.code,
          position,
        });
        return {
          body: { id: created.id, position: created.position, status: created.status },
        };
      },
    );
    return result as { id: string; position: number; status: string };
  }

  async listWaitlist(
    auth: RegistrationAuthority,
    attemptId?: string,
    periodCode?: string,
  ) {
    const { attempt, period } = await this.resolveAttempt(
      auth,
      attemptId,
      periodCode,
    );
    const rows = await this.prisma.waitlistEntry.findMany({
      where: { attemptId: attempt.id, periodId: period.id },
      orderBy: { createdAt: 'asc' },
      include: { course: true },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        courseCode: r.course.code,
        courseTitle: r.course.title,
        position: r.position,
        status: r.status,
        expiresAt: r.expiresAt ? (r.expiresAt as Date).toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async acceptWaitlist(
    auth: RegistrationAuthority,
    entryId: string,
    key: string,
    approve: boolean,
    note?: string,
  ): Promise<{ id: string; status: string }> {
    await this.recordsGate(auth);
    const result = await this.command(
      auth,
      key,
      approve ? 'AcceptWaitlistCoursePlace' : 'CancelWaitlistEntry',
      { entryId, approve, note },
      async (db) => {
        await this.recordsGate(auth);
        const entry = await db.waitlistEntry.findFirst({
          where: { id: entryId },
          include: { course: true },
        });
        if (!entry) this.fail('NOT_FOUND', 'Waitlist entry not found.', 404);
        if (entry.status !== 'WAITING' && entry.status !== 'OFFERED') {
          this.fail(
            'REQUEST_CLOSED',
            'This waitlist entry is already resolved.',
            409,
          );
        }
        if (!approve) {
          const cancelled = await db.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'CANCELLED' },
          });
          await this.audit(
            db,
            auth,
            'WaitlistEntryCancelled',
            entry.attemptId,
            key,
            'ALLOW',
            { entryId: entry.id },
          );
          return { body: { id: cancelled.id, status: cancelled.status } };
        }
        if (entry.expiresAt != null && entry.expiresAt <= new Date()) {
          // Committed outside the command transaction: the transaction
          // rolls back on refusal, but the expiry fact must persist.
          await this.prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'EXPIRED' },
          });
          this.fail(
            'ENTRY_EXPIRED',
            'This waitlist place expired under policy.',
            409,
          );
        }
        await db.$queryRaw`SELECT id FROM "Course" WHERE id = ${entry.courseId} FOR UPDATE`;
        const enrolled = await db.courseRegistration.count({
          where: { courseId: entry.courseId, status: 'ENROLLED' },
        });
        if (enrolled + 1 > entry.course.capacity) {
          this.fail(
            'CAPACITY_EXCEEDED',
            `${entry.course.code} is full; the place cannot be taken now.`,
            409,
          );
        }
        const registration =
          await db.institutionalRegistration.findFirst({
            where: { attemptId: entry.attemptId, periodId: entry.periodId },
          });
        if (!registration) {
          this.fail(
            'NO_REGISTRATION',
            'There is no submitted registration to attach this place to.',
            409,
          );
        }
        await db.courseRegistration.upsert({
          where: {
            registrationId_courseId: {
              registrationId: registration.id,
              courseId: entry.courseId,
            },
          },
          update: { status: 'ENROLLED' },
          create: {
            registrationId: registration.id,
            courseId: entry.courseId,
            status: 'ENROLLED',
          },
        });
        await db.institutionalRegistration.update({
          where: { id: registration.id },
          data: { version: { increment: 1 } },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'InstitutionalRegistration',
            aggregateId: registration.id,
            type: 'MoodleCourseAdded',
            payload: json({
              registrationId: registration.id,
              courseCode: entry.course.code,
            }),
          },
        });
        const accepted = await db.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: 'ACCEPTED' },
        });
        await this.audit(
          db,
          auth,
          'WaitlistPlaceAccepted',
          registration.id,
          key,
          'ALLOW',
          {
            entryId: entry.id,
            courseCode: entry.course.code,
            note: note?.trim() ?? null,
          },
        );
        return { body: { id: accepted.id, status: accepted.status } };
      },
    );
    return result as { id: string; status: string };
  }
}
