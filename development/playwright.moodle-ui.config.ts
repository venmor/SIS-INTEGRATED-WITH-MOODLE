import { defineConfig, devices } from '@playwright/test';

/** UI-fixture checks: real Next pages and same-origin proxies; no Moodle/DB proof. */
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'moodle-operations-ui.spec.ts',
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: '.evidence/moodle-ui-browser',
  use: {
    baseURL: 'http://127.0.0.1:3711',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: [
    { command: 'node tests/browser/fixtures/moodle-ui-api.mjs', url: 'http://127.0.0.1:3710/fixture/health', reuseExistingServer: false },
    { command: 'node tests/browser/fixtures/start-moodle-ui-web.mjs', url: 'http://127.0.0.1:3711/sign-in', reuseExistingServer: false, timeout: 120000 },
  ],
});
