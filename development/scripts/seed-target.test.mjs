import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("actual seed refuses unpinned remote and query-overridden targets before database work", () => {
  const pins = {
    DEMO_MODE: "true", ALLOW_DEMO_SEED: "true",
    SIS_ENABLE_CLOUD_DEMONSTRATION: "true",
    SIS_DEMO_DATABASE_HOST: "selected.example",
    SIS_DEMO_DATABASE_NAME: "demonstration",
  };
  for (const [url, overrides] of [
    ["postgresql://demo:unused@selected.example/demonstration?sslmode=require", { SIS_ENABLE_CLOUD_DEMONSTRATION: "false" }],
    ["postgresql://demo:unused@other.example/demonstration?sslmode=require", {}],
    ["postgresql://demo:unused@selected.example/demonstration?sslmode=require&host=other.example", {}],
    ["postgresql://demo:unused@selected.example/other?sslmode=require", {}],
    ["postgresql://demo:unused@127.0.0.1:1/sis_ci_review?host=127.0.0.1&port=1&dbname=production", {}],
  ]) {
    const result = spawnSync(process.execPath, ["prisma/seed/seed.ts"], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, ...pins, ...overrides, DATABASE_URL: url },
      encoding: "utf8", timeout: 10_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /demonstration seeding requires the exact approved target/);
    assert.doesNotMatch(result.stdout, /Seeding capabilities|Seeding complete/);
  }
});
