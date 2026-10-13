import { test, expect } from '@playwright/test';
// Existing generated actor in the owned isolated database; no data seeding or
// official registration/publication mutation occurs in this browser proof.
const attemptId = 'e57bba21-8af6-4798-a4e7-e9bc431cca1e';
const period = 'DEMO-2026-PUBLICATION';
const query = `attemptId=${attemptId}&period=${period}`;
test('ordinary student login discovers published period and keeps academic navigation exact', async ({ page }, info) => {
  await page.goto('/sign-in');
  await page.getByLabel('Username', { exact: true }).fill('chanda.time');
  await page.getByLabel('Password', { exact: true }).fill('Seed-2026-Student');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  await page.getByRole('link', { name: 'My timetable', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/timetable\\?${query}`));
  await expect(page.getByRole('list', { name: 'Published class sessions', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Programme and period', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('registered-period-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Registration', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/readiness\\?${query}`));
  await page.getByRole('link', { name: 'Plan your courses', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/courses\\?${query}`));
  await expect(page.getByRole('button', { name: 'Save course plan', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Review registration', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/register\\?${query}`));
  await expect(page.getByRole('status', { name: 'Registration completed', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit registration', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/student/timetable?${query}`);
  await expect(page.getByRole('list', { name: 'Published class sessions', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('registered-period-mobile.png'), fullPage: true });
  await page.goto(`/student/timetable?attemptId=${attemptId}&attemptId=wrong&period=${period}`);
  await expect(page.getByRole('alert', { name: 'Timetable status unavailable', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Published class sessions', exact: true })).toHaveCount(0);
});
