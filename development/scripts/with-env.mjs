// Cross-platform env wrapper: `node scripts/with-env.mjs <cmd> [args…]`.
// Loads development/.env when present (never overwrites real env), else falls
// back to parse-only dummies so `prisma generate` works on fresh clones and
// CI without a database. No shell-specific syntax (Windows-safe).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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
const localBin = join(root, "node_modules", ".bin");
const env = {
  ...process.env,
  PATH: `${localBin}${delimiter}${process.env.PATH ?? ""}`,
};

// On Windows those local binaries are <name>.cmd shims, and Node refuses to
// spawn a .cmd/.bat without a shell, so `with-env prisma generate` dies with
// EINVAL there. Resolve the shim and run it through the shell with every word
// quoted (arguments may contain JSON, so quoting is explicit, not casual).
const isWindows = process.platform === "win32";
const shim = (candidate) => {
  for (const ext of [".cmd", ".bat"]) {
    const file = join(localBin, candidate + ext);
    if (existsSync(file)) return file;
  }
  return null;
};
const quote = (word) => `"${String(word).replace(/"/g, '""')}"`;

const useShell = isWindows && !/\.(exe|cmd|bat)$/i.test(cmd) && shim(cmd);
const result = useShell
  ? spawnSync([shim(cmd), ...args].map(quote).join(" "), {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env,
    })
  : spawnSync(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
      env,
    });
process.exit(result.status ?? 1);
