## 2024-05-18 - Insecure random fallback in Webhook secret generation
**Vulnerability:** `packages/services/src/webhook.service.ts` generated webhook secrets using an insecure `Math.random` fallback loop if `crypto.getRandomValues` was not available.
**Learning:** Never fallback to pseudo-random numbers (`Math.random()`) for security-critical functions like generating webhook secrets, as they can be predicted by attackers.
**Prevention:** If a cryptographically secure pseudo-random number generator (CSPRNG) is unavailable, explicitly throw an error (Fail Securely) rather than falling back to an insecure method.
