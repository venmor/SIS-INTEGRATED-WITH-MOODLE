import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../identity-access/prisma.service.js';
import type { FinanceService } from '../finance/finance.service.js';
import type { IntegrationService } from '../integration/integration.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { RegistrationService } from './registration.service.js';

const auth: ActiveAuthority = {
  accountId: 'student-account',
  assignmentId: 'student-assignment',
  activeRole: 'STUDENT',
  scope: 'STUDENT:student',
};

/** Only persistence and the integration-owned readiness port are doubled.
 * Ownership, status selection and receipt projection use the real service. */
function fixture(input: {
  backend?: 'simulator' | 'live-test' | 'live-test-disabled';
  delivered?: boolean;
  registered?: boolean;
  authority?: boolean;
  personId?: string;
  manual?: boolean;
  deadLetter?: boolean;
} = {}) {
  const registration = {
    id: 'registration', attemptId: 'attempt', version: 1,
    status: 'REGISTERED', receipt: 'SYNTHETIC-RECEIPT-1',
    createdAt: new Date('2026-10-07T10:00:00Z'),
    snapshot: { courses: [{ code: 'TEST101', title: 'Synthetic course',
      credits: 1, courseType: 'CORE', semester: null }], loadHalves: 1,
      clearance: 'CLEARED' },
  };
  const source = { id: 'source-event', deliveredAt: input.delivered
    ? new Date('2026-10-07T10:01:00Z') : null };
  const prisma = {
    roleAssignment: { findFirst: vi.fn().mockResolvedValue(
      input.authority === false ? null : { id: auth.assignmentId, scopeType: 'STUDENT', scopeRef: 'student' }) },
    account: { findUnique: vi.fn().mockResolvedValue({ id: auth.accountId,
      personId: 'student-person' }) },
    student: { findUnique: vi.fn().mockResolvedValue({ id: 'student' }) },
    programmeAttempt: {
      findFirst: vi.fn().mockResolvedValue({ id: 'attempt', studentId: 'student', student: { id: 'student', studentNumber: 'STUDENT-1', personId: input.personId ?? 'student-person' } }),
      findUnique: vi.fn().mockResolvedValue({ id: 'attempt', studentId: 'student',
        student: { id: 'student', studentNumber: 'STUDENT-1', personId: input.personId ?? 'student-person' } }),
    },
    academicPeriod: { findUnique: vi.fn().mockResolvedValue({ id: 'period',
      code: '2026S1' }) },
    institutionalRegistration: { findUnique: vi.fn().mockResolvedValue(
      input.registered === false ? null : registration) },
    outboxEvent: { findFirst: vi.fn().mockResolvedValue(source) },
    registrationAmendment: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const backend = input.backend ?? 'simulator';
  const integration = {
    liveDeliveryDeferral: () => backend === 'simulator' ? null : {
      outcome: 'NOT_PROVISIONED', backend,
      reason: backend === 'live-test' ? 'LIVE_PREREQUISITES_UNAVAILABLE'
        : 'LIVE_CONFIGURATION_REFUSED',
      detail: 'Staff-only fixture configuration detail.',
    },
    deliveryFlags: vi.fn().mockResolvedValue({ manual: input.manual ?? false,
      deadLetter: input.deadLetter ?? false }),
  };
  return { source, registration, service: new RegistrationService(
    prisma as unknown as PrismaService, {} as FinanceService,
    integration as unknown as IntegrationService,
  ) };
}

describe('owned registration Moodle access status', () => {
  it.each(['live-test', 'live-test-disabled'] as const)(
    'preserves receipt but never presents historical simulator delivery as %s access',
    async (backend) => {
      const { service, registration, source } = fixture({ backend, delivered: true });
      const before = JSON.stringify({ registration, source });
      const result = await service.registrationStatus(auth);
      expect(result.registration?.receipt).toBe('SYNTHETIC-RECEIPT-1');
      expect(result.registration?.status).toBe('REGISTERED');
      expect(result.moodle.state).toBe('NOT_PROVISIONED');
      expect(result.moodle.detail).toMatch(/being prepared/i);
      expect(result.moodle.detail).toMatch(/registration.*complete/i);
      expect(result.moodle.detail).toMatch(/do not register again/i);
      expect(result.moodle.detail).not.toContain('Staff-only');
      expect(JSON.stringify({ registration, source })).toBe(before);
    },
  );
  it('does not turn a live prerequisite deferral into an old manual-review failure', async () => {
    const { service } = fixture({ backend: 'live-test', manual: true });
    expect((await service.registrationStatus(auth)).moodle.state).toBe('NOT_PROVISIONED');
  });
  it.each([
    { delivered: false, want: 'Queued' },
    { delivered: true, want: 'Synced' },
    { delivered: false, manual: true, want: 'Failed' },
    { delivered: false, deadLetter: true, want: 'Delayed' },
  ])('preserves explicit simulator status $want', async ({ want, ...input }) => {
    const { service } = fixture(input);
    expect((await service.registrationStatus(auth)).moodle.state).toBe(want);
  });
  it('keeps unsubmitted registration unavailable even when live setup is deferred', async () => {
    const { service } = fixture({ backend: 'live-test', registered: false });
    const result = await service.registrationStatus(auth);
    expect(result.registration).toBeNull();
    expect(result.moodle.state).toBe('NotAvailable');
  });
  it('does not expose status to an inactive assignment', async () => {
    const { service } = fixture({ backend: 'live-test', authority: false });
    await expect(service.registrationStatus(auth)).rejects.toMatchObject({ status: 403 });
  });
  it('keeps another student attempt neutral before evaluating live readiness', async () => {
    const { service } = fixture({ backend: 'live-test', personId: 'another-person' });
    await expect(service.registrationStatus(auth, 'attempt')).rejects.toMatchObject({ status: 404 });
  });
});
