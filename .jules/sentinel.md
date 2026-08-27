## 2026-08-27 - Fail Securely on Missing Crypto
**Vulnerability:** Webhook secrets were being generated using `Math.random()` as a fallback, which is cryptographically insecure and allows signature forgery.
**Learning:** Silently falling back to an insecure RNG mechanism when `crypto` is unavailable violates the "fail securely" principle.
**Prevention:** Never use `Math.random()` for security secrets. Always throw an error if a secure CSRNG (like `crypto.getRandomValues`) is unavailable.
