## 2025-02-14 - Prevent XSS in dynamically rendered React markup
**Vulnerability:** Unsanitized user HTML input rendered directly via `dangerouslySetInnerHTML` in NotesPanel component.
**Learning:** Even internal notes applications are susceptible to stored XSS if raw HTML is rendered without client-side sanitization. Relying on "server-side sanitization" only as a contract is fragile, especially for UI components distributed via monorepos packages (`@workspace/ui`). Isomorphic DOMPurify must be used for safe hydration during SSR and CSR.
**Prevention:** Always wrap `dangerouslySetInnerHTML` values with `DOMPurify.sanitize()` using the `isomorphic-dompurify` package whenever handling user-provided or rich-text content in React components to avoid hydration errors.
