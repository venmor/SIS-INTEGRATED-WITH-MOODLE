import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('fixture refresh refuses a non-test database before connecting', () => {
  const result = spawnSync(process.execPath, ['scripts/prepare-test-offerings.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/sis',
    },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /isolated test database required/i);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED|Can't reach database/i);
});
