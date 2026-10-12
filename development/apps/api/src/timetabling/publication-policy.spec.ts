import { randomUUID } from 'node:crypto';
import { parsePublicationCommand } from './publication-policy.js';

describe('fictional timetable publication decision', () => {
  const input = () => ({
    clientRequestId: randomUUID(),
    contentDigest: 'a'.repeat(64),
    expectedPublicationId: null,
    reviewed: true,
    fictionalOnly: true,
    password: 'synthetic proof',
    reason: 'Reviewed fictional allocation',
  });
  it('requires a target fingerprint, nullable predecessor, deliberate confirmations and password', () => {
    expect(parsePublicationCommand(input())).toEqual(
      expect.objectContaining({ reviewed: true, fictionalOnly: true }),
    );
    for (const field of [
      'clientRequestId',
      'contentDigest',
      'expectedPublicationId',
      'reviewed',
      'fictionalOnly',
      'password',
      'reason',
    ]) {
      const value: Record<string, unknown> = input();
      delete value[field];
      expect(() => parsePublicationCommand(value)).toThrow();
    }
  });
  it.each([
    { reviewed: false },
    { fictionalOnly: false },
    { password: '' },
    { password: 'x'.repeat(1025) },
    { contentDigest: 'BAD' },
    { expectedPublicationId: 'not-an-id' },
    { force: true },
    { password: 10 },
    { reason: '' },
    { reason: 'x'.repeat(501) },
  ])('refuses a malformed or broadened decision %j', (change) => {
    expect(() => parsePublicationCommand({ ...input(), ...change })).toThrow();
  });
  it('accepts a concrete predecessor without modifying the password', () => {
    const value = {
      ...input(),
      expectedPublicationId: randomUUID(),
      password: '  unchanged proof  ',
    };
    expect(parsePublicationCommand(value)).toEqual(value);
  });
});
