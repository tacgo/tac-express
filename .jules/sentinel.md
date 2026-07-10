## 2024-07-10 - Notes Panel XSS Vulnerability
**Vulnerability:** Found `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx` directly rendering HTML without sanitization, leading to XSS vulnerabilities.
**Learning:** `dangerouslySetInnerHTML` should never be used without strict server-side or client-side sanitization, specifically with DOMPurify. Using `isomorphic-dompurify` prevents hydration errors.
**Prevention:** Always use `isomorphic-dompurify` in React to sanitize `dangerouslySetInnerHTML`.
