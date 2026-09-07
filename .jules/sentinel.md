## 2024-05-24 - [CRITICAL] Fix insecure PRNG for webhook secret
**Vulnerability:** Weak random numbers used to generate webhook secrets via `Math.random()` when web crypto API is unavailable.
**Learning:** Hardcoding insecure fallbacks compromises security, especially for signature generation.
**Prevention:** Fail securely if no robust cryptography engine exists, optionally with a standard fallback using `node:crypto`.
