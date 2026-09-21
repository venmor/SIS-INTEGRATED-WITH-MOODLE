import { describe, expect, it } from 'vitest';
import type { ApplicationStatusEvent } from '@sis/contracts';
import { visibleTimeline } from './case.js';

function event(
  overrides: Partial<ApplicationStatusEvent>,
): ApplicationStatusEvent {
  return {
    id: 'e',
    occurredAt: '2026-09-01T10:00:00.000Z',
    code: 'Submitted',
    label: 'Application received',
    detail: null,
    actorRole: 'APPLICANT',
    applicantVisible: true,
    ...overrides,
  };
}

describe('visibleTimeline', () => {
  it('drops staff-only events and sorts ascending by time', () => {
    const rows = visibleTimeline([
      event({ id: 'b', occurredAt: '2026-09-02T10:00:00.000Z' }),
      event({
        id: 'staff',
        occurredAt: '2026-09-01T11:00:00.000Z',
        code: 'Assigned',
        label: 'Internal assignment',
        actorRole: 'ADMISSIONS',
        applicantVisible: false,
      }),
      event({ id: 'a', occurredAt: '2026-09-01T10:00:00.000Z' }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('never leaks staff-only rows even when alone', () => {
    expect(
      visibleTimeline([event({ id: 'x', applicantVisible: false })]),
    ).toEqual([]);
  });
});
