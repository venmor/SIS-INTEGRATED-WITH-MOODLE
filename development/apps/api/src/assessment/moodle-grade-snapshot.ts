import { createHash } from 'node:crypto';

export interface MoodleGradeParticipant {
  moodleUserId: number;
  studentRef: string;
}
export interface MoodleGradeCoordinates {
  courseId: number;
  /** Moodle gradebook item ID, not the assignment instance or course-module ID. */
  gradeItemId: number;
  maxMark: number;
  participants: MoodleGradeParticipant[];
}
type GradeLine = { studentRef: string; rawValue?: number; outcome: string };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('MOODLE_GRADE_RESPONSE_INVALID');
  return value as Record<string, unknown>;
}

/** Only numeric raw grades are transferable. Formatted HTML, percentages,
 * course totals and text scales cannot silently become assessment marks. */
export function moodleGradeSnapshot(
  body: unknown,
  input: MoodleGradeCoordinates,
) {
  const data = record(body);
  if (
    !Array.isArray(data.usergrades) ||
    (data.warnings !== undefined &&
      (!Array.isArray(data.warnings) || data.warnings.length))
  )
    throw Error('MOODLE_GRADE_RESPONSE_INCOMPLETE');
  const expected = new Map(
    input.participants.map((p) => [p.moodleUserId, p.studentRef]),
  );
  if (
    !expected.size ||
    expected.size !== input.participants.length ||
    new Set(expected.values()).size !== expected.size
  )
    throw Error('MOODLE_IDENTITY_BINDING_AMBIGUOUS');
  const rows = new Map<number, { line: GradeLine; gradedAt: number | null }>();
  for (const raw of data.usergrades) {
    const row = record(raw);
    if (
      row.courseid !== input.courseId ||
      typeof row.userid !== 'number' ||
      !expected.has(row.userid) ||
      rows.has(row.userid) ||
      !Array.isArray(row.gradeitems)
    )
      throw Error('MOODLE_GRADE_SCOPE_MISMATCH');
    const items = row.gradeitems
      .map(record)
      .filter((i) => i.id === input.gradeItemId);
    if (items.length !== 1)
      throw Error('MOODLE_GRADE_ITEM_MISSING_OR_DUPLICATE');
    const item = items[0];
    if (
      item.itemtype !== 'mod' ||
      !['assign', 'quiz'].includes(String(item.itemmodule)) ||
      // Moodle returns NULL when a numeric point item has no grading scale.
      // Undefined, strings and positive scale IDs remain invalid.
      (item.scaleid !== 0 && item.scaleid !== null) ||
      item.grademin !== 0 ||
      item.grademax !== input.maxMark
    )
      throw Error('MOODLE_GRADE_SCALE_MISMATCH');
    if (item.gradeneedsupdate === true || item.gradeneedsupdate === 1)
      throw Error('MOODLE_GRADE_RECALCULATION_PENDING');
    const value = item.graderaw;
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== 'number' || !Number.isFinite(value))
    )
      throw Error('MOODLE_GRADE_VALUE_INVALID');
    const line: GradeLine =
      value === null || value === undefined
        ? { studentRef: expected.get(row.userid)!, outcome: 'MISSING_MARK' }
        : {
            studentRef: expected.get(row.userid)!,
            rawValue: value as number,
            outcome: 'MARK_RECORDED',
          };
    rows.set(row.userid, {
      line,
      gradedAt:
        typeof item.gradedategraded === 'number' ? item.gradedategraded : null,
    });
  }
  const canonical = [...expected]
    .sort(([a], [b]) => a - b)
    .map(([userid, studentRef]) => ({
      userid,
      ...(rows.get(userid) ?? {
        line: { studentRef, outcome: 'MISSING_MARK' },
        gradedAt: null,
      }),
    }));
  const checksum = createHash('sha256')
    .update(
      JSON.stringify({
        courseId: input.courseId,
        gradeItemId: input.gradeItemId,
        maxMark: input.maxMark,
        rows: canonical,
      }),
    )
    .digest('hex');
  return {
    lines: canonical.map((r) => r.line),
    sourceRevision: `moodle:${checksum}`,
    checksum,
    received: rows.size,
    expected: expected.size,
  };
}
