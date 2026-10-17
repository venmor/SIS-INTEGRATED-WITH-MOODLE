import { describe, expect, it } from 'vitest';
import {
  databaseFingerprint,
  fingerprintMatches,
  manifestChecksum,
  parseNonSecretDatabaseIdentity,
  preparationSelection,
} from './moodle-scope.js';

describe('live Moodle scope binding', () => {
  it('removes credentials and query parameters from database identity', () => {
    expect(
      parseNonSecretDatabaseIdentity(
        'postgresql://user:private@db.example:5432/sis_test?sslmode=require',
      ),
    ).toEqual({ host: 'db.example', port: 5432, database: 'sis_test' });
  });
  it('rejects ambiguous database identities without echoing input', () => {
    for (const url of [
      'https://u:private@h/d',
      'postgresql://u:private@h/',
      'postgresql://u:private@h/a%2Fb',
    ]) {
      expect(() => parseNonSecretDatabaseIdentity(url)).toThrow(
        'DATABASE_IDENTITY_INVALID',
      );
    }
  });
  it('fingerprints schema and database, independently of credentials', () => {
    const a = parseNonSecretDatabaseIdentity('postgresql://u:a@h/d');
    const b = parseNonSecretDatabaseIdentity('postgresql://u:b@h/d');
    expect(databaseFingerprint(a, 's')).toBe(databaseFingerprint(b, 's'));
    expect(databaseFingerprint(a, 's')).not.toBe(
      databaseFingerprint(a, 'changed'),
    );
    expect(fingerprintMatches('a'.repeat(64), 'b'.repeat(64))).toEqual({
      ok: false,
      reason: 'DB_FINGERPRINT_MISMATCH',
    });
  });
  it('seals a deterministic duplicate-free manifest', () => {
    const entries = [
      { entity: 'Account', entityId: 'b' },
      { entity: 'Student', entityId: 'a' },
    ];
    expect(manifestChecksum(entries)).toBe(
      manifestChecksum([...entries].reverse()),
    );
    expect(() => manifestChecksum([entries[0]!, entries[0]!])).toThrow(
      'MANIFEST_DUPLICATE',
    );
    expect(() =>
      manifestChecksum([{ entity: 'Account\nx', entityId: 'a' }]),
    ).toThrow('MANIFEST_ENTRY_INVALID');
  });
  it('preparation never falls back from simulator to a live target', () => {
    expect(preparationSelection({})).toEqual({ kind: 'simulator' });
    const out = preparationSelection({ MOODLE_INTEGRATION_MODE: 'live-test' });
    expect(out.kind).toBe('live-test-disabled');
    if (out.kind === 'live-test-disabled') {
      expect(out.reasons).not.toContain('RUN_ID_MISSING');
      expect(out.reasons).not.toContain('DB_FINGERPRINT_MISSING');
      expect(out.reasons).toContain('TOKEN_MISSING');
    }
  });
});
