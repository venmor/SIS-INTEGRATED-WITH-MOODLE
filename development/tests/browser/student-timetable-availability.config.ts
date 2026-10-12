import { defineConfig, devices } from "@playwright/test";

// Rendering and request-context evidence only. This suite owns a loopback
// fixture API and Next process; it never opens a database or provider.
export default defineConfig({
  testDir: ".",
  testMatch: "student-timetable-availability.spec.ts",
  outputDir:
    "../../../.superpowers/sdd/2026-10-08-student-timetable-ui/browser-results",
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
