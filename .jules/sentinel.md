## 2025-02-28 - Secure Webhook Secret Generation
**Vulnerability:** Webhook secret generator `generateSecret` fell back to `Math.random()` if `crypto.getRandomValues` was unavailable.
**Learning:** Security mechanisms that fall back to cryptographically insecure PRNGs can be silently bypassed or brute forced, compromising the integrity of security tokens.
**Prevention:** Fail securely. Always throw explicit errors in security-sensitive operations if required secure APIs are unavailable, instead of using insecure fallbacks.
