import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ASSESSMENT_DEMO_V1 as policy, MOODLE_DEMO_V1 as moodle } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { BOARD_DECISIONS, PACKAGE_DECLARATION, AMENDMENT_DECLARATION } from './dto.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface AssessmentAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 7 slices 1–2: assessment scheme + grade-activity mapping plan +
// Moodle grade staging snapshot (TASK-PH7-001/002, GAP-022 interim). Staged
// batches freeze DS5 §4 provenance (source + SIS coordinates in force at
// stage time); an unreachable source refuses fail-closed (503) and preserves
// the last confirmed batch instead of writing through an outage.
// Versioned plans per offering+period
// (DRAFT→APPROVED; approval supersedes, never edits; one APPROVED per
// offering+period). Mappings bind one Moodle activity to one approved
// component (DRAFT→TESTED→ACTIVE under four-eyes; synthetic validation
// writes nothing on failure). Lecturer capture stays inside the offering
// scope; approval is coordinator-only; Moodle admins wire, never approve;
// sysadmins never write.
@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

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
          'Review the assessment workspace state, or contact the programme office.',
        ...extra,
      },
      status,
    );
  }

  private denied(): never {
    throw new HttpException(
      { message: 'This assessment workspace is unavailable.' },
      403,
    );
  }

  private async liveAssignment(
    auth: AssessmentAuthority,
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

  private async lecturer(auth: AssessmentAuthority, offeringRef: string) {
    const assignment = await this.liveAssignment(auth, 'LEC', 'stage-marks');
    if (
      !assignment ||
      auth.activeRole !== 'LEC' ||
      assignment.scopeType !== 'OFFERING' ||
      assignment.scopeRef !== offeringRef
    ) {
      this.denied();
    }
  }

  private async coordinator(auth: AssessmentAuthority) {
    const assignment = await this.liveAssignment(
      auth,
      'COORDINATOR',
      'approve-assessment',
    );
    // School-scoped governance: coordinators approve inside their school.
    if (
      !assignment ||
      auth.activeRole !== 'COORDINATOR' ||
      assignment.scopeType !== 'SCHOOL'
    ) {
      this.denied();
    }
  }

  private async mappingTechnician(auth: AssessmentAuthority) {
    const assignment = await this.liveAssignment(
      auth,
      'MOODLE_ADMIN',
      'manage-mapping',
    );
    if (!assignment || auth.activeRole !== 'MOODLE_ADMIN') {
      this.denied();
    }
  }

  private async mappingWriter(auth: AssessmentAuthority, offeringRef: string) {
    if (auth.activeRole === 'LEC') {
      await this.lecturer(auth, offeringRef);
      return;
    }
    if (auth.activeRole === 'MOODLE_ADMIN') {
      await this.mappingTechnician(auth);
      return;
    }
    this.denied();
  }

  private async reader(auth: AssessmentAuthority) {
    const candidates: Array<[string, string]> = [
      ['LEC', 'stage-marks'],
      ['COORDINATOR', 'approve-assessment'],
      ['MOODLE_ADMIN', 'manage-mapping'],
      ['EXAMINATIONS_OFFICER', 'validate-results'],
      ['MODERATOR', 'moderate-results'],
    ];
    for (const [role, capability] of candidates) {
      const assignment = await this.liveAssignment(auth, role, capability);
      if (assignment && auth.activeRole === role) return;
    }
    this.denied();
  }

  private checkVersion(row: { version: number }, expected: number): void {
    if (row.version !== expected) {
      this.fail(
        'VERSION_CONFLICT',
        'This plan changed since it was reviewed. Reload the list and try again with the current version.',
        409,
        { currentVersion: row.version },
      );
    }
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
              status: outcome.status ?? 201,
              response: json(outcome.body),
            },
          });
          return outcome;
        },
        { timeout: 15000 },
      );
      return result.body;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          code: 'ASSESSMENT_UNAVAILABLE',
          message:
            'The assessment service could not complete this action. Check the current state before retrying.',
          supportReference: randomUUID(),
        },
        503,
      );
    }
  }

  private async audit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    id: string,
    key: string,
    metadata: unknown = {},
  ) {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole ?? 'LEC',
        scope: `ASSESSMENT:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: policy.version,
        purpose: 'Assessment scheme and mapping governance',
        metadata: json(metadata),
      },
    });
  }

  private componentView(row: {
    id: string;
    planId: string;
    code: string;
    maxMark: number;
    weight: number;
    scaleRef: string;
    moderationRequired: boolean;
    status: string;
  }) {
    return {
      id: row.id,
      planId: row.planId,
      code: row.code,
      maxMark: row.maxMark,
      weight: row.weight,
      scaleRef: row.scaleRef,
      moderationRequired: row.moderationRequired,
      status: row.status,
    };
  }

  private planView(row: {
    id: string;
    offeringRef: string;
    periodCode: string;
    version: number;
    status: string;
    policyVersion: string;
    createdByAccountId: string;
    approvedByAccountId: string | null;
    createdAt: Date;
    approvedAt: Date | null;
    components: Array<{
      id: string;
      planId: string;
      code: string;
      maxMark: number;
      weight: number;
      scaleRef: string;
      moderationRequired: boolean;
      status: string;
    }>;
  }) {
    return {
      id: row.id,
      offeringRef: row.offeringRef,
      periodCode: row.periodCode,
      version: row.version,
      status: row.status,
      policyVersion: row.policyVersion,
      createdBy: row.createdByAccountId,
      approvedBy: row.approvedByAccountId,
      createdAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      components: row.components.map((c) => this.componentView(c)),
    };
  }

  private mappingView(row: {
    id: string;
    componentId: string;
    moodleActivityId: string;
    moodleCourseRef: string;
    status: string;
    version: number;
    testResult: unknown;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      componentId: row.componentId,
      moodleActivityId: row.moodleActivityId,
      moodleCourseRef: row.moodleCourseRef,
      status: row.status,
      version: row.version,
      testResult: row.testResult ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async draftPlan(
    auth: AssessmentAuthority,
    key: string,
    input: {
      offeringRef: string;
      periodCode: string;
      components: Array<{ code: string; maxMark: number; weight: number }>;
    },
  ) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const offeringRef = input.offeringRef.trim();
    const periodCode = input.periodCode.trim();
    await this.lecturer(auth, offeringRef);
    // Closed scheme: component codes come from ASSESSMENT-DEMO-v1.
    const allowed = new Map(
      (policy.components as unknown as Array<{ code: string }>).map((c) => [
        c.code,
        c,
      ]),
    );
    const seen = new Set<string>();
    let weight = 0;
    for (const component of input.components) {
      if (!allowed.has(component.code)) {
        this.fail(
          'COMPONENT_UNKNOWN',
          'Assessment components come from the approved scheme.',
          400,
          { componentCode: component.code },
        );
      }
      if (seen.has(component.code)) {
        this.fail(
          'DUPLICATE_COMPONENT',
          'Each assessment component appears once per plan.',
          400,
          { componentCode: component.code },
        );
      }
      seen.add(component.code);
      weight += component.weight;
    }
    if (weight !== 100) {
      this.fail(
        'WEIGHT_MISMATCH',
        'Component weights must total 100.',
        400,
        { total: weight },
      );
    }
    const result = await this.command(
      auth,
      key,
      'DraftAssessmentPlan',
      { offeringRef, periodCode, components: input.components },
      async (db) => {
        const max = await db.assessmentPlan.aggregate({
          where: { offeringRef, periodCode },
          _max: { version: true },
        });
        const created = await db.assessmentPlan.create({
          data: {
            offeringRef,
            periodCode,
            version: (max._max.version ?? 0) + 1,
            status: 'DRAFT',
            policyVersion: policy.version,
            createdByAccountId: auth.accountId,
            components: {
              create: input.components.map((c) => ({
                code: c.code,
                maxMark: c.maxMark,
                weight: c.weight,
                scaleRef: policy.scale as unknown as string,
                moderationRequired: true,
                status: 'DRAFT',
              })),
            },
          },
          include: { components: true },
        });
        await this.audit(db, auth, 'AssessmentPlanDrafted', created.id, key, {
          version: created.version,
        });
        return { body: this.planView(created) };
      },
    );
    return result;
  }

  async approvePlan(
    auth: AssessmentAuthority,
    key: string,
    id: string,
    version: number,
  ) {
    const row = await this.prisma.assessmentPlan.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!row) this.fail('NOT_FOUND', 'Assessment plan not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.coordinator(auth);
    const result = await this.command(
      auth,
      key,
      'ApproveAssessmentPlan',
      { id, version },
      async (db) => {
        const live = await db.assessmentPlan.findUniqueOrThrow({
          where: { id },
          include: { components: true },
        });
        this.checkVersion(live, version);
        if (live.status !== 'DRAFT') {
          this.fail(
            'REQUEST_CLOSED',
            'Only draft plans can be approved.',
            409,
          );
        }
        // Four-eyes: the approver must differ from the creator.
        if (live.createdByAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'A second officer must approve this plan.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        try {
          // Supersede, never edit: the outgoing approved plan and its
          // components stay as history.
          const outgoing = await db.assessmentPlan.findMany({
            where: {
              offeringRef: live.offeringRef,
              periodCode: live.periodCode,
              status: 'APPROVED',
            },
            select: { id: true },
          });
          if (outgoing.length > 0) {
            await db.assessmentPlan.updateMany({
              where: { id: { in: outgoing.map((p) => p.id) } },
              data: { status: 'SUPERSEDED' },
            });
            await db.assessmentComponent.updateMany({
              where: { planId: { in: outgoing.map((p) => p.id) } },
              data: { status: 'SUPERSEDED' },
            });
          }
          const approved = await db.assessmentPlan.update({
            where: { id: live.id },
            data: {
              status: 'APPROVED',
              approvedByAccountId: auth.accountId,
              approvedAt: new Date(),
            },
            include: { components: true },
          });
          await db.assessmentComponent.updateMany({
            where: { planId: live.id },
            data: { status: 'APPROVED' },
          });
          const view = await db.assessmentPlan.findUniqueOrThrow({
            where: { id: approved.id },
            include: { components: true },
          });
          await this.audit(db, auth, 'AssessmentPlanApproved', live.id, key, {
            version: live.version,
          });
          return { body: this.planView(view) };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            this.fail(
              'APPROVAL_CONFLICT',
              'Another approval landed first. Reload the list before retrying.',
              409,
            );
          }
          throw error;
        }
      },
    );
    return result;
  }

  async listPlans(
    auth: AssessmentAuthority,
    filter: { offeringRef?: string; periodCode?: string },
  ) {
    await this.reader(auth);
    const rows = await this.prisma.assessmentPlan.findMany({
      where: {
        offeringRef: filter.offeringRef ?? undefined,
        periodCode: filter.periodCode ?? undefined,
      },
      include: { components: { orderBy: { code: 'asc' } } },
      orderBy: { version: 'desc' },
      take: 200,
    });
    return { items: rows.map((r) => this.planView(r)) };
  }

  async draftMapping(
    auth: AssessmentAuthority,
    key: string,
    input: {
      componentId: string;
      moodleActivityId: string;
      moodleCourseRef: string;
    },
  ) {
    const component = await this.prisma.assessmentComponent.findUnique({
      where: { id: input.componentId },
      include: { plan: true },
    });
    if (!component) this.fail('NOT_FOUND', 'Assessment component not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.mappingWriter(auth, component.plan.offeringRef);
    if (component.plan.status !== 'APPROVED') {
      this.fail(
        'PLAN_NOT_APPROVED',
        'Mappings bind components of an approved plan only.',
        409,
      );
    }
    if (component.status !== 'APPROVED') {
      this.fail(
        'COMPONENT_CLOSED',
        'This component takes no new mappings.',
        409,
      );
    }
    const result = await this.command(
      auth,
      key,
      'DraftGradeMapping',
      { ...input },
      async (db) => {
        const max = await db.gradeActivityMapping.aggregate({
          where: { componentId: component.id },
          _max: { version: true },
        });
        const created = await db.gradeActivityMapping.create({
          data: {
            componentId: component.id,
            moodleActivityId: input.moodleActivityId.trim(),
            moodleCourseRef: input.moodleCourseRef.trim(),
            status: 'DRAFT',
            version: (max._max.version ?? 0) + 1,
            createdByAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'GradeMappingDrafted', created.id, key, {
          componentId: component.id,
        });
        return { body: this.mappingView(created) };
      },
    );
    return result;
  }

  async testMapping(auth: AssessmentAuthority, key: string, id: string) {
    const row = await this.prisma.gradeActivityMapping.findUnique({
      where: { id },
      include: { component: { include: { plan: true } } },
    });
    if (!row) this.fail('NOT_FOUND', 'Grade mapping not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.mappingWriter(auth, row.component.plan.offeringRef);
    if (row.status === 'ACTIVE' || row.status === 'SUPERSEDED') {
      this.fail(
        'REQUEST_CLOSED',
        'Decided mappings are never re-tested. Draft a new version instead.',
        409,
      );
    }
    const result = await this.command(
      auth,
      key,
      'TestGradeMapping',
      { id },
      async (db) => {
        // Synthetic validation: six validity conditions checked against
        // SIS rows and the Phase 6 shell registry. Nothing is written to
        // any plan, component or shell row by a test.
        const live = await db.gradeActivityMapping.findUniqueOrThrow({
          where: { id },
          include: { component: { include: { plan: true } } },
        });
        const conditions: Array<{ condition: string; passed: boolean }> = [];
        const reasons: string[] = [];
        const check = (condition: string, passed: boolean, reason: string) => {
          conditions.push({ condition, passed });
          if (!passed) reasons.push(reason);
        };
        check('component-present', true, 'SIS component does not exist.');
        check(
          'plan-approved',
          live.component.plan.status === 'APPROVED',
          'SIS plan is not approved.',
        );
        const period = await db.academicPeriod.findUnique({
          where: { code: live.component.plan.periodCode },
        });
        check(
          'period-known',
          period != null,
          'SIS academic period does not exist.',
        );
        check(
          'scale-matches',
          live.component.scaleRef === (policy.scale as unknown as string),
          'Component scale does not match the approved scale.',
        );
        const shell = await db.moodleMapping.findFirst({
          where: {
            kind: 'SHELL',
            status: 'ACTIVE',
            moodleId: live.moodleCourseRef,
          },
        });
        check(
          'course-shell-active',
          shell != null,
          'Moodle course has no active shell binding.',
        );
        check(
          'identifiers-complete',
          live.moodleActivityId.trim().length > 0 &&
            live.moodleCourseRef.trim().length > 0,
          'Both SIS and Moodle identifiers are required.',
        );
        const passed = reasons.length === 0;
        const testResult = {
          result: passed ? 'PASS' : 'FAIL',
          conditions,
          reasons,
          testedAt: new Date().toISOString(),
          testedBy: auth.accountId,
        };
        const updated = await db.gradeActivityMapping.update({
          where: { id: live.id },
          data: {
            testResult: json(testResult),
            // A failed test moves nothing: the mapping keeps its status.
            ...(passed && live.status === 'DRAFT' ? { status: 'TESTED' } : {}),
          },
        });
        await this.audit(db, auth, 'GradeMappingTested', live.id, key, {
          result: passed ? 'PASS' : 'FAIL',
        });
        void updated;
        return {
          body: {
            id: live.id,
            result: passed ? 'PASS' : 'FAIL',
            reasons,
            conditions,
          },
        };
      },
    );
    return result;
  }

  async activateMapping(auth: AssessmentAuthority, key: string, id: string) {
    const row = await this.prisma.gradeActivityMapping.findUnique({
      where: { id },
    });
    if (!row) this.fail('NOT_FOUND', 'Grade mapping not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    // Academic activation: coordinators only. Moodle admins wire, lecturers
    // capture, tutors observe — none of them activate.
    await this.coordinator(auth);
    const result = await this.command(
      auth,
      key,
      'ActivateGradeMapping',
      { id },
      async (db) => {
        // Serialize per component: one ACTIVE mapping, never two.
        await db.$queryRaw`SELECT id FROM "AssessmentComponent" WHERE id = ${row.componentId} FOR UPDATE`;
        const live = await db.gradeActivityMapping.findUniqueOrThrow({
          where: { id },
        });
        if (live.status === 'ACTIVE') {
          return { body: this.mappingView(live) };
        }
        if (live.status !== 'TESTED') {
          this.fail(
            'TEST_REQUIRED',
            'Run a passing synthetic test before activation.',
            409,
          );
        }
        // Four-eyes: the activator must differ from the creator.
        if (live.createdByAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'A second officer must activate this mapping.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        const recorded = (live.testResult ?? {}) as Record<string, unknown>;
        if (recorded.result !== 'PASS') {
          this.fail(
            'TEST_REQUIRED',
            'Run a passing synthetic test before activation.',
            409,
          );
        }
        try {
          await db.gradeActivityMapping.updateMany({
            where: {
              componentId: live.componentId,
              status: 'ACTIVE',
              id: { not: live.id },
            },
            data: { status: 'SUPERSEDED' },
          });
          const activated = await db.gradeActivityMapping.update({
            where: { id: live.id },
            data: {
              status: 'ACTIVE',
              activatedByAccountId: auth.accountId,
            },
          });
          await this.audit(db, auth, 'GradeMappingActivated', live.id, key, {
            version: activated.version,
          });
          return { body: this.mappingView(activated) };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            this.fail(
              'MAPPING_RACE',
              'Another activation landed first. Reload the list before retrying.',
              409,
            );
          }
          throw error;
        }
      },
    );
    return result;
  }

  async listMappings(auth: AssessmentAuthority, filter: { componentId?: string }) {
    await this.reader(auth);
    const rows = await this.prisma.gradeActivityMapping.findMany({
      where: { componentId: filter.componentId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { items: rows.map((r) => this.mappingView(r)) };
  }

  private lineView(row: {
    id: string;
    studentRef: string;
    rawValue: number | null;
    outcome: string;
    convertedValue: number | null;
    conversionFormula: string | null;
    resolvedStudentId: string | null;
    resolvedAccountId: string | null;
    status: string;
    flagCode: string | null;
  }) {
    return {
      id: row.id,
      studentRef: row.studentRef,
      rawValue: row.rawValue,
      outcome: row.outcome,
      convertedValue: row.convertedValue,
      conversionFormula: row.conversionFormula,
      resolvedStudentId: row.resolvedStudentId,
      resolvedAccountId: row.resolvedAccountId,
      status: row.status,
      flagCode: row.flagCode,
    };
  }

  private batchView(row: {
    id: string;
    mappingId: string;
    sourceRevision: string;
    status: string;
    version: number;
    createdAt: Date;
    moodleInstance: string;
    moodleCourseRef: string;
    moodleActivityId: string;
    offeringRef: string;
    periodCode: string;
    componentCode: string;
    planVersion: number;
    policyVersion: string;
    sourceResponse: unknown;
    resultState: string | null;
    validatedAt: Date | null;
    validatedByAccountId: string | null;
    lines: Array<{
      id: string;
      studentRef: string;
      rawValue: number | null;
      outcome: string;
      convertedValue: number | null;
      conversionFormula: string | null;
      resolvedStudentId: string | null;
      resolvedAccountId: string | null;
      status: string;
      flagCode: string | null;
    }>;
    findings: Array<{
      id: string;
      batchId: string;
      lineId: string | null;
      code: string;
      lane: string;
      status: string;
      version: number;
      ownerUnit: string | null;
      escalationDeadline: Date | null;
      createdAt: Date;
    }>;
  }) {
    return {
      id: row.id,
      mappingId: row.mappingId,
      sourceRevision: row.sourceRevision,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      moodleInstance: row.moodleInstance,
      moodleCourseRef: row.moodleCourseRef,
      moodleActivityId: row.moodleActivityId,
      offeringRef: row.offeringRef,
      periodCode: row.periodCode,
      componentCode: row.componentCode,
      planVersion: row.planVersion,
      policyVersion: row.policyVersion,
      sourceResponse: row.sourceResponse ?? null,
      resultState: row.resultState,
      validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
      validatedByAccountId: row.validatedByAccountId,
      lines: row.lines.map((l) => this.lineView(l)),
      findings: row.findings.map((f) => this.findingView(f)),
    };
  }

  async stageBatch(
    auth: AssessmentAuthority,
    key: string,
    input: {
      mappingId: string;
      sourceRevision: string;
      lines: Array<{ studentRef: string; rawValue?: number; outcome?: string }>;
    },
  ) {
    const mapping = await this.prisma.gradeActivityMapping.findUnique({
      where: { id: input.mappingId },
      include: { component: { include: { plan: true } } },
    });
    if (!mapping) this.fail('NOT_FOUND', 'Grade mapping not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    // Staging is lecturer capture inside the mapping's offering scope.
    // Moodle admins wire mappings but never stage academic marks.
    await this.lecturer(auth, mapping.component.plan.offeringRef);
    if (mapping.status !== 'ACTIVE') {
      this.fail(
        'MAPPING_REQUIRED',
        'Grades stage only through an ACTIVE mapping. Test and activate the mapping first.',
        409,
      );
    }
    // Outage survival: an unreachable source refuses fail-closed and
    // preserves the last confirmed batch instead of writing through.
    const shell = await this.prisma.moodleMapping.findFirst({
      where: {
        kind: 'SHELL',
        status: 'ACTIVE',
        moodleId: mapping.moodleCourseRef,
      },
    });
    if (!shell) {
      this.fail(
        'SOURCE_UNAVAILABLE',
        'The Moodle source is unreachable. Staged batches are preserved; retry once the source recovers.',
        503,
      );
    }
    const outcomes = new Set<string>(policy.nonNumericOutcomes as readonly string[]);
    return this.command(auth, key, 'StageGradeBatch', input, async (db) => {
      // Serialize concurrent stages of the same mapping+revision first;
      // the replay check below then sees rows committed by a racing
      // transaction, so concurrent stages converge on one snapshot.
      await db.$queryRaw`SELECT id FROM "GradeActivityMapping" WHERE id = ${input.mappingId} FOR UPDATE`;
      // Resource-idempotent: the same mapping+revision returns the stored
      // batch, so a lost response never creates a second snapshot. The
      // moderation lock below applies to new revisions only, never to a
      // replay of an already-stored batch.
      const replay = await db.gradeBatch.findUnique({
        where: {
          mappingId_sourceRevision: {
            mappingId: input.mappingId,
            sourceRevision: input.sourceRevision,
          },
        },
        include: { lines: true, findings: { orderBy: { createdAt: 'asc' } } },
      });
      if (replay) return { body: this.batchView(replay) };
      // Moderation lock: no new revisions while a case for this component
      // is open. Returned, referred, and decided cases never block;
      // corrections flow through new revisions after a return.
      const openCase = await db.moderationCase.findFirst({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_MODERATION', 'CLARIFICATION_REQUESTED'] },
          batch: { mapping: { componentId: mapping.componentId } },
        },
        select: { id: true },
      });
      if (openCase) {
        this.fail(
          'CASE_OPEN',
          'Finish or return the open moderation case before staging a new revision.',
          409,
          { caseId: openCase.id },
        );
      }
      try {
        const seen = new Set<string>();
        const prepared = [];
        for (const line of input.lines) {
          const outcome = line.outcome ?? 'MARK_RECORDED';
          let status = 'STAGED';
          let flagCode: string | null = null;
          let converted: number | null = null;
          let resolvedStudentId: string | null = null;
          let resolvedAccountId: string | null = null;
          if (!outcomes.has(outcome)) {
            status = 'QUARANTINED';
            flagCode = 'STRUCTURALLY_INVALID';
          } else if (seen.has(line.studentRef)) {
            status = 'FLAGGED';
            flagCode = 'DUPLICATE';
          } else if (
            outcome === 'MARK_RECORDED' &&
            (typeof line.rawValue !== 'number' ||
              !Number.isFinite(line.rawValue) ||
              line.rawValue < 0 ||
              line.rawValue > mapping.component.maxMark)
          ) {
            // Malformed values (non-numeric, negative) are structural;
            // only finite values above the component maximum are range
            // errors. Either way the line is quarantined, never official.
            status = 'QUARANTINED';
            flagCode =
              typeof line.rawValue === 'number' &&
              Number.isFinite(line.rawValue) &&
              line.rawValue > mapping.component.maxMark
                ? 'OUT_OF_RANGE'
                : 'STRUCTURALLY_INVALID';
          } else if (outcome === 'MARK_RECORDED') {
            // Moodle-only check: a staged mark with no SIS identity behind
            // it is preserved as evidence but converts to nothing. The
            // resolved identity is the student/enrolment mapping (DS5 §4);
            // enrolment-truth disputes belong to the slice-3 swimlanes.
            const student = await db.student.findUnique({
              where: { studentNumber: line.studentRef },
            });
            if (student) {
              resolvedStudentId = student.id;
              // Demo conversion is the identity formula; the applied
              // policy version travels with the batch, never a bare value.
              converted = line.rawValue ?? null;
            } else {
              const account = await db.account.findUnique({
                where: { username: line.studentRef },
              });
              if (account) {
                resolvedAccountId = account.id;
                converted = line.rawValue ?? null;
              } else {
                status = 'FLAGGED';
                flagCode = 'MOODLE_ONLY';
              }
            }
          }
          seen.add(line.studentRef);
          prepared.push({
            studentRef: line.studentRef,
            rawValue: line.rawValue ?? null,
            outcome,
            convertedValue: converted,
            conversionFormula: converted !== null ? 'identity' : null,
            resolvedStudentId,
            resolvedAccountId,
            status,
            flagCode,
          });
        }
        // First write wins per student inside one batch: later duplicates
        // collapse onto the stored row, which carries the DUPLICATE flag.
        const unique = new Map<string, (typeof prepared)[number]>();
        for (const row of prepared) {
          if (!unique.has(row.studentRef)) unique.set(row.studentRef, row);
          else {
            const first = unique.get(row.studentRef);
            if (first && first.flagCode === null) {
              first.status = 'FLAGGED';
              first.flagCode = 'DUPLICATE';
            }
          }
        }
        const created = await db.gradeBatch.create({
          data: {
            mappingId: input.mappingId,
            sourceRevision: input.sourceRevision,
            status: 'VALIDATED',
            createdByAccountId: auth.accountId,
            // Frozen DS5 §4 provenance: the source and SIS coordinates in
            // force at stage time. Later supersedes never rewrite these.
            moodleInstance: moodle.provider,
            moodleCourseRef: mapping.moodleCourseRef,
            moodleActivityId: mapping.moodleActivityId,
            offeringRef: mapping.component.plan.offeringRef,
            periodCode: mapping.component.plan.periodCode,
            componentCode: mapping.component.code,
            planVersion: mapping.component.plan.version,
            policyVersion: policy.version,
            sourceResponse: json({
              sourceRevision: input.sourceRevision,
              receivedLines: input.lines.length,
              receivedAt: new Date().toISOString(),
              instance: moodle.provider,
            }),
            lines: { create: [...unique.values()] },
          },
          include: { lines: true, findings: { orderBy: { createdAt: 'asc' } } },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'GradeBatch',
            aggregateId: created.id,
            type: 'MoodleGradeTransferStaged',
            payload: json({
              batchId: created.id,
              mappingId: input.mappingId,
              sourceRevision: input.sourceRevision,
              lineCount: created.lines.length,
              quarantined: created.lines.filter(
                (l) => l.status !== 'STAGED',
              ).length,
              policyVersion: policy.version,
              // Canonical chain (GAP-022 interim): ACT-ASM-001 +
              // CMD-LRN-StageMoodleGradeTransfer +
              // INT-Moodle-GradeTransfer-v1 +
              // EVT-MoodleGradeTransferStaged-v1.
              chain: {
                act: 'ACT-ASM-001',
                command: 'CMD-LRN-StageMoodleGradeTransfer',
                interface: 'INT-Moodle-GradeTransfer-v1',
                event: 'EVT-MoodleGradeTransferStaged-v1',
              },
            }),
          },
        });
        await this.audit(db, auth, 'GradeBatchStaged', created.id, key, {
          mappingId: input.mappingId,
          sourceRevision: input.sourceRevision,
        });
        return { body: this.batchView(created) };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          // A concurrent stage of the same revision landed first:
          // converge on the stored snapshot instead of a second one.
          const stored = await db.gradeBatch.findUniqueOrThrow({
            where: {
              mappingId_sourceRevision: {
                mappingId: input.mappingId,
                sourceRevision: input.sourceRevision,
              },
            },
            include: { lines: true, findings: { orderBy: { createdAt: 'asc' } } },
          });
          return { body: this.batchView(stored) };
        }
        throw error;
      }
    });
  }

  async listBatches(auth: AssessmentAuthority, filter: { mappingId?: string }) {
    await this.reader(auth);
    const rows = await this.prisma.gradeBatch.findMany({
      where: { mappingId: filter.mappingId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        lines: true,
        findings: { orderBy: { createdAt: 'asc' } },
      },
    });
    return { items: rows.map((r) => this.batchView(r)) };
  }

  async batchDetail(auth: AssessmentAuthority, id: string) {
    await this.reader(auth);
    const row = await this.prisma.gradeBatch.findUnique({
      where: { id },
      include: {
        lines: true,
        findings: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) this.fail('NOT_FOUND', 'Grade batch not found.', 404);
    return this.batchView(row);
  }

  // Phase 7 slice 3: validation and missing-mark queue (TASK-PH7-003,
  // GAP-022 interim). Validation writes immutable findings, never edits
  // source rows; corrections stage new revisions. Lanes scope queue
  // visibility: TECHNICAL (Moodle Admin), ACADEMIC (lecturer/
  // coordinator), ENROLMENT (Registry truth via the operating
  // examinations office until a Registry demo role is approved).
  private static readonly LANES: Record<string, string> = {
    UNMAPPED: 'TECHNICAL',
    STALE_MAPPING: 'TECHNICAL',
    SCALE_MISMATCH: 'TECHNICAL',
    STRUCTURALLY_INVALID: 'TECHNICAL',
    MISSING_MARK: 'ACADEMIC',
    DUPLICATE: 'ACADEMIC',
    OUT_OF_RANGE: 'ACADEMIC',
    MOODLE_ONLY: 'ENROLMENT',
  };

  // Demo escalation budget for missing-mark work items (DS5 §17, GAP-022).
  private static readonly ESCALATION_DAYS = 7;

  private async examiner(auth: AssessmentAuthority, periodCode?: string) {
    const assignment = await this.liveAssignment(
      auth,
      'EXAMINATIONS_OFFICER',
      'validate-results',
    );
    if (
      !assignment ||
      auth.activeRole !== 'EXAMINATIONS_OFFICER' ||
      assignment.scopeType !== 'PERIOD' ||
      (periodCode !== undefined && assignment.scopeRef !== periodCode)
    ) {
      this.denied();
    }
  }

  private async queueLanes(
    auth: AssessmentAuthority,
  ): Promise<string[] | null> {
    // Null means no queue access at all (403). Lane filtering below stays
    // neutral (404) so one lane never confirms another lane's findings.
    if (auth.activeRole === 'EXAMINATIONS_OFFICER') {
      const assignment = await this.liveAssignment(
        auth,
        'EXAMINATIONS_OFFICER',
        'validate-results',
      );
      if (assignment && assignment.scopeType === 'PERIOD') {
        return ['TECHNICAL', 'ACADEMIC', 'ENROLMENT'];
      }
      return null;
    }
    if (auth.activeRole === 'LEC') {
      const assignment = await this.liveAssignment(auth, 'LEC', 'stage-marks');
      return assignment ? ['ACADEMIC'] : null;
    }
    if (auth.activeRole === 'COORDINATOR') {
      const assignment = await this.liveAssignment(
        auth,
        'COORDINATOR',
        'approve-assessment',
      );
      return assignment ? ['ACADEMIC'] : null;
    }
    if (auth.activeRole === 'MOODLE_ADMIN') {
      const assignment = await this.liveAssignment(
        auth,
        'MOODLE_ADMIN',
        'manage-mapping',
      );
      return assignment ? ['TECHNICAL'] : null;
    }
    return null;
  }

  private findingView(row: {
    id: string;
    batchId: string;
    lineId: string | null;
    code: string;
    lane: string;
    status: string;
    version: number;
    ownerUnit: string | null;
    escalationDeadline: Date | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      batchId: row.batchId,
      lineId: row.lineId,
      code: row.code,
      lane: row.lane,
      status: row.status,
      version: row.version,
      ownerUnit: row.ownerUnit,
      escalationDeadline: row.escalationDeadline
        ? row.escalationDeadline.toISOString()
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async validateBatch(auth: AssessmentAuthority, key: string, id: string) {
    const batch = await this.prisma.gradeBatch.findUnique({
      where: { id },
      include: { mapping: { include: { component: { include: { plan: true } } } } },
    });
    if (!batch) this.fail('NOT_FOUND', 'Grade batch not found.', 404);
    await this.examiner(auth, batch.mapping.component.plan.periodCode);
    return this.command(auth, key, 'ValidateGradeBatch', { id }, async (db) => {
      // Serialize concurrent validations of one batch; the open-code
      // check below then converges instead of duplicating findings.
      await db.$queryRaw`SELECT id FROM "GradeBatch" WHERE id = ${id} FOR UPDATE`;
      const live = await db.gradeBatch.findUniqueOrThrow({
        where: { id },
        include: {
          lines: { orderBy: { studentRef: 'asc' } },
          mapping: { include: { component: { include: { plan: true } } } },
        },
      });
      const plan = live.mapping.component.plan;
      const desired: Array<{ lineId: string | null; code: string }> = [];
      // Batch-level: plan membership (UNMAPPED strands lines outside
      // any approved component), mapping freshness, and scale drift.
      // Each is an independent fact; all present findings are reported
      // together with the line-level ones.
      if (plan.status !== 'APPROVED') {
        desired.push({ lineId: null, code: 'UNMAPPED' });
      }
      if (live.mapping.status !== 'ACTIVE') {
        desired.push({ lineId: null, code: 'STALE_MAPPING' });
      }
      if (
        live.mapping.component.scaleRef !==
        (policy.scale as unknown as string)
      ) {
        desired.push({ lineId: null, code: 'SCALE_MISMATCH' });
      }
      for (const line of live.lines) {
        if (line.flagCode === 'DUPLICATE') {
          desired.push({ lineId: line.id, code: 'DUPLICATE' });
        } else if (line.flagCode === 'OUT_OF_RANGE') {
          desired.push({ lineId: line.id, code: 'OUT_OF_RANGE' });
        } else if (line.flagCode === 'STRUCTURALLY_INVALID') {
          desired.push({ lineId: line.id, code: 'STRUCTURALLY_INVALID' });
        } else if (line.flagCode === 'MOODLE_ONLY') {
          desired.push({ lineId: line.id, code: 'MOODLE_ONLY' });
        }
        // Missing marks are declared outcomes, never stored as zero:
        // the finding carries the work item, the line stays as staged.
        if (line.outcome === 'MISSING_MARK') {
          desired.push({ lineId: line.id, code: 'MISSING_MARK' });
        }
      }
      const open = await db.gradeFinding.findMany({
        where: { batchId: id, status: 'OPEN' },
      });
      const openKeys = new Set(
        open.map((f) => `${f.code}:${f.lineId ?? ''}`),
      );
      const now = new Date();
      let created = 0;
      for (const item of desired) {
        if (openKeys.has(`${item.code}:${item.lineId ?? ''}`)) continue;
        const lane =
          AssessmentService.LANES[item.code] ?? 'TECHNICAL';
        const missing = item.code === 'MISSING_MARK';
        await db.gradeFinding.create({
          data: {
            batchId: id,
            lineId: item.lineId,
            code: item.code,
            lane,
            status: 'OPEN',
            detail: json(
              missing
                ? {
                    outcome: 'MISSING_MARK',
                    note: 'Mandatory mark missing: assigned to the responsible unit, never stored as zero.',
                  }
                : { code: item.code },
            ),
            ownerUnit:
              lane === 'ACADEMIC'
                ? plan.offeringRef
                : lane === 'ENROLMENT'
                  ? 'REGISTRY'
                  : 'MOODLE_ADMIN',
            escalationDeadline: missing
              ? new Date(
                  now.getTime() +
                    AssessmentService.ESCALATION_DAYS * 24 * 3600 * 1000,
                )
              : null,
            createdByAccountId: auth.accountId,
          },
        });
        created += 1;
      }
      // DS5 §17: mandatory missing marks set the result MISSING_MARKS.
      const openMissing = await db.gradeFinding.count({
        where: { batchId: id, status: 'OPEN', code: 'MISSING_MARK' },
      });
      const updated = await db.gradeBatch.update({
        where: { id },
        data: {
          resultState: openMissing > 0 ? 'MISSING_MARKS' : null,
          validatedAt: now,
          validatedByAccountId: auth.accountId,
        },
      });
      await this.audit(db, auth, 'GradeBatchValidated', id, key, {
        newFindings: created,
        resultState: updated.resultState,
      });
      const findings = await db.gradeFinding.findMany({
        where: { batchId: id },
        orderBy: { createdAt: 'asc' },
      });
      return {
        body: {
          id,
          resultState: updated.resultState,
          validatedAt: now.toISOString(),
          findings: findings.map((f) => this.findingView(f)),
        },
      };
    });
  }

  async listFindings(
    auth: AssessmentAuthority,
    filter: { batchId?: string; code?: string; status?: string },
  ) {
    const lanes = await this.queueLanes(auth);
    if (!lanes) this.denied();
    const rows = await this.prisma.gradeFinding.findMany({
      where: {
        lane: { in: lanes ?? [] },
        batchId: filter.batchId ?? undefined,
        code: filter.code ?? undefined,
        status: filter.status ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { items: rows.map((r) => this.findingView(r)) };
  }

  async findingDetail(auth: AssessmentAuthority, id: string) {
    const lanes = await this.queueLanes(auth);
    if (!lanes) this.denied();
    const row = await this.prisma.gradeFinding.findUnique({ where: { id } });
    if (!row || !lanes?.includes(row.lane)) {
      this.fail('NOT_FOUND', 'Grade finding not found.', 404);
    }
    return this.findingView(row);
  }

  async transitionFinding(
    auth: AssessmentAuthority,
    key: string,
    id: string,
    version: number,
    to: string,
    reason?: string,
  ) {
    const finding = await this.prisma.gradeFinding.findUnique({
      where: { id },
      include: { batch: true },
    });
    if (!finding) this.fail('NOT_FOUND', 'Grade finding not found.', 404);
    await this.examiner(auth, finding.batch.periodCode);
    const targets = ['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];
    if (!targets.includes(to)) {
      this.fail(
        'INVALID_TRANSITION',
        'Findings move to ACKNOWLEDGED, RESOLVED or DISMISSED only.',
        400,
      );
    }
    if (
      (to === 'RESOLVED' || to === 'DISMISSED') &&
      !reason?.trim()
    ) {
      this.fail(
        'REASON_REQUIRED',
        'Resolving or dismissing a finding demands a recorded reason.',
        400,
      );
    }
    return this.command(
      auth,
      key,
      'TransitionGradeFinding',
      { id, version, to },
      async (db) => {
        // Serialize racing triage so concurrent transitions conflict
        // instead of silently overwriting (TEST-REC-005).
        await db.$queryRaw`SELECT id FROM "GradeFinding" WHERE id = ${id} FOR UPDATE`;
        const live = await db.gradeFinding.findUniqueOrThrow({
          where: { id },
        });
        this.checkVersion(live, version);
        const allowed: Record<string, string[]> = {
          OPEN: ['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'],
          ACKNOWLEDGED: ['RESOLVED', 'DISMISSED'],
          RESOLVED: [],
          DISMISSED: [],
        };
        if (!allowed[live.status].includes(to)) {
          this.fail(
            'REQUEST_CLOSED',
            'Decided findings keep their outcome. Operate on the open finding instead.',
            409,
          );
        }
        const terminal = to === 'RESOLVED' || to === 'DISMISSED';
        const updated = await db.gradeFinding.update({
          where: { id: live.id },
          data: {
            status: to,
            version: { increment: 1 },
            ...(terminal
              ? {
                  resolvedByAccountId: auth.accountId,
                  resolvedAt: new Date(),
                  resolveReason: reason?.trim() ?? null,
                }
              : {}),
          },
        });
        await this.audit(db, auth, 'GradeFindingTransitioned', live.id, key, {
          from: live.status,
          to,
        });
        return { body: this.findingView(updated) };
      },
    );
  }

  // Phase 7 slice 4: lecturer correction and moderation handoff
  // (TASK-PH7-004, GAP-022 interim). Validated batches submit with a
  // recorded declaration; moderation cases move SUBMITTED (claim) →
  // UNDER_MODERATION → APPROVED/RETURNED/CLARIFICATION_REQUESTED/
  // REFERRED with version checks. The moderator is never the stager.
  // Approval locks the batch and writes immutable official CA records;
  // corrections stage new revisions and re-moderate (supersede).
  private async submitter(auth: AssessmentAuthority, offeringRef: string) {
    if (auth.activeRole === 'LEC') {
      await this.lecturer(auth, offeringRef);
      return;
    }
    if (auth.activeRole === 'COORDINATOR') {
      await this.coordinator(auth);
      return;
    }
    this.denied();
  }

  private async moderator(auth: AssessmentAuthority, offeringRef: string) {
    const assignment = await this.liveAssignment(
      auth,
      'MODERATOR',
      'moderate-results',
    );
    if (
      !assignment ||
      auth.activeRole !== 'MODERATOR' ||
      assignment.scopeType !== 'OFFERING' ||
      assignment.scopeRef !== offeringRef
    ) {
      this.denied();
    }
  }

  private caseView(row: {
    id: string;
    batchId: string;
    status: string;
    version: number;
    declaration: string;
    submittedByAccountId: string;
    submittedAt: Date;
    reviewerAccountId: string | null;
    reviewedAt: Date | null;
    decidedByAccountId: string | null;
    decidedAt: Date | null;
    decisionReason: string | null;
  }) {
    return {
      id: row.id,
      batchId: row.batchId,
      status: row.status,
      version: row.version,
      declaration: row.declaration,
      submittedBy: row.submittedByAccountId,
      submittedAt: row.submittedAt.toISOString(),
      reviewer: row.reviewerAccountId,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      decidedBy: row.decidedByAccountId,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      decisionReason: row.decisionReason,
    };
  }

  async provisionCandidateList(
    auth: AssessmentAuthority,
    key: string,
    input: { offeringRef: string; periodCode: string; studentRefs: string[] },
  ) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.coordinator(auth);
    const offeringRef = input.offeringRef.trim();
    const periodCode = input.periodCode.trim();
    const refs = [...new Set(input.studentRefs.map((r) => r.trim()))]
      .filter((r) => r.length > 0)
      .sort();
    if (refs.length === 0) {
      this.fail(
        'EMPTY_CANDIDATE_LIST',
        'The candidate list names at least one expected participant.',
        400,
      );
    }
    return this.command(
      auth,
      key,
      'ProvisionCandidateList',
      { offeringRef, periodCode, studentRefs: refs },
      async (db) => {
        const max = await db.assessmentCandidateList.aggregate({
          where: { offeringRef, periodCode },
          _max: { version: true },
        });
        try {
          await db.assessmentCandidateList.updateMany({
            where: { offeringRef, periodCode, status: 'ACTIVE' },
            data: { status: 'SUPERSEDED' },
          });
          const created = await db.assessmentCandidateList.create({
            data: {
              offeringRef,
              periodCode,
              version: (max._max.version ?? 0) + 1,
              status: 'ACTIVE',
              studentRefs: refs,
              createdByAccountId: auth.accountId,
            },
          });
          await this.audit(db, auth, 'CandidateListProvisioned', created.id, key, {
            version: created.version,
          });
          return {
            body: {
              id: created.id,
              offeringRef,
              periodCode,
              version: created.version,
              studentRefs: refs,
            },
          };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            const current = await db.assessmentCandidateList.findFirstOrThrow({
              where: { offeringRef, periodCode, status: 'ACTIVE' },
            });
            return {
              body: {
                id: current.id,
                offeringRef,
                periodCode,
                version: current.version,
                studentRefs: current.studentRefs,
              },
            };
          }
          throw error;
        }
      },
    );
  }

  async listCandidateLists(
    auth: AssessmentAuthority,
    filter: { offeringRef?: string; periodCode?: string },
  ) {
    await this.reader(auth);
    const rows = await this.assessmentCandidateList(auth, filter);
    return {
      items: rows.map((r) => ({
        id: r.id,
        offeringRef: r.offeringRef,
        periodCode: r.periodCode,
        version: r.version,
        status: r.status,
        studentRefs: r.studentRefs,
      })),
    };
  }

  private async assessmentCandidateList(
    auth: AssessmentAuthority,
    filter: { offeringRef?: string; periodCode?: string },
  ) {
    void auth;
    return this.prisma.assessmentCandidateList.findMany({
      where: {
        offeringRef: filter.offeringRef ?? undefined,
        periodCode: filter.periodCode ?? undefined,
      },
      orderBy: { version: 'desc' },
      take: 200,
    });
  }

  async submitBatch(
    auth: AssessmentAuthority,
    key: string,
    batchId: string,
    declaration: string,
  ) {
    const batch = await this.prisma.gradeBatch.findUnique({
      where: { id: batchId },
      include: {
        lines: true,
        mapping: { include: { component: { include: { plan: true } } } },
      },
    });
    if (!batch) this.fail('NOT_FOUND', 'Grade batch not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const offeringRef = batch.mapping.component.plan.offeringRef;
    await this.submitter(auth, offeringRef);
    return this.command(
      auth,
      key,
      'SubmitBatchForModeration',
      { batchId },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "GradeBatch" WHERE id = ${batchId} FOR UPDATE`;
        const live = await db.gradeBatch.findUniqueOrThrow({
          where: { id: batchId },
          include: {
            lines: true,
            mapping: { include: { component: { include: { plan: true } } } },
          },
        });
        // Checklist, in handbook order: validated, no open findings,
        // candidate reconciliation, recorded declaration.
        if (!live.validatedAt) {
          this.fail(
            'CHECKLIST_UNVALIDATED',
            'Validate the batch before submitting it for moderation.',
            409,
          );
        }
        const openFindings = await db.gradeFinding.count({
          where: { batchId, status: 'OPEN' },
        });
        if (openFindings > 0) {
          this.fail(
            'CHECKLIST_OPEN_FINDINGS',
            'Resolve or classify every open finding before submitting.',
            409,
          );
        }
        const list = await db.assessmentCandidateList.findFirst({
          where: {
            offeringRef: live.mapping.component.plan.offeringRef,
            periodCode: live.mapping.component.plan.periodCode,
            status: 'ACTIVE',
          },
        });
        const staged = new Set(live.lines.map((l) => l.studentRef));
        const expected = new Set(list?.studentRefs ?? []);
        const missing = [...expected].filter((r) => !staged.has(r));
        const extra = [...staged].filter((r) => !expected.has(r));
        if (!list || missing.length > 0 || extra.length > 0) {
          this.fail(
            'CHECKLIST_UNRECONCILED',
            'Reconcile the staged lines against the official candidate list before submitting.',
            409,
            { missing: missing.length, extra: extra.length },
          );
        }
        const prior = await db.moderationCase.findUnique({
          where: { batchId },
        });
        if (prior) return { body: this.caseView(prior) };
        const created = await db.moderationCase.create({
          data: {
            batchId,
            status: 'SUBMITTED',
            declaration,
            submittedByAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'BatchSubmittedForModeration', created.id, key, {
          batchId,
        });
        return { body: this.caseView(created) };
      },
    );
  }

  async beginReview(auth: AssessmentAuthority, key: string, caseId: string) {
    const found = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: {
        batch: {
          include: { mapping: { include: { component: { include: { plan: true } } } } },
        },
      },
    });
    if (!found) this.fail('NOT_FOUND', 'Moderation case not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const offeringRef = found.batch.mapping.component.plan.offeringRef;
    await this.moderator(auth, offeringRef);
    // Separation of duties: the stager never reviews their own batch,
    // in any workspace.
    if (found.submittedByAccountId === auth.accountId) {
      throw new HttpException(
        {
          code: 'SOD_VIOLATION',
          message: 'An independent moderator must review this batch.',
          supportReference: randomUUID(),
        },
        403,
      );
    }
    return this.command(auth, key, 'BeginModerationReview', { id: caseId }, async (db) => {
      const live = await db.moderationCase.findUniqueOrThrow({
        where: { id: caseId },
      });
      if (live.status !== 'SUBMITTED') {
        this.fail(
          'REQUEST_CLOSED',
          'Only submitted cases begin review. Decided cases keep their outcome.',
          409,
        );
      }
      const updated = await db.moderationCase.update({
        where: { id: live.id },
        data: {
          status: 'UNDER_MODERATION',
          reviewerAccountId: auth.accountId,
          reviewedAt: new Date(),
        },
      });
      await this.audit(db, auth, 'ModerationReviewBegun', live.id, key, {
        batchId: live.batchId,
      });
      return { body: this.caseView(updated) };
    });
  }

  async decideCase(
    auth: AssessmentAuthority,
    key: string,
    caseId: string,
    version: number,
    to: string,
    reason?: string,
  ) {
    const found = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: {
        batch: {
          include: {
            lines: true,
            mapping: { include: { component: { include: { plan: true } } } },
          },
        },
      },
    });
    if (!found) this.fail('NOT_FOUND', 'Moderation case not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const offeringRef = found.batch.mapping.component.plan.offeringRef;
    await this.moderator(auth, offeringRef);
    if (found.submittedByAccountId === auth.accountId) {
      throw new HttpException(
        {
          code: 'SOD_VIOLATION',
          message: 'An independent moderator must decide this batch.',
          supportReference: randomUUID(),
        },
        403,
      );
    }
    const targets = ['APPROVED', 'RETURNED', 'CLARIFICATION_REQUESTED', 'REFERRED'];
    if (!targets.includes(to)) {
      this.fail(
        'INVALID_TRANSITION',
        'Moderation decides APPROVED, RETURNED, CLARIFICATION_REQUESTED or REFERRED only.',
        400,
      );
    }
    if (to !== 'APPROVED' && !reason?.trim()) {
      this.fail(
        'REASON_REQUIRED',
        'Returning, clarifying or referring a batch demands a recorded reason.',
        400,
      );
    }
    return this.command(
      auth,
      key,
      'DecideModerationCase',
      { id: caseId, version, to },
      async (db) => {
        // Serialize racing decisions: the version check below must see
        // rows committed by a concurrent decision, never a stale read.
        await db.$queryRaw`SELECT id FROM "ModerationCase" WHERE id = ${caseId} FOR UPDATE`;
        const live = await db.moderationCase.findUniqueOrThrow({
          where: { id: caseId },
          include: {
            batch: {
              include: {
                lines: true,
                mapping: { include: { component: { include: { plan: true } } } },
              },
            },
          },
        });
        this.checkVersion(live, version);
        if (live.status !== 'UNDER_MODERATION') {
          this.fail(
            'REQUEST_CLOSED',
            'Begin review before deciding. Decided cases keep their outcome.',
            409,
          );
        }
        const now = new Date();
        const updated = await db.moderationCase.update({
          where: { id: live.id },
          data: {
            status: to,
            version: { increment: 1 },
            decidedByAccountId: auth.accountId,
            decidedAt: now,
            decisionReason: reason?.trim() ?? null,
          },
        });
        // Approval locks the batch and writes immutable official CA
        // records; lines without a converted mark carry no official
        // value and are skipped, never zero-filled.
        if (to === 'APPROVED') {
          await db.gradeBatch.update({
            where: { id: live.batchId },
            data: { lockedAt: now },
          });
          const plan = live.batch.mapping.component.plan;
          for (const line of live.batch.lines) {
            if (line.convertedValue === null) continue;
            const max = await db.officialCARecord.aggregate({
              where: {
                offeringRef: plan.offeringRef,
                periodCode: plan.periodCode,
                componentCode: live.batch.mapping.component.code,
                studentRef: line.studentRef,
              },
              _max: { version: true },
            });
            await db.officialCARecord.create({
              data: {
                offeringRef: plan.offeringRef,
                periodCode: plan.periodCode,
                componentCode: live.batch.mapping.component.code,
                planVersion: plan.version,
                studentRef: line.studentRef,
                resolvedStudentId: line.resolvedStudentId,
                mark: line.convertedValue,
                outcome: line.outcome,
                policyVersion: policy.version,
                caseId: live.id,
                version: (max._max.version ?? 0) + 1,
              },
            });
          }
        }
        await this.audit(db, auth, 'ModerationCaseDecided', live.id, key, {
          from: live.status,
          to,
        });
        return { body: this.caseView(updated) };
      },
    );
  }

  async listModeration(
    auth: AssessmentAuthority,
    filter: { status?: string },
  ) {
    const status = filter.status ?? undefined;
    if (auth.activeRole === 'MODERATOR') {
      const assignment = await this.liveAssignment(
        auth,
        'MODERATOR',
        'moderate-results',
      );
      if (
        !assignment ||
        assignment.scopeType !== 'OFFERING'
      ) {
        this.denied();
      }
      const rows = await this.prisma.moderationCase.findMany({
        where: {
          status,
          batch: {
            mapping: {
              component: { plan: { offeringRef: assignment.scopeRef } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return { items: rows.map((r) => this.caseView(r)) };
    }
    if (auth.activeRole === 'EXAMINATIONS_OFFICER') {
      const assignment = await this.liveAssignment(
        auth,
        'EXAMINATIONS_OFFICER',
        'validate-results',
      );
      if (!assignment || assignment.scopeType !== 'PERIOD') this.denied();
      // Examinations owns the referred lane only in this slice.
      const rows = await this.prisma.moderationCase.findMany({
        where: { status: 'REFERRED' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return { items: rows.map((r) => this.caseView(r)) };
    }
    if (auth.activeRole === 'LEC' || auth.activeRole === 'COORDINATOR') {
      const capability =
        auth.activeRole === 'LEC' ? 'stage-marks' : 'approve-assessment';
      const assignment = await this.liveAssignment(
        auth,
        auth.activeRole,
        capability,
      );
      if (!assignment) this.denied();
      const rows = await this.prisma.moderationCase.findMany({
        where: { status, submittedByAccountId: auth.accountId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return { items: rows.map((r) => this.caseView(r)) };
    }
    this.denied();
  }

  async moderationDetail(auth: AssessmentAuthority, id: string) {
    const row = await this.prisma.moderationCase.findUnique({
      where: { id },
      include: {
        batch: {
          include: { mapping: { include: { component: { include: { plan: true } } } } },
        },
      },
    });
    if (!row) this.fail('NOT_FOUND', 'Moderation case not found.', 404);
    const entitled = await this.moderationEntitled(auth, row);
    if (!entitled) {
      // No queue access at all denies loudly; out-of-scope reads stay
      // neutral so one lane never confirms another lane's cases.
      const lanes = await this.moderationLanes(auth);
      if (!lanes) this.denied();
      this.fail('NOT_FOUND', 'Moderation case not found.', 404);
    }
    return this.caseView(row);
  }

  private async moderationLanes(
    auth: AssessmentAuthority,
  ): Promise<string[] | null> {
    if (auth.activeRole === 'MODERATOR') {
      const assignment = await this.liveAssignment(
        auth,
        'MODERATOR',
        'moderate-results',
      );
      return assignment && assignment.scopeType === 'OFFERING'
        ? ['MODERATOR']
        : null;
    }
    if (auth.activeRole === 'EXAMINATIONS_OFFICER') {
      const assignment = await this.liveAssignment(
        auth,
        'EXAMINATIONS_OFFICER',
        'validate-results',
      );
      return assignment && assignment.scopeType === 'PERIOD'
        ? ['EXAMINATIONS']
        : null;
    }
    if (auth.activeRole === 'LEC') {
      const assignment = await this.liveAssignment(auth, 'LEC', 'stage-marks');
      return assignment ? ['SUBMITTER'] : null;
    }
    if (auth.activeRole === 'COORDINATOR') {
      const assignment = await this.liveAssignment(
        auth,
        'COORDINATOR',
        'approve-assessment',
      );
      return assignment ? ['SUBMITTER'] : null;
    }
    return null;
  }

  private async moderationEntitled(
    auth: AssessmentAuthority,
    row: {
      status: string;
      submittedByAccountId: string;
      batch: {
        mapping: { component: { plan: { offeringRef: string } } };
      };
    } | null,
  ): Promise<boolean> {
    if (!row) return false;
    const lanes = await this.moderationLanes(auth);
    if (!lanes) return false;
    const offeringRef = row.batch.mapping.component.plan.offeringRef;
    if (lanes.includes('MODERATOR')) {
      const assignment = await this.liveAssignment(
        auth,
        'MODERATOR',
        'moderate-results',
      );
      return (
        !!assignment &&
        assignment.scopeType === 'OFFERING' &&
        assignment.scopeRef === offeringRef
      );
    }
    if (lanes.includes('EXAMINATIONS')) {
      return row.status === 'REFERRED';
    }
    return row.submittedByAccountId === auth.accountId;
  }

  private packageView(row: {
    id: string;
    offeringRef: string;
    periodCode: string;
    version: number;
    status: string;
    packageHash: string;
    trace: unknown;
    candidateListId: string;
    declaration: string;
    preparedByAccountId: string;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      offeringRef: row.offeringRef,
      periodCode: row.periodCode,
      version: row.version,
      status: row.status,
      packageHash: row.packageHash,
      trace: row.trace,
      candidateListId: row.candidateListId,
      declaration: row.declaration,
      preparedBy: row.preparedByAccountId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // Phase 7 slice 5: board/decision package (TASK-PH7-005, GAP-022
  // interim). Result packages freeze approved official CA refs, the
  // weighted-total-v1 preview + trace, moderation refs, candidate-list
  // reconciliation, declarations and a SHA-256 hash. The examinations
  // authority records the board decision with four-eyes; conditions
  // store for slice-6 enforcement. No release effects here.
  async assemblePackage(
    auth: AssessmentAuthority,
    key: string,
    input: { offeringRef: string; periodCode: string; declaration: string },
  ) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const offeringRef = input.offeringRef.trim();
    const periodCode = input.periodCode.trim();
    await this.submitter(auth, offeringRef);
    if (input.declaration !== PACKAGE_DECLARATION) {
      this.fail(
        'DECLARATION_REQUIRED',
        'Accept the exact board-package declaration before assembling.',
        400,
      );
    }
    return this.command(
      auth,
      key,
      'AssembleResultPackage',
      { offeringRef, periodCode },
      async (db) => {
        const components = policy.components as unknown as Array<{
          code: string;
          maxMark: number;
          weight: number;
        }>;
        // Gate 1: every demo component carries a moderated-approved case
        // whose batch came through SIS-governed provenance (an APPROVED
        // plan), never Moodle-direct.
        const approvedCases = await db.moderationCase.findMany({
          where: {
            status: 'APPROVED',
            batch: {
              mapping: {
                component: {
                  plan: { offeringRef, periodCode, status: 'APPROVED' },
                },
              },
            },
          },
          include: {
            batch: {
              include: {
                mapping: { include: { component: true } },
              },
            },
          },
        });
        const approvedCodes = new Set(
          approvedCases.map((c) => c.batch.mapping.component.code),
        );
        for (const component of components) {
          if (!approvedCodes.has(component.code)) {
            this.fail(
              'UNMODERATED_COMPONENT',
              `Component ${component.code} is not moderated-approved for this offering and period.`,
              409,
            );
          }
        }
        // Gate 2: no OPEN missing-mark findings remain in scope.
        const openMissing = await db.gradeFinding.count({
          where: {
            status: 'OPEN',
            code: 'MISSING_MARK',
            batch: { offeringRef, periodCode },
          },
        });
        if (openMissing > 0) {
          this.fail(
            'OPEN_FINDINGS',
            'Open missing-mark findings remain for this offering and period.',
            409,
          );
        }
        // Gate 3: an ACTIVE candidate list reconciles the frozen lines.
        const list = await db.assessmentCandidateList.findFirst({
          where: { offeringRef, periodCode, status: 'ACTIVE' },
          orderBy: { version: 'desc' },
        });
        if (!list) {
          this.fail(
            'CANDIDATE_LIST_REQUIRED',
            'An active candidate list is required before assembling.',
            409,
          );
        }
        const caRows = await db.officialCARecord.findMany({
          where: { offeringRef, periodCode, status: 'APPROVED' },
          orderBy: [{ studentRef: 'asc' }, { version: 'desc' }],
        });
        // Latest approved version per component+student (re-moderation
        // supersedes; history is preserved in earlier versions).
        const latest = new Map<string, (typeof caRows)[number]>();
        for (const row of caRows) {
          const slot = `${row.componentCode}::${row.studentRef}`;
          if (!latest.has(slot)) latest.set(slot, row);
        }
        const staged = new Set([...latest.values()].map((r) => r.studentRef));
        const expected = new Set(list.studentRefs);
        const missing = [...expected].filter((r) => !staged.has(r));
        const extra = [...staged].filter((r) => !expected.has(r));
        if (missing.length > 0 || extra.length > 0) {
          this.fail(
            'UNRECONCILED_CANDIDATES',
            'Reconcile the approved results against the official candidate list before assembling.',
            409,
            { missing: missing.length, extra: extra.length },
          );
        }
        // weighted-total-v1 preview: contribution = mark/maxMark*weight,
        // rounded half-up to 2dp. Null marks stay absent, never zero-fill.
        const byStudent = new Map<
          string,
          {
            parts: Array<{
              componentCode: string;
              raw: number | null;
              normalised: number | null;
              weighted: number;
            }>;
            total: number;
          }
        >();
        for (const row of latest.values()) {
          const component = components.find((c) => c.code === row.componentCode);
          if (!component) continue;
          const entry = byStudent.get(row.studentRef) ?? {
            parts: [] as Array<{
              componentCode: string;
              raw: number | null;
              normalised: number | null;
              weighted: number;
            }>,
            total: 0,
          };
          const normalised =
            row.mark === null ? null : row.mark / component.maxMark;
          const weighted =
            row.mark === null ? 0 : (row.mark / component.maxMark) * component.weight;
          entry.parts.push({
            componentCode: row.componentCode,
            raw: row.mark,
            normalised,
            weighted,
          });
          entry.total += weighted;
          byStudent.set(row.studentRef, entry);
        }
        const students = [...byStudent].map(([studentRef, v]) => ({
          studentRef,
          parts: v.parts,
          preRounded: v.total,
          rounded: Math.round((v.total + Number.EPSILON) * 100) / 100,
        }));
        const trace = {
          formulaVersion: 'weighted-total-v1',
          passMark: policy.passMark,
          policyVersion: policy.version,
          students,
          moderationRefs: approvedCases.map((c) => c.id),
          candidateListId: list.id,
        };
        const packageHash = createHash('sha256')
          .update(
            JSON.stringify({
              offeringRef,
              periodCode,
              trace,
              caRefs: [...latest.values()].map((r) => r.id).sort(),
            }),
          )
          .digest('hex');
        const max = await db.resultPackage.aggregate({
          where: { offeringRef, periodCode },
          _max: { version: true },
        });
        const created = await db.resultPackage.create({
          data: {
            offeringRef,
            periodCode,
            version: (max._max.version ?? 0) + 1,
            status: 'ASSEMBLED',
            packageHash,
            trace: json(trace),
            candidateListId: list.id,
            declaration: input.declaration,
            preparedByAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'ResultPackageAssembled', created.id, key, {
          offeringRef,
          periodCode,
        });
        return { status: 201, body: this.packageView(created) };
      },
    );
  }

  async listPackages(
    auth: AssessmentAuthority,
    filter: { offeringRef?: string; periodCode?: string },
  ) {
    await this.reader(auth);
    const rows = await this.prisma.resultPackage.findMany({
      where: {
        offeringRef: filter.offeringRef ?? undefined,
        periodCode: filter.periodCode ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { items: rows.map((r) => this.packageView(r)) };
  }

  async packageDetail(auth: AssessmentAuthority, id: string) {
    const row = await this.prisma.resultPackage.findUnique({
      where: { id },
      include: { decisions: { orderBy: { version: 'asc' } } },
    });
    if (!row) this.fail('NOT_FOUND', 'Result package not found.', 404);
    await this.reader(auth);
    return {
      ...this.packageView(row),
      decisions: row.decisions.map((d) => ({
        version: d.version,
        to: d.to,
        reason: d.reason,
        conditions: d.conditions,
        decidedBy: d.decidedByAccountId,
        decidedAt: d.decidedAt.toISOString(),
      })),
    };
  }

  async decidePackage(
    auth: AssessmentAuthority,
    key: string,
    id: string,
    version: number,
    to: string,
    reason?: string,
    conditions?: Array<Record<string, unknown>>,
  ) {
    const found = await this.prisma.resultPackage.findUnique({
      where: { id },
    });
    if (!found) this.fail('NOT_FOUND', 'Result package not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    // Board path per GAP-022: the examinations authority records board
    // decisions inside its period scope; no demo board is invented.
    // Only identity (404), role gates and scope matching stay outside:
    // every decision gate lives INSIDE command() below so the
    // idempotency replay lookup runs before the guarded write — a
    // retried key returns the stored decision even after the status
    // flipped (releaseResults pattern, TASK-PH7-006).
    await this.examiner(auth, found.periodCode);
    return this.command(
      auth,
      key,
      'DecideResultPackage',
      { id, version, to },
      async (db) => {
        // Serialize racing decisions: the version check below must see
        // rows committed by a concurrent decision, never a stale read.
        await db.$queryRaw`SELECT id FROM "ResultPackage" WHERE id = ${id} FOR UPDATE`;
        const live = await db.resultPackage.findUniqueOrThrow({
          where: { id },
        });
        // Four-eyes: the decider is never the preparer (live read, not
        // the pre-transaction snapshot above).
        if (live.preparedByAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'Board decisions require four-eyes: the decider must differ from the preparer.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        if (!(BOARD_DECISIONS as readonly string[]).includes(to)) {
          this.fail(
            'INVALID_TRANSITION',
            'Board decides APPROVE_FOR_RELEASE, RETURN, CLARIFY, CONDITION, DEFER or REFER only.',
            400,
          );
        }
        if (to !== 'APPROVE_FOR_RELEASE' && !reason?.trim()) {
          this.fail(
            'REASON_REQUIRED',
            'Returning, clarifying, conditioning, deferring or referring a package demands a recorded reason.',
            400,
          );
        }
        if (to === 'CONDITION' && (!conditions || conditions.length === 0)) {
          this.fail(
            'CONDITION_REQUIRED',
            'Conditional board decisions demand stored conditions for release enforcement.',
            400,
          );
        }
        this.checkVersion(live, version);
        if (live.status !== 'ASSEMBLED') {
          this.fail(
            'REQUEST_CLOSED',
            'Decided packages keep their outcome. Deferrals re-submit as new versions.',
            409,
          );
        }
        const status =
          to === 'APPROVE_FOR_RELEASE' ? 'APPROVED_FOR_RELEASE' : to;
        const updated = await db.resultPackage.update({
          where: { id: live.id },
          data: { status, version: { increment: 1 } },
        });
        await db.boardDecision.create({
          data: {
            packageId: live.id,
            version: live.version,
            to,
            reason: reason?.trim() ?? null,
            conditions: json(conditions ?? []),
            decidedByAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'BoardDecisionRecorded', live.id, key, {
          from: live.status,
          to,
        });
        return { body: this.packageView(updated) };
      },
    );
  }

  private releaseView(
    pkg: {
      id: string;
      version: number;
      status: string;
    },
    rows: Array<{ id: string }>,
    publishedAt: Date,
  ) {
    const releaseHash = createHash('sha256')
      .update(JSON.stringify({ packageId: pkg.id, rows: rows.map((r) => r.id).sort() }))
      .digest('hex');
    return {
      packageId: pkg.id,
      version: pkg.version,
      status: pkg.status,
      studentCount: rows.length,
      releaseHash,
      publishedAt: publishedAt.toISOString(),
    };
  }

  // Phase 7 slice 6: official result release (TASK-PH7-006, GAP-022
  // interim). Release is a distinct authorised action on an
  // APPROVED_FOR_RELEASE package: blocking board conditions, stale
  // frozen inputs and unresolvable students refuse fail-closed.
  // Immutable OfficialCourseResult rows + the release outbox event
  // commit in one TX; delivery failure never rolls back the release.
  // Concurrent releases converge on the stored rows.
  async releaseResults(auth: AssessmentAuthority, key: string, packageId: string) {
    const found = await this.prisma.resultPackage.findUnique({
      where: { id: packageId },
    });
    if (!found) this.fail('NOT_FOUND', 'Result package not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.examiner(auth, found.periodCode);
    // All release gates live INSIDE command() below: the idempotency
    // replay lookup runs before the guarded write, so a retried key
    // returns the stored release even after the status flipped. Only
    // identity (404), role gates and scope matching stay outside.
    return this.command(
      auth,
      key,
      'ReleaseOfficialCourseResults',
      { packageId },
      async (db) => {
        // Serialize racing releases: the second transaction sees the
        // flipped row and converges instead of writing twice.
        await db.$queryRaw`SELECT id FROM "ResultPackage" WHERE id = ${packageId} FOR UPDATE`;
        const live = await db.resultPackage.findUniqueOrThrow({
          where: { id: packageId },
        });
        if (live.status === 'RELEASED') {
          const existing = await db.officialCourseResult.findMany({
            where: { packageId },
            orderBy: { studentRef: 'asc' },
          });
          const publishedAt =
            existing
              .map((r) => r.publishedAt.getTime())
              .sort((a, b) => b - a)
              .map((t) => new Date(t))[0] ?? new Date();
          return { body: this.releaseView(live, existing, publishedAt) };
        }
        // Slice-5 conditions first (plain JS, no DB JSON predicates): a
        // blocking condition is the most actionable diagnosis, ahead of
        // the generic board-approval gate below.
        const decisions = await db.boardDecision.findMany({
          where: { packageId },
        });
        let conditionCount = 0;
        for (const d of decisions) {
          const list = Array.isArray(d.conditions)
            ? (d.conditions as Array<{ blocksRelease?: boolean }>)
            : [];
          conditionCount += list.length;
          if (list.some((c) => c.blocksRelease === true)) {
            this.fail(
              'CONDITION_BLOCKS_RELEASE',
              'A blocking board condition must be cleared by a new decision first.',
              409,
            );
          }
        }
        if (live.status !== 'APPROVED_FOR_RELEASE') {
          this.fail(
            'NOT_BOARD_APPROVED',
            'Release needs an approved-for-release board decision.',
            409,
          );
        }
        const trace = (live.trace ?? {}) as {
          formulaVersion?: string;
          students?: Array<{
            studentRef: string;
            rounded: number;
            parts?: unknown;
          }>;
        };
        const students = [...(trace.students ?? [])].sort((a, b) =>
          a.studentRef < b.studentRef ? -1 : 1,
        );
        // Frozen-input guard: current approved CA must still match the
        // frozen trace exactly (students and per-part marks); any drift
        // forces a fresh assembly version instead of stale release.
        const caRows = await db.officialCARecord.findMany({
          where: {
            offeringRef: live.offeringRef,
            periodCode: live.periodCode,
            status: 'APPROVED',
          },
        });
        const latest = new Map<string, (typeof caRows)[number]>();
        for (const row of [...caRows].sort((a, b) => b.version - a.version)) {
          const slot = `${row.componentCode}::${row.studentRef}`;
          if (!latest.has(slot)) latest.set(slot, row);
        }
        const frozenRefs = new Set(students.map((s) => s.studentRef));
        const currentRefs = new Set(
          [...latest.values()].map((r) => r.studentRef),
        );
        const sameRefs =
          frozenRefs.size === currentRefs.size &&
          [...frozenRefs].every((r) => currentRefs.has(r));
        let marksMatch = true;
        for (const s of students) {
          for (const part of (s.parts ?? []) as Array<{
            componentCode: string;
            raw: number | null;
          }>) {
            if (latest.get(`${part.componentCode}::${s.studentRef}`)?.mark !== part.raw) {
              marksMatch = false;
            }
          }
        }
        if (!sameRefs || !marksMatch) {
          this.fail(
            'STALE_PACKAGE',
            'Approved results changed since assembly. Assemble a new package version first.',
            409,
          );
        }
        // Fail-closed identity: every trace student must resolve to a
        // Student record. Registry corrects dangling subjects; the
        // release never publishes a silent partial.
        const resolved = await db.student.findMany({
          where: { studentNumber: { in: [...frozenRefs] } },
          select: { studentNumber: true },
        });
        const resolvedRefs = new Set(resolved.map((s) => s.studentNumber));
        const dangling = [...frozenRefs].filter((r) => !resolvedRefs.has(r));
        if (dangling.length > 0) {
          this.fail(
            'UNRESOLVED_STUDENTS',
            'Some result subjects have no student record. Registry must correct this first.',
            409,
            { count: dangling.length },
          );
        }
        const now = new Date();
        const created = [];
        for (const s of students) {
          created.push(
            await db.officialCourseResult.create({
              data: {
                offeringRef: live.offeringRef,
                periodCode: live.periodCode,
                studentRef: s.studentRef,
                total: s.rounded,
                outcome:
                  s.rounded >= (policy.passMark as unknown as number)
                    ? 'PASS'
                    : 'FAIL',
                trace: json({
                  parts: s.parts ?? [],
                  formulaVersion: trace.formulaVersion ?? 'weighted-total-v1',
                }),
                packageId: live.id,
                version: live.version,
                status: 'RELEASED',
                publishedAt: now,
              },
            }),
          );
        }
        const updated = await db.resultPackage.update({
          where: { id: live.id },
          data: { status: 'RELEASED', version: { increment: 1 } },
        });
        const view = this.releaseView(updated, created, now);
        await db.outboxEvent.create({
          data: {
            aggregate: 'ResultPackage',
            aggregateId: live.id,
            type: 'OfficialResultsReleased',
            payload: json({
              packageId: live.id,
              version: live.version,
              studentCount: created.length,
              releaseHash: view.releaseHash,
              conditionCount,
              policyVersion: policy.version,
              // Canonical chain (GAP-022 interim): the release command
              // and event travel in the payload; the stored type stays
              // the short implementation reference per DESIGN-INDEX.
              chain: {
                command: 'ReleaseOfficialCourseResults',
                event: 'OfficialResultsReleased-v1',
              },
            }),
          },
        });
        await this.audit(db, auth, 'OfficialResultsReleased', live.id, key, {
          packageId: live.id,
          studentCount: created.length,
        });
        return { status: 201, body: view };
      },
    );
  }

  async releaseDetail(auth: AssessmentAuthority, id: string) {
    const row = await this.prisma.resultPackage.findUnique({
      where: { id },
    });
    if (!row) this.fail('NOT_FOUND', 'Result package not found.', 404);
    await this.reader(auth);
    const rows = await this.prisma.officialCourseResult.findMany({
      where: { packageId: id },
      orderBy: { studentRef: 'asc' },
    });
    if (row.status !== 'RELEASED' || rows.length === 0) {
      this.fail('NOT_FOUND', 'Result package not found.', 404);
    }
    const publishedAt =
      rows
        .map((r) => r.publishedAt.getTime())
        .sort((a, b) => b - a)
        .map((t) => new Date(t))[0] ?? row.createdAt;
    return this.releaseView(row, rows, publishedAt);
  }

  // Phase 7 slice 6 student view (TASK-PH7-006). The caller sees only
  // their own RELEASED rows, resolved through Account → Person →
  // Student. Anyone without a released row gets a neutral empty set:
  // unreleased means "not yet released", never a leak. Slice 7 serves
  // the latest version per offering+period (amended supersedes).
  async studentResults(auth: AssessmentAuthority) {
    if (auth.activeRole !== 'STUDENT') this.denied();
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: auth.accountId },
    });
    const student = await this.prisma.student.findUnique({
      where: { personId: account.personId },
    });
    if (!student || student.status !== 'ACTIVE') return { items: [] };
    const rows = await this.prisma.officialCourseResult.findMany({
      where: { studentRef: student.studentNumber, status: 'RELEASED' },
      orderBy: { publishedAt: 'desc' },
    });
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const slot = `${r.offeringRef}::${r.periodCode}`;
      const kept = latest.get(slot);
      if (!kept || r.version > kept.version) latest.set(slot, r);
    }
    return {
      items: [...latest.values()].map((r) => ({
        offeringRef: r.offeringRef,
        periodCode: r.periodCode,
        studentRef: r.studentRef,
        total: r.total,
        outcome: r.outcome,
        version: r.version,
        publishedAt: r.publishedAt.toISOString(),
      })),
    };
  }

  private amendmentView(row: {
    id: string;
    packageId: string;
    studentRef: string;
    status: string;
    version: number;
    correctedTotal: number;
    correctedOutcome: string;
    reason: string;
    requestedByAccountId: string;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      packageId: row.packageId,
      studentRef: row.studentRef,
      status: row.status,
      version: row.version,
      correctedTotal: row.correctedTotal,
      correctedOutcome: row.correctedOutcome,
      reason: row.reason,
      requestedBy: row.requestedByAccountId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // Phase 7 slice 7: result amendment skeleton (TASK-PH7-007, GAP-022
  // interim). A requester opens a controlled case on one RELEASED
  // package + student; the examinations authority approves (new
  // immutable official row + impact stub + outbox in one TX) or
  // declines with reason. Originals are never edited or deleted.
  async requestAmendment(
    auth: AssessmentAuthority,
    key: string,
    input: {
      packageId: string;
      studentRef: string;
      correctedTotal: number;
      reason: string;
      evidence?: string;
      declaration: string;
    },
  ) {
    const found = await this.prisma.resultPackage.findUnique({
      where: { id: input.packageId },
    });
    if (!found) this.fail('NOT_FOUND', 'Result package not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.submitter(auth, found.offeringRef);
    // All amendment gates live INSIDE command() below so a retried key
    // replays the stored case (releaseResults/decidePackage pattern).
    // Only identity (404), role gates and scope matching stay outside.
    return this.command(
      auth,
      key,
      'RequestOfficialResultAmendment',
      { packageId: input.packageId, studentRef: input.studentRef },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "ResultPackage" WHERE id = ${input.packageId} FOR UPDATE`;
        const live = await db.resultPackage.findUniqueOrThrow({
          where: { id: input.packageId },
        });
        if (live.status !== 'RELEASED') {
          this.fail(
            'NOT_RELEASED',
            'Amendments open only on released official results.',
            409,
          );
        }
        if (input.declaration !== AMENDMENT_DECLARATION) {
          this.fail(
            'DECLARATION_REQUIRED',
            'Accept the exact amendment declaration before submitting.',
            400,
          );
        }
        if (
          typeof input.correctedTotal !== 'number' ||
          Number.isNaN(input.correctedTotal) ||
          input.correctedTotal < 0 ||
          input.correctedTotal > 100
        ) {
          this.fail(
            'OUT_OF_RANGE',
            'Corrected totals stay on the 0–100 demo scale.',
            400,
          );
        }
        if (!input.reason?.trim()) {
          this.fail(
            'REASON_REQUIRED',
            'Amendments demand a recorded reason with documented authority.',
            400,
          );
        }
        const released = await db.officialCourseResult.findMany({
          where: {
            packageId: live.id,
            studentRef: input.studentRef,
            status: 'RELEASED',
          },
          orderBy: { version: 'desc' },
        });
        if (released.length === 0) {
          this.fail(
            'UNKNOWN_STUDENT',
            'No released result for this student on this package.',
            409,
          );
        }
        const existing = await db.resultAmendmentCase.findMany({
          where: { packageId: live.id, studentRef: input.studentRef },
          orderBy: { version: 'desc' },
        });
        if (existing.some((c) => c.status === 'OPEN')) {
          this.fail(
            'CASE_OPEN',
            'An amendment case is already open for this student. Decide it first.',
            409,
          );
        }
        const version =
          (existing.map((c) => c.version).sort((a, b) => b - a)[0] ?? 0) + 1;
        const created = await db.resultAmendmentCase.create({
          data: {
            packageId: live.id,
            offeringRef: live.offeringRef,
            periodCode: live.periodCode,
            studentRef: input.studentRef,
            supersedesId: released[0].id,
            correctedTotal: input.correctedTotal,
            correctedOutcome:
              input.correctedTotal >= (policy.passMark as unknown as number)
                ? 'PASS'
                : 'FAIL',
            reason: input.reason.trim(),
            evidence: input.evidence?.trim() || null,
            declaration: input.declaration,
            status: 'OPEN',
            version,
            requestedByAccountId: auth.accountId,
          },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'ResultAmendmentCase',
            aggregateId: created.id,
            type: 'OfficialResultAmendmentRequested',
            payload: json({
              caseId: created.id,
              packageId: live.id,
              studentRef: input.studentRef,
              chain: {
                command: 'RequestOfficialResultAmendment',
                event: 'OfficialResultAmendmentRequested-v1',
              },
            }),
          },
        });
        await this.audit(db, auth, 'OfficialResultAmendmentRequested', created.id, key, {
          packageId: live.id,
          studentRef: input.studentRef,
        });
        return { status: 201, body: this.amendmentView(created) };
      },
    );
  }

  async decideAmendment(
    auth: AssessmentAuthority,
    key: string,
    id: string,
    version: number,
    to: string,
    reason?: string,
  ) {
    const found = await this.prisma.resultAmendmentCase.findUnique({
      where: { id },
    });
    if (!found) this.fail('NOT_FOUND', 'Amendment case not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.examiner(auth, found.periodCode);
    return this.command(
      auth,
      key,
      'ApproveOfficialResultAmendment',
      { id, version, to },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "ResultAmendmentCase" WHERE id = ${id} FOR UPDATE`;
        const live = await db.resultAmendmentCase.findUniqueOrThrow({
          where: { id },
        });
        // Four-eyes: the approver is never the requester.
        if (live.requestedByAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'Amendment approval requires four-eyes: the approver must differ from the requester.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        if (!['APPROVE', 'DECLINE'].includes(to)) {
          this.fail(
            'INVALID_TRANSITION',
            'Amendment cases decide APPROVE or DECLINE only.',
            400,
          );
        }
        if (to === 'DECLINE' && !reason?.trim()) {
          this.fail(
            'REASON_REQUIRED',
            'Declining an amendment demands a recorded reason.',
            400,
          );
        }
        this.checkVersion(live, version);
        if (live.status !== 'OPEN') {
          this.fail(
            'REQUEST_CLOSED',
            'Decided amendment cases keep their outcome. Open a new case for further correction.',
            409,
          );
        }
        if (to === 'DECLINE') {
          const declined = await db.resultAmendmentCase.update({
            where: { id: live.id },
            data: {
              status: 'DECLINED',
              decidedByAccountId: auth.accountId,
              decidedAt: new Date(),
            },
          });
          await this.audit(db, auth, 'OfficialResultAmendmentDeclined', live.id, key, {
            reason: reason?.trim(),
          });
          return { body: this.amendmentView(declined) };
        }
        // APPROVE: new immutable official row (supersede link in trace,
        // never an edit) + impact stub + outbox in one TX.
        const prior = await db.officialCourseResult.findMany({
          where: {
            offeringRef: live.offeringRef,
            periodCode: live.periodCode,
            studentRef: live.studentRef,
            status: 'RELEASED',
          },
          orderBy: { version: 'desc' },
        });
        if (prior.length === 0) {
          this.fail(
            'UNKNOWN_STUDENT',
            'No released result remains for this student.',
            409,
          );
        }
        const nextVersion =
          (prior.map((r) => r.version).sort((a, b) => b - a)[0] ?? 0) + 1;
        const now = new Date();
        const created = await db.officialCourseResult.create({
          data: {
            offeringRef: live.offeringRef,
            periodCode: live.periodCode,
            studentRef: live.studentRef,
            total: live.correctedTotal,
            outcome: live.correctedOutcome,
            trace: json({
              supersedesId: live.supersedesId,
              amendmentCaseId: live.id,
              formulaVersion: 'weighted-total-v1',
            }),
            packageId: live.packageId,
            version: nextVersion,
            status: 'RELEASED',
            publishedAt: now,
          },
        });
        const decided = await db.resultAmendmentCase.update({
          where: { id: live.id },
          data: {
            status: 'APPROVED',
            decidedByAccountId: auth.accountId,
            decidedAt: now,
          },
        });
        const impact = await db.academicImpactTask.create({
          data: {
            amendmentCaseId: live.id,
            studentRef: live.studentRef,
            kind: 'PROGRESSION_RECALC',
            status: 'PENDING',
            detail: json({
              offeringRef: live.offeringRef,
              periodCode: live.periodCode,
              priorVersion: prior[0].version,
              nextVersion,
            }),
          },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'ResultAmendmentCase',
            aggregateId: live.id,
            type: 'OfficialResultAmended',
            payload: json({
              caseId: live.id,
              packageId: live.packageId,
              studentRef: live.studentRef,
              nextVersion,
              impactTaskId: impact.id,
              chain: {
                command: 'ApproveOfficialResultAmendment',
                event: 'OfficialResultAmended-v1',
              },
            }),
          },
        });
        await this.audit(db, auth, 'OfficialResultAmended', live.id, key, {
          packageId: live.packageId,
          studentRef: live.studentRef,
          nextVersion,
          resultId: created.id,
        });
        return { status: 201, body: this.amendmentView(decided) };
      },
    );
  }

  async listAmendments(
    auth: AssessmentAuthority,
    filters: { packageId?: string; status?: string },
  ) {
    await this.reader(auth);
    const rows = await this.prisma.resultAmendmentCase.findMany({
      where: {
        ...(filters.packageId ? { packageId: filters.packageId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((r) => this.amendmentView(r)) };
  }

  async amendmentDetail(auth: AssessmentAuthority, id: string) {
    const row = await this.prisma.resultAmendmentCase.findUnique({
      where: { id },
    });
    if (!row) this.fail('NOT_FOUND', 'Amendment case not found.', 404);
    await this.reader(auth);
    const impacts = await this.prisma.academicImpactTask.findMany({
      where: { amendmentCaseId: id },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ...this.amendmentView(row),
      decidedBy: row.decidedByAccountId,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      impacts: impacts.map((t) => ({
        id: t.id,
        kind: t.kind,
        status: t.status,
        studentRef: t.studentRef,
      })),
    };
  }
}
