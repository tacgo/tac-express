## 2024-07-12 - Critical XSS in NotesPanel
**Vulnerability:** NotesPanel uses `dangerouslySetInnerHTML={{ __html: note.bodyHtml }}` directly, trusting that the input HTML is sanitized.
**Learning:** React requires explicit HTML sanitization even if data might have been sanitized before. We should use `isomorphic-dompurify` in UI components as required by the guidelines for safe rendering.
**Prevention:** Never trust `bodyHtml` blindly. Always pass content through `DOMPurify.sanitize()` before passing to `dangerouslySetInnerHTML`.
