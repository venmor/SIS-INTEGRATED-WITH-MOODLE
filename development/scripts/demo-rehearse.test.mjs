import test from "node:test";
import assert from "node:assert/strict";
import { validateRehearsalEnvironment } from "./demo-rehearse.mjs";

test("demo rehearsal accepts explicit demo mode with a local database", () => {
  assert.deepEqual(
    validateRehearsalEnvironment({
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://sis:sis@127.0.0.1:5432/sis_demo",
      API_INTERNAL_URL: "http://127.0.0.1:3101",
    }),
    [],
  );
});

test("demo rehearsal refuses non-demo and remote database targets", () => {
  const errors = validateRehearsalEnvironment({
    DEMO_MODE: "false",
    DATABASE_URL: "postgresql://sis:sis@db.example.org:5432/sis",
    API_INTERNAL_URL: "https://api.example.org",
  });
  assert.match(errors.join("\n"), /DEMO_MODE=true/);
  assert.match(errors.join("\n"), /local database/i);
});

test("demo rehearsal requires the environment needed by the story checks", () => {
  const errors = validateRehearsalEnvironment({});
  assert.match(errors.join("\n"), /DATABASE_URL/);
  assert.match(errors.join("\n"), /API_INTERNAL_URL/);
});
