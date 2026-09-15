// demo:reset — rebuild the database from scratch (Phase 1+). Cross-platform
// Node (no shell-specific syntax): compose up → wait healthy → migrate deploy
// → seed. Destroys the local pgdata volume; never touches real data (there is
// none — fictional fixtures only).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) {
    throw new Error("development/.env is missing — copy .env.example first");
  }
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    const value = trimmed.slice(trimmed.indexOf("=") + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sh(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`failed: ${cmd} ${args.join(" ")}`);
}

function ready() {
  const user = process.env.POSTGRES_USER ?? "sis";
  const db = process.env.POSTGRES_DB ?? "sis";
  for (let i = 0; i < 30; i++) {
    try {
      execFileSync("docker", ["exec", "sis-postgres-18", "pg_isready", "-U", user, "-d", db], { stdio: "ignore" });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
    }
  }
  throw new Error("postgres did not become ready in time");
}

loadEnv();
sh("docker", ["compose", "up", "-d", "db"]);
ready();
sh("npx", ["prisma", "generate"]);
sh("npx", ["prisma", "migrate", "deploy"]);
sh("node", ["prisma/seed/seed.ts"]);
console.log("demo:reset complete");
