import type { Prisma } from '@prisma/client';
import { PrismaService } from '../identity-access/prisma.service.js';

type Tx = Prisma.TransactionClient;
import type {
  ActualEnrolment,
  ActualGroupMember,
  MoodleAdapter,
  ShellHandle,
} from './moodle-adapter.js';
import {
  applyEnrolment as simApplyEnrolment,
  applyGroupMember as simApplyGroupMember,
  applyRemoval as simApplyRemoval,
  applyStaffRole as simApplyStaffRole,
  ensureSimShell,
  type SimScenario,
} from './moodle-simulator.js';

/**
 * Simulator backend: executes operations against the Sim* projection
 * tables through the deterministic adapter. Reads serve reconciliation
 * from the same rows. Explicitly labelled demo state, never production.
 */
export class SimulatorAdapter implements MoodleAdapter {
  readonly backend = 'simulator' as const;

  constructor(private readonly prisma: PrismaService) {}

  async ensureShell(input: {
    db: Tx;
    shellRef: string;
    offeringId: string;
    periodId: string;
  }): Promise<{ id: string; created: boolean }> {
    return ensureSimShell(input.db, {
      shellRef: input.shellRef,
      offeringId: input.offeringId,
      periodId: input.periodId,
    });
  }

  async applyEnrolment(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    role: string;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS' | 'MISMATCHED'> {
    return simApplyEnrolment(input.db, {
      shellId: input.shell.id,
      studentId: input.studentId,
      role: input.role,
      scenario: input.scenario as SimScenario,
    });
  }

  async applyRemoval(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    scenario: string;
  }): Promise<'SUSPENDED' | 'ABSENT'> {
    return simApplyRemoval(
      input.db,
      input.shell.id,
      input.studentId,
      input.scenario as SimScenario,
    );
  }

  async applyStaffRole(input: {
    db: Tx;
    shell: ShellHandle;
    accountId: string;
    moodleRole: string;
    quizScope: unknown;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS'> {
    return simApplyStaffRole(input.db, {
      shellId: input.shell.id,
      accountId: input.accountId,
      moodleRole: input.moodleRole,
      quizScope: input.quizScope,
      scenario: input.scenario as SimScenario,
    });
  }

  async applyGroupMember(input: {
    db: Tx;
    shell: ShellHandle;
    groupId: string;
    studentId: string;
    scenario: string;
    remove?: boolean;
  }): Promise<'CREATED' | 'EXISTS' | 'SUSPENDED' | 'ABSENT'> {
    return simApplyGroupMember(input.db, {
      shellId: input.shell.id,
      groupId: input.groupId,
      studentId: input.studentId,
      scenario: input.scenario as SimScenario,
      remove: input.remove,
    });
  }

  async suspendAccess(input: {
    db: Tx;
    shell: ShellHandle;
    studentKey: string;
  }): Promise<'SUSPENDED' | 'ABSENT'> {
    const existing = await input.db.simStudentEnrolment.findFirst({
      where: { shellId: input.shell.id, studentId: input.studentKey },
    });
    if (!existing) return 'ABSENT';
    await input.db.simStudentEnrolment.update({
      where: { id: existing.id },
      data: { status: 'SUSPENDED' },
    });
    return 'SUSPENDED';
  }

  async listActualEnrolments(
    shell: ShellHandle,
  ): Promise<ActualEnrolment[]> {
    const rows = await this.prisma.simStudentEnrolment.findMany({
      where: { shellId: shell.id },
    });
    return rows.map((r) => ({
      key: r.studentId,
      role: r.role,
      status: r.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
    }));
  }

  async listActualGroupMembers(
    shell: ShellHandle,
  ): Promise<ActualGroupMember[]> {
    const rows = await this.prisma.simGroupMember.findMany({
      where: { shellId: shell.id },
    });
    return rows.map((r) => ({
      groupKey: r.groupId,
      studentKey: r.studentId,
      status: r.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
    }));
  }

  async validateConnection(): Promise<{
    ok: boolean;
    backend: 'simulator';
    version: string | null;
    detail: string;
  }> {
    return {
      ok: true,
      backend: 'simulator',
      version: 'MOODLE-SIM-v1',
      detail:
        'Labelled demonstration simulator. No real Moodle is contacted.',
    };
  }
}
