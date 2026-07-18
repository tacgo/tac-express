## 2025-03-01 - Prevent XSS in Notes Panel
**Vulnerability:** Found un-sanitized user input being rendered with `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx`.
**Learning:** Even if rich-text editors produce "clean" HTML on the client side, it's unsafe to trust this input without sanitization during rendering, as malicious content could have been injected directly into the backend or via API bypasses.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML content before rendering it with `dangerouslySetInnerHTML`.
