import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceHome } from '../apps/web/lib/workspace-home.ts';

const active = (role, scopeType = 'SYSTEM', scopeRef = 'GLOBAL') => ({
  assignmentId: 'live-assignment', role, scopeType, scopeRef, endsAt: null,
});

test('landing uses the selected student, lecturer and global administrator workspaces', () => {
  assert.equal(workspaceHome(active('STUDENT', 'STUDENT', 'own-student')), '/student');
  assert.equal(workspaceHome(active('APP', 'APPLICATION', 'own-application')), '/applicant');
  assert.equal(workspaceHome(active('LEC', 'OFFERING', 'SWE-2026S1')), '/admin/assessment/plans');
  assert.equal(workspaceHome(active('SYSADMIN')), '/admin/reviews');
});

test('landing preserves an already selected role rather than choosing another held role', () => {
  const me = { workspaces: [active('SYSADMIN'), active('LEC', 'OFFERING', 'SWE-2026S1')],
    activeWorkspace: active('LEC', 'OFFERING', 'SWE-2026S1') };
  assert.equal(workspaceHome(me.activeWorkspace), '/admin/assessment/plans');
});

test('missing, expired, unknown and emergency authority stays on the recovery/switch page', () => {
  for (const value of [null, active('UNKNOWN'), active('SYSADMIN', 'SCHOOL', 'SCI'),
    active('SYSADMIN', 'BREAK_GLASS', 'INC-001'),
    { ...active('LEC'), endsAt: '2000-01-01T00:00:00Z' }]) {
    assert.equal(workspaceHome(value), '/workspaces');
  }
});

test('demo domain destinations need exact scope and the source owner permission result', () => {
  const reviewer = active('DOMAIN_ADMIN', 'SYSTEM', 'DEMO-UNIVERSITY');
  assert.equal(workspaceHome(reviewer), '/workspaces');
  assert.equal(workspaceHome(reviewer, { timetable: { canRead: true, canPublish: true } }), '/admin/timetabling/publications');
  assert.equal(workspaceHome(reviewer, { setupAvailable: true }), '/admin/setup/university');
  assert.equal(workspaceHome(active('DOMAIN_ADMIN', 'SYSTEM', 'OTHER'), { setupAvailable: true }), '/workspaces');
  assert.equal(workspaceHome(active('TIMETABLE_COORDINATOR', 'SYSTEM', 'DEMO-UNIVERSITY'), { timetable: { canRead: true, canCreate: true } }), '/admin/timetabling/master');
  assert.equal(workspaceHome(active('TIMETABLE_COORDINATOR', 'SYSTEM', 'OTHER'), { timetable: { canRead: true, canCreate: true } }), '/workspaces');
});
