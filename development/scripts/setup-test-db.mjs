// setup-test-db — ensure the test database exists, run migrations, and seed.
// Uses the same DATABASE_URL resolution as with-env.mjs (loads .env, falls back to default).
// The default DATABASE_URL (postgresql://ci:ci@localhost:5432/ci) requires a Postgres instance.
// For local development: run `npm run db:start` first (starts embedded Postgres on port 5432),
// then this script will create the "ci" database/user in that instance.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Resolve DATABASE_URL exactly like with-env.mjs does
loadEnv({
  root,
  requireFile: false,
  defaults: { DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci" },
});

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL not resolved");

const url = new URL(dbUrl);
const host = url.hostname;
const port = Number(url.port || 5432);
const database = url.pathname.slice(1); // remove leading /
const user = url.username;
const password = url.password;

console.log(`Setting up test database: ${database} on ${host}:${port}`);

// Connect as superuser (postgres) to create database and role
// For embedded postgres (local-db), the superuser is the configured user (default "sis")
const superUser = process.env.POSTGRES_USER ?? "sis";
const superPassword = process.env.POSTGRES_PASSWORD ?? "sis";

async function ensureDatabaseAndRole() {
  const { Client } = await import("pg");
  const adminClient = new Client({
    host,
    port,
    user: superUser,
    password: superPassword,
    database: "postgres",
  });
  await adminClient.connect();
  try {
    // Create role if not exists
    try {
      await adminClient.query(`CREATE ROLE "${user}" WITH LOGIN PASSWORD '${password}'`);
      console.log(`created role ${user}`);
    } catch (error) {
      if (error?.code !== "42710") throw error; // duplicate_object
    }
    // Create database if not exists
    try {
      await adminClient.query(`CREATE DATABASE "${database}" OWNER "${user}"`);
      console.log(`created database ${database} owned by ${user}`);
    } catch (error) {
      if (error?.code !== "42P04") throw error; // duplicate_database
    }
    // Grant privileges
    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${database}" TO "${user}"`);
  } finally {
    await adminClient.end();
  }
}

function sh(cmd, args, env) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`failed: ${cmd} ${args.join(" ")}`);
  }
}

await ensureDatabaseAndRole();

// Run migrations and seed against the test database
const env = { ...process.env, DATABASE_URL: dbUrl };

console.log("Running migrations on test database...");
sh("npx", ["prisma", "migrate", "deploy"], env);

console.log("Seeding test database...");
sh("node", ["prisma/seed/seed.ts"], env);

console.log("Test database ready");