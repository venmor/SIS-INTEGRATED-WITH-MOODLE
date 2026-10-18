'use client';

import { useRef, useState } from 'react';
import { ActionButton, DataTable, Notice, StatusChip } from '@sis/ui';
import type { Binding, BindingInventory, Source } from './state';
import { bindingActions, bindingFailure, requestReference } from './state';
import ui from '../../staff-workspace.module.css';
import styles from './workbench.module.css';

const PAGE_SIZE = 10;
function message(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const value = (data as { message: unknown }).message;
    if (typeof value === 'string') return bindingFailure(value);
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join('. ');
  }
  return 'We could not confirm this action. Refresh the list, then retry with the same selection.';
}

export function LiveBindings({ initial, role }: { initial: BindingInventory; role: string }) {
  const [inventory, setInventory] = useState(initial);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sourceId, setSourceId] = useState(initial.sources[0]?.courseRegistrationId ?? '');
  const [kind, setKind] = useState<'SHELL' | 'USER'>('SHELL');
  const [selectedId, setSelectedId] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; title: string; text: string } | null>(null);
  const references = useRef(new Map<string, string>());
  const selected = inventory.mappings.find((mapping) => mapping.id === selectedId);
  const source = inventory.sources.find((item) => item.courseRegistrationId === sourceId);
  const rows = inventory.mappings.filter((mapping) => {
    const match = inventory.sources.find((item) => mapping.kind === 'SHELL' ? item.shellKey === mapping.sisId : item.studentId === mapping.sisId);
    return (status === 'ALL' || mapping.status === status) && `${match?.courseCode ?? ''} ${match?.courseTitle ?? ''} ${match?.studentName ?? ''} ${mapping.moodleId} ${mapping.id}`.toLowerCase().includes(query.toLowerCase().trim());
  });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const actions = selected ? bindingActions(role, selected) : { attest: false, activate: false };

  async function reload() {
    const response = await fetch('/api/integration/live-bindings', { cache: 'no-store', credentials: 'same-origin' });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(message(data));
    setInventory(data as BindingInventory);
  }
  async function refresh() {
    if (pending) return;
    setPending('refresh');
    try { await reload(); setFeedback({ error: false, title: 'List refreshed', text: 'Current connection states have been loaded.' }); }
    catch { setFeedback({ error: true, title: 'Refresh unavailable', text: 'The last confirmed list is still shown. Retry shortly.' }); }
    finally { setPending(null); }
  }
  async function command(path: string, identity: Record<string, unknown>, success: string, password?: string) {
    if (pending) return;
    setPending(path); setFeedback(null);
    const idempotencyKey = requestReference(references.current, path, identity, () => crypto.randomUUID());
    try {
      const response = await fetch(`/api/integration${path}`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ ...identity, idempotencyKey, ...(password ? { password } : {}) }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(message(data));
      setFeedback({ error: false, title: 'Action confirmed', text: success });
      if (data && typeof data === 'object' && 'id' in data && typeof data.id === 'string') setSelectedId(data.id);
      try { await reload(); }
      catch { setFeedback({ error: false, title: 'Action saved; refresh pending', text: `${success} Refresh to load the latest states.` }); }
    } catch (error) {
      setFeedback({ error: true, title: 'Action not confirmed', text: `${error instanceof Error ? error.message : 'Connection interrupted.'} Request reference: ${idempotencyKey}. The reference is retained for retry.` });
    } finally { setPending(null); }
  }
  function sourceFor(mapping: Binding): Source | undefined {
    return inventory.sources.find((item) => mapping.kind === 'SHELL' ? item.shellKey === mapping.sisId : item.studentId === mapping.sisId);
  }
  return <>
    <div className={styles.summary} aria-label="Connection overview">
      <div className={styles.metric}><strong>{new Set(inventory.sources.map((item) => item.shellKey)).size}</strong><span>Registered courses in scope</span></div>
      <div className={styles.metric}><strong>{inventory.mappings.filter((item) => item.status === 'ACTIVE').length}</strong><span>Active connections</span></div>
      <div className={styles.metric}><strong>{inventory.mappings.filter((item) => item.status === 'DRAFT').length}</strong><span>Awaiting review</span></div>
    </div>
    <section className={ui.panel}>
      <div className={ui.actions}><StatusChip tone={inventory.state === 'RUNNING' ? 'success' : 'attention'}>Run: {inventory.state.replaceAll('_', ' ')}</StatusChip><button className={ui.secondary} type="button" onClick={() => void refresh()} disabled={pending !== null}>{pending === 'refresh' ? 'Refreshing…' : 'Refresh list'}</button></div>
      <ol className={styles.flow}><li>Choose SIS registration</li><li>Verify Moodle identity</li><li>Independent review</li><li>Activate connection</li></ol>
      <p className={ui.supporting}>Course connections need an academic coordinator and a different Moodle administrator. Learner connections need a different Moodle administrator. Registration remains valid while access is prepared.</p>
    </section>
    {feedback ? <Notice severity={feedback.error ? 'warning' : 'success'} title={feedback.title} message={feedback.text} /> : null}
    {role === 'MOODLE_ADMIN' ? <section className={ui.panel}>
      <h2 className={ui.sectionHeading}>Connect course or learner</h2>
      <p className={ui.supporting}>Choose an official registration. Leave the Moodle course ID empty to create a course; enter an existing ID to connect one. Learner connections require an existing Moodle user ID.</p>
      <form className={ui.form} aria-label="Draft live Moodle connection" onSubmit={(event) => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        const remoteId = String(form.get('moodle-id') ?? '').trim();
        void command('/live-bindings', { courseRegistrationId: sourceId, kind, ...(remoteId ? { moodleId: Number(remoteId) } : {}) }, 'Moodle identity verified and connection drafted. An independent officer must review it.');
      }}>
        <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="binding-source">Registered course and student</label><select className={ui.control} id="binding-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)} required disabled={pending !== null}><option value="">Choose registration…</option>{inventory.sources.map((item) => <option key={item.courseRegistrationId} value={item.courseRegistrationId}>{item.courseCode} · {item.periodId} · {item.studentName}</option>)}</select></div>
        {source ? <div className={styles.selection}><strong>{source.courseCode} — {source.courseTitle}</strong><span className={ui.supporting}>{source.studentName} · {source.periodId}</span></div> : null}
        <div className={styles.grid}>
          <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="binding-kind">Connection type</label><select id="binding-kind" className={ui.control} value={kind} onChange={(event) => setKind(event.target.value as 'SHELL' | 'USER')} disabled={pending !== null}><option value="SHELL">Course</option><option value="USER">Learner account</option></select></div>
          <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="moodle-id">Moodle {kind === 'SHELL' ? 'course' : 'user'} ID{kind === 'SHELL' ? ' (optional)' : ''}</label><input key={kind} id="moodle-id" name="moodle-id" className={ui.control} type="number" min="1" step="1" required={kind === 'USER'} disabled={pending !== null} /><small className={ui.supporting}>{kind === 'SHELL' ? 'Empty creates a course from SIS details.' : 'Use the numeric ID from the Moodle user profile.'}</small></div>
        </div>
        <ActionButton disabled={!sourceId || pending !== null || inventory.state !== 'RUNNING'} pending={pending === '/live-bindings'} loadingText="Checking Moodle…">Verify and draft</ActionButton>
      </form>
    </section> : null}
    <section className={ui.panel}>
      <h2 className={ui.sectionHeading}>Course and learner connections</h2>
      <div className={styles.toolbar}>
        <div className={`${ui.formField} ${styles.search}`}><label className={ui.fieldLabel} htmlFor="binding-search">Find connection</label><input id="binding-search" className={ui.control} type="search" placeholder="Course, student or Moodle ID" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>
        <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="binding-status">State</label><select id="binding-status" className={ui.control} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">All states</option><option value="DRAFT">Awaiting review</option><option value="ACTIVE">Active</option><option value="SUPERSEDED">Superseded</option></select></div>
      </div>
      <DataTable title="Live Moodle connections" hideTitle wideCards rows={rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} keyOf={(item) => item.id} emptyText="No connections match this view." columns={[
        { heading: 'SIS source', render: (item) => <><strong>{item.kind === 'SHELL' ? sourceFor(item)?.courseCode ?? 'Course' : sourceFor(item)?.studentName ?? 'Learner'}</strong><span className={styles.metadata}>{item.kind === 'SHELL' ? sourceFor(item)?.courseTitle : 'Learner account'} · {sourceFor(item)?.periodId}</span></> },
        { heading: 'Moodle ID', render: (item) => <>{item.moodleId}<span className={styles.metadata}>{item.kind === 'SHELL' ? 'Course' : 'User'} · version {item.version}</span></> },
        { heading: 'Review', render: (item) => <><StatusChip tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status.replaceAll('_', ' ')}</StatusChip>{item.kind === 'SHELL' && item.status === 'DRAFT' ? <span className={styles.metadata}>{item.checks.some((check) => check.result === 'ACADEMIC_APPROVED') ? 'Academic review complete' : 'Academic review needed'}</span> : null}</> },
        { heading: 'Action', render: (item) => <button className={ui.secondary} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selectedId === item.id}>Review connection</button> },
      ]} />
      <nav className={styles.pager} aria-label="Connection pages"><span>{rows.length} connections · page {current} of {pages}</span><div className={ui.actions}><button className={ui.secondary} type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button><button className={ui.secondary} type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button></div></nav>
    </section>
    {selected ? <section className={ui.panel} aria-label="Selected connection review">
      <h2 className={ui.sectionHeading}>Review connection</h2>
      <dl className={ui.factGrid}><dt>SIS source</dt><dd>{selected.kind === 'SHELL' ? sourceFor(selected)?.courseTitle : sourceFor(selected)?.studentName}<span className={styles.metadata}>{selected.sisId}</span></dd><dt>Moodle identifier</dt><dd>{selected.moodleId} · {selected.kind === 'SHELL' ? 'Course' : 'Learner'}</dd><dt>Connection state</dt><dd>{selected.status} · version {selected.version}</dd></dl>
      {actions.attest ? <ActionButton type="button" pending={pending === `/live-bindings/${selected.id}/attest`} disabled={pending !== null} loadingText="Recording review…" onClick={() => void command(`/live-bindings/${selected.id}/attest`, { version: selected.version }, 'Academic course connection review recorded. A different Moodle administrator can now activate it.')}>Approve course connection</ActionButton> : null}
      {actions.activate ? <form className={ui.form} aria-label="Activate live Moodle connection" onSubmit={(event) => {
        event.preventDefault(); const form = event.currentTarget; const input = form.elements.namedItem('confirm-password') as HTMLInputElement;
        const password = input.value; input.value = '';
        void command(`/live-bindings/${selected.id}/activate`, { version: selected.version }, 'Connection activated. Registered-course access is delivered through the integration queue.', password);
      }}>
        <p className={ui.supporting}>Confirm with your SIS password. The creator cannot activate their own connection.</p>
        <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="confirm-password">Your SIS password</label><input className={ui.control} id="confirm-password" name="confirm-password" type="password" autoComplete="current-password" required maxLength={256} disabled={pending !== null} /></div>
        <ActionButton pending={pending === `/live-bindings/${selected.id}/activate`} disabled={pending !== null} loadingText="Activating…">Activate connection</ActionButton>
      </form> : null}
      {!actions.attest && !actions.activate ? <p className={ui.supporting}>{selected.status === 'ACTIVE' ? 'This connection is active. Review delivery in the integration queue.' : selected.status !== 'DRAFT' ? 'This historical connection cannot be activated.' : 'Academic course review or a different appointed workspace is needed before activation.'}</p> : null}
    </section> : null}
  </>;
}
