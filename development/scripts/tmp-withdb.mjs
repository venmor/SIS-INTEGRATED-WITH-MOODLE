// Test helper (delete before commit): run <cmd> with DATABASE_URL
// pathname swapped to an isolated test database. Real credentials stay
// in the environment; nothing secret is printed.
import { spawnSync } from 'node:child_process';
import { delimiter, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ root, requireFile: false, defaults: {} });
const [dbname, cmd, ...args] = process.argv.slice(2);
if (!dbname || !cmd) {
  console.error('usage: node scripts/tmp-withdb.mjs <dbname> <cmd> [args…]');
  process.exit(2);
}
const u = new URL(process.env.DATABASE_URL);
u.pathname = `/${dbname}`;
const env = {
  ...process.env,
  DATABASE_URL: u.toString(),
  PATH: `${join(root, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}`,
};
const result = spawnSync(cmd, args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});
process.exit(result.status ?? 1);
