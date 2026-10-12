// contrast-check — prove WCAG AA text contrast (4.5:1) for the token
// pairs components actually render (Phase 8 slice 5, handbook §10:
// error/status colour is always paired with text — and that text must
// itself be legible). Reads packages/ui/src/tokens.css (no imports,
// plain node). Exits non-zero naming the failing pair.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "packages/ui/src/tokens.css"), "utf8");

const vars = {};
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6}|var\(--[\w-]+\))/g)) {
  vars[m[1]] = m[2];
}
const hex = (name) => {
  let v = vars[name];
  for (let i = 0; i < 5 && v?.startsWith("var("); i++)
    v = vars[v.slice(4, -1)];
  if (!/^#[0-9a-fA-F]{6}$/.test(v ?? ""))
    throw new Error(`unresolvable token ${name} -> ${v}`);
  return v;
};
const lum = (h) => {
  const f = (c) => {
    const s = parseInt(c, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * f(h.slice(1, 3)) +
    0.7152 * f(h.slice(3, 5)) +
    0.0722 * f(h.slice(5, 7))
  );
};
const ratio = (fg, bg) => {
  const [a, b] = [lum(hex(fg)), lum(hex(bg))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

// [foreground, background, where the pairing renders]
const PAIRS = [
  ["--neutral-text", "--neutral-bg", "StatusChip neutral"],
  ["--info-text", "--info-bg", "StatusChip info"],
  ["--success-text", "--success-bg", "StatusChip success"],
  ["--warning-text", "--warning-bg", "StatusChip warning/attention"],
  ["--error-text", "--error-bg", "StatusChip error / ErrorSummary"],
  ["--text-primary", "--white", "body text on surfaces"],
  ["--text-primary", "--gray-50", "body text on page"],
  ["--text-secondary", "--white", "supporting text"],
  ["--link", "--white", "links"],
  ["--white", "--green-500", "primary button text"],
  ["--white", "--error", "destructive button text"],
];

for (const [fg, bg, where] of PAIRS) {
  test(`${where}: ${fg} on ${bg} meets AA 4.5:1`, () => {
    const r = ratio(fg, bg);
    assert.ok(
      r >= 4.5,
      `${fg} (${hex(fg)}) on ${bg} (${hex(bg)}) = ${r.toFixed(2)}:1, want >= 4.5:1 (${where})`,
    );
  });
}
