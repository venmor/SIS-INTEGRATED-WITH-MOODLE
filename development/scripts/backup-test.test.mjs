import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
test("backup failures do not expose a database password", () => {
  const root = mkdtempSync(join(tmpdir(), "sis-backup-failure-"));
  const canary = "fictionalPasswordCanary123";
  try {
    mkdirSync(join(root, "scripts"));
    for (const file of ["backup-test.mjs", "env.mjs"])
      copyFileSync(new URL(file, import.meta.url), join(root, "scripts", file));
    writeFileSync(join(root, ".env"), "# isolated test only\n");
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/backup-test.mjs")],
      {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          DATABASE_URL: `postgresql://test:${canary}@127.0.0.1:1/unreachable`,
          PGCONNECT_TIMEOUT: "2",
        },
      },
    );
    assert.notEqual(result.status, 0);
    assert.equal(
      (result.stdout + result.stderr).includes(canary),
      false,
      "Password must not appear in failure output",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
