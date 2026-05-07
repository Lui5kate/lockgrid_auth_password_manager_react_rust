<div align="center">

<img src="app-icon.png" alt="LockGrid Auth Logo" width="120" height="120" />

# LockGrid Auth

**A modern, secure desktop password manager built with Tauri v2, React, and Rust**

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/microsoft/windows)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-stable-CE412B?style=for-the-badge&logo=rust)](https://www.rust-lang.org)

[Features](#-features) · [Screenshots](#-screenshots) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Security](#-security-model) · [Contributing](#-contributing)

</div>

---

## Overview

LockGrid Auth is a privacy-first, offline password manager designed for Windows. All data is stored locally in a SQLCipher-encrypted database — your credentials never leave your machine. The application combines a polished three-column UI with a hardened Rust backend, giving you enterprise-grade security without cloud dependency.

---

## Features

### Security
- **Argon2id key derivation** — industry-leading master password hashing resistant to brute-force and side-channel attacks
- **AES-256-GCM field-level encryption** — each credential field is individually encrypted at rest
- **SQLCipher database** — the entire database file is encrypted, not just individual fields
- **Secure memory management** — encryption keys are zeroized from memory immediately after use via the `zeroize` crate
- **Two-tier locking** — soft lock (PIN unlock) and full lock (master password required), each with independent key lifecycle
- **Auto-lock on inactivity** — configurable timeout locks the vault automatically
- **Clipboard auto-clear** — copied passwords are automatically wiped from the clipboard after a configurable delay

### Credential Management
- **Full CRUD** — create, view, edit, and delete credentials with rich metadata
- **Custom fields** — add text, password, URL, email, or textarea fields to any credential
- **Credential history** — every edit is versioned; restore previous values at any time
- **Favorites** — pin frequently used credentials to the top
- **Category & tag system** — flexible two-axis organization
- **TOTP support** — store TOTP secrets and generate one-time codes in-app
- **Attachments** — attach files (documents, certificates, keys) to credentials
- **Password strength indicator** — real-time entropy analysis as you type

### Guided Connection
- **One-click launch** — open URLs in the default browser, launch RDP sessions, SSH tunnels, or local executables directly from a credential
- **Multi-step automation** — define a sequence of CLI commands that run in order when a credential is activated
- **Connection types** — `web`, `rdp`, `ssh`, `file`, and `command` modes

### Productivity
- **Spotlight search** — global keyboard shortcut opens an instant fuzzy search overlay across all credentials
- **Password generator** — cryptographically secure random passwords with configurable length, character sets, and entropy display
- **Backup & restore** — export an encrypted `.lgbk` backup and restore it on any machine with the master password
- **System tray integration** — minimize to tray; quick-lock from the tray context menu
- **Dark / light theme** — system-aware with manual override

---

## Screenshots

> Screenshots will be added in v0.2.0. See the [Roadmap](#-roadmap) for upcoming releases.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop Shell | [Tauri v2](https://tauri.app) | Native window, IPC, OS integration |
| Frontend Framework | [React 18](https://react.dev) | Component-based UI |
| Language (UI) | [TypeScript 5.6](https://www.typescriptlang.org) | Type-safe frontend code |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) | Utility-first CSS with custom design tokens |
| Animations | [Framer Motion 11](https://www.framer.com/motion/) | Fluid UI transitions |
| State Management | [Zustand 4](https://zustand-demo.pmnd.rs) | Lightweight global state |
| Build Tool | [Vite 5](https://vite.dev) | Fast HMR dev server and bundler |
| Language (Backend) | [Rust (stable)](https://www.rust-lang.org) | Memory-safe, performant backend |
| Database | [SQLite + SQLCipher](https://www.zetetic.net/sqlcipher/) | Encrypted local database |
| Key Derivation | [Argon2id](https://docs.rs/argon2) | Master password hashing |
| Encryption | [AES-256-GCM](https://docs.rs/aes-gcm) | Authenticated field encryption |
| Secure Memory | [zeroize](https://docs.rs/zeroize) | Key wiping on drop |
| Error Handling | [thiserror](https://docs.rs/thiserror) | Typed error hierarchy |
| Icons | [Lucide React](https://lucide.dev) | Consistent icon set |

---

## Architecture

```
lockgrid-auth/
├── src/                          # React + TypeScript frontend
│   ├── features/                 # Feature modules (auth, credentials, search…)
│   │   ├── auth/                 # Login, lock, setup screens + Zustand store
│   │   ├── credentials/          # Credential CRUD, history, TOTP, attachments
│   │   ├── guided-connection/    # Connection launcher & multi-step runner
│   │   ├── search/               # Spotlight overlay
│   │   └── settings/             # App preferences
│   ├── components/               # Shared layout & UI primitives
│   ├── services/                 # Tauri IPC wrappers (one file per domain)
│   ├── types/                    # TypeScript interfaces
│   └── hooks/                    # Cross-feature React hooks
│
└── src-tauri/src/                # Rust backend
    ├── commands/                 # Tauri command handlers (thin layer)
    ├── db/                       # SQLCipher connection, migrations, queries
    ├── crypto/                   # KDF, cipher, password generator, secure memory
    ├── state/                    # AppState (DB handle, keys, lock status)
    └── errors/                   # Custom error types
```

**Data flow:** React component → Zustand store → service layer → `invoke()` IPC → Tauri command → DB/crypto layer → response propagated back up.

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | 18 LTS or later | |
| [Rust](https://www.rust-lang.org/tools/install) | stable | via `rustup` |
| [Tauri CLI](https://tauri.app/start/prerequisites/) | v2 | `cargo install tauri-cli` |
| OpenSSL | 3.x | Required for SQLCipher — see note below |

> **OpenSSL on Windows:** Install via [vcpkg](https://vcpkg.io) and set `OPENSSL_DIR` before building.
> ```powershell
> vcpkg install openssl:x64-windows
> $env:OPENSSL_DIR = "C:\vcpkg\installed\x64-windows"
> ```

### Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/lockgrid-auth.git
cd lockgrid-auth
npm install
```

### Development

Start the Tauri dev server with hot-reload:

```bash
npm run tauri dev
```

The frontend dev server runs on `http://localhost:1420`. The Rust backend recompiles and reloads automatically on file changes.

### Production Build

```bash
npm run tauri build
```

The NSIS installer will be output to `src-tauri/target/release/bundle/nsis/`.

---

## Security Model

LockGrid Auth implements a layered security model with no network dependency.

### Key Derivation

The master password is never stored. On first setup, a random 32-byte salt is generated and persisted. On each unlock, the master password is fed through **Argon2id** to derive two independent 256-bit keys:

- **DB key** — unlocks the SQLCipher database
- **Field key** — encrypts individual sensitive fields within the database

### Encryption at Rest

Every credential's sensitive fields (passwords, TOTP secrets, custom password fields) are independently encrypted with **AES-256-GCM** before being written to the database. The database itself is also encrypted with SQLCipher (ChaCha20-Poly1305 by default), providing double-layer protection.

### Memory Safety

Keys are stored in Rust's `AppState` behind `Mutex<Option<Zeroizing<[u8; 32]>>>`. The `Zeroizing` wrapper guarantees that memory is zeroed when the key is dropped — this happens on full lock. No key material is ever serialized or passed across the IPC boundary.

### Lock Levels

| Level | Trigger | Keys retained | Unlock path |
|---|---|---|---|
| **Soft lock** | Inactivity timeout / tray menu | DB key + Field key kept, DB closed | PIN (4–8 digits) |
| **Full lock** | Manual lock / startup | All keys zeroized | Master password |

### What LockGrid Auth does NOT do

- No cloud sync or telemetry
- No analytics or crash reporting
- No network requests of any kind
- The database file (`.lockgrid`) cannot be opened without the master password

---

## Roadmap

### v0.2.0
- [ ] Screenshot gallery in README
- [ ] macOS and Linux support
- [ ] Biometric unlock (Windows Hello / TouchID)
- [ ] Browser extension for autofill

### v0.3.0
- [ ] Optional local-network sync (no cloud)
- [ ] Import from 1Password, Bitwarden, KeePass (CSV/JSON)
- [ ] Password audit (duplicates, weak, breached via HaveIBeenPwned offline)
- [ ] Yubikey / hardware key support

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

For security vulnerabilities, **do not** open a public issue — see [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## License

LockGrid Auth is released under the [MIT License](LICENSE).

---

<div align="center">

Built with Tauri · React · Rust

</div>
