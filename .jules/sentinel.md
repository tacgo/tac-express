## 2025-02-18 - XSS vulnerability in NotesPanel
**Vulnerability:** Unsanitized user-generated rich text HTML was passed directly to dangerouslySetInnerHTML in the NotesPanel component.
**Learning:** Client-side XSS prevention should not rely solely on upstream server-side sanitization.
**Prevention:** Always sanitize HTML on the client before injecting it into the DOM, using a safe isomorphism-compatible library like isomorphic-dompurify.
