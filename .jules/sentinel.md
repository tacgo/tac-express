## 2026-06-15 - [XSS Fix in Notes Panel]
**Vulnerability:** Direct interpolation of user-generated HTML in Notes Panel without sanitization.
**Learning:** Rich text editors produce sanitized HTML, but defense in depth requires client-side sanitization before interpolation using `dangerouslySetInnerHTML`.
**Prevention:** Use `isomorphic-dompurify` for any raw HTML interpolation in React components.
