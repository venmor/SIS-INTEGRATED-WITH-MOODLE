import { createHash, timingSafeEqual } from 'node:crypto';
import { selectBackend, type BackendSelection } from './moodle-live-config.js';

export interface NonSecretDatabaseIdentity {
  host: string;
  port: number;
  database: string;
}
export interface ManifestEntryInput {
  entity: string;
  entityId: string;
}
export const checksum = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export function parseNonSecretDatabaseIdentity(
  value: string,
): NonSecretDatabaseIdentity {
  try {
    const u = new URL(value);
    const database = decodeURIComponent(u.pathname.slice(1));
    if (
      !['postgresql:', 'postgres:'].includes(u.protocol) ||
      !u.hostname ||
      !database ||
      /[\s/\\]/.test(database) ||
      database.split('').some((character) => character.charCodeAt(0) < 32) ||
      u.hash
    )
      throw Error();
    return {
      host: u.hostname.toLowerCase(),
      port: Number(u.port || 5432),
      database,
    };
  } catch {
    throw Error('DATABASE_IDENTITY_INVALID');
  }
}
export function databaseFingerprint(
  identity: NonSecretDatabaseIdentity,
  schemaChecksum: string,
): string {
  return checksum(
    `${identity.host}:${identity.port}/${identity.database}|${schemaChecksum}`,
  );
}
export function fingerprintMatches(
  expected: string,
  actual: string,
): { ok: true } | { ok: false; reason: 'DB_FINGERPRINT_MISMATCH' } {
  return /^[a-f0-9]{64}$/.test(expected) &&
    /^[a-f0-9]{64}$/.test(actual) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
    ? { ok: true }
    : { ok: false, reason: 'DB_FINGERPRINT_MISMATCH' };
}
export function manifestChecksum(entries: ManifestEntryInput[]): string {
  const keys = entries
    .map(({ entity, entityId }) => {
      if (
        !/^[A-Za-z][A-Za-z0-9]*$/.test(entity) ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(entityId)
      )
        throw Error('MANIFEST_ENTRY_INVALID');
      return `${entity}:${entityId}`;
    })
    .sort();
  if (new Set(keys).size !== keys.length) throw Error('MANIFEST_DUPLICATE');
  return checksum(keys.join('\n'));
}
/** Preparation validates every target field, but does not bind/arm a run.
 * The placeholder binding is private to this projection; ordinary runtime
 * selection and start/resume still require the operator's exact binding. */
export function preparationSelection(
  env: NodeJS.ProcessEnv = process.env,
): BackendSelection {
  return selectBackend({
    ...env,
    MOODLE_LIVE_TEST_RUN_ID: 'PREPARATION-ONLY',
    MOODLE_LIVE_TEST_DB_FINGERPRINT: '0'.repeat(64),
  });
}
