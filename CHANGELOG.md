# Changelog

All notable changes to LockGrid Auth are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- macOS and Linux support
- Biometric unlock (Windows Hello)
- Browser extension for autofill
- Import from 1Password, Bitwarden, KeePass

---

## [0.1.0] — 2026-05-07

### Added

**Core application**
- Tauri v2 desktop shell with custom frameless window and system tray
- Three-column layout (sidebar / main panel / detail panel) with Framer Motion transitions
- Dark and light theme with system-aware detection and manual override
- Global keyboard shortcut opens Spotlight search overlay

**Authentication**
- First-run setup wizard with master password creation
- Argon2id key derivation with random 32-byte salt
- AES-256-GCM field-level encryption for sensitive credential data
- SQLCipher encrypted database (entire `.lockgrid` file encrypted at rest)
- PIN setup for fast re-unlock after soft lock
- Two-tier locking: soft lock (PIN) and full lock (master password)
- Inactivity auto-lock with configurable timeout

**Credential management**
- Create, view, edit, and delete credentials
- Rich credential model: title, username, password, URL, notes, icon, category, tags
- Custom fields (text, password, URL, email, textarea)
- Credential version history — browse and restore previous values
- Favorites with pinned sorting
- Password strength indicator with entropy display
- Cryptographically secure password generator (length, charset, entropy)
- TOTP secret storage and in-app code generation
- File attachments per credential

**Organization**
- Categories with color and icon
- Tags (many-to-many with credentials)
- Full-text search across all credential fields

**Guided Connection**
- One-click launch for `web`, `rdp`, `ssh`, `file`, and `command` connection types
- Multi-step command sequence runner

**Data safety**
- Clipboard auto-clear after configurable delay
- Encrypted backup export (`.lgbk` format)
- Backup restore with master password verification

**Settings**
- Auto-lock timeout
- Clipboard clear delay
- Theme preference
- PIN management

[Unreleased]: https://github.com/YOUR_USERNAME/lockgrid-auth/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_USERNAME/lockgrid-auth/releases/tag/v0.1.0
