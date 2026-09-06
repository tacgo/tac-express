## 2026-09-06 - Insecure PRNG for Webhook Secrets
**Vulnerability:** `Math.random()` was used as a fallback for generating cryptographic secrets for webhooks.
**Learning:** In environments where `crypto.getRandomValues` isn't available, standard random generation falls back to `Math.random()`, which is predictable and vulnerable to attacks, especially for webhook verification.
**Prevention:** Fail securely. Always use cryptographically secure PRNGs. Fallback to Node.js `crypto.randomBytes` if Web Crypto is unavailable. If neither is available, throw an error instead of using insecure functions.
