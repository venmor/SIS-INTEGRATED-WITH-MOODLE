import test from "node:test";
import assert from "node:assert/strict";
import { validateVercelDemoBootstrap } from "./vercel-demo-bootstrap.mjs";

test("non-Vercel installs do not bootstrap the cloud demo", () => {
  assert.deepEqual(
    validateVercelDemoBootstrap({
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://demo:demo@db.example.test/demo",
    }),
    { run: false, errors: [] },
  );
});

test("Vercel non-demo installs do not seed", () => {
  assert.deepEqual(
    validateVercelDemoBootstrap({
      VERCEL: "1",
      DEMO_MODE: "false",
      DATABASE_URL: "postgresql://demo:demo@db.example.test/demo",
    }),
    { run: false, errors: [] },
  );
});

test("Vercel demo installs accept a remote PostgreSQL demo database", () => {
  assert.deepEqual(
    validateVercelDemoBootstrap({
      VERCEL: "1",
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://demo:demo@ep-demo.neon.tech/demo?sslmode=require",
    }),
    { run: true, errors: [] },
  );
});

test("Vercel demo bootstrap refuses a local database target", () => {
  const result = validateVercelDemoBootstrap({
    VERCEL: "1",
    DEMO_MODE: "true",
    DATABASE_URL: "postgresql://demo:demo@localhost:5432/demo",
  });
  assert.equal(result.run, false);
  assert.match(result.errors.join("\n"), /remote demo database/i);
});

test("Vercel demo bootstrap refuses live Moodle configuration", () => {
  const result = validateVercelDemoBootstrap({
    VERCEL: "1",
    DEMO_MODE: "true",
    DATABASE_URL: "postgresql://demo:demo@ep-demo.neon.tech/demo?sslmode=require",
    MOODLE_API_URL: "https://moodle.example.edu",
    MOODLE_API_TOKEN: "fictional",
  });
  assert.equal(result.run, false);
  assert.match(result.errors.join("\n"), /simulator-only/i);
});

test("Vercel demo bootstrap rejects missing or malformed database URLs", () => {
  assert.match(
    validateVercelDemoBootstrap({ VERCEL: "1", DEMO_MODE: "true" }).errors.join("\n"),
    /DATABASE_URL is required/i,
  );
  assert.match(
    validateVercelDemoBootstrap({
      VERCEL: "1",
      DEMO_MODE: "true",
      DATABASE_URL: "not-a-url",
    }).errors.join("\n"),
    /valid URL/i,
  );
});
