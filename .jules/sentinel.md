## 2025-05-26 - XSS in dangerouslySetInnerHTML
**Vulnerability:** Found `dangerouslySetInnerHTML` taking raw un-sanitized HTML (`note.bodyHtml`) in `packages/ui/src/components/composed/notes/notes-panel.tsx`.
**Learning:** The component assumed input was already sanitized by the rich-text editor on the way in. However, this is unsafe because malicious users could bypass the client-side editor and send raw HTML to the backend. The backend did not sanitize the input, and then the component blindly rendered it via `dangerouslySetInnerHTML`.
**Prevention:** Never trust client-side or server-side input directly when rendering with `dangerouslySetInnerHTML`. Always use a sanitization library like `isomorphic-dompurify` directly at the rendering layer (`DOMPurify.sanitize(input)`).
