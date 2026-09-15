// Cross-platform env wrapper: `node scripts/with-env.mjs <cmd> [args…]`.
// Loads development/.env when present (never overwrites real env), else falls
// back to parse-only dummies so `prisma generate` works on fresh clones and
// CI without a database. No shell-specific syntax (Windows-safe).
import { spawnSync } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
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
// Local binaries (prisma, nest, vitest…) live in node_modules/.bin, which is
// NOT on PATH for spawned processes — without this, `with-env prisma …`
// silently runs nothing and the Prisma client goes stale (slice-3 lesson).
const env = {
  ...process.env,
  PATH: `${join(root, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
};
const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false, env });
process.exit(result.status ?? 1);
