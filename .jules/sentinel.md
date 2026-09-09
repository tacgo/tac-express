## 2025-05-18 - Insecure PRNG in Webhooks
**Vulnerability:** Found `Math.random()` being used as a fallback to generate webhook secrets, which is cryptographically insecure and predictable.
**Learning:** In environments where Web Crypto (`crypto.getRandomValues`) might be unavailable, using `Math.random()` to generate security secrets violates the "Fail Securely" principle.
**Prevention:** Never use `Math.random()` for security secrets. Always fallback to Node.js crypto (`require('node:crypto').randomBytes`) wrapped in a `typeof require !== 'undefined'` check, or throw an error if neither is available.
