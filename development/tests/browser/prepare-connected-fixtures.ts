import { execFileSync } from "node:child_process";

// Playwright starts the configured API before globalSetup. This additive helper
// refuses non-demo targets and uses real registration/master APIs; it never publishes.
export default async function prepareConnectedFixtures() {
  execFileSync(process.execPath, ["scripts/timetable-publication-demo.mjs"], {
    cwd: process.cwd(), stdio: "inherit",
    env: { ...process.env, TIMETABLE_DEMO_API_URL: "http://127.0.0.1:3101" },
  });
}
