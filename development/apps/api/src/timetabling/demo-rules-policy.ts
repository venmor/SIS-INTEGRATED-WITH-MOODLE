import type { TimetableRules } from './conflicts.js';

/** Only a complete saved version can drive a dated planning preview. */
export function toPlanningRules(row: {
  id: string;
  roomTurnaroundMinutes: number;
  maxOccurrences: number;
  campusTravelMinutes: unknown;
  periodId: string | null;
  teachingStartDate: Date | null;
  teachingEndDate: Date | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  allowedWeekdays: unknown;
  maxSessionMinutes: number | null;
}): (TimetableRules & { periodId: string }) | null {
  if (!row.periodId || !row.teachingStartDate || !row.teachingEndDate ||
    !row.dailyStartTime || !row.dailyEndTime || !Array.isArray(row.allowedWeekdays) ||
    !row.allowedWeekdays.every((day) => Number.isSafeInteger(day)) ||
    row.maxSessionMinutes === null || !Array.isArray(row.campusTravelMinutes)) return null;
  const travel: Record<string, Record<string, number>> = {};
  for (const raw of row.campusTravelMinutes) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (typeof item.fromCampus !== 'string' || typeof item.toCampus !== 'string' ||
      !Number.isSafeInteger(item.minutes)) return null;
    travel[item.fromCampus] ??= {};
    travel[item.fromCampus][item.toCampus] = item.minutes as number;
  }
  return {
    version: row.id,
    periodId: row.periodId,
    roomTurnaroundMinutes: row.roomTurnaroundMinutes,
    maxOccurrences: row.maxOccurrences,
    campusTravelMinutes: travel,
    teachingWindow: {
      startDate: row.teachingStartDate.toISOString().slice(0, 10),
      endDate: row.teachingEndDate.toISOString().slice(0, 10),
      dailyStartTime: row.dailyStartTime,
      dailyEndTime: row.dailyEndTime,
      allowedWeekdays: row.allowedWeekdays as number[],
      maxSessionMinutes: row.maxSessionMinutes,
    },
  };
}
