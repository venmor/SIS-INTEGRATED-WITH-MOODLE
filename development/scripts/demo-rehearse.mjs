import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";

const filename = fileURLToPath(import.meta.url);
const root = join(dirname(filename), "..");

export function validateRehearsalEnvironment(env) {
  const errors = [];
  if (env.DEMO_MODE !== "true") errors.push("Set DEMO_MODE=true before rehearsal.");
  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  } else {
    try {
      const parsed = new URL(env.DATABASE_URL);
      if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
        errors.push("Rehearsal requires a local database target.");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid URL.");
    }
  }
  if (!env.API_INTERNAL_URL) errors.push("API_INTERNAL_URL is required.");
  return errors;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`failed: ${command} ${args.join(" ")}`);
  }
}

function command(name) {
  if (process.platform !== "win32") return name;
  return `${name}.cmd`;
}

async function main() {
  loadEnv({ root, requireFile: false });
  const errors = validateRehearsalEnvironment(process.env);
  if (errors.length) {
    console.error("Demo rehearsal refused unsafe or incomplete configuration.");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("1/3 Demo doctor");
  run(process.execPath, ["scripts/demo-doctor.mjs"]);

  console.log("\n2/3 Presentation browser contracts");
  run(command("npx"), [
    "playwright",
    "test",
    "tests/browser/demo-control.spec.ts",
    "tests/browser/demo-evidence.spec.ts",
    "tests/browser/design-preview-assessment.spec.ts",
    "tests/browser/design-preview-v2.spec.ts",
  ]);

  console.log("\n3/3 Story readiness");
  console.log("PASS Story 1: seeded admissions/student/finance checkpoints verified by demo:doctor.");
  console.log("PASS Story 2: teaching is live through Phase 6; assessment/results are explicitly preview-only.");
  console.log("PASS Story 3: seeded replay and reconciliation recovery checkpoints verified by demo:doctor.");
  console.log("\nFallback evidence:");
  console.log("- /demo/evidence");
  console.log("- /admin/audit");
  console.log("- /admin/integration");
  console.log("- /admin/integration/reconciliation");
  console.log("- /design-preview/assessment");
  console.log("\nDemo rehearsal passed.");
}

if (process.argv[1] === filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
