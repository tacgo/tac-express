## 2024-05-18 - Fix XSS Vulnerability in Notes Panel
**Vulnerability:** Client-side XSS via unsanitized `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx` rendering `note.bodyHtml`.
**Learning:** Even if rich-text editors sanitize input on creation, client components must always sanitize HTML (e.g. using `isomorphic-dompurify`) right before rendering via `dangerouslySetInnerHTML`. Server-side data could be compromised or missing validation.
**Prevention:** Always wrap `dangerouslySetInnerHTML` variables in `DOMPurify.sanitize(html)` to enforce client-side defense-in-depth against XSS.
