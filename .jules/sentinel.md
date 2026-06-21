
## 2024-05-24 - Client-side XSS vulnerability in dangerouslySetInnerHTML
**Vulnerability:** XSS vulnerability where server-provided HTML is trusted without client-side sanitization before being injected via `dangerouslySetInnerHTML`.
**Learning:** Even though rich-text output might be sanitized server-side, we must not blindly trust it when rendering on the client using `dangerouslySetInnerHTML`. Relying on server-side sanitization creates a risk if the backend validation fails or is bypassed.
**Prevention:** Always sanitize any dynamic HTML on the client side using a library like DOMPurify or isomorphic-dompurify before passing it to `dangerouslySetInnerHTML`.
