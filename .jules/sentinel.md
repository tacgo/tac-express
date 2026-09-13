## 2024-09-13 - Insecure PRNG for Webhook Secrets
**Vulnerability:** Used Math.random() as a fallback to generate webhook secrets when crypto.getRandomValues is unavailable.
**Learning:** Math.random() is not cryptographically secure and can lead to predictable secrets.
**Prevention:** Always fail securely by throwing an error or using a secure Node.js crypto fallback (require('node:crypto').randomBytes) when Web Crypto is unavailable.
