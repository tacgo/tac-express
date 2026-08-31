## 2026-05-28 - Insecure random number generation fallback
**Vulnerability:** generateSecret used Math.random() as a fallback for generating cryptographic secrets when crypto.getRandomValues was unavailable.
**Learning:** Generating cryptographic secrets using non-CSPRNGs like Math.random() is insecure and allows for secret prediction.
**Prevention:** Always fail securely by throwing an error if a cryptographically secure random number generator is unavailable instead of silently falling back to insecure methods.
