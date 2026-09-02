## 2025-02-18 - Math.random() as Cryptographic Fallback
**Vulnerability:** Found Math.random() being used as a fallback for generating webhook secrets if crypto.getRandomValues is unavailable.
**Learning:** Math.random() is not a cryptographically secure pseudo-random number generator (CSPRNG). Using it for security secrets (like webhook signing keys) can lead to predictable secrets.
**Prevention:** If Web Crypto (crypto.getRandomValues) is unavailable, fallback to Node.js crypto via an inline require('node:crypto').randomBytes() instead of using Math.random().
