## 2025-02-28 - XSS Vulnerability in NotesPanel
**Vulnerability:** The NotesPanel component rendered note contents via `dangerouslySetInnerHTML` directly without sanitizing the input on the client side, leading to a Cross-Site Scripting (XSS) vulnerability.
**Learning:** `dangerouslySetInnerHTML` should never be used without first passing the HTML string through a robust sanitization library like `isomorphic-dompurify` to prevent malicious scripts from executing.
**Prevention:** Always sanitize inputs directly before injecting them into `dangerouslySetInnerHTML`, even if the server is expected to have sanitized it.
