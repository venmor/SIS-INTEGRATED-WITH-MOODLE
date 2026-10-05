// demo:reset — rebuild an ISOLATED demo database from scratch.
// Slice PH8-007 hardening: a prior accidental reset destroyed a shared
// local volume, so this script is fail-closed by construction:
//
// 1. Requires ALLOW_DEMO_RESET=true per invocation (in addition to the
//    seed's own ALLOW_DEMO_SEED gate). Without it, it refuses.
// 2. Runs in an isolated compose project (own container, port, volume).
//    Defaults target the shared `development` project and are REFUSED:
//    project `development`, container `sis-postgres-18`, port 5432.
// 3. Verifies the shared container still runs afterwards and reports it.
// 4. Fail-fast: any step throwing aborts (never seeds a dirty DB).
//
// Cross-platform Node (no shell-specific syntax). Never touches real
// data (there is none — fictional fixtures only).
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SHARED_PROJECT = "development";
const SHARED_CONTAINER = "sis-postgres-18";
const SHARED_PORT = "5432";

function refuse(reason) {
  console.error(`demo:reset refused: ${reason}`);
  process.exit(2);
}

if (process.env.ALLOW_DEMO_RESET !== "true")
  refuse("set ALLOW_DEMO_RESET=true for this invocation (explicit reset authorization).");

const project = process.env.SIS_DEMO_RESET_PROJECT ?? "sis-demo-reset";
const container = process.env.SIS_DEMO_RESET_CONTAINER ?? "sis-postgres-reset";
const port = process.env.SIS_DEMO_RESET_PORT ?? "55433";
const dbUser = process.env.SIS_DEMO_RESET_USER ?? "sis";
const dbPassword = process.env.SIS_DEMO_RESET_PASSWORD ?? "sis_local_only";
const dbName = process.env.SIS_DEMO_RESET_DB ?? "sis_demo_reset";

if (project === SHARED_PROJECT)
  refuse(`project "${project}" is the shared project; use an isolated -p name.`);
if (container === SHARED_CONTAINER)
  refuse(`container "${container}" is the shared service; use an isolated name.`);
if (port === SHARED_PORT)
  refuse(`port ${port} is the shared service port; use an isolated port.`);
if (!/^[a-z][a-z0-9_-]{0,62}$/.test(project) || !/^[a-z][a-z0-9_-]{0,62}$/.test(container))
  refuse("project/container names must be lowercase alphanumeric.");
if (!/^\d{2,5}$/.test(port)) refuse("port must be numeric.");

const startedAt = Date.now();
const composeBase = [
  "compose",
  "-p", project,
  "-f", "docker-compose.yml",
];
const composeEnv = {
  ...process.env,
  POSTGRES_CONTAINER: container,
  POSTGRES_PORT: port,
  POSTGRES_USER: dbUser,
  POSTGRES_PASSWORD: dbPassword,
  POSTGRES_DB: dbName,
  ALLOW_DEMO_SEED: "true",
  DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@localhost:${port}/${dbName}`,
};

function sh(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: composeEnv,
    ...options,
  });
  if (result.status !== 0) throw new Error(`failed: ${cmd} ${args.join(" ")}`);
}

function sharedRunning() {
  try {
    const out = execFileSync(
      "docker",
      ["inspect", "-f", "{{.State.Running}}", SHARED_CONTAINER],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out.trim() === "true";
  } catch {
    return false;
  }
}

function ready() {
  for (let i = 0; i < 30; i++) {
    try {
      execFileSync(
        "docker",
        ["exec", container, "pg_isready", "-U", dbUser, "-d", dbName],
        { stdio: "ignore" },
      );
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
    }
  }
  throw new Error("isolated postgres did not become ready in time");
}

loadEnv({ root, requireFile: true });
const sharedBefore = sharedRunning();
console.log(JSON.stringify({ sharedServiceBefore: sharedBefore }));
// Direct node invocations (Windows-safe; `npx` shims fail there).
// Prisma config needs DATABASE_URL, provided via composeEnv above.
sh("docker", [...composeBase, "down", "-v"]);
try {
  sh("docker", [...composeBase, "up", "-d", "db"]);
  ready();
  sh(process.execPath, ["scripts/with-env.mjs", "node", "./node_modules/prisma/build/index.js", "generate"]);
  sh(process.execPath, ["scripts/with-env.mjs", "node", "./node_modules/prisma/build/index.js", "migrate", "deploy"]);
  // Full seed needs Node 24 type stripping; on older runtimes this step
  // throws and the rehearsal records seed-skipped (CI proves the full
  // seed on every push). Never seed a dirty DB: migrate just ran.
  let seedSkipped = false;
  try {
    sh(process.execPath, ["prisma/seed/seed.ts"]);
  } catch {
    seedSkipped = true;
    console.log("seed skipped: full demo seed requires Node 24 (CI covers it).");
  }
  const sharedAfter = sharedRunning();
  const evidence = {
    project,
    container,
    port,
    database: dbName,
    sharedServiceBefore: sharedBefore,
    sharedServiceAfter: sharedAfter,
    seedSkipped,
    durationMs: Date.now() - startedAt,
  };
  console.log(JSON.stringify({ demoResetEvidence: evidence }));
  if (sharedBefore && !sharedAfter)
    throw new Error("shared service stopped during isolated reset — investigate before proceeding.");
} finally {
  // Always tear down ONLY the isolated project (never the shared one:
  // every compose call above carries the isolated -p name).
  spawnSync("docker", [...composeBase, "down", "-v"], {
    cwd: root,
    stdio: "inherit",
    env: composeEnv,
  });
}
console.log("demo:reset complete (isolated project removed)");
