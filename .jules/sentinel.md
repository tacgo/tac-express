## 2024-05-18 - XSS Vulnerability in Notes Panel
**Vulnerability:** A Cross-Site Scripting (XSS) vulnerability was found in the `notes-panel.tsx` component where `note.bodyHtml` was being passed directly to `dangerouslySetInnerHTML` without proper sanitization.
**Learning:** Even though the rich-text editor might produce sanitized HTML, we cannot trust that all data coming from the server is perfectly sanitized. It's a defense-in-depth requirement to always sanitize HTML before rendering it, especially when using `dangerouslySetInnerHTML`.
**Prevention:** Always use `isomorphic-dompurify` (to support SSR without hydration issues) to sanitize HTML strings immediately before passing them to `dangerouslySetInnerHTML`. Never rely on upstream sanitization alone.
