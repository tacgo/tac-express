## 2024-07-03 - [High] Missing Client-Side HTML Sanitization
**Vulnerability:** XSS vulnerability in `notes-panel.tsx` via `dangerouslySetInnerHTML` directly using `note.bodyHtml` without client-side sanitization.
**Learning:** Relying solely on the rich-text editor or theoretical server-side sanitization is insufficient. Defense in depth requires sanitizing at the point of rendering, especially with React's `dangerouslySetInnerHTML`.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML content immediately before passing it to `dangerouslySetInnerHTML`, ensuring safe execution across SSR and client environments.
