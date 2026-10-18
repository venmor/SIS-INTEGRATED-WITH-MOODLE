import { cookies } from 'next/headers';
import { Notice, PageHeader } from '@sis/ui';
import { LiveDeliveryQueue, type Inventory } from './queue';
import ui from '../../staff-workspace.module.css';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const sid = (await cookies()).get('sid')?.value;
  let inventory: Inventory | null = null;
  try {
    const r = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/integration/live-bindings/deliveries`, { headers: { cookie: `sid=${encodeURIComponent(sid ?? '')}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (r.ok) inventory = await r.json() as Inventory;
  } catch { /* An unavailable queue never becomes an empty success state. */ }
  return <div className={ui.page}><main className={ui.main}>
    <PageHeader eyebrow="Integration support" title="Live course delivery" lede="Review confirmed access and recover interrupted enrolments. Registration and earlier delivery evidence remain intact." />
    {inventory ? <LiveDeliveryQueue initial={inventory} /> : <Notice severity="warning" title="Queue unavailable" message="Use your appointed Integration support workspace with access to the current Moodle run." />}
  </main></div>;
}
