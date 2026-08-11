## 2025-02-20 - [XSS vulnerability in notes-panel]
**Vulnerability:** XSS vulnerability in `notes-panel.tsx` via `dangerouslySetInnerHTML`
**Learning:** Even if a comment instructs the consumer to sanitize HTML server-side, it is safer to perform sanitization on the client-side/SSR as well using `isomorphic-dompurify`.
**Prevention:** Always use `DOMPurify.sanitize()` when using `dangerouslySetInnerHTML` for user-generated content like notes.
