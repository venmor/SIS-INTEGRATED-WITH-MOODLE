import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile workspace UI components (they ship as TS source in Phase 0).
  transpilePackages: ["@sis/ui"],
};

export default nextConfig;
