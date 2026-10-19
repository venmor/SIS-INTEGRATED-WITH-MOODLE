'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ActionButton, DataTable, Notice, StatusChip } from '@sis/ui';
import type { MoodleLiveRunAction, MoodleLiveRunSetupView, MoodleLiveRunView } from '@sis/contracts/moodle-live-run';
import { requestReference, bindingFailure } from '../live-bindings/state';
import ui from '../../staff-workspace.module.css';
import styles from '../live-bindings/workbench.module.css';
const labels: Record<MoodleLiveRunAction, string> = { 'add-entry': 'Add source record', seal: 'Seal source list', 'technical-approval': 'Approve technical setup', start: 'Start synchronisation', pause: 'Pause synchronisation', resume: 'Resume synchronisation', fail: 'Stop failed run', complete: 'Complete rehearsal', 'close-technical': 'Confirm credential retirement', close: 'Close run' };
const freshActions: MoodleLiveRunAction[] = ['technical-approval', 'start', 'resume', 'close-technical', 'close'];
const entities = ['Account', 'Student', 'ProgrammeOffering', 'ProgrammeAttempt', 'CourseRegistration', 'TutorialGroup', 'TeachingAssignment'];
function failure(value: unknown): string {
  const raw = value && typeof value === 'object' && 'message' in value ? (value as { message: unknown }).message : null;
  const reasons: Record<string, string> = { RUN_VERSION_STALE: 'This run changed. Refresh before retrying.', MANIFEST_SOURCE_NOT_FOUND: 'The selected source record was not found. Check its type and SIS ID.', MANIFEST_NOT_SEALABLE: 'Add at least one valid source record before sealing.', FULL_REHEARSAL_EVIDENCE_REQUIRED: 'Completion needs the full rehearsal evidence. The current run remains available.', RUN_FRESH_AUTH_REQUIRED: 'Confirm your current SIS password for this action.', MOODLE_TARGET_IDENTITY_REQUIRED: 'The configured Moodle site could not be verified. Check connection settings and retry.', DATABASE_MIGRATIONS_REQUIRED: 'Apply the required database migrations before preparing the connection.' };
  if (typeof raw === 'string') return reasons[raw] ?? bindingFailure(raw);
  return 'This action was not confirmed. Refresh to check the current state before retrying.';
}
async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`/api/integration/live-test/${path}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify(body) });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(failure(data)) as Error & { status: number }; error.status = response.status; throw error; }
  return data;
}
export function LiveRunWorkbench({ initial, role }: { initial: MoodleLiveRunSetupView; role: string }) {
  const [setup, setSetup] = useState(initial);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<MoodleLiveRunAction | ''>('');
  const [page, setPage] = useState(1);
  const references = useRef(new Map<string, string>());
  // Short-lived receipts stay in memory only; keep the exact receipt across an
  // uncertain command response so the server can recover the original request.
  const receipts = useRef(new Map<string, string>());
  const run = setup.current;
  const permitted = run?.permittedActions ?? [];
  const actions: MoodleLiveRunAction[] = permitted.filter((action) => action !== 'add-entry');
  const action = selected && actions.includes(selected) ? selected : actions[0] ?? '';
  const pages = Math.max(1, Math.ceil((run?.manifest.entries.length ?? 0) / 10));
  const current = Math.min(page, pages);
  async function refresh() {
    if (pending) return;
    setPending(true);
    try { const response = await fetch('/api/integration/live-test/setup', { cache: 'no-store' }); const data: unknown = await response.json(); if (!response.ok) throw new Error(failure(data)); setSetup(data as MoodleLiveRunSetupView); setNotice({ error: false, text: 'Current setup loaded.' }); }
    catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : 'Refresh unavailable. Last confirmed setup is still shown.' }); }
    finally { setPending(false); }
  }
  async function act(path: string, identity: Record<string, unknown>, password?: string, requiring?: MoodleLiveRunAction) {
    if (pending) return;
    setPending(true); setNotice(null);
    const key = requestReference(references.current, path, identity, () => crypto.randomUUID());
    try {
      let receiptToken: string | undefined;
      if (requiring && run) {
        receiptToken = receipts.current.get(key);
        if (!receiptToken) {
          const proof = await post(`runs/${run.id}/reauthenticate`, { action: requiring, version: run.version, evidenceChecksum: run.actionEvidence[requiring], password }) as { receiptToken: string };
          receiptToken = proof.receiptToken; receipts.current.set(key, receiptToken);
        }
      }
      const updated = await post(path, { ...identity, idempotencyKey: key, ...(receiptToken ? { receiptToken } : {}) }) as MoodleLiveRunView;
      setSetup((prior) => ({ ...prior, current: updated }));
      receipts.current.delete(key);
      setNotice({ error: false, text: 'Action recorded. The current state and available next steps are shown below.' });
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status && status >= 400 && status < 500) { receipts.current.delete(key); references.current.delete(JSON.stringify([path, identity])); }
      setNotice({ error: true, text: `${error instanceof Error ? error.message : 'Connection interrupted.'} Request reference: ${key}. Keep this page open to retry the same request.` });
    }
    finally { setPending(false); }
  }
  return <>
    <div className={styles.summary} aria-label="Setup overview">
      <div className={styles.metric}><strong>{setup.target.kind === 'live-test' ? 'Live' : setup.target.kind === 'simulator' ? 'Simulator' : 'Blocked'}</strong><span>Connection mode</span></div>
      <div className={styles.metric}><strong>{run?.state.replaceAll('_', ' ') ?? 'Not prepared'}</strong><span>Current run</span></div>
      <div className={styles.metric}><strong>{run?.manifest.entryCount ?? 0}</strong><span>Selected source records</span></div>
    </div>
    <section className={ui.panel}><div className={ui.actions}><button className={ui.secondary} type="button" onClick={() => void refresh()} disabled={pending}>Refresh setup</button><Link className={ui.secondary} href="/admin/moodle/live-bindings">Course connections</Link></div><p className={ui.supporting}>The server stores the connection token and verifies the configured site. Do not enter a Moodle token here. Run approval enables controlled delivery; it does not certify enrolment or publish marks.</p>{setup.target.reasons?.length ? <Notice severity="warning" title="Connection settings needed" message="The server connection is incomplete. Check the deployment settings in the configuration guide below, then refresh." /> : null}</section>
    {notice ? <Notice severity={notice.error ? 'warning' : 'success'} title={notice.error ? 'Action not confirmed' : 'Setup updated'} message={notice.text} /> : null}
    {!run && role === 'MOODLE_ADMIN' ? <section className={ui.panel}>
      <h2 className={ui.sectionHeading}>Prepare demonstration</h2>
      <form className={ui.form} aria-label="Prepare Moodle demonstration" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void act('runs', { reason: String(data.get('reason')), nonProductionConfirmed: data.has('nonProduction'), syntheticOnlyConfirmed: data.has('syntheticOnly') }); }}>
        <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="prepare-reason">Purpose</label><input className={ui.control} id="prepare-reason" name="reason" required maxLength={500} disabled={pending} /></div>
        <label><input type="checkbox" name="nonProduction" required disabled={pending} /> This connection is for our demonstration.</label>
        <label><input type="checkbox" name="syntheticOnly" required disabled={pending} /> We use generated participants only.</label>
        <ActionButton disabled={pending || !setup.databaseReady || setup.target.kind !== 'live-test'} pending={pending} loadingText="Preparing run…">Prepare run</ActionButton>
      </form>
    </section> : null}
    {run ? <>
      <section className={ui.panel}><h2 className={ui.sectionHeading}>Connection identity</h2><div className={ui.actions}><StatusChip tone={run.state === 'RUNNING' ? 'success' : 'attention'}>{run.state}</StatusChip><StatusChip>Version {run.version}</StatusChip><StatusChip tone={run.manifest.sealedAt ? 'success' : 'neutral'}>{run.manifest.sealedAt ? 'Source list sealed' : 'Source list open'}</StatusChip></div>
        <dl className={ui.factGrid}><dt>Moodle site</dt><dd>{run.expectedHost} · site {run.expectedSiteId}</dd><dt>Expected release</dt><dd>{run.expectedRelease}</dd><dt>Site verification</dt><dd>{run.identityStatus}{run.identityCheckedAt ? ` · ${new Date(run.identityCheckedAt).toLocaleString('en-GB')}` : ''}</dd><dt>Run ID</dt><dd className={ui.code}>{run.requiredBinding.runId}</dd><dt>Database fingerprint</dt><dd className={ui.code}>{run.requiredBinding.dbFingerprint}</dd></dl>
        <details><summary className={ui.disclosure}>Deployment binding</summary><p className={ui.supporting}>Set MOODLE_LIVE_TEST_RUN_ID to this run ID and MOODLE_LIVE_TEST_DB_FINGERPRINT to this database fingerprint on the API server. Restart or redeploy the API before starting. These values bind this run to the configured database; they are not credentials.</p></details>
      </section>
      <section className={ui.panel}><h2 className={ui.sectionHeading}>Selected source records</h2><p className={ui.supporting}>Include the learner, programme attempt, programme offering and each course registration to be synchronised. Add the linked account where the identity workflow requires it. Sealing fixes the list for independent review.</p>
        <DataTable title="Run source manifest" hideTitle rows={run.manifest.entries.slice((current - 1) * 10, current * 10)} keyOf={(entry) => `${entry.entity}:${entry.entityId}`} emptyText="No source records selected." columns={[{ heading: 'Record type', render: (entry) => entry.entity }, { heading: 'SIS identifier', render: (entry) => <span className={ui.code}>{entry.entityId}</span> }]} />
        <nav className={styles.pager} aria-label="Source record pages"><span>{run.manifest.entryCount} records · page {current} of {pages}</span><div className={ui.actions}><button className={ui.secondary} type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous records</button><button className={ui.secondary} type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next records</button></div></nav>
        {permitted.includes('add-entry') ? <form className={ui.form} aria-label="Add run source record" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void act(`runs/${run.id}/manifest/entries`, { version: run.version, reason: String(data.get('reason')), entity: String(data.get('entity')), entityId: String(data.get('entityId')) }); }}>
          <div className={styles.grid}><div className={ui.formField}><label className={ui.fieldLabel} htmlFor="run-entity">Record type</label><select className={ui.control} id="run-entity" name="entity" disabled={pending}>{entities.map((entity) => <option key={entity}>{entity}</option>)}</select></div><div className={ui.formField}><label className={ui.fieldLabel} htmlFor="run-entity-id">SIS record ID</label><input className={ui.control} id="run-entity-id" name="entityId" required pattern="[0-9a-fA-F-]{36}" disabled={pending} /></div></div>
          <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="entry-reason">Reason</label><input className={ui.control} id="entry-reason" name="reason" required maxLength={500} disabled={pending} /></div><ActionButton pending={pending} disabled={pending} loadingText="Adding record…">Add source record</ActionButton>
        </form> : null}
      </section>
      <section className={ui.panel}><h2 className={ui.sectionHeading}>Review and run control</h2>
        {actions.length ? <form className={ui.form} aria-label="Control Moodle run" onSubmit={(event) => {
          event.preventDefault(); if (!action) return; const form = event.currentTarget; const data = new FormData(form); const password = String(data.get('password') ?? ''); const passwordInput = form.elements.namedItem('password') as HTMLInputElement | null; if (passwordInput) passwordInput.value = '';
          void act(`runs/${run.id}/${action === 'seal' ? 'manifest/seal' : action}`, { version: run.version, reason: String(data.get('reason')), ...(action === 'close-technical' ? { credentialRetiredConfirmed: data.has('credentialRetired') } : {}), ...(action === 'close' ? { evidenceFrozenConfirmed: data.has('evidenceFrozen'), humanReviewConfirmed: data.has('humanReview') } : {}) }, password, freshActions.includes(action) ? action : undefined);
        }}>
          <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="run-action">Available action</label><select id="run-action" className={ui.control} value={action} disabled={pending} onChange={(event) => setSelected(event.target.value as MoodleLiveRunAction)}>{actions.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></div>
          <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="action-reason">Decision reason</label><input id="action-reason" className={ui.control} name="reason" required maxLength={500} disabled={pending} /></div>
          {action && freshActions.includes(action) ? <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="run-password">Your SIS password</label><input id="run-password" className={ui.control} name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={pending} /><small className={ui.supporting}>Confirms this action only. Independent approval is checked by the server.</small></div> : null}
          {action === 'close-technical' ? <label><input type="checkbox" name="credentialRetired" required disabled={pending} /> I have retired the demonstration Moodle token.</label> : null}
          {action === 'close' ? <><label><input type="checkbox" name="evidenceFrozen" required disabled={pending} /> We have saved the final evidence.</label><label><input type="checkbox" name="humanReview" required disabled={pending} /> The required human review has taken place.</label></> : null}
          {action === 'complete' ? <p className={ui.supporting}>Completion remains blocked until the full rehearsal evidence is verified. A running state alone does not certify delivery.</p> : null}
          <ActionButton pending={pending} disabled={pending} loadingText="Recording action…">{action ? labels[action] : 'Select action'}</ActionButton>
        </form> : <p className={ui.empty}>No actions are available in this state for your appointment.</p>}
      </section>
      <section className={ui.panel}><h2 className={ui.sectionHeading}>Decision history</h2><DataTable title="Run decision history" hideTitle rows={run.decisions.slice(-10).reverse()} keyOf={(item) => item.id} emptyText="No decisions recorded." description="Most recent ten decisions; the complete history remains in the audit record." columns={[{ heading: 'Action', render: (item) => item.command }, { heading: 'Outcome', render: (item) => `${item.fromState} → ${item.toState}` }, { heading: 'Reason', render: (item) => item.reason }, { heading: 'Recorded', render: (item) => new Date(item.createdAt).toLocaleString('en-GB') }]} /></section>
    </> : null}
    <section className={ui.panel}><details><summary className={ui.disclosure}>Server configuration guide</summary><p className={ui.supporting}>Configure the API server with the Moodle HTTPS base URL, restricted external-service token, exact allowed host, expected site ID and release, role IDs, category ID, course visibility and demonstration cohort prefix. Keep the token in the ignored environment file or deployment secret settings. After preparing a run, apply its run ID and database fingerprint. Refresh, seal the source list, obtain independent technical approval and start from the integration support workspace.</p><dl className={ui.factGrid}><dt>Connection mode</dt><dd>MOODLE_INTEGRATION_MODE=live-test</dd><dt>Site identity</dt><dd>MOODLE_API_URL, MOODLE_ALLOWED_HOST, MOODLE_EXPECTED_SITE_ID, MOODLE_EXPECTED_VERSION</dd><dt>Token (server only)</dt><dd>MOODLE_API_TOKEN</dd><dt>Course settings</dt><dd>MOODLE_ROLE_IDS, MOODLE_CATEGORY_ID, MOODLE_COURSE_VISIBLE, MOODLE_LIVE_TEST_COHORT_PREFIX</dd><dt>Run binding</dt><dd>MOODLE_LIVE_TEST_RUN_ID, MOODLE_LIVE_TEST_DB_FINGERPRINT</dd></dl><p className={ui.supporting}>A missing service function or mismatched site is a visible blocker. Connection controls do not edit official registration or publish results.</p></details></section>
  </>;
}
