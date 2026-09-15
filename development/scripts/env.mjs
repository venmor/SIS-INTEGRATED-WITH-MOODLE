// Shared .env loader (single copy — demo-reset and with-env both use this).
// Copies KEY=VALUE lines into process.env WITHOUT overwriting real env vars.
// Never prints values (secret-safe logging).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnv({ root, requireFile = false, defaults = {} }) {
  const file = join(root, ".env");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
      const value = trimmed.slice(trimmed.indexOf("=") + 1).trim();
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } else if (requireFile) {
    throw new Error("development/.env is missing — copy .env.example first");
  }
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in process.env)) process.env[key] = value;
  }
}
