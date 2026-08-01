## 2025-02-18 - Prevent XSS in NotesPanel
**Vulnerability:** Found un-sanitized user-provided HTML being rendered via dangerouslySetInnerHTML in packages/ui/src/components/composed/notes/notes-panel.tsx.
**Learning:** React's dangerouslySetInnerHTML is inherently dangerous when rendering HTML from user inputs unless explicitly sanitized at the rendering step.
**Prevention:** Always use isomorphic-dompurify or dompurify to sanitize HTML content passed to dangerouslySetInnerHTML, especially for data models populated by users.
