import { describe, expect, it } from 'vitest';
import { intervalToCron } from './expiry-daemon.service.js';

// Pure scheduler mapping (no DB): minutes → cron expression. Invalid
// cadences throw instead of silently degrading the daemon.
describe('intervalToCron', () => {
  it('maps 1..59 minutes to per-minute expressions', () => {
    expect(intervalToCron(1)).toBe('*/1 * * * *');
    expect(intervalToCron(5)).toBe('*/5 * * * *');
    expect(intervalToCron(59)).toBe('*/59 * * * *');
  });

  it('maps 60 minutes to the hourly expression', () => {
    expect(intervalToCron(60)).toBe('0 * * * *');
  });

  it('rejects non-positive, over-range and non-finite cadences', () => {
    expect(() => intervalToCron(0)).toThrow();
    expect(() => intervalToCron(-5)).toThrow();
    expect(() => intervalToCron(61)).toThrow();
    expect(() => intervalToCron(Number.NaN)).toThrow();
  });

  it('rejects fractional cadences instead of silently flooring', () => {
    expect(() => intervalToCron(1.9)).toThrow();
  });
});
