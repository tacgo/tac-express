## 2025-05-24 - Client-side XSS Vulnerability in NotesPanel
**Vulnerability:** Unsanitized HTML rendering via `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx`.
**Learning:** Relying solely on the rich-text editor's input sanitization or expecting the server to always sanitize data is insufficient (defense in depth). Malicious or corrupted data in the database could lead to XSS on the client side.
**Prevention:** Always use a dedicated sanitization library (like `isomorphic-dompurify`) when rendering raw HTML strings in React components, regardless of trust in the source.
