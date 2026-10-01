import { defineConfig, devices } from "@playwright/test";
// Dedicated local ports; never reuse an OpenCode development server.
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "result-publication.spec.ts",
  timeout: 60000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3146",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node scripts/with-env.mjs node apps/api/dist/main.js",
      url: "http://127.0.0.1:3147/health",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command:
        "node scripts/with-env.mjs npm run start --workspace=web -- --port 3146",
      url: "http://127.0.0.1:3146",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
