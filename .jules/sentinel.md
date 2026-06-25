## 2024-05-24 - Missing HTML Sanitization in UI Components
**Vulnerability:** Found `dangerouslySetInnerHTML` directly using `note.bodyHtml` in `packages/ui/src/components/composed/notes/notes-panel.tsx` without client-side sanitization.
**Learning:** Even if rich-text editors sanitize on input, relying solely on consumers to sanitize server-side before persistence is an incomplete defense-in-depth strategy.
**Prevention:** Always sanitize HTML directly at the point of injection using `isomorphic-dompurify` (which works safely in SSR/hydration contexts), rather than trusting the incoming data source.
