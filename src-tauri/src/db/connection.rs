use rusqlite::Connection;
use std::path::Path;

use crate::errors::AppError;

/// Open an encrypted SQLCipher database with the given key.
/// Creates the file if it doesn't exist.
pub fn open_db(path: &str, key: &[u8; 32]) -> Result<Connection, AppError> {
    let db_path = Path::new(path);

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(path)?;

    // Set the encryption key for SQLCipher
    let hex_key = hex_encode(key);
    conn.execute_batch(&format!("PRAGMA key = \"x'{}'\";", hex_key))?;

    // Verify the key works by reading from the database
    conn.execute_batch("SELECT count(*) FROM sqlite_master;")?;

    // Performance and safety pragmas
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;
         PRAGMA foreign_keys = ON;
         PRAGMA auto_vacuum = INCREMENTAL;",
    )?;

    Ok(conn)
}

/// Open an unencrypted database (for first-time setup before key is derived).
/// This is NOT used in normal operation — only `open_db` with encryption.
pub fn test_connection(path: &str, key: &[u8; 32]) -> Result<bool, AppError> {
    match open_db(path, key) {
        Ok(_) => Ok(true),
        Err(AppError::Database(_)) => Ok(false),
        Err(e) => Err(e),
    }
}

/// Get the default database path in the app data directory.
pub fn default_db_path(app_handle: &tauri::AppHandle) -> Result<String, AppError> {
    use tauri::Manager;
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(format!("Could not resolve app data dir: {}", e)))?;

    std::fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("lockgrid.db");
    db_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Io("Invalid path encoding".into()))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_encode() {
        let bytes = [0xAB, 0xCD, 0xEF];
        assert_eq!(hex_encode(&bytes), "abcdef");
    }
}
