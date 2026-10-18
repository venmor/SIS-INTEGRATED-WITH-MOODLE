import { cookies } from 'next/headers';
import { Notice, PageHeader } from '@sis/ui';
import type { MoodleLiveRunSetupView } from '@sis/contracts/moodle-live-run';
import { LiveRunWorkbench } from './workbench';
import ui from '../../staff-workspace.module.css';
export const dynamic = 'force-dynamic';
export default async function LiveRunPage() {
  const sid = (await cookies()).get('sid')?.value;
  let setup: MoodleLiveRunSetupView | null = null;
  let role = '';
  if (sid) try {
    const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
    const headers = { cookie: `sid=${encodeURIComponent(sid)}` };
    const [response, me] = await Promise.all([fetch(`${api}/integration/live-test/setup`, { headers, cache: 'no-store' }), fetch(`${api}/auth/me`, { headers, cache: 'no-store' })]);
    if (response.ok && me.ok) { setup = await response.json() as MoodleLiveRunSetupView; role = ((await me.json()) as { activeWorkspace?: { role: string } }).activeWorkspace?.role ?? ''; }
  } catch { /* Preserve unavailable state. */ }
  return <div className={ui.page}><main className={ui.main}>
    <PageHeader eyebrow="Learning integration" title="Moodle connection setup" lede="Prepare a bounded demonstration, select source records and independently authorise live synchronisation." />
    {setup ? <LiveRunWorkbench initial={setup} role={role} /> : <Notice severity="warning" title="Setup unavailable" message="Use an appointed Moodle administrator or integration support workspace. If already appointed, retry when the integration service is available." action={{ label: 'Moodle workspace', href: '/admin/moodle' }} />}
  </main></div>;
}
