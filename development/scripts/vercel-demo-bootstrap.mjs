import { spawnSync } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEMO_API_PROJECT_ID = "prj_R9XRipqNatks71GYJCxOySknyxBr";

export function validateVercelDemoBootstrap(env) {
  if (!env.VERCEL) return { run: false, errors: [] };
  const isDocumentedDemoProject =
    env.VERCEL_PROJECT_ID === DEMO_API_PROJECT_ID;
  if (env.DEMO_MODE !== "true" && !isDocumentedDemoProject) {
    return { run: false, errors: [] };
  }

  const errors = [];
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for Vercel demo bootstrap.");
  } else {
    try {
      const parsed = new URL(databaseUrl);
      if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
        errors.push("DATABASE_URL must be a PostgreSQL URL.");
      }
      if (LOCAL_HOSTS.has(parsed.hostname)) {
        errors.push("Vercel demo bootstrap requires a remote demo database.");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid URL.");
    }
  }

  if ((env.MOODLE_API_URL ?? "").trim() || (env.MOODLE_API_TOKEN ?? "").trim()) {
    errors.push(
      "Vercel demo bootstrap is simulator-only; unset MOODLE_API_URL and MOODLE_API_TOKEN.",
    );
  }

  return { run: errors.length === 0, errors };
}

function run(command, args, env, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function main(env = process.env) {
  const result = validateVercelDemoBootstrap(env);
  if (result.errors.length > 0) {
    console.error("Vercel demo bootstrap refused unsafe configuration.");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  if (!result.run) return;

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const childEnv = {
    ...env,
    ALLOW_DEMO_SEED: "true",
    DEMO_MODE: "true",
    PATH: `${join(root, "node_modules", ".bin")}${delimiter}${env.PATH ?? ""}`,
  };

  console.log("Preparing Vercel fictional demo database…");
  run("prisma", ["migrate", "deploy"], childEnv, root);
  run(process.execPath, ["prisma/seed/seed.ts"], childEnv, root);
  console.log("Vercel fictional demo database is ready.");
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
