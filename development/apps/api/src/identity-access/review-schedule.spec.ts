import { describe, expect, it, vi } from 'vitest';
import { createReviewSchedule, planReviewSchedule } from './review-schedule.js';

const RISKS = { SYSADMIN: 'high', DEAN: 'high', LEC: 'medium', TUT: 'low' };
const CADENCES = { high: 30, medium: 90, low: 180 };
const NOW = new Date('2026-09-17T12:00:00Z');

describe('planReviewSchedule', () => {
  it('maps high-risk roles to quarterly reviews 30 days out', () => {
    const plan = planReviewSchedule('SYSADMIN', RISKS, CADENCES, NOW);
    expect(plan).toEqual({
      riskLevel: 'high',
      cadence: 'quarterly',
      nextDueAt: new Date('2026-10-17T12:00:00Z'),
    });
  });

  it('maps low-risk roles to annual reviews 180 days out', () => {
    const plan = planReviewSchedule('TUT', RISKS, CADENCES, NOW);
    expect(plan.riskLevel).toBe('low');
    expect(plan.cadence).toBe('annual');
    expect(plan.nextDueAt).toEqual(new Date('2027-03-16T12:00:00Z'));
  });

  it('defaults unknown roles to medium instead of breaking the grant', () => {
    const plan = planReviewSchedule('MYSTERY', RISKS, CADENCES, NOW);
    expect(plan.riskLevel).toBe('medium');
    expect(plan.cadence).toBe('annual');
  });

  it('rejects non-positive cadences loudly', () => {
    expect(() =>
      planReviewSchedule('TUT', RISKS, { high: 30, medium: 90, low: 0 }, NOW),
    ).toThrow();
  });
});

describe('createReviewSchedule', () => {
  it('writes a pending row linking assignment and reviewer', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'sched-1' });
    await createReviewSchedule(
      { reviewSchedule: { create } },
      { riskLevel: 'high', cadence: 'quarterly', nextDueAt: NOW },
      'assign-1',
      'reviewer-1',
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toEqual({
      data: {
        assignmentId: 'assign-1',
        reviewerId: 'reviewer-1',
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: NOW,
        status: 'pending',
      },
    });
  });
});
