import { defineConfig, devices } from "@playwright/test";

// This suite owns its loopback fixture API and Next process. It never starts
// the connected API, loads repository env files, or opens a database.
export default defineConfig({
  testDir: ".",
  testMatch: "moodle-live-deferral.spec.ts",
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
