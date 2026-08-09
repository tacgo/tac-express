## 2024-08-09 - Fix XSS Vulnerability in Notes Panel
**Vulnerability:** Unsanitized user input (`note.bodyHtml`) was directly injected into the DOM via `dangerouslySetInnerHTML`.
**Learning:** Even though the rich-text editor might sanitize on the way in, relying on client-side input sanitization or assuming stored data is safe can lead to XSS if the data source is ever bypassed or compromised.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML immediately before rendering it with `dangerouslySetInnerHTML`.
## 2024-08-09 - Fix npm audit failures via dependency overrides
**Vulnerability:** Transitive dependencies (`fast-uri`, `postcss`, `brace-expansion`, `nanoid`) had high/moderate vulnerabilities caught by npm audit.
**Learning:** Resolving npm audit failures for transitive dependencies in a pnpm monorepo requires defining patched versions in the `pnpm.overrides` section of the root `package.json`.
**Prevention:** Monitor npm audit logs and utilize `pnpm.overrides` to enforce secure versions of nested subdependencies before they become blocking CI failures.
