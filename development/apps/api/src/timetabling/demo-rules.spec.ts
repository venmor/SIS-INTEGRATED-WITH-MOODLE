import { describe, expect, it } from 'vitest';
import { parseDraftCommand, timetableDemoDraftsEnabled } from './demo-rules.service.js';

const request = 'a141dad1-16af-4f7b-b3f7-ec0c0c5d9b1d';
const base = {
  clientRequestId: request,
  expectedVersion: 0,
  roomTurnaroundMinutes: 15,
  maxOccurrences: 200,
  travel: [
    { fromCampus: 'DEMO-MAIN', toCampus: 'DEMO-HEALTH', minutes: 30 },
  ],
};

describe('fictional timetable rule draft boundary', () => {
  it('requires explicit opt-in and a loopback review database', () => {
    const enabled = {
      DEMO_MODE: 'true',
      SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: 'true',
      DATABASE_URL: 'postgresql://demo:demo@127.0.0.1:5432/sis_time_review',
    };
    expect(timetableDemoDraftsEnabled(enabled)).toBe(true);
    expect(timetableDemoDraftsEnabled({ ...enabled, DEMO_MODE: 'false' })).toBe(false);
    expect(timetableDemoDraftsEnabled({ ...enabled, SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: 'false' })).toBe(false);
    expect(timetableDemoDraftsEnabled({ ...enabled, DATABASE_URL: 'postgresql://demo:demo@db.example/sis_time_review' })).toBe(false);
    expect(timetableDemoDraftsEnabled({ ...enabled, DATABASE_URL: 'postgresql://demo:demo@127.0.0.1:5432/sis_production' })).toBe(false);
  });

  it('normalizes directed travel rows to make replay comparison stable', () => {
    expect(parseDraftCommand({
      ...base,
      travel: [
        { fromCampus: 'DEMO-Z', toCampus: 'DEMO-A', minutes: 25 },
        ...base.travel,
      ],
    }).travel).toEqual([
      base.travel[0],
      { fromCampus: 'DEMO-Z', toCampus: 'DEMO-A', minutes: 25 },
    ]);
  });

  it('rejects guessed production campuses, repeated routes and extra fields', () => {
    expect(() => parseDraftCommand({ ...base, travel: [{ fromCampus: 'MAIN', toCampus: 'DEMO-HEALTH', minutes: 1 }] })).toThrow();
    expect(() => parseDraftCommand({ ...base, travel: [...base.travel, ...base.travel] })).toThrow();
    expect(() => parseDraftCommand({ ...base, approved: true })).toThrow();
    expect(() => parseDraftCommand({ ...base, maxOccurrences: 501 })).toThrow();
  });
});
