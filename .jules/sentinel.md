## 2025-05-16 - Insecure Random Number Generation in Webhook Service
**Vulnerability:** Found `Math.random()` being used as a fallback to generate webhook secrets in `packages/services/src/webhook.service.ts`. `Math.random()` is not cryptographically secure and predictable.
**Learning:** In environments where Web Crypto (`crypto.getRandomValues`) isn't available natively, insecure PRNGs must not be used as a fallback for generating security secrets. Node.js `crypto` should be required instead.
**Prevention:** Ensure cryptographic operations use Web Crypto or Node.js `crypto.randomBytes`. Throw an explicit error if neither secure PRNG is available to fail securely rather than generating weak secrets.
