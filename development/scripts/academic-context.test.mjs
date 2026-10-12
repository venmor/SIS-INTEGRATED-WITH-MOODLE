import { test } from 'node:test';
import assert from 'node:assert/strict';
import { academicHref, parseAcademicContext } from '../apps/web/lib/academic-context.ts';

const attemptId = 'e57bba21-8af6-4798-a4e7-e9bc431cca1e';
test('academic navigation preserves the exact selected attempt and period', () => {
  const input = { attemptId, period: 'DEMO-2026-PUBLICATION' };
  const parsed = parseAcademicContext(input);
  assert.equal(parsed.valid, true);
  const href = academicHref('/student/register', input);
  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/student/register');
  assert.deepEqual(Object.fromEntries(url.searchParams), input);
});
test('repeated or malformed explicit context cannot silently become a default', () => {
  for (const input of [
    { attemptId: [attemptId, attemptId], period: '2026S1' },
    { attemptId: 'another-student', period: '2026S1' },
    { attemptId, period: ['2026S1', 'DEMO-2026-PUBLICATION'] },
    { attemptId, period: '' },
    { attemptId, period: 'a'.repeat(65) },
  ]) assert.equal(parseAcademicContext(input).valid, false);
  assert.equal(parseAcademicContext({}).valid, true);
});
