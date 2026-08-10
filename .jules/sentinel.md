## 2024-03-24 - Unsanitized dangerouslySetInnerHTML in NotesPanel
**Vulnerability:** The `NotesPanel` component in `packages/ui/src/components/composed/notes/notes-panel.tsx` uses `dangerouslySetInnerHTML={{ __html: note.bodyHtml }}` without client-side sanitization.
**Learning:** While the rich-text editor might sanitize input, relying solely on server-side or input-time sanitization leaves the application vulnerable to XSS if the database contains malicious payloads or if the sanitization is bypassed.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML content immediately before rendering it via `dangerouslySetInnerHTML` in React/Next.js applications.
