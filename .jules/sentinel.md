## 2025-05-16 - Prevent vulnerable deps leaking into production builds
**Vulnerability:** `esbuild` < 0.28.1 and `@opentelemetry/core` < 2.8.0 introduced critical/moderate RCE and DoS risks via nested dependency chains.
**Learning:** Monorepo package managers like `pnpm` will resolve vulnerable transitive dependency versions even if direct dependencies are safe, exposing production builds.
**Prevention:** Use `pnpm.overrides` in `package.json` to force patched versions of transitive dependencies system-wide until upstream libraries release patched versions.
## 2025-05-16 - Prevent static generation failures lacking env vars
**Vulnerability:** Pages using Supabase client without `force-dynamic` attempt to statically prerender using environment variables (like `NEXT_PUBLIC_SUPABASE_URL`) that may not be available at build time in CI, causing `Error: Missing NEXT_PUBLIC_SUPABASE_URL` prerender errors.
**Learning:** Next.js static prerendering runs code that initializes the Supabase client. If the page is not explicitly marked dynamic, it crashes the CI build step if those env vars aren't populated.
**Prevention:** Add `export const dynamic = "force-dynamic";` to all pages utilizing `useClient` hooks connecting to Supabase if the CI build environment omits real variables.
