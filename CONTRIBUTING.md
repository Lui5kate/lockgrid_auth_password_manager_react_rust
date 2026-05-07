# Contributing to LockGrid Auth

Thank you for taking the time to contribute! This document covers the process for reporting bugs, proposing features, and submitting code.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Standards](#coding-standards)
- [Security Issues](#security-issues)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating you agree to uphold a respectful, inclusive environment.

---

## Reporting Bugs

1. Search [existing issues](../../issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include:
   - OS version and architecture
   - LockGrid Auth version
   - Steps to reproduce
   - Expected vs. actual behavior
   - Relevant log output (from the Tauri dev console)

> **Security bugs:** Do not open a public issue. See [SECURITY.md](SECURITY.md).

---

## Suggesting Features

1. Search [existing issues](../../issues) for similar proposals.
2. Open a new issue using the **Feature Request** template.
3. Describe the problem you want to solve, not just the solution.

---

## Development Setup

### Prerequisites

- Node.js 18 LTS or later
- Rust stable toolchain (`rustup`)
- Tauri CLI v2 (`cargo install tauri-cli`)
- OpenSSL 3.x (required for SQLCipher on Windows — see README for setup)

### Running locally

```bash
# Install frontend dependencies
npm install

# Start the Tauri dev server (hot-reload for both frontend and Rust backend)
npm run tauri dev
```

The frontend dev server runs on `http://localhost:1420`.

### Running tests

```bash
# Rust unit tests
cd src-tauri && cargo test

# TypeScript type check
npm run build
```

---

## Submitting a Pull Request

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/issue-123
   ```

2. **Make your changes.** Keep commits focused and atomic.

3. **Test your changes** — run `cargo test` and verify the app builds cleanly.

4. **Update documentation** if your change affects behavior visible to users.

5. **Open a PR** against `main` using the pull request template.

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/biometric-unlock` |
| Bug fix | `fix/<issue-or-description>` | `fix/clipboard-clear-timer` |
| Refactor | `refactor/<area>` | `refactor/crypto-module` |
| Docs | `docs/<topic>` | `docs/security-model` |
| Chore | `chore/<task>` | `chore/update-dependencies` |

---

## Coding Standards

### Rust

- Follow `cargo fmt` formatting (enforced via CI).
- Run `cargo clippy -- -D warnings` before submitting — no new warnings.
- Prefer `thiserror` for error types; avoid `unwrap()` in library code.
- Zeroize any key material that leaves scope.

### TypeScript / React

- All new code must pass `tsc --noEmit` with no errors.
- Use TypeScript strict mode — no `any` without explicit justification.
- Components go in the appropriate `features/<name>/components/` directory.
- State goes in `features/<name>/stores/` using Zustand.
- IPC calls are wrapped in `services/` — components do not call `invoke()` directly.

### General

- No commented-out code.
- No console.log / eprintln! in production paths.
- Keep PRs small and focused — one logical change per PR.

---

## Security Issues

Please review [SECURITY.md](SECURITY.md) before reporting any vulnerability. Responsible disclosure is greatly appreciated.
