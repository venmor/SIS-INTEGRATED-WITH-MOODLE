/**
 * Daily upload-quota day boundary (TASK-PH8-004).
 *
 * The handbook requires a per-user daily document-upload quota; the demo
 * policy counts Lusaka calendar days (`APPLICATION-DEMO-v1.timezone`).
 * Africa/Lusaka observes CAT (UTC+2) year-round with no daylight saving,
 * so the offset is a constant. Pure functions for unit proof.
 */
const LUSAKA_OFFSET_MS = 2 * 3600 * 1000;

/** Start (inclusive) of the Lusaka calendar day containing `now`, as a UTC instant. */
export function startOfUploadDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + LUSAKA_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - LUSAKA_OFFSET_MS);
}

/** Whole seconds from `now` until the next Lusaka midnight (for Retry-After). */
export function secondsUntilNextUploadDay(now: Date = new Date()): number {
  const next = startOfUploadDay(now).getTime() + 24 * 3600 * 1000;
  return Math.max(Math.ceil((next - now.getTime()) / 1000), 1);
}
