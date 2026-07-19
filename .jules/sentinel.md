## 2024-05-24 - Fix XSS Vulnerability in Notes Panel
**Vulnerability:** The Notes Panel component in `packages/ui/src/components/composed/notes/notes-panel.tsx` rendered user-provided HTML notes using `dangerouslySetInnerHTML={{ __html: note.bodyHtml }}` without client-side or server-side sanitization, leading to an XSS vulnerability.
**Learning:** Even though the rich text editor claims to produce sanitized HTML on the way in, relying solely on input sanitization is insufficient because the data could be tampered with via API directly or might be unsanitized in the database.
**Prevention:** Always use a well-known HTML sanitization library (like `isomorphic-dompurify`) when rendering user-submitted HTML content using `dangerouslySetInnerHTML`.
