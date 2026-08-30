## 2026-08-30 - Insecure CSPRNG Fallback in Webhook Secrets
**Vulnerability:** Used Math.random() as a fallback for generating cryptographic webhook secrets when crypto.getRandomValues was unavailable.
**Learning:** Using predictable pseudo-random number generators (PRNGs) for security-sensitive data compromises the secret. Silent fallbacks to insecure methods mask environment issues.
**Prevention:** Always fail securely. If a secure CSPRNG is required but unavailable, throw an explicit error rather than falling back to an insecure method.
