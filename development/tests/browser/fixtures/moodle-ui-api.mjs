// Presentation component checks only. This local fixture never contacts Moodle
// or a database, and cannot demonstrate connected delivery or academic approval.
import { createServer } from 'node:http';
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let mappings; let run;
const sources = Array.from({ length: 12 }, (_, index) => ({ courseRegistrationId: uuid(index + 1), courseCode: `CSC${110 + index}`, courseTitle: `Computer Science course ${index + 1}`, periodId: '2026S1', studentId: uuid(index + 100), studentName: `Learner ${index + 1}`, shellKey: `${uuid(index + 200)}:2026S1` }));
const reset = () => { run = { id: uuid(600), runId: 'UI-FIXTURE-RUN', state: 'PREPARED', version: 1, expectedHost: 'fixture.invalid', expectedSiteId: 1, expectedRelease: 'Fixture 1.0', identityStatus: 'PENDING', identityCheckedAt: null, requiredBinding: { runId: 'UI-FIXTURE-RUN', dbFingerprint: 'a'.repeat(64) }, manifest: { checksum: 'b'.repeat(64), entryCount: 1, sealedAt: null, entries: [{ entity: 'Student', entityId: uuid(100), addedAt: new Date().toISOString() }] }, decisions: [], blockers: [], deliveryReadiness: { outcome: 'NOT_PROVISIONED', detail: 'UI fixture only' } }; mappings = sources.map((source, index) => ({ id: uuid(index + 300), kind: 'SHELL', sisType: 'COURSE_PERIOD', sisId: source.shellKey, moodleId: String(index + 20), status: 'DRAFT', version: 1, checks: index === 1 ? [{ result: 'ACADEMIC_APPROVED' }] : [] })); };
reset();
createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.url === '/fixture/health') return send(200, { fixture: true });
  if (req.url === '/fixture/reset' && req.method === 'POST') { reset(); return send(200, { reset: true }); }
  const sid = req.headers.cookie?.match(/sid=([^;]+)/)?.[1];
  if (!sid?.startsWith('ui-fixture-')) return send(401, { message: 'Fixture session required' });
  const role = sid.endsWith('support') ? 'INTEGRATION_SUPPORT' : sid.endsWith('coordinator') ? 'COORDINATOR' : sid.endsWith('lecturer') ? 'LEC' : 'MOODLE_ADMIN';
  if (req.url === '/auth/me') return send(200, { account: { displayName: 'UI Fixture Officer' }, activeWorkspace: { role, scopeType: role === 'COORDINATOR' ? 'SCHOOL' : 'SYSTEM', scopeRef: role === 'COORDINATOR' ? 'Natural Sciences' : 'MOODLE' } });
  const runView = () => { const permittedActions = role === 'INTEGRATION_SUPPORT' ? run.state === 'RUNNING' ? ['pause'] : ['start'] : run.manifest.sealedAt ? ['technical-approval'] : ['add-entry', 'seal']; return { ...run, permittedActions, actionEvidence: Object.fromEntries(permittedActions.map((a) => [a, 'c'.repeat(64)])) }; };
  if (req.url === '/integration/live-test/setup') return send(200, { target: { kind: 'live-test' }, databaseReady: true, current: runView() });
  if (req.url === '/integration/live-bindings' && req.method === 'GET') return send(200, { sources, mappings, state: 'RUNNING' });
  if (req.url === '/integration/live-bindings/deliveries' && req.method === 'GET') return send(200, { state: 'RUNNING', items: [{ id: uuid(700), courseCode: 'CSC110', studentNumber: '2026000001', state: 'MANUAL_REVIEW', attempt: 2, lastCode: 'MOODLE_REMOTE_REFUSAL', updatedAt: new Date().toISOString(), canRetry: true }] });
  if (req.url === '/assessment/batches') return send(200, { items: [], canStage: true });
  if (req.url === '/assessment/mappings') return send(200, { items: [{ id: uuid(400), componentId: uuid(401), moodleActivityId: '7', moodleCourseRef: '20', status: 'ACTIVE', version: 1, testResult: 'PASS', createdAt: new Date().toISOString() }] });
  let text = ''; for await (const part of req) text += part;
  const body = text ? JSON.parse(text) : {};
  if (req.url === `/integration/live-test/runs/${uuid(600)}/reauthenticate`) return body.password === 'Fixture-only-password!' ? send(201, { receiptToken: 'fixture-receipt-token', expiresAt: new Date(Date.now() + 300000).toISOString() }) : send(403, { message: 'FRESH_PASSWORD_REQUIRED' });
  if (req.method === 'POST' && !body.idempotencyKey) return send(400, { message: 'Request reference required' });
  if (req.url?.startsWith(`/integration/live-test/runs/${uuid(600)}/`) && req.method === 'POST') {
    if (req.url.endsWith('/manifest/entries')) { run.manifest.entries.push({ entity: body.entity, entityId: body.entityId, addedAt: new Date().toISOString() }); run.manifest.entryCount++; }
    if (req.url.endsWith('/manifest/seal')) run.manifest.sealedAt = new Date().toISOString();
    if (req.url.endsWith('/start')) { run.state = 'RUNNING'; run.identityStatus = 'VERIFIED'; }
    if (req.url.endsWith('/pause')) run.state = 'PAUSED';
    run.version++; return send(201, runView());
  }
  if (req.url === '/integration/live-bindings' && req.method === 'POST') {
    const source = sources.find((item) => item.courseRegistrationId === body.courseRegistrationId);
    if (!source) return send(400, { message: 'Choose a registration' });
    const binding = { id: uuid(999), kind: body.kind, sisType: body.kind === 'SHELL' ? 'COURSE_PERIOD' : 'STUDENT', sisId: body.kind === 'SHELL' ? source.shellKey : source.studentId, moodleId: String(body.moodleId ?? 100), status: 'DRAFT', version: 1, checks: [] };
    mappings = [binding, ...mappings.filter((item) => item.id !== binding.id)];
    return send(201, binding);
  }
  const decision = req.url?.match(/^\/integration\/live-bindings\/([^/]+)\/(attest|activate)$/);
  if (decision && req.method === 'POST') {
    const mapping = mappings.find((item) => item.id === decision[1]);
    if (!mapping) return send(404, { message: 'LIVE_BINDING_NOT_FOUND' });
    if (decision[2] === 'attest') mapping.checks.push({ result: 'ACADEMIC_APPROVED' });
    else if (body.password !== 'Fixture-only-password!') return send(403, { message: 'FRESH_PASSWORD_REQUIRED' });
    else { mapping.status = 'ACTIVE'; mapping.version++; }
    return send(201, mapping);
  }
  if (req.url === `/integration/live-bindings/deliveries/${uuid(700)}/retry` && req.method === 'POST') return body.reason?.length >= 10 ? send(201, { outcome: 'RECOVERY_QUEUED' }) : send(400, { message: 'Reason required' });
  if (req.url === `/assessment/mappings/${uuid(400)}/import-moodle` && req.method === 'POST') return send(201, { id: uuid(500), lines: [{ id: uuid(501) }, { id: uuid(502) }] });
  return send(404, { message: 'Fixture route not found' });
}).listen(3710, '127.0.0.1');
