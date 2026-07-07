## 2025-02-28 - Missing Output Sanitization in NotesPanel
**Vulnerability:** The NotesPanel component uses `dangerouslySetInnerHTML` directly with `note.bodyHtml` without sanitization.
**Learning:** Relying purely on input sanitization at the rich text editor side is insufficient and vulnerable to bypass or polluted state data returning from the database, creating an XSS threat surface.
**Prevention:** Always use `isomorphic-dompurify` (or DOMPurify) immediately prior to rendering dynamic HTML, implementing a defense-in-depth posture on output regardless of input sanitization mechanisms.
