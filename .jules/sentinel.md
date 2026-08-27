## 2023-10-25 - Defense-in-Depth for dangerouslySetInnerHTML
**Vulnerability:** XSS risk due to relying solely on server-side sanitization for user-generated notes.
**Learning:** dangerouslySetInnerHTML was being used with note.bodyHtml assuming the backend sanitized it. This lacks defense-in-depth.
**Prevention:** Always use client-side sanitization (e.g., DOMPurify.sanitize()) with isomorphic-dompurify when rendering HTML.
