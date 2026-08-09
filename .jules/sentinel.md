## 2024-08-09 - Fix XSS Vulnerability in Notes Panel
**Vulnerability:** Unsanitized user input (`note.bodyHtml`) was directly injected into the DOM via `dangerouslySetInnerHTML`.
**Learning:** Even though the rich-text editor might sanitize on the way in, relying on client-side input sanitization or assuming stored data is safe can lead to XSS if the data source is ever bypassed or compromised.
**Prevention:** Always use `isomorphic-dompurify` to sanitize HTML immediately before rendering it with `dangerouslySetInnerHTML`.
