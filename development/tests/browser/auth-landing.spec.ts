import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { createStudent, createLecturer } from './fixtures';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { hash } = require('argon2');

async function landingActor(roles: string[]) {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !/(?:test|review|ci|browser)/i.test(url.pathname)) throw new Error('Use an isolated loopback browser database.');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });
  try {
    const person = await db.person.create({ data: { displayName: 'Fictional landing reviewer' } });
    const username = `browser.landing.${randomUUID()}`;
    const password = 'Fictional-workspace-browser-2026!';
    const account = await db.account.create({ data: { personId: person.id, username } });
    await db.credential.create({ data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(password) } });
    for (const [index, role] of roles.entries()) await db.roleAssignment.create({ data: {
      accountId: account.id, role, scopeType: role === 'LEC' ? 'OFFERING' : 'SYSTEM',
      scopeRef: role === 'LEC' ? 'SWE-2026S1' : 'GLOBAL',
      capabilities: role === 'LEC' ? ['stage-marks'] : ['administer-identity'],
      startsAt: new Date(`200${index}-01-01`), reason: 'Isolated browser landing fixture',
    } });
    return { username, password };
  } finally { await db.$disconnect(); }
}

async function signIn(page: Page, actor: { username: string; password: string }, returnTo?: string) {
  await page.goto(`/sign-in${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`);
  await page.getByLabel('Username', { exact: true }).fill(actor.username);
  await page.getByLabel('Password', { exact: true }).fill(actor.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('real student and lecturer sign-in opens their actual workspace without a chooser', async ({ page }) => {
  await signIn(page, await createStudent());
  await expect(page).toHaveURL(/\/student$/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Switch workspace', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Switch workspace', exact: true })).toHaveAttribute('href', '/workspaces');
  await page.context().clearCookies();
  await signIn(page, await createLecturer());
  await expect(page).toHaveURL(/\/admin\/assessment\/plans$/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Switch workspace', exact: true })).toHaveCount(0);
});

test('global administrator and deliberate multi-role switching retain the selected context on re-sign-in', async ({ page }) => {
  const actor = await landingActor(['LEC', 'SYSADMIN']);
  await signIn(page, actor);
  await expect(page).toHaveURL(/\/admin\/assessment\/plans$/, { timeout: 20000 });
  await page.goto('/workspaces');
  await page.getByRole('button', { name: 'Switch to SYSADMIN · GLOBAL', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/reviews$/, { timeout: 20000 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/admin\/reviews$/);
  await signIn(page, actor);
  await expect(page).toHaveURL(/\/admin\/reviews$/, { timeout: 20000 });
  await page.goto('/workspaces');
  await expect(page.getByRole('button', { name: 'SYSADMIN · GLOBAL (active)', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Continue current workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/reviews$/);
});

test('no active authority reaches safe recovery without an unauthorized default', async ({ page }) => {
  await signIn(page, await landingActor([]));
  await expect(page).toHaveURL(/\/workspaces$/, { timeout: 20000 });
  await expect(page.getByText('No active workspace', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Access reviews', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Student portal', exact: true })).toHaveCount(0);
});

test('explicit safe return links survive login while external destinations use the actual workspace', async ({ page }) => {
  const actor = await createStudent();
  await signIn(page, actor, '/notifications');
  await expect(page).toHaveURL(/\/notifications$/, { timeout: 20000 });
  await signIn(page, actor, '//example.invalid');
  await expect(page).toHaveURL(/\/student$/, { timeout: 20000 });
  expect(new URL(page.url()).hostname).not.toBe('example.invalid');
});
