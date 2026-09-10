## 2025-01-20 - Insecure Fallback PRNG for Secrets
**Vulnerability:** Weak PRNG (`Math.random()`) used as fallback for generating webhook secrets if `crypto.getRandomValues` was missing.
**Learning:** Security functions need safe fallbacks in isomorphic code. Web API checks shouldn't default back to insecure random implementations.
**Prevention:** If `crypto.getRandomValues` isn't available, attempt to require Node's `crypto` block inline (wrapped in a `typeof require` check with appropriate eslint disables). If neither exists, fail securely by throwing an Error rather than silently downgrading to an insecure math PRNG.
