import { expect, test, type Page } from '@playwright/test';

// Explicitly UI-fixture coverage. Real Moodle and PostgreSQL journeys are
// exercised separately; these mocked identities cannot prove either service.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function session(page: Page, role = 'admin') {
  await page.context().addCookies([{ name: 'sid', value: `ui-fixture-${role}`, url: 'http://127.0.0.1:3711' }]);
}

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:3710/fixture/reset');
});

test('UI fixture: course connections search, paging, keyboard and mobile layout', async ({ page }) => {
  await session(page);
  await page.goto('/admin/moodle/live-bindings');
  await expect(page.getByRole('heading', { name: 'Live course connections' })).toBeVisible();
  await expect(page.getByText('12 connections · page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('12 connections · page 2 of 2')).toBeVisible();
  await page.getByLabel('Find connection').fill('CSC110');
  await expect(page.getByText('1 connections · page 1 of 1')).toBeVisible();
  await page.getByRole('button', { name: 'Review connection', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('region', { name: 'Selected connection review' })).toBeVisible();
  await page.getByLabel('Find connection').focus();
  await expect(page.getByLabel('Find connection')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Verify and draft' })).toBeVisible();
});

test('UI fixture: uncertain draft reuses request reference and coordinator reviews saved course', async ({ page }) => {
  await session(page);
  await page.goto('/admin/moodle/live-bindings');
  let attempts = 0;
  const keys: string[] = [];
  await page.route('**/api/integration/live-bindings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts++;
    keys.push(route.request().postDataJSON().idempotencyKey);
    if (attempts === 1) return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Response unavailable' }) });
    return route.continue();
  });
  await page.getByRole('button', { name: 'Verify and draft' }).click();
  await expect(page.getByText('Action not confirmed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Verify and draft' }).click();
  await expect(page.getByText('Action confirmed', { exact: true })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await session(page, 'coordinator');
  await page.reload();
  await page.getByLabel('Find connection').fill(uuid(999));
  await page.getByRole('button', { name: 'Review connection', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Verify and draft' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Approve course connection' }).click();
  await expect(page.getByText('Action confirmed', { exact: true })).toBeVisible();
});

test('UI fixture: activation clears password and only confirmed states become active', async ({ page }) => {
  await session(page);
  await page.goto('/admin/moodle/live-bindings');
  await page.getByLabel('Find connection').fill(uuid(301));
  await page.getByRole('button', { name: 'Review connection', exact: true }).filter({ visible: true }).click();
  await page.getByLabel('Your SIS password').fill('Fixture-only-password!');
  const request = page.waitForRequest((r) => r.url().includes('/activate') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Activate connection', exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({ password: 'Fixture-only-password!', version: 1 });
  await expect(page.getByText('Action confirmed', { exact: true })).toBeVisible();
  await expect(page.getByText('This connection is active. Review delivery in the integration queue.')).toBeVisible();
  await expect(page.getByLabel('Your SIS password')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Fixture-only-password!');
});

test('UI fixture: lecturer imports marks through same-origin proxy and gets review link', async ({ page }) => {
  await session(page, 'lecturer');
  await page.goto('/admin/assessment/batches');
  const form = page.getByRole('form', { name: 'Import Moodle marks' });
  await form.getByLabel('Assessment mapping').selectOption(uuid(400));
  const imported = page.waitForResponse((r) => r.url().includes('/import-moodle') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Import marks' }).click();
  expect((await imported).status()).toBe(201);
  await expect(page.getByText('Moodle marks imported', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review batch', exact: true })).toHaveAttribute('href', `/admin/assessment/batches/${uuid(500)}`);
  await expect(page.getByText('2 student records saved for review.')).toBeVisible();
});

test('UI fixture: run manifest uses typed records and only permitted controls', async ({ page }) => {
  await session(page);
  await page.goto('/admin/moodle/live-run');
  await expect(page.getByRole('heading', { name: 'Moodle connection setup' })).toBeVisible();
  const add = page.getByRole('form', { name: 'Add run source record' });
  await add.getByLabel('Record type', { exact: true }).selectOption('CourseRegistration');
  await add.getByLabel('SIS record ID').fill(uuid(1));
  await add.getByLabel('Reason', { exact: true }).fill('Include registered course');
  await add.getByRole('button', { name: 'Add source record' }).click();
  await expect(page.getByText('2 records · page 1 of 1')).toBeVisible();
  const control = page.getByRole('form', { name: 'Control Moodle run' });
  await expect(control.getByLabel('Available action')).toHaveValue('seal');
  await expect(control.getByLabel('Available action').getByRole('option', { name: 'Start synchronisation' })).toHaveCount(0);
  await control.getByLabel('Decision reason').fill('Sources reviewed');
  await control.getByRole('button', { name: 'Seal source list' }).click();
  await expect(page.getByText('Source list sealed', { exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Add run source record' })).toHaveCount(0);
});

test('UI fixture: start binds fresh authentication to current action evidence', async ({ page }) => {
  await session(page, 'support');
  await page.goto('/admin/moodle/live-run');
  const control = page.getByRole('form', { name: 'Control Moodle run' });
  await control.getByLabel('Decision reason').fill('Approved demonstration');
  await control.getByLabel('Your SIS password').fill('Fixture-only-password!');
  const proof = page.waitForRequest((r) => r.url().includes('/reauthenticate') && r.method() === 'POST');
  await control.getByRole('button', { name: 'Start synchronisation' }).click();
  expect((await proof).postDataJSON()).toMatchObject({ action: 'start', version: 1, evidenceChecksum: 'c'.repeat(64), password: 'Fixture-only-password!' });
  await expect(page.getByText('Action recorded. The current state and available next steps are shown below.')).toBeVisible();
  await expect(control.getByLabel('Available action')).toHaveValue('pause');
  await expect(control.getByLabel('Your SIS password')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fixture-receipt-token');
});


test('UI fixture: Integration support reviews a failed delivery and queues an explained recovery', async ({ page }) => {
  await session(page, 'support');
  await page.goto('/admin/moodle/live-deliveries');
  await expect(page.getByRole('heading', { name: 'Live course delivery' })).toBeVisible();
  await page.getByRole('button', { name: 'Review and retry' }).filter({ visible: true }).click();
  await page.getByLabel('Reason for retry').fill('Corrected manual enrolment settings and verified the course.');
  const recovered = page.waitForResponse(r => r.url().includes('/deliveries/') && r.url().endsWith('/retry') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Queue recovery' }).click();
  expect((await recovered).status()).toBe(201);
  await expect(page.getByText('Recovery queued. The worker will check Moodle before applying another enrolment.')).toBeVisible();
});
