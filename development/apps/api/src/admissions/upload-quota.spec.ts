import {
  secondsUntilNextUploadDay,
  startOfUploadDay,
} from './upload-quota.js';

describe('upload quota day boundary', () => {
  it('maps an evening UTC instant to the Lusaka day start', () => {
    // 2026-10-04T21:30:00Z is 23:30 in Lusaka (UTC+2): day start is
    // 2026-10-04T00:00:00+02:00 == 2026-10-03T22:00:00Z.
    expect(startOfUploadDay(new Date('2026-10-04T21:30:00.000Z'))).toEqual(
      new Date('2026-10-03T22:00:00.000Z'),
    );
  });

  it('maps a small-hours UTC instant to the same Lusaka day', () => {
    // 2026-10-04T00:30:00Z is 02:30 in Lusaka on Oct 4: same day start.
    expect(startOfUploadDay(new Date('2026-10-04T00:30:00.000Z'))).toEqual(
      new Date('2026-10-03T22:00:00.000Z'),
    );
  });

  it('reports seconds until the next Lusaka midnight', () => {
    // 30 minutes before Lusaka midnight.
    expect(
      secondsUntilNextUploadDay(new Date('2026-10-04T21:30:00.000Z')),
    ).toBe(1800);
    // Exactly at midnight: a full day remains, never zero.
    expect(
      secondsUntilNextUploadDay(new Date('2026-10-03T22:00:00.000Z')),
    ).toBe(86400);
  });
});
