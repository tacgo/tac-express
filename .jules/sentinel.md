## 2025-02-14 - Prevent XSS in HTML rendering via dangerouslySetInnerHTML
**Vulnerability:** XSS vulnerability through improperly sanitized user input rendered via `dangerouslySetInnerHTML`.
**Learning:** React requires explicit HTML string sanitization before using `dangerouslySetInnerHTML` to prevent cross-site scripting attacks, particularly where components reflect data (like rich text notes) back to the user without server-side scrubbing guarantees.
**Prevention:** Always wrap variables passed into `dangerouslySetInnerHTML` with `DOMPurify.sanitize()` (e.g. `isomorphic-dompurify`) or equivalent to strip execution contexts and scripts from user input.
