// Test helper (delete before commit): start detached API + web servers
// against an isolated database and wait for both health endpoints.
// Usage: node scripts/tmp-serve.mjs <dbname>
import { spawn } from 'node:child_process';
import { appendFileSync, openSync } from 'node:fs';
import { delimiter, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ root, requireFile: false, defaults: {} });
const [dbname] = process.argv.slice(2);
if (!dbname) {
  console.error('usage: node scripts/tmp-serve.mjs <dbname>');
  process.exit(2);
}
const u = new URL(process.env.DATABASE_URL);
u.pathname = `/${dbname}`;
const baseEnv = {
  ...process.env,
  DATABASE_URL: u.toString(),
  DEMO_MODE: 'true',
  API_INTERNAL_URL: 'http://127.0.0.1:3101',
  PATH: `${join(root, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}`,
};

function launch(name, cmd, args, cwd, env, log) {
  const out = openSync(log, 'a');
  const child = spawn(cmd, args, {
    cwd,
    env,
    stdio: ['ignore', out, out],
    detached: true,
    shell: process.platform === 'win32',
  });
  child.unref();
  appendFileSync(log, `\n--- ${name} pid ${child.pid} ---\n`);
  return child.pid;
}

const apiLog = join(root, 'tmp-api.log');
const webLog = join(root, 'tmp-web.log');
launch(
  'api',
  'node',
  ['apps/api/dist/main.js'],
  root,
  { ...baseEnv, PORT: '3101' },
  apiLog,
);
launch(
  'web',
  'node',
  [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '--port', '3100'],
  join(root, 'apps', 'web'),
  { ...baseEnv, PORT: '3100' },
  webLog,
);

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

const apiOk = await waitFor('http://127.0.0.1:3101/health');
console.log(`API:${apiOk ? 'UP' : 'DOWN'}`);
const webOk = await waitFor('http://127.0.0.1:3100/sign-in');
console.log(`WEB:${webOk ? 'UP' : 'DOWN'}`);
if (!apiOk || !webOk) process.exit(1);
