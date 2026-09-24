import type { Prisma } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

/** Which backend executes Moodle operations. Simulator is the default;
 * live engages only with explicit URL + token configuration. */
export type MoodleBackend = 'simulator' | 'live';

export class MoodleConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoodleConfigurationError';
  }
}

export type ApplyResult =
  | 'CREATED'
  | 'EXISTS'
  | 'SUSPENDED'
  | 'ABSENT'
  | 'MISMATCHED';

export interface ShellHandle {
  /** Opaque shell handle: simulator row id or Moodle course id. */
  id: string;
  ref: string;
}

export interface ActualEnrolment {
  /** SIS-side key: student id (simulator) or idnumber (live). */
  key: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface ActualGroupMember {
  groupKey: string;
  studentKey: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

/**
 * Moodle operations backend. Both implementations obey the same
 * contract: idempotent apply operations (unique guards converge
 * duplicates), removals that suspend and retain history, and
 * read-your-actual queries for reconciliation. No academic, finance
 * or policy logic lives behind this interface.
 */
export interface MoodleAdapter {
  readonly backend: MoodleBackend;

  ensureShell(input: {
    db: Tx;
    shellRef: string;
    offeringId: string;
    periodId: string;
  }): Promise<{ id: string; created: boolean }>;

  applyEnrolment(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    role: string;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS' | 'MISMATCHED'>;

  applyRemoval(input: {
    db: Tx;
    shell: ShellHandle;
    studentId: string;
    scenario: string;
  }): Promise<'SUSPENDED' | 'ABSENT'>;

  applyStaffRole(input: {
    db: Tx;
    shell: ShellHandle;
    accountId: string;
    moodleRole: string;
    quizScope: unknown;
    scenario: string;
  }): Promise<'CREATED' | 'EXISTS'>;

  applyGroupMember(input: {
    db: Tx;
    shell: ShellHandle;
    groupId: string;
    studentId: string;
    scenario: string;
    remove?: boolean;
  }): Promise<'CREATED' | 'EXISTS' | 'SUSPENDED' | 'ABSENT'>;

  /** Governed suspension of Moodle-side access. SIS rows untouched;
   * history retained. studentKey is backend-opaque (row id or idnumber). */
  suspendAccess(input: {
    db: Tx;
    shell: ShellHandle;
    studentKey: string;
  }): Promise<'SUSPENDED' | 'ABSENT'>;

  /** Actual enrolments for reconciliation (simulator rows or live query). */
  listActualEnrolments(shell: ShellHandle): Promise<ActualEnrolment[]>;

  /** Actual group mirrors for reconciliation. */
  listActualGroupMembers(shell: ShellHandle): Promise<ActualGroupMember[]>;

  /** Connection validation for the connection page. Never returns secrets. */
  validateConnection(): Promise<{
    ok: boolean;
    backend: MoodleBackend;
    version: string | null;
    detail: string;
  }>;
}

/** Backend selection: simulator only when live config is entirely absent.
 * A half-configured live connection is a deployment error, not a simulator
 * fallback, because silently falling back can hide a broken production setup. */
export function selectBackend(): MoodleBackend {
  const url = (process.env.MOODLE_API_URL ?? '').trim();
  const token = (process.env.MOODLE_API_TOKEN ?? '').trim();
  const hasUrl = url !== '';
  const hasToken = token !== '';

  if (!hasUrl && !hasToken) return 'simulator';
  if (hasUrl && hasToken) return 'live';

  throw new MoodleConfigurationError(
    'Live Moodle configuration is incomplete. Set both MOODLE_API_URL and MOODLE_API_TOKEN, or leave both unset for simulator mode.',
  );
}
