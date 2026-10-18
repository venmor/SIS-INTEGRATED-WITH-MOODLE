import { describe, expect, it } from 'vitest';
import { moodleGradeSnapshot } from './moodle-grade-snapshot.js';

const participants = [
  { moodleUserId: 7, studentRef: '2026000001' },
  { moodleUserId: 8, studentRef: '2026000002' },
];
const item = {
  id: 42,
  itemtype: 'mod',
  itemmodule: 'assign',
  scaleid: 0,
  grademin: 0,
  grademax: 20,
  graderaw: 0,
  gradedategraded: 1234,
};
const response = (grade: unknown = item) => ({
  usergrades: [{ courseid: 12, userid: 7, gradeitems: [grade] }],
  warnings: [],
});
const snapshot = (body: unknown) =>
  moodleGradeSnapshot(body, {
    courseId: 12,
    gradeItemId: 42,
    maxMark: 20,
    participants,
  });

describe('Moodle grade snapshot', () => {
  it('accepts Moodle 5.2 numeric points with a null scale ID, keeping the raw 17/20 mark', () => {
    expect(snapshot(response({ ...item, scaleid: null, graderaw: 17, gradeneedsupdate: false })).lines[0])
      .toEqual({ studentRef: '2026000001', rawValue: 17, outcome: 'MARK_RECORDED' });
  });
  it('retains a genuine zero and represents missing grades without inventing absence or zero', () => {
    expect(snapshot(response()).lines).toEqual([
      { studentRef: '2026000001', rawValue: 0, outcome: 'MARK_RECORDED' },
      { studentRef: '2026000002', outcome: 'MISSING_MARK' },
    ]);
    expect(
      snapshot(response({ ...item, graderaw: null })).lines[0].outcome,
    ).toBe('MISSING_MARK');
  });
  it('uses stable revisions independent of response order, but detects changed marks', () => {
    const first = snapshot(response());
    expect(snapshot(response()).sourceRevision).toBe(first.sourceRevision);
    expect(
      snapshot(response({ ...item, graderaw: 15 })).sourceRevision,
    ).not.toBe(first.sourceRevision);
  });
  it.each([
    { ...item, grademax: 100 },
    { ...item, scaleid: 2 },
    { ...item, gradeneedsupdate: true },
    { ...item, itemtype: 'course' },
    { ...item, graderaw: '15' },
  ])('refuses incompatible, stale, aggregate or malformed marks', (grade) => {
    expect(() => snapshot(response(grade))).toThrow();
  });
  it('rejects wrong-course, unmapped-user, duplicate rows and partial responses', () => {
    for (const body of [
      { usergrades: [{ courseid: 99, userid: 7, gradeitems: [item] }] },
      { usergrades: [{ courseid: 12, userid: 99, gradeitems: [item] }] },
      { usergrades: [...response().usergrades, ...response().usergrades] },
      { usergrades: [{ courseid: 12, userid: 7, gradeitems: [] }] },
      { ...response(), warnings: [{ warningcode: 'partial' }] },
    ])
      expect(() => snapshot(body)).toThrow();
  });
  it('preserves out-of-range numeric evidence for the existing quarantine workflow', () => {
    expect(
      snapshot(response({ ...item, graderaw: 30 })).lines[0].rawValue,
    ).toBe(30);
  });
});
