## 2024-05-18 - Prevent XSS in dynamically rendered content
**Vulnerability:** Found `dangerouslySetInnerHTML` used directly with unsanitized rich text content in `packages/ui/src/components/composed/notes/notes-panel.tsx`.
**Learning:** Using `dangerouslySetInnerHTML` without properly sanitizing HTML input opens the application to Cross-Site Scripting (XSS) vulnerabilities. Even though a rich text editor is used, it should be sanitized server-side or right before rendering.
**Prevention:** Always sanitize any user-provided HTML with `isomorphic-dompurify` before passing it to `dangerouslySetInnerHTML` to ensure malicious scripts are stripped out across both server and client environments.
