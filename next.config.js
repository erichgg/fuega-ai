/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Prevent jsdom (used by isomorphic-dompurify for SSR HTML sanitization)
  // from being bundled by webpack — it must run as a native Node.js require.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  webpack(config, { isServer }) {
    if (isServer) {
      // Ensure jsdom and its CSS file lookups resolve correctly at runtime
      // by keeping it as a Node.js external rather than bundling it.
      const existing = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existing) ? existing : [existing]),
        "isomorphic-dompurify",
        "jsdom",
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required by Next.js for inline styles/scripts.
              // 'strict-dynamic' removed: without nonce injection it would block
              // dynamically-loaded scripts in CSP Level 3 browsers.
              // TODO: wire up Next.js nonce middleware to re-enable strict-dynamic safely.
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "report-uri /api/csp-report",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
