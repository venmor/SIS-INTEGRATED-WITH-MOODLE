export interface TeachingOccurrence {
  id: string;
  startAt: string;
  endAt: string;
  campusCode: string;
  venueId: string | null;
  teacherIds: string[];
  studentIds: string[];
  expectedSeats: number;
  venueCapacity: number | null;
  requiresStepFreeAccess: boolean;
  venueStepFreeAccess: boolean | null;
}

export interface TimetableRules {
  version: string;
  roomTurnaroundMinutes: number;
  campusTravelMinutes: Record<string, Record<string, number>>;
  maxOccurrences: number;
}

export interface TimetableIssue {
  code:
    | 'POLICY_INVALID'
    | 'DRAFT_LIMIT'
    | 'DUPLICATE_OCCURRENCE'
    | 'INVALID_TIME'
    | 'VENUE_MISSING'
    | 'TEACHER_MISSING'
    | 'VENUE_CAPACITY'
    | 'VENUE_ACCESSIBILITY'
    | 'ROOM_CONFLICT'
    | 'ROOM_TURNAROUND'
    | 'STUDENT_CONFLICT'
    | 'STUDENT_TRAVEL'
    | 'TEACHER_CONFLICT'
    | 'TEACHER_TRAVEL'
    | 'TRAVEL_POLICY_MISSING';
  occurrenceIds: string[];
}

const priority: Record<TimetableIssue['code'], number> = {
  POLICY_INVALID: 0,
  DRAFT_LIMIT: 1,
  DUPLICATE_OCCURRENCE: 2,
  INVALID_TIME: 3,
  VENUE_MISSING: 4,
  TEACHER_MISSING: 4.5,
  VENUE_CAPACITY: 5,
  VENUE_ACCESSIBILITY: 6,
  ROOM_CONFLICT: 7,
  ROOM_TURNAROUND: 8,
  STUDENT_CONFLICT: 9,
  STUDENT_TRAVEL: 10,
  TEACHER_CONFLICT: 11,
  TEACHER_TRAVEL: 12,
  TRAVEL_POLICY_MISSING: 13,
};

const minutes = (value: number) => value * 60_000;
const zonedInstant =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
function validInstant(value: string) {
  if (!zonedInstant.test(value) || !Number.isFinite(Date.parse(value)))
    return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendarDay = new Date(0);
  calendarDay.setUTCFullYear(year, month - 1, day);
  return calendarDay.toISOString().slice(0, 10) === value.slice(0, 10);
}
const overlaps = (left: TeachingOccurrence, right: TeachingOccurrence) =>
  Date.parse(left.startAt) < Date.parse(right.endAt) &&
  Date.parse(right.startAt) < Date.parse(left.endAt);

function common(left: Set<string>, right: Set<string>) {
  const [small, large] =
    left.size <= right.size ? [left, right] : [right, left];
  for (const value of small) if (large.has(value)) return true;
  return false;
}

export function validateTeachingOccurrences(
  occurrences: TeachingOccurrence[],
  rules: TimetableRules,
): TimetableIssue[] {
  if (
    !rules.version.trim() ||
    !Number.isSafeInteger(rules.roomTurnaroundMinutes) ||
    rules.roomTurnaroundMinutes < 0 ||
    !Number.isSafeInteger(rules.maxOccurrences) ||
    rules.maxOccurrences < 1
  )
    return [{ code: 'POLICY_INVALID', occurrenceIds: [] }];
  if (occurrences.length > rules.maxOccurrences)
    return [{ code: 'DRAFT_LIMIT', occurrenceIds: [] }];

  const ordered = [...occurrences].sort((a, b) => a.id.localeCompare(b.id));
  const issues: TimetableIssue[] = [];
  const seen = new Set<string>();
  const valid: TeachingOccurrence[] = [];
  for (const item of ordered) {
    if (!item.id || seen.has(item.id)) {
      issues.push({ code: 'DUPLICATE_OCCURRENCE', occurrenceIds: [item.id] });
      continue;
    }
    seen.add(item.id);
    const start = Date.parse(item.startAt);
    const end = Date.parse(item.endAt);
    if (
      !validInstant(item.startAt) ||
      !validInstant(item.endAt) ||
      end <= start
    ) {
      issues.push({ code: 'INVALID_TIME', occurrenceIds: [item.id] });
    } else {
      valid.push(item);
    }
    if (!item.venueId)
      issues.push({ code: 'VENUE_MISSING', occurrenceIds: [item.id] });
    if (item.teacherIds.length === 0)
      issues.push({ code: 'TEACHER_MISSING', occurrenceIds: [item.id] });
    if (
      !Number.isSafeInteger(item.expectedSeats) ||
      item.expectedSeats < 0 ||
      item.venueCapacity === null ||
      !Number.isSafeInteger(item.venueCapacity) ||
      item.expectedSeats > item.venueCapacity
    )
      issues.push({ code: 'VENUE_CAPACITY', occurrenceIds: [item.id] });
    if (item.requiresStepFreeAccess && item.venueStepFreeAccess !== true)
      issues.push({ code: 'VENUE_ACCESSIBILITY', occurrenceIds: [item.id] });
  }

  const studentSets = new Map(
    valid.map((item) => [item.id, new Set(item.studentIds)]),
  );
  const teacherSets = new Map(
    valid.map((item) => [item.id, new Set(item.teacherIds)]),
  );
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const left = valid[i];
      const right = valid[j];
      const ids = [left.id, right.id];
      const overlap = overlaps(left, right);
      const earlier =
        Date.parse(left.startAt) <= Date.parse(right.startAt) ? left : right;
      const later = earlier === left ? right : left;
      const gap = Date.parse(later.startAt) - Date.parse(earlier.endAt);
      if (left.venueId && left.venueId === right.venueId) {
        if (overlap) issues.push({ code: 'ROOM_CONFLICT', occurrenceIds: ids });
        else if (gap < minutes(rules.roomTurnaroundMinutes))
          issues.push({ code: 'ROOM_TURNAROUND', occurrenceIds: ids });
      }
      for (const [shared, conflict, travel] of [
        [
          common(studentSets.get(left.id)!, studentSets.get(right.id)!),
          'STUDENT_CONFLICT',
          'STUDENT_TRAVEL',
        ],
        [
          common(teacherSets.get(left.id)!, teacherSets.get(right.id)!),
          'TEACHER_CONFLICT',
          'TEACHER_TRAVEL',
        ],
      ] as const) {
        if (!shared) continue;
        if (overlap) {
          issues.push({ code: conflict, occurrenceIds: ids });
          continue;
        }
        if (earlier.campusCode === later.campusCode) continue;
        const required =
          rules.campusTravelMinutes[earlier.campusCode]?.[later.campusCode];
        if (!Number.isSafeInteger(required) || required < 0)
          issues.push({ code: 'TRAVEL_POLICY_MISSING', occurrenceIds: ids });
        else if (gap < minutes(required))
          issues.push({ code: travel, occurrenceIds: ids });
      }
    }
  }
  return issues
    .sort(
      (a, b) =>
        a.occurrenceIds.join('|').localeCompare(b.occurrenceIds.join('|')) ||
        priority[a.code] - priority[b.code],
    )
    .filter(
      (issue, index, all) =>
        index === 0 ||
        issue.code !== all[index - 1].code ||
        issue.occurrenceIds.join('|') !==
          all[index - 1].occurrenceIds.join('|'),
    );
}
