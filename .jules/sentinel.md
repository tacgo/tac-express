## 2025-03-05 - XSS in Notes Panel
**Vulnerability:** Unsanitized HTML passed directly to `dangerouslySetInnerHTML` in the `NotesPanel` component.
**Learning:** Even though the rich-text editor sanitizes on the way in, relying solely on client-side input sanitization or hoping consumers sanitize server-side before persistence is an unsafe pattern, risking stored XSS.
**Prevention:** Always sanitize HTML right before rendering using `isomorphic-dompurify` when using `dangerouslySetInnerHTML`.
