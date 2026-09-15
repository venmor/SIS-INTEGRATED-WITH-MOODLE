// Phase 0 shell: Prisma 7 connection config — datasource URL only.
// Migrations and models arrive with the first database-backed slice.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
