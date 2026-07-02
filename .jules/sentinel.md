## 2025-02-24 - [Fix XSS in Notes Panel]
**Vulnerability:** XSS vulnerability in dangerouslySetInnerHTML where unsanitized note.bodyHtml is injected directly.
**Learning:** Reliance on client-side rich-text editors for sanitization is unsafe, as they only sanitize on input, not output, and server-side logic was expected to DOMPurify it but wasn't strictly enforced.
**Prevention:** Always use isomorphic-dompurify on the frontend when rendering dynamic HTML via dangerouslySetInnerHTML, even if server-side sanitization is supposedly in place.
