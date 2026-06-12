## 2026-06-12 - [Sanitize dangerouslySetInnerHTML output with isomorphic-dompurify]
**Vulnerability:** XSS vulnerability through the use of `dangerouslySetInnerHTML` on un-sanitized note body HTML inside React's rendering flow in the UI component (`notes-panel.tsx`).
**Learning:** Raw use of `dangerouslySetInnerHTML` can expose applications to cross-site scripting when receiving inputs originating from user or third-party modifications, even if initial inputs pass through a rich text editor.
**Prevention:** Always sanitize any output given to `dangerouslySetInnerHTML`. Use `isomorphic-dompurify` over normal `dompurify` in React to avoid hydration mismatches, making it safe for both server and client rendering loops.
