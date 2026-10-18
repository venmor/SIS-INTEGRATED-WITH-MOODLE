import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindingActions, requestReference } from './state.ts';

test('academic owner only attests a draft course, not identities or active mappings', () => {
  assert.deepEqual(bindingActions('COORDINATOR', { kind: 'SHELL', status: 'DRAFT', checks: [] }), { attest: true, activate: false });
  assert.equal(bindingActions('COORDINATOR', { kind: 'USER', status: 'DRAFT', checks: [] }).attest, false);
  assert.equal(bindingActions('COORDINATOR', { kind: 'SHELL', status: 'ACTIVE', checks: [] }).attest, false);
});
test('technical activation waits for academic course approval; other staff get no actions', () => {
  assert.equal(bindingActions('MOODLE_ADMIN', { kind: 'SHELL', status: 'DRAFT', checks: [] }).activate, false);
  assert.equal(bindingActions('MOODLE_ADMIN', { kind: 'SHELL', status: 'DRAFT', checks: [{ result: 'ACADEMIC_APPROVED' }] }).activate, true);
  assert.equal(bindingActions('MOODLE_ADMIN', { kind: 'USER', status: 'DRAFT', checks: [] }).activate, true);
  assert.deepEqual(bindingActions('LEC', { kind: 'USER', status: 'DRAFT', checks: [] }), { attest: false, activate: false });
});
test('uncertain retry retains the action reference while changed payload gets its own reference', () => {
  const refs = new Map(); let n = 0;
  const generate = () => `ref-${++n}`;
  assert.equal(requestReference(refs, '/draft', { courseRegistrationId: 'a' }, generate), 'ref-1');
  assert.equal(requestReference(refs, '/draft', { courseRegistrationId: 'a' }, generate), 'ref-1');
  assert.equal(requestReference(refs, '/draft', { courseRegistrationId: 'b' }, generate), 'ref-2');
  assert.equal(requestReference(refs, '/activate', { version: 1 }, generate), 'ref-3');
});
test('integration errors explain the next action instead of exposing internal codes', async () => {
  const { bindingFailure } = await import('./state.ts');
  assert.match(bindingFailure('INDEPENDENT_BINDING_DECISION_REQUIRED'), /different officer/i);
  assert.match(bindingFailure('PUBLISHED_CURRICULUM_COURSE_REQUIRED'), /published curriculum/i);
  assert.equal(bindingFailure('UNRECOGNISED_REMOTE_CODE'), 'We could not confirm this action. Refresh the list, then retry with the same selection.');
});
