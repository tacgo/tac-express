## 2026-08-04 - XSS vulnerability in `dangerouslySetInnerHTML`
**Vulnerability:** Found `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx` rendering un-sanitized user input.
**Learning:** React rich-text editors often produce HTML that is then rendered directly without server-side validation or sanitation in the React component itself.
**Prevention:** Use `isomorphic-dompurify` to run `DOMPurify.sanitize()` inline around any variable passed to `dangerouslySetInnerHTML`.
