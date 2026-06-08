## 2025-01-01 - DOMPurify usage missing in dangerouslySetInnerHTML
**Vulnerability:** Found instances where `dangerouslySetInnerHTML` is used without DOMPurify, specifically in `packages/ui/src/components/composed/notes/notes-panel.tsx`. This creates a high risk of Cross-Site Scripting (XSS).
**Learning:** Even internal toolings or rich text output components that assume input is safe might omit XSS sanitization, which creates persistent vulnerabilities if backends don't rigorously sanitize the payload.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with `DOMPurify.sanitize` (or `isomorphic-dompurify`).
