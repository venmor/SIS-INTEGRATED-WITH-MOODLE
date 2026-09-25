import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ASSESSMENT_DEMO_V1 as policy, MOODLE_DEMO_V1 as moodle } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

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
      // batch, so a lost response never creates a second snapshot.
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
}
