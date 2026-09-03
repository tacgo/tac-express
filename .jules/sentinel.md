## 2024-05-18 - Insecure PRNG Fallback in Secret Generation
**Vulnerability:** Used `Math.random()` as a fallback for generating webhook secrets when Web Crypto `crypto` was undefined.
**Learning:** `Math.random()` is not cryptographically secure. While Web Crypto was checked, environments without it defaulted to predictable randomness, compromising secret integrity.
**Prevention:** Always use secure PRNGs. If Web Crypto is unavailable, check for Node.js `crypto` via an inline require. If neither is available, throw an error instead of failing open with an insecure method.
