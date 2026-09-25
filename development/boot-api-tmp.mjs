// Temporary: boot the API against the isolated browser DB for diagnosis.
import { spawnSync } from "node:child_process";
const base = process.env.DATABASE_URL ?? "";
process.env.DATABASE_URL = base.replace(/\/sis$/, "/sis_browser");
process.env.PORT = "3101";
const r = spawnSync("node apps/api/dist/main.js", { stdio: "inherit", shell: true, env: process.env, timeout: 45000 });
process.exit(r.status ?? 1);
