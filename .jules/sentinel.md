## 2024-07-28 - Cross-Site Scripting (XSS) in Notes Panel
**Vulnerability:** The Notes Panel component was rendering raw HTML (`note.bodyHtml`) using `dangerouslySetInnerHTML` without proper client-side sanitization.
**Learning:** The application mistakenly assumed that since the rich-text editor sanitized HTML on the way in, the stored HTML was safe to render directly. This violates the "Never trust user input" and "Defense in depth" principles.
**Prevention:** Always use a sanitization library like `isomorphic-dompurify` when using `dangerouslySetInnerHTML`, especially for content originating from users, even if it was pre-sanitized before storage.
