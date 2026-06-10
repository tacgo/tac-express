
## 2026-06-10 - [Missing HTML Sanitization]
**Vulnerability:** XSS vulnerability where `note.bodyHtml` was directly rendered using `dangerouslySetInnerHTML` without client-side sanitization.
**Learning:** Relying solely on upstream (server-side) sanitization for user-generated HTML is a defense-in-depth failure. The component itself must guarantee its output is safe.
**Prevention:** Use `isomorphic-dompurify` (to prevent hydration mismatches) to sanitize any raw HTML string immediately before passing it to `dangerouslySetInnerHTML`.
