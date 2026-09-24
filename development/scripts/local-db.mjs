// local-db — user-space PostgreSQL 18 for local UI testing (no Docker,
// no root). Data lives in ~/.local/share/sis-postgres-18 and survives
// restarts; nothing here touches real infrastructure.
//
// Usage:
//   node scripts/local-db.mjs start   # init if needed, start, ensure role+db
//   node scripts/local-db.mjs stop    # stop the server (keeps data)
//   node scripts/local-db.mjs status  # report whether it answers
//   node scripts/local-db.mjs reset   # STOP + WIPE the data directory
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import EmbeddedPostgres from "embedded-postgres";
import { loadEnv } from "./env.mjs";

const root = join(new URL(".", import.meta.url).pathname, "..");
loadEnv({ root });

const DATA_DIR =
  process.env.SIS_PGDATA ?? join(homedir(), ".local/share/sis-postgres-18");
const PORT = Number(process.env.SIS_PGPORT ?? 5432);
const SUPERUSER = process.env.POSTGRES_USER ?? "sis";
const SUPERPASSWORD = process.env.POSTGRES_PASSWORD ?? "sis";
const DATABASE = process.env.POSTGRES_DB ?? "sis";

function pg() {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: SUPERUSER,
    password: SUPERPASSWORD,
    port: PORT,
    persistent: true,
  });
}

function probe() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: PORT });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000).unref?.();
  });
}

async function ensureRoleAndDb(server) {
  const client = server.getPgClient();
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${DATABASE}"`);
    console.log(`created database ${DATABASE}`);
  } catch (error) {
    if (error?.code !== "42P04") throw error;
  } finally {
    await client.end();
  }
}

function binDir() {
  const require = createRequire(join(root, "package.json"));
  const entry = require.resolve("@embedded-postgres/linux-x64");
  return join(dirname(entry), "..", "native", "bin");
}

async function start() {
  if (await probe()) {
    console.log(`postgres already answering on 127.0.0.1:${PORT}`);
    return;
  }
  const fresh = !existsSync(join(DATA_DIR, "PG_VERSION"));
  if (fresh) {
    console.log(`initialising cluster in ${DATA_DIR} ...`);
    await pg().initialise();
  }
  // pg_ctl daemonizes: the server survives this process exiting (the
  // embedded-postgres child handle does not).
  const bindir = binDir();
  const started = spawnSync(
    join(bindir, "pg_ctl"),
    [
      "-D",
      DATA_DIR,
      "-l",
      join(DATA_DIR, "local-db.log"),
      "-o",
      `-p ${PORT} -k "" -c listen_addresses=127.0.0.1`,
      "start",
    ],
    { encoding: "utf8" },
  );
  if (started.status !== 0) {
    console.error(started.stderr || started.stdout);
    throw new Error("pg_ctl start failed");
  }
  for (let i = 0; i < 30; i++) {
    if (await probe()) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!(await probe())) throw new Error("postgres did not answer in time");
  await ensureRoleAndDb(pg());
  console.log(`postgres up on 127.0.0.1:${PORT} (db ${DATABASE})`);
}

async function stop() {
  if (!(await probe())) {
    console.log("postgres is not running");
    return;
  }
  const stopped = spawnSync(join(binDir(), "pg_ctl"), ["-D", DATA_DIR, "stop"], {
    encoding: "utf8",
  });
  if (stopped.status !== 0) {
    console.error(stopped.stderr || stopped.stdout);
    throw new Error("pg_ctl stop failed");
  }
  console.log("postgres stopped (data kept)");
}

async function reset() {
  if (await probe()) await stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
  console.log(`wiped ${DATA_DIR} — run 'start' to re-initialise`);
}

const command = process.argv[2] ?? "status";
if (command === "start") await start();
else if (command === "stop") await stop();
else if (command === "reset") await reset();
else console.log((await probe()) ? "postgres is UP" : "postgres is DOWN");
process.exit(0);
