## 2025-02-14 - Isomorphic DOMPurify with Next.js App Router
**Vulnerability:** XSS in NotesPanel using `dangerouslySetInnerHTML`
**Learning:** In Next.js applications (even with `"use client"` directives, which still undergo Server-Side Rendering), using the standard `dompurify` package directly can cause "window is not defined" errors.
**Prevention:** Always use `isomorphic-dompurify` in React/Next.js environments where SSR might occur to safely sanitize HTML input before rendering it via `dangerouslySetInnerHTML`. Ensure `dompurify` is also installed to prevent type resolution errors during build.
