import { cookies } from 'next/headers';
import { Notice, PageHeader } from '@sis/ui';
import { LiveBindings } from './workbench';
import type { BindingInventory } from './state';
import ui from '../../staff-workspace.module.css';

export const dynamic = 'force-dynamic';

export default async function LiveBindingsPage() {
  const sid = (await cookies()).get('sid')?.value;
  const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  let inventory: BindingInventory | null = null;
  let role = '';
  let unavailable = 'The integration service is unavailable. Retry without changing your registration.';
  if (sid) {
    try {
      const headers = { cookie: `sid=${encodeURIComponent(sid)}` };
      const [list, me] = await Promise.all([
        fetch(`${api}/integration/live-bindings`, { headers, cache: 'no-store' }),
        fetch(`${api}/auth/me`, { headers, cache: 'no-store' }),
      ]);
      if (list.ok && me.ok) {
        inventory = await list.json() as BindingInventory;
        role = ((await me.json()) as { activeWorkspace?: { role: string } }).activeWorkspace?.role ?? '';
      } else if (list.status === 401 || list.status === 403) {
        unavailable = 'Use an appointed Moodle administrator or course coordinator workspace. The active run must include the registered course and student.';
      }
    } catch { /* Preserve an explicit unavailable state, never an empty successful list. */ }
  } else unavailable = 'Sign in with your Moodle administration or course coordinator account.';
  return (
    <div className={ui.page}><main className={ui.main}>
      <PageHeader eyebrow="Learning integration" title="Live course connections" lede="Connect official SIS registrations to Moodle courses and learner accounts. Independent review protects course and identity links." />
      {inventory ? <LiveBindings initial={inventory} role={role} /> : <Notice severity="warning" title="Connections unavailable" message={unavailable} action={{ label: 'Moodle workspace', href: '/admin/moodle' }} />}
    </main></div>
  );
}
