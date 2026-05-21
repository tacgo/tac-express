import { withSentryConfig } from "@sentry/nextjs"

/**
 * Legacy v6 path → canonical Paper Ops Console redirects.
 *
 * The `(dashboard)` route group was deleted as part of the single-shell
 * migration (May 2026). Internal navigation already points at
 * `/ops-console/*` (see `nav-config.ts`), but bookmarks, deep links from
 * email/Slack, and any cached external references still hit the legacy
 * `/foo` shape. These redirects keep those references working.
 *
 * 308 permanent — search engines + browsers cache the redirect, so a
 * second visit goes straight to the canonical URL. Dynamic segments use
 * `:path*` so `/customers/123/abc` correctly redirects to
 * `/ops-console/customers/123/abc`.
 */
const LEGACY_REDIRECTS = [
  // Top-level list/section roots
  "analytics",
  "shipments",
  "manifests",
  "scanning",
  "inventory",
  "exceptions",
  "finance",
  "customers",
  "management",
  "notifications",
  "settings",
  "audit",
  "arrival-audit",
  "shift-report",
  "bookings",
].flatMap((slug) => [
  {
    source: `/${slug}`,
    destination: `/ops-console/${slug}`,
    permanent: true,
  },
  {
    source: `/${slug}/:path*`,
    destination: `/ops-console/${slug}/:path*`,
    permanent: true,
  },
])

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/types",
    "@workspace/services",
    "@workspace/database",
    "@workspace/auth",
  ],
  allowedDevOrigins: ["192.168.1.246", "localhost", "127.0.0.1", "*.localhost"],
  async redirects() {
    return [
      // Special-case renames (v6 path → ops-console path with different slug).
      { source: "/home", destination: "/ops-console", permanent: true },
      { source: "/rate-cards", destination: "/ops-console/rates", permanent: true },
      { source: "/rate-cards/:path*", destination: "/ops-console/rates/:path*", permanent: true },
      // Generic v6 list-section redirects.
      ...LEGACY_REDIRECTS,
    ]
  },
}

/**
 * Sentry build wrapper — source-map upload + ad-blocker tunnel.
 *
 * org/project identify the Sentry project; source-map upload only runs when
 * SENTRY_AUTH_TOKEN is present (env / CI), and is silent outside CI. The
 * tunnelRoute "/monitoring" routes browser SDK requests through the Next
 * server to dodge ad-blockers — it does not collide with any proxy.ts
 * redirect slug above. Webpack-only options (automaticVercelMonitors) are
 * omitted: the dashboard builds with Turbopack and runs no Vercel crons.
 */
export default withSentryConfig(nextConfig, {
  org: "tac-an",
  project: "javascript-nextjs",
  // Source-map upload auth (build-time only). Auto-detected from the
  // gitignored .env.sentry-build-plugin / CI env; passed explicitly to
  // match the canonical setup. Upload no-ops when the token is absent.
  authToken: globalThis.process?.env?.SENTRY_AUTH_TOKEN,
  silent: !globalThis.process?.env?.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
})

