## 2026-08-07 - XSS in Notes Panel
**Vulnerability:** User-generated HTML (`note.bodyHtml`) was rendered directly via `dangerouslySetInnerHTML` in `packages/ui/src/components/composed/notes/notes-panel.tsx`, creating an XSS risk.
**Learning:** Next.js server-side rendering requires an isomorphic sanitization approach to avoid `window is not defined` errors when trying to sanitize HTML on the server.
**Prevention:** Use `isomorphic-dompurify` in React/Next.js applications to safely handle sanitization across both server-side (SSR) and client-side rendering when using `dangerouslySetInnerHTML`. Also ensure you install both `isomorphic-dompurify` and `dompurify` to avoid type resolution errors during the build.
