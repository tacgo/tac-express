## 2025-01-23 - Insecure Webhook Secret Generation
**Vulnerability:** Found `Math.random()` used as a fallback for generating cryptographic secrets in webhook URLs.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable secrets. If Web Crypto isn't available, we should fail securely or try node:crypto.
**Prevention:** Never use `Math.random()` for security secrets. Use `crypto.getRandomValues()` or `node:crypto`'s `randomBytes()`, or fail securely (throw an error).
