## 2026-08-03 - XSS in Notes Panel
**Vulnerability:** XSS via `dangerouslySetInnerHTML` directly rendering `note.bodyHtml` from rich text editor in `notes-panel.tsx`.
**Learning:** Although the rich text editor might sanitize input on the way in, a belt-and-braces approach requires sanitizing HTML from the DB right before rendering as the file comment noted but hadn't implemented.
**Prevention:** Always use `isomorphic-dompurify` when using `dangerouslySetInnerHTML` with user-supplied HTML.
