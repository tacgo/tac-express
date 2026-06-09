## 2026-05-19 - XSS vulnerability in Notes Panel
**Vulnerability:** The `notes-panel.tsx` component was using React's `dangerouslySetInnerHTML` directly with unsanitized `note.bodyHtml` strings.
**Learning:** Even though rich text editors may produce sanitized HTML on the way in, for defense in depth, we need to sanitize it again on the way out before rendering. Also, standard DOMPurify causes SSR hydration mismatches in Next.js.
**Prevention:** Always use `isomorphic-dompurify` on `dangerouslySetInnerHTML` interpolations to prevent XSS across both SSR and client-side rendering environments without hydration errors.
