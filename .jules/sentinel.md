## 2024-05-13 - Mitigate XSS with isomorphic-dompurify
**Vulnerability:** XSS risk in rich text rendering via dangerouslySetInnerHTML.
**Learning:** The notes-panel component rendered user-supplied rich text without explicit sanitization. While the editor sanitizes input on creation, it should be sanitized server-side or during rendering to ensure safety.
**Prevention:** Use DOMPurify.sanitize() wrapped around the dangerouslySetInnerHTML content. For Next.js/React SSR applications, use the `isomorphic-dompurify` package to handle both server and client side rendering correctly.
