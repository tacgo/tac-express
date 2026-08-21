## 2025-02-21 - [Prevent XSS in Notes Panel]
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` in the `NotesPanel` component where user-generated rich text notes could theoretically execute malicious scripts if not properly sanitized server-side.
**Learning:** Relying solely on consumers to sanitize input before persisting allows potential XSS if the consumer forgets. Adding an additional layer of sanitization at the presentation level acts as a defense-in-depth measure.
**Prevention:** Always use `DOMPurify.sanitize()` with `isomorphic-dompurify` when rendering raw HTML strings in React using `dangerouslySetInnerHTML`, even if it's expected to be pre-sanitized.
