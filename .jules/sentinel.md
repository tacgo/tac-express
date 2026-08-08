## 2026-08-08 - XSS Mitigation in dangerouslySetInnerHTML
**Vulnerability:** Unsanitized user input passed directly to `dangerouslySetInnerHTML`.
**Learning:** `dangerouslySetInnerHTML` is extremely vulnerable to XSS if not explicitly sanitized, especially when displaying user-generated content like rich-text notes. Even if editors "sanitize on the way in", defense-in-depth requires sanitization right before rendering.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with `DOMPurify.sanitize()` using `isomorphic-dompurify` to handle SSR/CSR correctly.
