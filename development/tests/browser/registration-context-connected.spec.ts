import { test, expect, type Page } from '@playwright/test';
// The browser global setup prepares this actor through the real synthetic workflow.
const period = 'DEMO-2026-PUBLICATION';
async function expectContext(page: Page, path: string, attemptId: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === path &&
    url.searchParams.getAll('attemptId').length === 1 &&
    url.searchParams.get('attemptId') === attemptId &&
    url.searchParams.getAll('period').length === 1 &&
    url.searchParams.get('period') === period &&
    [...url.searchParams.keys()].length === 2,
  );
}
test('ordinary student login discovers registered period and keeps academic navigation exact', async ({ page }, info) => {
  await page.goto('/sign-in?returnTo=%2Fstudent');
  await page.getByLabel('Username', { exact: true }).fill('chanda.time');
  await page.getByLabel('Password', { exact: true }).fill('Seed-2026-Student');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  const inventory = await page.evaluate(async () => {
    const response = await fetch("/api/registration/contexts");
    if (!response.ok) throw new Error("Owned registration context fixture is unavailable");
    return response.json();
  });
  const selected = inventory.items.find((item: { period: string }) => item.period === "DEMO-2026-PUBLICATION");
  expect(selected, "Prepared student owns the synthetic publication period").toBeTruthy();
  expect(selected.registrationStatus).toBe("REGISTERED");
  const attemptId = selected.attemptId;
  const query = `attemptId=${attemptId}&period=${period}`;
  await page.getByRole('link', { name: 'My timetable', exact: true }).click();
  await expectContext(page, '/student/timetable', attemptId);
  await expect(page.getByText('Timetable being prepared', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Programme and period', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('registered-period-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Registration', exact: true }).click();
  await expectContext(page, '/student/readiness', attemptId);
  await page.getByRole('link', { name: 'Plan your courses', exact: true }).click();
  await expectContext(page, '/student/courses', attemptId);
  await expect(page.getByRole('button', { name: 'Save course plan', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Review registration', exact: true }).click();
  await expectContext(page, '/student/register', attemptId);
  await expect(page.getByRole('status', { name: 'Registration completed', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit registration', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/student/timetable?${query}`);
  await expect(page.getByText('Timetable being prepared', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('registered-period-mobile.png'), fullPage: true });
  await page.goto(`/student/timetable?attemptId=${attemptId}&attemptId=wrong&period=${period}`);
  await expect(page.getByRole('alert', { name: 'Timetable status unavailable', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Published class sessions', exact: true })).toHaveCount(0);
});
