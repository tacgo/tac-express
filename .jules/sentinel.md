## 2025-03-09 - Client-side XSS from Rich Text
**Vulnerability:** The Notes Panel component (`notes-panel.tsx`) was rendering raw HTML (`note.bodyHtml`) into the DOM via `dangerouslySetInnerHTML` without client-side sanitization.
**Learning:** Even if the rich-text editor attempts to sanitize HTML on output, we cannot trust data coming back from the API, as the API might be bypassed or have missing validation.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML injected via `dangerouslySetInnerHTML` in React components to prevent XSS across both SSR and CSR contexts.
