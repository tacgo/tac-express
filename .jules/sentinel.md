## 2024-06-28 - XSS in Notes Panel
**Vulnerability:** Unsanitized HTML rendering via `dangerouslySetInnerHTML` in NotesPanel component for user-generated notes content.
**Learning:** Even if rich-text editors produce sanitized HTML on the way in, belt-and-braces approach demands client-side sanitization before rendering untrusted content, especially when it can be modified elsewhere.
**Prevention:** Always use `isomorphic-dompurify` to sanitize untrusted HTML before rendering it with `dangerouslySetInnerHTML`.
