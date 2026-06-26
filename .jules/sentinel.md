## 2025-05-24 - Cross-Site Scripting (XSS) in Notes Panel
**Vulnerability:** Found `dangerouslySetInnerHTML={{ __html: note.bodyHtml }}` directly interpolating user input without sanitization in the `notes-panel.tsx` component.
**Learning:** Even if the rich-text editor sanitizes input on the way in, relying solely on client-side input sanitization or consumer-side handling is insufficient and risky for components that display HTML.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML content when using `dangerouslySetInnerHTML` directly in the rendering component, enforcing defense in depth.
