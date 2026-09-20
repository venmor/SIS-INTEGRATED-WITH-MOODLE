import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function checkSource(root) {
  const rules = [
    {
      pattern:
        "linear-gradient|radial-gradient|backdrop-filter:\\s*blur|chatbot",
      paths: ["apps/web/app", "packages/ui/src"],
    },
    {
      pattern:
        "BEGIN (RSA )?PRIVATE KEY|sk-live-[A-Za-z0-9]{12,}|ghp_[A-Za-z0-9]{20,}",
      paths: ["apps", "packages", "prisma", "scripts"],
    },
  ];
  for (const rule of rules) {
    const result = spawnSync(
      "rg",
      [
        "-l",
        "-i",
        rule.pattern,
        "--glob",
        "!package-lock.json",
        "--glob",
        "!*.pdf",
        "--glob",
        "!node_modules/**",
        "--glob",
        "!dist/**",
        ...rule.paths,
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (result.status === 0) {
      console.error(
        "Source scan found a prohibited pattern in:",
        result.stdout.trim(),
      );
      return 1;
    }
    if (result.status !== 1) {
      console.error(
        "Source scan could not run:",
        result.stderr?.trim() || "ripgrep unavailable",
      );
      return 2;
    }
  }
  return 0;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exit(checkSource(resolve(process.argv[2] ?? ".")));
