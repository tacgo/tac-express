## 2025-02-24 - Cross-Site Scripting (XSS) in Notes Panel
**Vulnerability:** The `NotesPanel` component was rendering unsanitized HTML from user input using `dangerouslySetInnerHTML`, which could lead to Cross-Site Scripting (XSS).
**Learning:** React components that render HTML from user input without sanitization are vulnerable to XSS.
**Prevention:** Always sanitize HTML input before rendering it in the DOM using a trusted library like `isomorphic-dompurify`.
