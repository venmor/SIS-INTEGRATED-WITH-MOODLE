// Each connected suite gets a disposable clone; immutable history and fixture
// edits must never change the baseline observed by another suite.
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

export function assertIsolatedBaseline(env) {
  const url = new URL(env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || env.DEMO_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^sis_(?:ci|setup003_test|time003_review)(?:_[A-Za-z0-9]+)*$/.test(url.pathname.slice(1))) {
    throw new Error('A local, explicitly named isolated demonstration baseline is required.');
  }
  return url;
}
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
async function main() {
  const baseline = assertIsolatedBaseline(process.env);
  const files = (await readdir('apps/api/test')).filter((name) => name.endsWith('.e2e-spec.ts')).sort();
  const adminUrl = new URL(baseline); adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect();
  try {
    for (const file of files) {
      const name = `sis_setup003_test_ci_${randomBytes(8).toString('hex')}`;
      await admin.query(`CREATE DATABASE ${quote(name)} TEMPLATE ${quote(decodeURIComponent(baseline.pathname.slice(1)))}`);
      const target = new URL(baseline); target.hostname = '127.0.0.1'; target.pathname = `/${name}`;
      console.log(`Isolated connected suite: ${file}`);
      let status;
      try {
        status = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ['../../node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.e2e.ts', `test/${file}`, '--no-file-parallelism'], {
            cwd: 'apps/api', env: { ...process.env, DATABASE_URL: target.href }, stdio: 'inherit',
          });
          child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1));
        });
        if (status === 0 && process.env.CI_BACKUP_REHEARSAL === 'true' && ['finance-assessment.e2e-spec.ts', 'grade-publication.e2e-spec.ts'].includes(file)) {
          status = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ['scripts/backup-test.mjs'], { env: { ...process.env, DATABASE_URL: target.href }, stdio: 'inherit' });
            child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1));
          });
        }
      } finally {
        // Only the random database created above is ever removed.
        await admin.query(`DROP DATABASE ${quote(name)} WITH (FORCE)`);
      }
      if (status !== 0) { process.exitCode = status; break; }
    }
  } finally { await admin.end(); }
}
if (process.argv[1]?.endsWith('/isolated-e2e.mjs')) main().catch(() => {
  console.error('Isolated connected suite runner failed; inspect the preceding suite output.');
  process.exitCode = 1;
});
