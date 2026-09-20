import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSource } from "./check-source.mjs";
test("a positive scanner match fails the gate instead of being swallowed", () => {
  const dir = mkdtempSync(join(tmpdir(), "sis-source-test-"));
  try {
    for (const folder of [
      "apps/web/app",
      "packages/ui/src",
      "prisma",
      "scripts",
    ])
      mkdirSync(join(dir, folder), { recursive: true });
    assert.equal(checkSource(dir), 0);
    writeFileSync(
      join(dir, "apps/web/app/example.css"),
      "body { background: " +
        ["linear", "gradient"].join("-") +
        "(red, blue); }",
    );
    assert.equal(checkSource(dir), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
