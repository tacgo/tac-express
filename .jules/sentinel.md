## 2025-02-28 - [High] Fix XSS vulnerability in notes panel
**Vulnerability:** User input from `note.bodyHtml` was rendered directly via `dangerouslySetInnerHTML` in the `NotesPanel` without any client-side sanitization, enabling Cross-Site Scripting (XSS).
**Learning:** Even if rich-text editors produce seemingly safe HTML, data persisted to the database and fetched back can be modified maliciously. All HTML content fetched from the DB must be sanitized before rendering.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML content when using `dangerouslySetInnerHTML`, especially for user-generated or DB-stored content.
