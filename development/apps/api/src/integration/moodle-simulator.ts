import { Prisma } from '@prisma/client';

// MOODLE-SIM-v1 deterministic simulator adapter (TASK-PH6-003). It
// translates delivery operations into simulator rows and nothing else:
// no academic, finance or policy logic lives here. Scenarios reproduce
// success, timeout, duplicate delivery, mismatch and outage with no
// real credentials; every row is explicitly labelled simulator state.
export class SimulatorError extends Error {
  constructor(
    public readonly kind: 'TIMEOUT' | 'OUTAGE',
    message: string,
  ) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

export interface ShellRef {
  shellRef: string;
  offeringId: string;
  periodId: string;
}

export async function ensureSimShell(
  db: Tx,
  ref: ShellRef,
): Promise<{ id: string; created: boolean }> {
  const existing = await db.simShell.findUnique({
    where: { shellRef: ref.shellRef },
  });
  if (existing) return { id: existing.id, created: false };
  const created = await db.simShell.create({
    data: {
      shellRef: ref.shellRef,
      offeringId: ref.offeringId,
      periodId: ref.periodId,
      status: 'ACTIVE',
    },
  });
  return { id: created.id, created: true };
}

export type SimScenario = 'SUCCESS' | 'TIMEOUT' | 'DUPLICATE' | 'MISMATCH' | 'OUTAGE';

export interface EnrolOp {
  shellId: string;
  studentId: string;
  role: string;
  scenario: SimScenario;
}

function failOn(scenario: SimScenario): void {
  if (scenario === 'TIMEOUT')
    throw new SimulatorError('TIMEOUT', 'Simulator timed out.');
  if (scenario === 'OUTAGE')
    throw new SimulatorError('OUTAGE', 'Simulator is unreachable.');
}

async function applyOnce(
  db: Tx,
  op: EnrolOp,
): Promise<'CREATED' | 'EXISTS' | 'MISMATCHED'> {
  if (op.scenario === 'MISMATCH') {
    // Wrong-role enrolment: the drift reconciliation (slice 6) must flag.
    await db.simStudentEnrolment.upsert({
      where: {
        shellId_studentId: { shellId: op.shellId, studentId: op.studentId },
      },
      update: { status: 'SUSPENDED', role: 'Suspended' },
      create: {
        shellId: op.shellId,
        studentId: op.studentId,
        role: 'Suspended',
        status: 'SUSPENDED',
      },
    });
    return 'MISMATCHED';
  }
  const existing = await db.simStudentEnrolment.findUnique({
    where: {
      shellId_studentId: { shellId: op.shellId, studentId: op.studentId },
    },
  });
  if (existing) {
    if (existing.status !== 'ACTIVE' || existing.role !== op.role) {
      await db.simStudentEnrolment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', role: op.role },
      });
    }
    return 'EXISTS';
  }
  await db.simStudentEnrolment.create({
    data: {
      shellId: op.shellId,
      studentId: op.studentId,
      role: op.role,
      status: 'ACTIVE',
    },
  });
  return 'CREATED';
}

export async function applyEnrolment(
  db: Tx,
  op: EnrolOp,
): Promise<'CREATED' | 'EXISTS' | 'MISMATCHED'> {
  failOn(op.scenario);
  const first = await applyOnce(db, op);
  if (op.scenario === 'DUPLICATE') {
    // Second delivery of the same operation converges by unique guard.
    await applyOnce(db, { ...op, scenario: 'SUCCESS' });
  }
  return first;
}

export async function applyRemoval(
  db: Tx,
  shellId: string,
  studentId: string,
  scenario: SimScenario,
): Promise<'SUSPENDED' | 'ABSENT'> {
  failOn(scenario);
  const existing = await db.simStudentEnrolment.findUnique({
    where: { shellId_studentId: { shellId, studentId } },
  });
  if (!existing) return 'ABSENT';
  // Suspensions retain learning history; rows are never deleted.
  await db.simStudentEnrolment.update({
    where: { id: existing.id },
    data: { status: 'SUSPENDED' },
  });
  return 'SUSPENDED';
}

export async function applyStaffRole(
  db: Tx,
  input: {
    shellId: string;
    accountId: string;
    moodleRole: string;
    quizScope: unknown;
    scenario: SimScenario;
  },
): Promise<'CREATED' | 'EXISTS'> {
  failOn(input.scenario);
  const existing = await db.simStaffRole.findUnique({
    where: {
      shellId_accountId: { shellId: input.shellId, accountId: input.accountId },
    },
  });
  if (existing) {
    await db.simStaffRole.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        moodleRole: input.moodleRole,
        quizScope: input.quizScope as Prisma.InputJsonValue,
      },
    });
    return 'EXISTS';
  }
  await db.simStaffRole.create({
    data: {
      shellId: input.shellId,
      accountId: input.accountId,
      moodleRole: input.moodleRole,
      quizScope: input.quizScope as Prisma.InputJsonValue,
      status: 'ACTIVE',
    },
  });
  return 'CREATED';
}

export async function applyGroupMember(
  db: Tx,
  input: {
    shellId: string;
    groupId: string;
    studentId: string;
    scenario: SimScenario;
    remove?: boolean;
  },
): Promise<'CREATED' | 'EXISTS' | 'SUSPENDED' | 'ABSENT'> {
  failOn(input.scenario);
  const key = {
    shellId_groupId_studentId: {
      shellId: input.shellId,
      groupId: input.groupId,
      studentId: input.studentId,
    },
  };
  const existing = await db.simGroupMember.findUnique({ where: key });
  if (input.remove) {
    if (!existing) return 'ABSENT';
    await db.simGroupMember.update({
      where: { id: existing.id },
      data: { status: 'SUSPENDED' },
    });
    return 'SUSPENDED';
  }
  if (existing) {
    if (existing.status !== 'ACTIVE') {
      await db.simGroupMember.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    }
    return 'EXISTS';
  }
  await db.simGroupMember.create({
    data: {
      shellId: input.shellId,
      groupId: input.groupId,
      studentId: input.studentId,
      status: 'ACTIVE',
    },
  });
  return 'CREATED';
}
