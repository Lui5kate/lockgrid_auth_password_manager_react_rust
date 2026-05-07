# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in LockGrid Auth, please report it privately so it can be addressed before public disclosure.

### How to report

Send a detailed report to:

**luiskatelira@gmail.com**

Include the subject line: `[SECURITY] LockGrid Auth — <short description>`

Please provide:

1. **Description** — a clear summary of the vulnerability
2. **Impact** — what an attacker could achieve by exploiting it
3. **Reproduction steps** — enough detail to reproduce the issue reliably
4. **Affected version(s)** — the LockGrid Auth version(s) where you confirmed the issue
5. **Suggested fix** (optional) — any thoughts on how to address it

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

---

## Disclosure Policy

- We follow **coordinated disclosure** — we ask that you give us reasonable time to patch before making any details public.
- We aim to release a fix within **30 days** of a confirmed vulnerability report.
- Once a patch is released we will publish a security advisory crediting the reporter (unless you prefer to remain anonymous).

---

## Scope

Issues that are **in scope**:

- Cryptographic weaknesses in the key derivation, encryption, or database layer
- Authentication bypass (master password, PIN)
- Memory leaks of key material across the IPC boundary
- SQLCipher database extractable without the master password
- Local privilege escalation via the shell/command execution feature
- Insecure deserialization of backup files

Issues that are **out of scope**:

- Attacks requiring physical access to an already-unlocked session
- Denial-of-service attacks against a local-only application
- Theoretical vulnerabilities without a proof-of-concept
- Vulnerabilities in third-party dependencies that have already been publicly disclosed (open a regular issue to track an upstream update)

---

## Security Design Summary

For an overview of LockGrid Auth's threat model and cryptographic choices, see the [Security Model](README.md#-security-model) section of the README.
