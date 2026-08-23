## 2024-05-24 - Sanitizing dynamically generated HTML
**Vulnerability:** XSS vulnerability in notes-panel.tsx caused by direct use of dangerouslySetInnerHTML with unsanitized bodyHtml.
**Learning:** Even internal rich-text editors and internal content require strict sanitization on rendering. Relying solely on the consumer to DOMPurify server-side is insufficient for deep defense.
**Prevention:** Always wrap variables passed to dangerouslySetInnerHTML using DOMPurify.sanitize() from isomorphic-dompurify, especially in composed UI components.
