import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { TEACHING_DEMO_V1 as policy } from '@sis/config';
import { queueMoodleEvent } from '../integration/integration.service.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface TeachingAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 6 slice 0: tutorial-group and teaching-assignment sources
// (TASK-PH6-000). SIS-authoritative academic data; Moodle mirrors from
// slice 3 on. Activation needs a tutor; allocations never over-enrol;
// quiz authority derives from explicit capability + scope + dates.
@Injectable()
export class TeachingService {
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
          'Review the teaching workspace state, or contact the programme office.',
        ...extra,
      },
      status,
    );
  }

  private async liveAssignment(
    auth: TeachingAuthority,
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

  private async coordinator(
    auth: TeachingAuthority,
    capability: string,
    programmeCode?: string,
  ) {
    const assignment = await this.liveAssignment(
      auth,
      'COORDINATOR',
      capability,
    );
    if (!assignment || auth.activeRole !== 'COORDINATOR') {
      throw new HttpException(
        { message: 'This teaching workspace is unavailable.' },
        403,
      );
    }
    // Programme-scoped coordinators act only for their programme.
    if (
      programmeCode &&
      assignment.scopeType === 'PROGRAMME' &&
      assignment.scopeRef !== programmeCode
    ) {
      throw new HttpException(
        { message: 'This teaching workspace is unavailable.' },
        403,
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
          code: 'TEACHING_UNAVAILABLE',
          message:
            'The teaching service could not complete this action. Check the current state before retrying.',
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
        activeRole: actor.activeRole ?? 'COORDINATOR',
        scope: `TEACHING:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Tutorial-group and teaching management',
        metadata: json(metadata),
      },
    });
  }

  private groupView(row: {
    id: string;
    name: string;
    capacity: number;
    status: string;
    version: number;
    offering: { intake: string; programme: { code: string; name: string } };
    allocations: Array<{ status: string }>;
  }) {
    return {
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      status: row.status,
      version: row.version,
      programme: row.offering.programme.code,
      intake: row.offering.intake,
      allocated: row.allocations.filter((a) => a.status === 'ACTIVE').length,
    };
  }

  async createGroup(
    auth: TeachingAuthority,
    key: string,
    input: {
      offeringId: string;
      name: string;
      capacity: number;
      meetingPattern?: string;
      tutorRequirement?: string;
      venue?: string;
      mode?: string;
      allocationRule?: string;
    },
  ) {
    const offering = await this.prisma.programmeOffering.findUnique({
      where: { id: input.offeringId },
      include: { programme: true },
    });
    if (!offering) this.fail('NOT_FOUND', 'Programme offering not found.', 404);
    await this.coordinator(auth, 'manage-tutorial-groups', offering.programme.code);
    if (!input.name.trim()) this.fail('EMPTY_NAME', 'Name the tutorial group.', 400);
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
      this.fail('INVALID_CAPACITY', 'Capacity must be a positive whole number.', 400);
    }
    const result = await this.command(
      auth,
      key,
      'CreateTutorialGroup',
      { ...input },
      async (db) => {
        const clash = await db.tutorialGroup.findUnique({
          where: {
            offeringId_name: { offeringId: input.offeringId, name: input.name.trim() },
          },
        });
        if (clash) {
          this.fail(
            'DUPLICATE_TASK',
            'A tutorial group with this name already exists for the offering.',
            409,
            { groupId: clash.id },
          );
        }
        const created = await db.tutorialGroup.create({
          data: {
            offeringId: input.offeringId,
            name: input.name.trim(),
            capacity: input.capacity,
            meetingPattern: input.meetingPattern?.trim() || null,
            tutorRequirement: input.tutorRequirement?.trim() || null,
            venue: input.venue?.trim() || null,
            mode: input.mode?.trim() || null,
            allocationRule: input.allocationRule?.trim() || null,
            status: 'DRAFT',
          },
          include: {
            offering: { include: { programme: true } },
            allocations: true,
          },
        });
        await this.audit(db, auth, 'TutorialGroupCreated', created.id, key, {
          name: created.name,
        });
        return { body: this.groupView(created) };
      },
    );
    return result;
  }

  async activateGroup(auth: TeachingAuthority, key: string, groupId: string) {
    const group = await this.prisma.tutorialGroup.findUnique({
      where: { id: groupId },
      include: { offering: { include: { programme: true } } },
    });
    if (!group) this.fail('NOT_FOUND', 'Tutorial group not found.', 404);
    await this.coordinator(
      auth,
      'manage-tutorial-groups',
      group.offering.programme.code,
    );
    const result = await this.command(
      auth,
      key,
      'ActivateTutorialGroup',
      { groupId },
      async (db) => {
        const live = await db.tutorialGroup.findUniqueOrThrow({
          where: { id: groupId },
        });
        if (live.status === 'ACTIVE') {
          return {
            body: { id: live.id, status: live.status, version: live.version },
          };
        }
        if (live.status !== 'DRAFT') {
          this.fail(
            'WRONG_STATE',
            'Only draft groups can be activated.',
            409,
          );
        }
        // A tutor must exist before the group becomes available.
        const tutor = await db.teachingAssignment.findFirst({
          where: {
            groupId: live.id,
            status: 'ACTIVE',
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
          },
        });
        if (!tutor) {
          this.fail(
            'TUTOR_REQUIRED',
            'Assign an active tutor before activating this group.',
            409,
          );
        }
        const activated = await db.tutorialGroup.update({
          where: { id: live.id },
          data: { status: 'ACTIVE', version: { increment: 1 } },
        });
        await this.audit(db, auth, 'TutorialGroupActivated', live.id, key, {});
        return {
          body: {
            id: activated.id,
            status: activated.status,
            version: activated.version,
          },
        };
      },
    );
    return result;
  }

  async closeGroup(auth: TeachingAuthority, key: string, groupId: string) {
    const group = await this.prisma.tutorialGroup.findUnique({
      where: { id: groupId },
      include: { offering: { include: { programme: true } } },
    });
    if (!group) this.fail('NOT_FOUND', 'Tutorial group not found.', 404);
    await this.coordinator(
      auth,
      'manage-tutorial-groups',
      group.offering.programme.code,
    );
    const result = await this.command(
      auth,
      key,
      'CloseTutorialGroup',
      { groupId },
      async (db) => {
        const closed = await db.tutorialGroup.update({
          where: { id: groupId },
          data: { status: 'CLOSED', version: { increment: 1 } },
        });
        await this.audit(db, auth, 'TutorialGroupClosed', groupId, key, {});
        return {
          body: { id: closed.id, status: closed.status, version: closed.version },
        };
      },
    );
    return result;
  }

  async allocateStudent(
    auth: TeachingAuthority,
    key: string,
    input: { groupId: string; studentNumber: string; reason: string },
  ) {
    const group = await this.prisma.tutorialGroup.findUnique({
      where: { id: input.groupId },
      include: { offering: { include: { programme: true } } },
    });
    if (!group) this.fail('NOT_FOUND', 'Tutorial group not found.', 404);
    await this.coordinator(
      auth,
      'manage-tutorial-groups',
      group.offering.programme.code,
    );
    if (!input.reason.trim()) {
      this.fail('EMPTY_REASON', 'State the reason for this allocation.', 400);
    }
    if (group.status !== 'ACTIVE') {
      this.fail(
        'GROUP_NOT_ACTIVE',
        'Students join only active tutorial groups.',
        409,
      );
    }
    const student = await this.prisma.student.findUnique({
      where: { studentNumber: input.studentNumber.trim() },
      include: { attempts: true },
    });
    if (!student) this.fail('NOT_FOUND', 'Student record not found.', 404);
    const attempt = student.attempts.find(
      (a) => a.offeringId === group.offeringId,
    );
    if (!attempt) {
      this.fail(
        'WRONG_OFFERING',
        'This student has no attempt for the group offering.',
        409,
      );
    }
    const result = await this.command(
      auth,
      key,
      'AllocateTGStudent',
      { ...input },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "TutorialGroup" WHERE id = ${group.id} FOR UPDATE`;
        const existing = await db.tGAllocation.findUnique({
          where: {
            groupId_studentId: { groupId: group.id, studentId: student.id },
          },
        });
        if (existing?.status === 'ACTIVE') {
          this.fail(
            'DUPLICATE_TASK',
            'This student is already allocated to the group.',
            409,
            { allocationId: existing.id },
          );
        }
        const count = await db.tGAllocation.count({
          where: { groupId: group.id, status: 'ACTIVE' },
        });
        if (count + 1 > group.capacity) {
          this.fail(
            'TG_FULL',
            'This group is full. Allocation beyond capacity is refused.',
            409,
          );
        }
        const created = existing
          ? await db.tGAllocation.update({
              where: { id: existing.id },
              data: { status: 'ACTIVE', reason: input.reason.trim() },
            })
          : await db.tGAllocation.create({
              data: {
                groupId: group.id,
                studentId: student.id,
                reason: input.reason.trim(),
                status: 'ACTIVE',
              },
            });
        await this.audit(db, auth, 'TGStudentAllocated', created.id, key, {
          groupId: group.id,
        });
        await queueMoodleEvent(db, {
          aggregate: 'TutorialGroup',
          aggregateId: group.id,
          type: 'MoodleGroupSyncQueued',
          eventType: 'zm.sis.tutorial-group.member-changed.v1',
          payload: {
            groupId: group.id,
            studentId: student.id,
            action: 'ADD',
          },
          key,
        });
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async removeAllocation(
    auth: TeachingAuthority,
    key: string,
    allocationId: string,
  ) {
    const row = await this.prisma.tGAllocation.findUnique({
      where: { id: allocationId },
      include: { group: { include: { offering: { include: { programme: true } } } } },
    });
    if (!row) this.fail('NOT_FOUND', 'Allocation not found.', 404);
    await this.coordinator(
      auth,
      'manage-tutorial-groups',
      row.group.offering.programme.code,
    );
    const result = await this.command(
      auth,
      key,
      'RemoveTGAllocation',
      { allocationId },
      async (db) => {
        // History preserved: rows flip to REMOVED, never delete.
        const updated = await db.tGAllocation.update({
          where: { id: allocationId },
          data: { status: 'REMOVED' },
        });
        await this.audit(db, auth, 'TGAllocationRemoved', allocationId, key, {});
        await queueMoodleEvent(db, {
          aggregate: 'TutorialGroup',
          aggregateId: row.groupId,
          type: 'MoodleGroupSyncQueued',
          eventType: 'zm.sis.tutorial-group.member-changed.v1',
          payload: {
            groupId: row.groupId,
            studentId: row.studentId,
            action: 'REMOVE',
          },
          key,
        });
        return { body: { id: updated.id, status: updated.status } };
      },
    );
    return result;
  }

  async assignTeaching(
    auth: TeachingAuthority,
    key: string,
    input: {
      username: string;
      role: string;
      offeringId?: string;
      groupId?: string;
      capabilities: string[];
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ) {
    await this.coordinator(auth, 'assign-teaching');
    const roles = policy.assignableRoles as unknown as string[];
    if (!roles.includes(input.role)) {
      this.fail(
        'UNKNOWN_ROLE',
        'Teaching roles come from the approved list.',
        400,
      );
    }
    const account = await this.prisma.account.findUnique({
      where: { username: input.username },
    });
    if (!account || account.status !== 'ACTIVE') {
      this.fail('NOT_FOUND', 'Staff account not found.', 404);
    }
    if (input.offeringId) {
      const offering = await this.prisma.programmeOffering.findUnique({
        where: { id: input.offeringId },
      });
      if (!offering) this.fail('NOT_FOUND', 'Programme offering not found.', 404);
    }
    if (input.groupId) {
      const group = await this.prisma.tutorialGroup.findUnique({
        where: { id: input.groupId },
      });
      if (!group) this.fail('NOT_FOUND', 'Tutorial group not found.', 404);
    }
    const result = await this.command(
      auth,
      key,
      'AssignTeaching',
      { ...input },
      async (db) => {
        const created = await db.teachingAssignment.create({
          data: {
            accountId: account.id,
            role: input.role,
            offeringId: input.offeringId ?? null,
            groupId: input.groupId ?? null,
            capabilities: input.capabilities,
            effectiveFrom: input.effectiveFrom
              ? new Date(input.effectiveFrom)
              : null,
            effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
            status: 'PROPOSED',
            authorizerAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'TeachingAssigned', created.id, key, {
          role: created.role,
        });
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async decideAssignment(
    auth: TeachingAuthority,
    key: string,
    id: string,
    approve: boolean,
  ) {
    await this.coordinator(auth, 'assign-teaching');
    const result = await this.command(
      auth,
      key,
      approve ? 'ApproveTeachingAssignment' : 'SuspendTeachingAssignment',
      { id, approve },
      async (db) => {
        const row = await db.teachingAssignment.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Assignment not found.', 404);
        if (approve && row.status !== 'PROPOSED') {
          this.fail('REQUEST_CLOSED', 'This assignment is already decided.', 409);
        }
        const updated = await db.teachingAssignment.update({
          where: { id: row.id },
          data: { status: approve ? 'ACTIVE' : 'SUSPENDED' },
        });
        await this.audit(
          db,
          auth,
          approve ? 'TeachingAssignmentApproved' : 'TeachingAssignmentSuspended',
          row.id,
          key,
          {},
        );
        if (approve) {
          await queueMoodleEvent(db, {
            aggregate: 'TeachingAssignment',
            aggregateId: row.id,
            type: 'MoodleTeachingRoleQueued',
            eventType: 'zm.sis.teaching-assignment.activated.v1',
            payload: { assignmentId: row.id },
            key,
          });
        }
        return { body: { id: updated.id, status: updated.status } };
      },
    );
    return result;
  }

  async endAssignment(auth: TeachingAuthority, key: string, id: string) {
    await this.coordinator(auth, 'assign-teaching');
    const result = await this.command(
      auth,
      key,
      'EndTeachingAssignment',
      { id },
      async (db) => {
        const row = await db.teachingAssignment.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Assignment not found.', 404);
        const updated = await db.teachingAssignment.update({
          where: { id: row.id },
          data: { status: 'ENDED' },
        });
        await this.audit(db, auth, 'TeachingAssignmentEnded', row.id, key, {});
        return { body: { id: updated.id, status: updated.status } };
      },
    );
    return result;
  }

  async quizAuthority(
    auth: TeachingAuthority,
    input: { accountId?: string; groupId?: string },
  ) {
    // Coordinators check anyone; everyone else checks only themselves.
    const targetId = input.accountId ?? auth.accountId;
    if (targetId !== auth.accountId) {
      await this.coordinator(auth, 'assign-teaching');
    } else {
      const self = await this.liveAssignment(auth, 'STUDENT', 'study');
      const staff = await this.prisma.roleAssignment.findFirst({
        where: {
          id: auth.assignmentId ?? undefined,
          accountId: auth.accountId,
        },
      });
      if (!self && !staff) {
        throw new HttpException(
          { message: 'This teaching workspace is unavailable.' },
          403,
        );
      }
    }
    const now = new Date();
    const rows = await this.prisma.teachingAssignment.findMany({
      where: {
        accountId: targetId,
        status: 'ACTIVE',
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          },
        ],
      },
    });
    const capable = rows.filter((r) =>
      r.capabilities.includes(
        policy.quizCapability as unknown as string,
      ),
    );
    if (capable.length === 0) {
      return {
        allowed: false,
        scope: null,
        reason:
          'No active teaching assignment grants quiz creation and marking.',
      };
    }
    if (input.groupId) {
      const match = capable.find((r) => r.groupId === input.groupId);
      if (!match) {
        return {
          allowed: false,
          scope: null,
          reason: 'Quiz authority covers assigned tutorial groups only.',
        };
      }
      return {
        allowed: true,
        scope: 'TG',
        groupIds: [match.groupId],
        reason: 'Assignment grants quiz authority for this group.',
      };
    }
    const tgScoped = capable.filter((r) => r.groupId);
    if (tgScoped.length > 0 && tgScoped.length === capable.length) {
      return {
        allowed: true,
        scope: 'TG',
        groupIds: tgScoped.map((r) => r.groupId as string),
        reason: 'Assignment grants quiz authority for assigned groups.',
      };
    }
    return {
      allowed: true,
      scope: 'COURSE',
      groupIds: [],
      reason: 'Assignment grants course-wide quiz authority.',
    };
  }

  async listGroups(auth: TeachingAuthority) {
    const officer = await this.liveAssignment(
      auth,
      'COORDINATOR',
      'manage-tutorial-groups',
    );
    if (officer && auth.activeRole === 'COORDINATOR') {
      const rows = await this.prisma.tutorialGroup.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          offering: { include: { programme: true } },
          allocations: true,
        },
        take: 200,
      });
      return { items: rows.map((r) => this.groupView(r)) };
    }
    // Students see groups holding their active allocations.
    const student = await this.prisma.student.findFirst({
      where: {
        person: { accounts: { some: { id: auth.accountId } } },
      },
      include: {
        tgAllocations: {
          where: { status: 'ACTIVE' },
          include: {
            group: {
              include: {
                offering: { include: { programme: true } },
                allocations: true,
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new HttpException(
        { message: 'This teaching workspace is unavailable.' },
        403,
      );
    }
    return {
      items: student.tgAllocations.map((a) => this.groupView(a.group)),
    };
  }

  async groupDetail(auth: TeachingAuthority, groupId: string) {
    const row = await this.prisma.tutorialGroup.findUnique({
      where: { id: groupId },
      include: {
        offering: { include: { programme: true } },
        allocations: {
          include: { student: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!row) this.fail('NOT_FOUND', 'Tutorial group not found.', 404);
    const officer = await this.liveAssignment(
      auth,
      'COORDINATOR',
      'manage-tutorial-groups',
    );
    // Coordinators see everything; students see only their own groups.
    if (!(officer && auth.activeRole === 'COORDINATOR')) {
      const student = await this.prisma.student.findFirst({
        where: { person: { accounts: { some: { id: auth.accountId } } } },
      });
      const member = row.allocations.some(
        (a) => a.status === 'ACTIVE' && student && a.studentId === student.id,
      );
      if (!member) {
        throw new HttpException(
          { message: 'This teaching workspace is unavailable.' },
          403,
        );
      }
    }
    return {
      ...this.groupView({
        ...row,
        allocations: row.allocations.map((a) => ({ status: a.status })),
      }),
      members: row.allocations
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ studentNumber: a.student.studentNumber })),
    };
  }
}
