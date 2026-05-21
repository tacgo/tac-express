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

export default nextConfig;
