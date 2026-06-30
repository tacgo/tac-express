## 2026-06-30 - Fix Cross-Site Scripting (XSS) in NotesPanel
**Vulnerability:** User-provided note body HTML was rendered directly using `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx` without client-side sanitization.
**Learning:** Even if the server or rich-text editor is expected to sanitize HTML, client-side applications must still sanitize HTML before rendering it via `dangerouslySetInnerHTML` to ensure defense-in-depth and prevent hydration mismatches during SSR.
**Prevention:** Always use `isomorphic-dompurify` to wrap dynamic HTML input passed to `dangerouslySetInnerHTML` in React components.
