## 2024-05-24 - Cross-Site Scripting (XSS) in NotesPanel
**Vulnerability:** The NotesPanel component rendered user-supplied HTML via `dangerouslySetInnerHTML` relying on upstream API/backend sanitization, which led to a potential XSS vulnerability if un-sanitized content bypassed the API.
**Learning:** Client-side components must not fully trust that server-provided HTML strings are pre-sanitized, especially when the component documentation explicitly admits "the consumer should also DOMPurify it". Hydration mismatches can occur if using standard `dompurify`, requiring `isomorphic-dompurify`.
**Prevention:** Always apply client-side DOM sanitization (e.g., `isomorphic-dompurify.sanitize()`) immediately before passing data to `dangerouslySetInnerHTML` regardless of presumed backend safety.
