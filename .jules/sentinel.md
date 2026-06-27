## 2024-05-20 - Unsanitized HTML rendering in NotesPanel component
**Vulnerability:** Notes component rendered unvalidated raw user HTML directly via `dangerouslySetInnerHTML`.
**Learning:** React dangerouslySetInnerHTML bypasses XSS protection. It should always be used with DOMPurify sanitization.
**Prevention:** Use isomorphic-dompurify and DOMPurify.sanitize() when rendering raw HTML from user input.
