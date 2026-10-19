'use client';
import { useRef, useState } from 'react';
import { ActionButton, DataTable, Notice, StatusChip } from '@sis/ui';
import ui from '../../staff-workspace.module.css';
type Delivery = { id: string; courseCode: string; studentNumber: string; state: string; attempt: number; lastCode: string | null; updatedAt: string; canRetry: boolean };
export type Inventory = { state: string; items: Delivery[] };
export function LiveDeliveryQueue({ initial }: { initial: Inventory }) {
  const [data, setData] = useState(initial), [selected, setSelected] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(1);
  const [pending, setPending] = useState(false), [feedback, setFeedback] = useState('');
  const references = useRef(new Map<string,string>());
  const rows = data.items.filter(r => `${r.courseCode} ${r.studentNumber} ${r.state}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1,Math.ceil(rows.length / 10)), current = Math.min(page,pages);
  async function refresh() {
    const r = await fetch('/api/integration/live-bindings/deliveries', { cache: 'no-store' });
    if (!r.ok) throw Error('The queue could not be refreshed. The last confirmed list is kept.');
    setData(await r.json() as Inventory);
  }
  return <section className={ui.panel}>
    <div className={ui.actions}><StatusChip tone="info">Run: {data.state}</StatusChip><button type="button" className={ui.secondary} disabled={pending} onClick={async () => { setPending(true); try { await refresh(); setFeedback('Queue refreshed.'); } catch (e) { setFeedback((e as Error).message); } finally { setPending(false); } }}>Refresh queue</button></div>
    {feedback ? <Notice severity="info" title="Delivery update" message={feedback} /> : null}
    <div className={ui.formField}><label className={ui.fieldLabel} htmlFor="delivery-search">Find course or student</label><input id="delivery-search" className={ui.control} type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>
    <DataTable title="Current run deliveries" rows={rows.slice((current-1)*10,current*10)} keyOf={r => r.id} emptyText="No deliveries match this view." columns={[
      { heading: 'Course', render: r => <strong>{r.courseCode}</strong> },
      { heading: 'Student', render: r => r.studentNumber },
      { heading: 'State', render: r => <StatusChip tone={r.state === 'DELIVERED' ? 'success' : 'attention'}>{r.state.replaceAll('_',' ')}</StatusChip> },
      { heading: 'Attempts', render: r => r.attempt },
      { heading: 'Last response', render: r => r.lastCode?.replaceAll('_',' ') ?? 'No error' },
      { heading: 'Action', render: r => r.canRetry ? <button type="button" className={ui.secondary} disabled={pending} onClick={() => setSelected(r.id)}>Review and retry</button> : 'No action needed' },
    ]} />
    <nav aria-label="Delivery pages" className={ui.actions}><button className={ui.secondary} disabled={current<=1} onClick={() => setPage(current-1)}>Previous</button><span>Page {current} of {pages}</span><button className={ui.secondary} disabled={current>=pages} onClick={() => setPage(current+1)}>Next</button></nav>
    {selected ? <form className={ui.form} onSubmit={async e => {
      e.preventDefault(); const reason = String(new FormData(e.currentTarget).get('reason') ?? '').trim();
      const ref = JSON.stringify([selected,reason]); let idempotencyKey = references.current.get(ref);
      if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); references.current.set(ref,idempotencyKey); }
      setPending(true); setFeedback('');
      try {
        const r = await fetch(`/api/integration/live-bindings/deliveries/${selected}/retry`, { method: 'POST', headers: { 'content-type':'application/json','x-requested-with':'XMLHttpRequest' }, body: JSON.stringify({ reason,idempotencyKey }) });
        if (!r.ok) throw Error('Recovery could not be queued. Check the active run, source registration and course connection, then retry.');
        setSelected(''); setFeedback('Recovery queued. The worker will check Moodle before applying another enrolment.'); await refresh();
      } catch (e) { setFeedback((e as Error).message); } finally { setPending(false); }
    }}><h2 className={ui.sectionHeading}>Retry delivery</h2><p className={ui.supporting}>Repair the reported cause first. We keep the previous attempt and verify the current Moodle state.</p><div className={ui.formField}><label className={ui.fieldLabel} htmlFor="recovery-reason">Reason for retry</label><textarea className={ui.control} id="recovery-reason" name="reason" required minLength={10} maxLength={500} disabled={pending} /></div><ActionButton pending={pending} loadingText="Queuing recovery…">Queue recovery</ActionButton><button type="button" className={ui.secondary} disabled={pending} onClick={() => setSelected('')}>Cancel</button></form> : null}
  </section>;
}
