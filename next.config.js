/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    /** @type {import('next/dist/lib/load-custom-routes').Header['headers']} */
    const securityHeaders = [
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
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "media-src 'self' blob:",
          "font-src 'self'",
          "connect-src 'self' https://cloudflareinsights.com",
          "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
          // Allow iframes in dev for preview tools; deny in production
          isDev ? "frame-ancestors *" : "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "report-uri /api/csp-report",
        ].join("; "),
      },
    ];

    // Iframe and HSTS headers only in production
    if (!isDev) {
      securityHeaders.push(
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      );
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
