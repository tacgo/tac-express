## 2025-03-09 - Insecure PRNG in Webhook Service
**Vulnerability:** The `generateSecret` function in `packages/services/src/webhook.service.ts` used `Math.random()` as a fallback for generating cryptographic secrets when Web Crypto was unavailable.
**Learning:** This existed because `Math.random()` was used as a generic fallback, likely without realizing it is not cryptographically secure and produces predictable outputs.
**Prevention:** When Web Crypto (`crypto.getRandomValues`) is unavailable, fallback to Node.js crypto (`node:crypto`) instead. If neither is available, fail securely by throwing an error instead of silently using an insecure PRNG.
