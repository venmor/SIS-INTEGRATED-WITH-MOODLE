// Cross-platform env wrapper: `node scripts/with-env.mjs <cmd> [args…]`.
// Loads development/.env when present (never overwrites real env), else falls
// back to parse-only dummies so `prisma generate` works on fresh clones and
// CI without a database. No shell-specific syntax (Windows-safe).
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({
  root,
  requireFile: false,
  defaults: { DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci" },
});
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("usage: node scripts/with-env.mjs <cmd> [args…]");
  process.exit(2);
}
const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
process.exit(result.status ?? 1);
