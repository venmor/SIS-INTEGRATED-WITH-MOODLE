import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.REG_CONTEXT_WEB_ORIGIN;
if (!baseURL || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL)) throw new Error('Supply the owned isolated loopback REG_CONTEXT_WEB_ORIGIN.');
export default defineConfig({ testDir: '.', testMatch: 'registration-context-connected.spec.ts', outputDir: '../../../.superpowers/reg-context/connected-results', workers: 1, timeout: 60000, reporter: 'list', use: { ...devices['Desktop Chrome'], baseURL, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' } });
