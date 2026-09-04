## 2025-02-14 - Replace Insecure PRNG Fallback
**Vulnerability:** Found `Math.random()` being used as a fallback for generating secure tokens (webhook secrets) when Web Crypto (`crypto.getRandomValues`) is unavailable.
**Learning:** Insecure PRNGs (like `Math.random()`) should never be used for security secrets. In environments where Web Crypto is missing, we must fail securely or use Node.js crypto fallback instead of producing cryptographically weak secrets.
**Prevention:** Always verify PRNG capabilities before using them for security purposes. If neither Web Crypto nor Node crypto is available, explicitly throw an error to prevent silent insecure secret generation.
