import { describe, expect, it } from 'vitest';
import { validReceipt } from './idempotency.js';

describe('validReceipt', () => {
  it('accepts a well-formed receipt', () => {
    expect(validReceipt({ assignmentId: 'a-1' }, ['assignmentId'])).toBe(true);
  });

  it('rejects null, arrays, primitives and partial rows', () => {
    expect(validReceipt(null, ['assignmentId'])).toBe(false);
    expect(validReceipt([], ['assignmentId'])).toBe(false);
    expect(validReceipt('a-1', ['assignmentId'])).toBe(false);
    expect(validReceipt({}, ['assignmentId'])).toBe(false);
    expect(validReceipt({ assignmentId: 42 }, ['assignmentId'])).toBe(false);
  });
});
