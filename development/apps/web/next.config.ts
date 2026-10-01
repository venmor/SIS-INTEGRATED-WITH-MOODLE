import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile workspace UI components (they ship as TS source in Phase 0).
  transpilePackages: ["@sis/ui", "@sis/config"],
  // Baseline browser hardening (07/02). Script/style inline allowances keep
  // Next.js hydration working; per-request nonces are recorded debt for the
  // hardening slice (see NOTE-PH1-002a). HSTS is ignored over plain http, so
  // it is safe to send in every environment; production terminates TLS.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Prevent Node.js built-ins from being bundled for the browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        util: false,
        "util/types": false,
        assert: false,
        buffer: false,
        process: false,
        pg: false,
        "pg-connection-string": false,
        "pgpass": false,
        "@prisma/adapter-pg": false,
        dns: false,
        child_process: false,
      };
      // Explicitly alias problematic modules
      config.resolve.alias = {
        ...config.resolve.alias,
        "util/types": false,
        "pg": false,
        "@prisma/adapter-pg": false,
        "pg-connection-string": false,
        "pgpass": false,
      };
    }
    return config;
  },
};

export default nextConfig;