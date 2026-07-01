## 2024-10-24 - Defense-in-depth XSS Prevention in Notes Panel
**Vulnerability:** The `NotesPanel` component rendered user-provided HTML content via `dangerouslySetInnerHTML` without client-side sanitization, relying solely on server-side validation.
**Learning:** React components must employ defense-in-depth by sanitizing HTML on the client-side as well. We use `isomorphic-dompurify` to prevent hydration mismatches during SSR.
**Prevention:** Always wrap `dangerouslySetInnerHTML` values with `DOMPurify.sanitize()` when rendering rich text or external HTML, even if the backend is expected to provide clean HTML.
