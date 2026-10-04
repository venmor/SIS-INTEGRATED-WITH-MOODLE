import { describe, expect, it } from 'vitest';
import {
  validateTeachingOccurrences,
  type TeachingOccurrence,
  type TimetableRules,
} from './conflicts.js';

const rules: TimetableRules = {
  version: 'FICTIONAL-TIME-v1',
  roomTurnaroundMinutes: 10,
  maxOccurrences: 500,
  campusTravelMinutes: {
    MAIN: { HEALTH: 30 },
    HEALTH: { MAIN: 30 },
  },
};

function occurrence(
  id: string,
  overrides: Partial<TeachingOccurrence> = {},
): TeachingOccurrence {
  return {
    id,
    startAt: '2026-10-05T08:00:00+02:00',
    endAt: '2026-10-05T09:00:00+02:00',
    campusCode: 'MAIN',
    venueId: `VENUE-${id}`,
    teacherIds: [`TEACHER-${id}`],
    studentIds: [`STUDENT-${id}`],
    expectedSeats: 20,
    venueCapacity: 30,
    requiresStepFreeAccess: false,
    venueStepFreeAccess: true,
    ...overrides,
  };
}

describe('dated teaching occurrence validation', () => {
  it('blocks overlapping venue, teacher and registered-student commitments', () => {
    const issues = validateTeachingOccurrences(
      [
        occurrence('A', {
          venueId: 'V1',
          teacherIds: ['T1'],
          studentIds: ['S1'],
        }),
        occurrence('B', {
          venueId: 'V1',
          teacherIds: ['T1'],
          studentIds: ['S1'],
        }),
      ],
      rules,
    );
    expect(issues.map((issue) => issue.code)).toEqual([
      'ROOM_CONFLICT',
      'STUDENT_CONFLICT',
      'TEACHER_CONFLICT',
    ]);
    expect(
      issues.every((issue) => issue.occurrenceIds.join(',') === 'A,B'),
    ).toBe(true);
  });

  it('respects exact boundaries and configured room turnaround', () => {
    const first = occurrence('A', { venueId: 'V1' });
    const second = occurrence('B', {
      venueId: 'V1',
      startAt: '2026-10-05T09:00:00+02:00',
      endAt: '2026-10-05T10:00:00+02:00',
    });
    expect(
      validateTeachingOccurrences([first, second], {
        ...rules,
        roomTurnaroundMinutes: 0,
      }),
    ).toEqual([]);
    expect(validateTeachingOccurrences([first, second], rules)).toContainEqual({
      code: 'ROOM_TURNAROUND',
      occurrenceIds: ['A', 'B'],
    });
  });

  it('blocks insufficient or undefined cross-campus travel for one student', () => {
    const first = occurrence('A', { studentIds: ['S1'] });
    const second = occurrence('B', {
      campusCode: 'HEALTH',
      studentIds: ['S1'],
      startAt: '2026-10-05T09:15:00+02:00',
      endAt: '2026-10-05T10:15:00+02:00',
    });
    expect(validateTeachingOccurrences([first, second], rules)).toContainEqual({
      code: 'STUDENT_TRAVEL',
      occurrenceIds: ['A', 'B'],
    });
    expect(
      validateTeachingOccurrences([first, second], {
        ...rules,
        campusTravelMinutes: {},
      }),
    ).toContainEqual({
      code: 'TRAVEL_POLICY_MISSING',
      occurrenceIds: ['A', 'B'],
    });
  });

  it('blocks invalid times, missing venue, capacity and inaccessible placement', () => {
    expect(
      validateTeachingOccurrences(
        [
          occurrence('A', {
            startAt: '2026-10-05T09:00:00+02:00',
            endAt: '2026-10-05T08:00:00+02:00',
            venueId: null,
            expectedSeats: 31,
            requiresStepFreeAccess: true,
            venueStepFreeAccess: false,
          }),
        ],
        rules,
      ).map((issue) => issue.code),
    ).toEqual([
      'INVALID_TIME',
      'VENUE_MISSING',
      'VENUE_CAPACITY',
      'VENUE_ACCESSIBILITY',
    ]);
  });

  it('returns the same issues regardless of input order', () => {
    const a = occurrence('A', { teacherIds: ['T1'] });
    const b = occurrence('B', { teacherIds: ['T1'] });
    expect(validateTeachingOccurrences([a, b], rules)).toEqual(
      validateTeachingOccurrences([b, a], rules),
    );
  });

  it('rejects a local time without an offset and an unassigned teacher', () => {
    expect(
      validateTeachingOccurrences(
        [occurrence('A', { startAt: '2026-10-05T08:00:00', teacherIds: [] })],
        rules,
      ).map((issue) => issue.code),
    ).toEqual(['INVALID_TIME', 'TEACHER_MISSING']);
  });

  it('bounds the draft size using the supplied policy', () => {
    expect(
      validateTeachingOccurrences([occurrence('A'), occurrence('B')], {
        ...rules,
        maxOccurrences: 1,
      }),
    ).toEqual([{ code: 'DRAFT_LIMIT', occurrenceIds: [] }]);
  });

  it('rejects a non-existent local calendar date instead of normalizing it', () => {
    expect(
      validateTeachingOccurrences(
        [
          occurrence('A', {
            startAt: '2026-02-31T08:00:00+02:00',
            endAt: '2026-02-31T09:00:00+02:00',
          }),
        ],
        rules,
      ),
    ).toContainEqual({ code: 'INVALID_TIME', occurrenceIds: ['A'] });
  });
});
