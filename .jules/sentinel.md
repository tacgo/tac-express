## 2024-05-18 - Sanitization with React dangerouslySetInnerHTML
**Vulnerability:** A cross-site scripting (XSS) vulnerability via `dangerouslySetInnerHTML`.
**Learning:** `dangerouslySetInnerHTML` allows arbitrary code execution. It was used in `notes-panel.tsx` without an explicit `isomorphic-dompurify` layer despite the inline comment stating that the editor produces sanitized HTML on the way in.
**Prevention:** Use `isomorphic-dompurify` to sanitize HTML markup before passing it to `dangerouslySetInnerHTML`.

## 2026-06-22 - Fix OpenTelemetry Core Vulnerability
**Vulnerability:** Unbounded memory allocation in W3C Baggage propagation (`@opentelemetry/core` < 2.8.0).
**Learning:** Outdated dependencies in production can lead to severe memory allocation vulnerabilities. The `moderate` severity vulnerability was identified through `pnpm audit`.
**Prevention:** Use `pnpm`'s `overrides` configuration in the root `package.json` to enforce patched versions of deeply nested dependencies.
