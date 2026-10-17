import { expect, type Page } from '@playwright/test';
import type { MeResponse } from '@sis/contracts';
import { workspaceHome } from '../../apps/web/lib/workspace-home';

/** Existing journey setup checks the selected-role landing, never any-route success. */
export async function expectWorkspaceLanding(page: Page) {
  await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/, { timeout: 20000 });
  const response = await page.request.get(new URL('/api/auth/me', page.url()).href);
  expect(response.status()).toBe(200);
  const me = (await response.json()) as MeResponse;
  const path = workspaceHome(me.activeWorkspace);
  await expect(page).toHaveURL(new URL(path, page.url()).href, { timeout: 20000 });
}
