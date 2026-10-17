import { defineConfig, devices } from "@playwright/test";

// Real Next pages with an owned loopback fixture; no database or provider.
export default defineConfig({
  testDir: ".",
  testMatch: "student-study-workflows.spec.ts",
  outputDir: "../../../.superpowers/student-study-workflows/results",
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
