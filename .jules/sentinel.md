## 2024-06-18 - Unsafe DOM Manipulation in Notes Panel
**Vulnerability:** XSS vulnerability via dangerouslySetInnerHTML without sanitization.
**Learning:** React requires manual sanitization of HTML strings before injecting them via dangerouslySetInnerHTML.
**Prevention:** Use DOMPurify (specifically isomorphic-dompurify) for sanitizing any user-supplied or database-retrieved HTML content before injection.
