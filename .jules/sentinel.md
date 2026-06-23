## 2024-05-18 - [XSS Vulnerability in Notes Panel]
**Vulnerability:** The `notes-panel` component rendered unsanitized user-generated HTML (`note.bodyHtml`) using `dangerouslySetInnerHTML`.
**Learning:** Even if the rich-text editor sanitizes HTML on the way in, relying solely on client-side sanitization at the source is insufficient. If a malicious note is injected directly into the database (e.g., via a compromised API or internal tool), it will be rendered unsanitized by the UI.
**Prevention:** Always sanitize HTML immediately before rendering it with `dangerouslySetInnerHTML` using a library like `isomorphic-dompurify`, regardless of upstream sanitization claims.
