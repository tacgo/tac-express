## 2025-05-16 - Prevent vulnerable deps leaking into production builds
**Vulnerability:** `esbuild` < 0.28.1 and `@opentelemetry/core` < 2.8.0 introduced critical/moderate RCE and DoS risks via nested dependency chains.
**Learning:** Monorepo package managers like `pnpm` will resolve vulnerable transitive dependency versions even if direct dependencies are safe, exposing production builds.
**Prevention:** Use `pnpm.overrides` in `package.json` to force patched versions of transitive dependencies system-wide until upstream libraries release patched versions.
