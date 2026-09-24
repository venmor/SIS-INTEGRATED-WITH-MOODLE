const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateDemoResetEnvironment(env) {
  const errors = [];
  if (env.DEMO_MODE !== "true") {
    errors.push("Set DEMO_MODE=true before demo reset.");
  }

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  } else {
    try {
      const parsed = new URL(env.DATABASE_URL);
      if (!LOCAL_HOSTS.has(parsed.hostname)) {
        errors.push("Demo reset requires a local database target.");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid URL.");
    }
  }

  if ((env.MOODLE_API_URL ?? "").trim() || (env.MOODLE_API_TOKEN ?? "").trim()) {
    errors.push(
      "Demo reset is simulator-only; unset MOODLE_API_URL and MOODLE_API_TOKEN.",
    );
  }

  return errors;
}
