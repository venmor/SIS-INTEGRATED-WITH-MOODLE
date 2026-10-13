import { defineConfig } from "@playwright/test";
import connected from "../../playwright.config";

// Same fresh synthetic fixture and owned servers as CI; no developer database
// identity or external running server is required by this entry point.
export default defineConfig({
  ...connected,
  testDir: ".",
  testMatch: "registration-context-connected.spec.ts",
  globalSetup: "./prepare-connected-fixtures.ts",
});
