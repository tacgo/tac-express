## 2024-10-24 - Missing Client-Side HTML Sanitization
**Vulnerability:** The NotesPanel component uses `dangerouslySetInnerHTML` directly on user-provided HTML (`note.bodyHtml`), relying solely on external/server-side sanitization, which creates an XSS risk if un-sanitized content bypasses the backend.
**Learning:** Never assume external inputs or backend APIs will always pre-sanitize HTML content, especially in shared UI components.
**Prevention:** Always apply client-side HTML sanitization (e.g., via `isomorphic-dompurify`) when rendering user-generated rich text with `dangerouslySetInnerHTML`.
