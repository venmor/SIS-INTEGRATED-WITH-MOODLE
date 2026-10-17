import 'server-only';
import { cookies } from 'next/headers';
import type { MeResponse } from '@sis/contracts';
import { institutionSetupAvailable } from './institution-setup-permissions';
import { timetablePermissions } from './timetable-permissions';
import { workspaceHome } from './workspace-home';

export type WorkspaceSession =
  | { state: 'signed-in'; me: MeResponse }
  | { state: 'anonymous' }
  | { state: 'unavailable' };

/** Resolve the server's current selection. Never infer a role from a username. */
export async function loadWorkspaceSession(): Promise<WorkspaceSession> {
  const sid = (await cookies()).get('sid')?.value;
  if (!sid) return { state: 'anonymous' };
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) return { state: 'anonymous' };
    if (!response.ok) return { state: 'unavailable' };
    return { state: 'signed-in', me: (await response.json()) as MeResponse };
  } catch {
    return { state: 'unavailable' };
  }
}

export async function activeWorkspaceHome(active: MeResponse['activeWorkspace']) {
  const [timetable, setupAvailable] = await Promise.all([
    timetablePermissions(active), institutionSetupAvailable(active),
  ]);
  return workspaceHome(active, {
    timetable, setupAvailable,
    demoRulesAvailable: process.env.DEMO_MODE === 'true' &&
      process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS === 'true',
  });
}
