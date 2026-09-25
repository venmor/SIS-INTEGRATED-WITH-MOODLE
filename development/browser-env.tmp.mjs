// Temporary helper: re-exec a command with DATABASE_URL pointed at the
// isolated browser database (sis_browser). Deleted after use.
import { spawnSync } from "node:child_process";
const base = process.env.DATABASE_URL ?? "";
if (!/\/sis$/.test(new URL(base).pathname)) {
  console.error("refusing: base DATABASE_URL is not the shared sis db");
  process.exit(2);
}
process.env.DATABASE_URL = base.replace(/\/sis$/, "/sis_browser");
const cmd = process.argv.slice(2).join(" ");
const r = spawnSync(cmd, { stdio: "inherit", shell: true, env: process.env });
process.exit(r.status ?? 1);
