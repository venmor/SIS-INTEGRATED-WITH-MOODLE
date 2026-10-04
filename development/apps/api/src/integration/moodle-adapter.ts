import type { Prisma } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

export type MoodleBackend = 'simulator' | 'live-test';

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

/**
 * Backend selection is not a function of this module. It is re-exported
 * from `moodle-live-config.ts`, the one implementation that reads
 * `MOODLE_INTEGRATION_MODE` and validates fail-closed, so the adapter
 * cannot offer a second, laxer resolver. Task 9 repoints the callers that
 * still expect a bare `MoodleBackend` label.
 */
export { selectBackend } from './moodle-live-config.js';
