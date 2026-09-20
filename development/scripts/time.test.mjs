import test from "node:test";
import assert from "node:assert/strict";
import { formatLusaka } from "../apps/web/lib/time.ts";
test("receipt and deadline times identify the year and CAT across a UTC date boundary", () => {
  const label = formatLusaka("2026-12-31T23:15:00Z");
  assert.match(label, /1 January 2027/);
  assert.match(label, /01:15/);
  assert.match(label, /CAT/);
});
