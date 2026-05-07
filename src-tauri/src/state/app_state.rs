use rusqlite::Connection;
use std::sync::Mutex;
use zeroize::Zeroizing;

/// Application state managed by Tauri.
/// Holds the database connection, encryption keys, and lock status.
pub struct AppState {
    /// SQLCipher database connection (None when locked or uninitialized)
    pub db: Mutex<Option<Connection>>,

    /// Derived key for field-level encryption (zeroized on lock)
    pub field_key: Mutex<Option<Zeroizing<[u8; 32]>>>,

    /// Derived key for database encryption (kept to re-open DB)
    pub db_key: Mutex<Option<Zeroizing<[u8; 32]>>>,

    /// Salt stored from master_auth
    pub salt: Mutex<Option<[u8; 32]>>,

    /// Path to the database file
    pub db_path: Mutex<Option<String>>,

    /// Whether the app is currently locked
    pub is_locked: Mutex<bool>,

    /// Whether this is the first run (no master password set)
    pub is_first_run: Mutex<bool>,

    /// Whether a PIN is configured (cached so LockScreen can show PIN input while DB is closed)
    pub has_pin: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            db: Mutex::new(None),
            field_key: Mutex::new(None),
            db_key: Mutex::new(None),
            salt: Mutex::new(None),
            db_path: Mutex::new(None),
            is_locked: Mutex::new(true),
            is_first_run: Mutex::new(true),
            has_pin: Mutex::new(false),
        }
    }

    /// Soft lock: close DB connection, mark locked.
    /// field_key and db_key are kept in memory so PIN unlock can restore access
    /// without re-deriving from the master password.
    pub fn lock(&self) {
        if let Ok(mut db) = self.db.lock() {
            *db = None;
        }
        if let Ok(mut locked) = self.is_locked.lock() {
            *locked = true;
        }
    }

    /// Full lock: zeroize all keys. Master password required to unlock again.
    pub fn full_lock(&self) {
        self.lock();
        if let Ok(mut key) = self.field_key.lock() {
            *key = None;
        }
        if let Ok(mut key) = self.db_key.lock() {
            *key = None;
        }
    }

    /// Check if the app is locked
    pub fn is_locked(&self) -> bool {
        self.is_locked.lock().map(|l| *l).unwrap_or(true)
    }

    /// Check if this is the first run
    pub fn is_first_run(&self) -> bool {
        self.is_first_run.lock().map(|f| *f).unwrap_or(true)
    }

    /// Get a reference to the DB connection.
    /// Returns an error if locked or uninitialized.
    pub fn with_db<F, T>(&self, f: F) -> Result<T, crate::errors::AppError>
    where
        F: FnOnce(&Connection) -> Result<T, crate::errors::AppError>,
    {
        let db_guard = self
            .db
            .lock()
            .map_err(|e| crate::errors::AppError::Database(format!("Lock poisoned: {}", e)))?;
        let conn = db_guard
            .as_ref()
            .ok_or(crate::errors::AppError::Locked)?;
        f(conn)
    }

    /// Get the field encryption key.
    /// Returns an error if locked.
    pub fn get_field_key(&self) -> Result<Zeroizing<[u8; 32]>, crate::errors::AppError> {
        let key_guard = self
            .field_key
            .lock()
            .map_err(|e| crate::errors::AppError::Crypto(format!("Lock poisoned: {}", e)))?;
        key_guard
            .clone()
            .ok_or(crate::errors::AppError::Locked)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
