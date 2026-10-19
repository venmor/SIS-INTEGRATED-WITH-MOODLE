import { isDemonstrationDatabaseTarget } from '@sis/config';
/** Initial generated demonstration credentials only. Never use this as a
 * production password vault, or put its values in a normal read projection. */
export function initialDemoCredential(username: string | null, host: string) {
  if (!username || process.env.SIS_ENABLE_MOODLE_DEMO_CREDENTIALS !== 'true'
    || !isDemonstrationDatabaseTarget(process.env) || !/^sis\.(demo\.)?[a-z0-9._-]+$/.test(username)) return null;
  const source = process.env.MOODLE_DEMO_CREDENTIALS_JSON;
  if (!source || source.length > 65536) return null;
  try {
    const entries: unknown = JSON.parse(source);
    if (!entries || typeof entries !== 'object' || Array.isArray(entries) || !Object.hasOwn(entries, username)) return null;
    const item = (entries as Record<string, unknown>)[username];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const c = item as Record<string, unknown>;
    if (c.host !== host || !Number.isSafeInteger(c.moodleUserId) || Number(c.moodleUserId) <= 0
      || typeof c.password !== 'string' || c.password.length < 12 || c.password.length > 256) return null;
    if (c.password === process.env.MOODLE_API_TOKEN || c.password === process.env.MOODLE_DEMO_INITIAL_PASSWORD) return null;
    return { password: c.password, moodleUserId: Number(c.moodleUserId) };
  } catch { return null; }
}
