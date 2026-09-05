## 2024-05-24 - Insecure Math.random PRNG Fallback
**Vulnerability:** Weak, predictable secret generation using Math.random() as a fallback for missing Web Crypto when creating webhook secrets.
**Learning:** In isomorphic or edge environments, Web Crypto might be missing, but falling back to Math.random compromises security by generating predictable cryptographic secrets.
**Prevention:** Always fail securely. If Web Crypto isn't available, attempt to use Node's crypto library via inline require, and if neither is present, throw an error instead of using insecure randomness.
