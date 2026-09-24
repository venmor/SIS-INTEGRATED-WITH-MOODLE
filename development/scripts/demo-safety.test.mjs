import test from "node:test";
import assert from "node:assert/strict";
import { validateDemoResetEnvironment } from "./demo-safety.mjs";

test("demo reset accepts explicit demo mode with a local database", () => {
  assert.deepEqual(
    validateDemoResetEnvironment({
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://sis:sis@localhost:5432/sis",
    }),
    [],
  );
});

test("demo reset refuses non-demo mode", () => {
  const errors = validateDemoResetEnvironment({
    DEMO_MODE: "false",
    DATABASE_URL: "postgresql://sis:sis@localhost:5432/sis",
  });
  assert.match(errors.join("\n"), /DEMO_MODE=true/i);
});

test("demo reset refuses a non-local database target", () => {
  const errors = validateDemoResetEnvironment({
    DEMO_MODE: "true",
    DATABASE_URL: "postgresql://sis:sis@db.example.edu:5432/sis",
  });
  assert.match(errors.join("\n"), /local database target/i);
});

test("demo reset refuses a missing or malformed database URL", () => {
  assert.match(
    validateDemoResetEnvironment({ DEMO_MODE: "true" }).join("\n"),
    /DATABASE_URL is required/i,
  );
  assert.match(
    validateDemoResetEnvironment({
      DEMO_MODE: "true",
      DATABASE_URL: "not-a-url",
    }).join("\n"),
    /DATABASE_URL must be a valid URL/i,
  );
});

test("demo reset refuses live Moodle provider configuration", () => {
  const errors = validateDemoResetEnvironment({
    DEMO_MODE: "true",
    DATABASE_URL: "postgresql://sis:sis@localhost:5432/sis",
    MOODLE_API_URL: "https://moodle.example.edu",
    MOODLE_API_TOKEN: "not-a-real-token",
  });
  assert.match(errors.join("\n"), /simulator-only|Moodle/i);
});
