## 2024-05-18 - Sanitization with React dangerouslySetInnerHTML
**Vulnerability:** A cross-site scripting (XSS) vulnerability via `dangerouslySetInnerHTML`.
**Learning:** `dangerouslySetInnerHTML` allows arbitrary code execution. It was used in `notes-panel.tsx` without an explicit `isomorphic-dompurify` layer despite the inline comment stating that the editor produces sanitized HTML on the way in.
**Prevention:** Use `isomorphic-dompurify` to sanitize HTML markup before passing it to `dangerouslySetInnerHTML`.
