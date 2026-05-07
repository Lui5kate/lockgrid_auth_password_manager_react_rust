use serde::Serialize;
use tauri::State;

use crate::crypto::kdf;
use crate::db::{connection, migrations};
use crate::errors::AppError;
use crate::state::AppState;

const DB_KEY_CONTEXT: &[u8] = b"lockgrid-db-encryption-key";
const FIELD_KEY_CONTEXT: &[u8] = b"lockgrid-field-encryption-key";

#[derive(Debug, Serialize)]
pub struct AuthStatus {
    pub is_locked: bool,
    pub is_first_run: bool,
    pub has_pin: bool,
}

#[tauri::command]
pub async fn get_auth_status(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<AuthStatus, AppError> {
    let db_path = get_or_init_db_path(&state, &app)?;
    let salt_path = salt_path_for(&db_path);

    // First run = no salt file (DB + salt file are created together)
    let is_first_run = !std::path::Path::new(&salt_path).exists();

    if let Ok(mut fr) = state.is_first_run.lock() {
        *fr = is_first_run;
    }

    // If unlocked, refresh the cached has_pin flag from the DB.
    if !is_first_run && !state.is_locked() {
        let pin_present = state
            .with_db(|conn| {
                let result: Option<String> = conn
                    .query_row(
                        "SELECT pin_hash FROM master_auth WHERE id = 1",
                        [],
                        |row| row.get(0),
                    )
                    .ok()
                    .flatten();
                Ok(result.is_some())
            })
            .unwrap_or(false);
        if let Ok(mut guard) = state.has_pin.lock() {
            *guard = pin_present;
        }
    }

    let has_pin = state.has_pin.lock().map(|g| *g).unwrap_or(false);

    Ok(AuthStatus {
        is_locked: state.is_locked(),
        is_first_run,
        has_pin,
    })
}

#[tauri::command]
pub async fn setup_master_password(
    password: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::Validation(
            "Master password must be at least 8 characters".into(),
        ));
    }

    let db_path = get_or_init_db_path(&state, &app)?;
    let salt_path = salt_path_for(&db_path);

    if std::path::Path::new(&salt_path).exists() {
        return Err(AppError::AlreadyInitialized);
    }

    // Generate salt and derive keys
    let salt = kdf::generate_salt();
    let db_key = kdf::derive_key(password.as_bytes(), &salt, DB_KEY_CONTEXT)?;
    let field_key = kdf::derive_key(password.as_bytes(), &salt, FIELD_KEY_CONTEXT)?;

    // Hash the password for verification
    let password_hash = kdf::hash_password(password.as_bytes())?;

    // Write salt file BEFORE creating DB (so unlock can read it)
    std::fs::write(&salt_path, &salt)?;

    // Open encrypted database and run migrations
    let conn = connection::open_db(&db_path, &db_key)?;
    migrations::run_migrations(&conn)?;

    // Store master auth info inside DB
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO master_auth (id, password_hash, salt, created_at, updated_at)
         VALUES (1, ?1, ?2, ?3, ?3)",
        rusqlite::params![password_hash, salt.to_vec(), now],
    )?;

    // Update app state
    *state.db.lock().unwrap() = Some(conn);
    *state.db_key.lock().unwrap() = Some(db_key);
    *state.field_key.lock().unwrap() = Some(field_key);
    *state.salt.lock().unwrap() = Some(salt);
    *state.is_locked.lock().unwrap() = false;
    *state.is_first_run.lock().unwrap() = false;

    Ok(())
}

#[tauri::command]
pub async fn unlock(
    password: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let db_path = get_or_init_db_path(&state, &app)?;
    let salt_path_str = salt_path_for(&db_path);

    if !std::path::Path::new(&salt_path_str).exists() {
        return Err(AppError::NotInitialized);
    }

    // Read salt from file
    let salt = read_salt_file(&salt_path_str, &state)?;

    // Derive DB key from password + salt
    let db_key = kdf::derive_key(password.as_bytes(), &salt, DB_KEY_CONTEXT)?;

    // Try to open the database — if key is wrong, SQLCipher will fail
    let conn = connection::open_db(&db_path, &db_key)
        .map_err(|_| AppError::InvalidPassword)?;

    // Double-check with stored hash
    let stored_hash: String = conn
        .query_row(
            "SELECT password_hash FROM master_auth WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|_| AppError::InvalidPassword)?;

    if !kdf::verify_password(password.as_bytes(), &stored_hash)? {
        return Err(AppError::InvalidPassword);
    }

    // Cache whether a PIN exists so LockScreen can show PIN input when soft-locked
    let pin_present: bool = conn
        .query_row(
            "SELECT pin_hash IS NOT NULL FROM master_auth WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    // Derive field key
    let field_key = kdf::derive_key(password.as_bytes(), &salt, FIELD_KEY_CONTEXT)?;

    // Update state
    *state.db.lock().unwrap() = Some(conn);
    *state.db_key.lock().unwrap() = Some(db_key);
    *state.field_key.lock().unwrap() = Some(field_key);
    *state.salt.lock().unwrap() = Some(salt);
    *state.is_locked.lock().unwrap() = false;
    *state.is_first_run.lock().unwrap() = false;
    *state.has_pin.lock().unwrap() = pin_present;

    Ok(())
}

#[tauri::command]
pub async fn lock_app(state: State<'_, AppState>) -> Result<(), AppError> {
    // Soft lock: keep field_key and db_key so PIN can re-unlock quickly.
    // Only closes the DB connection and flips the locked flag.
    state.lock();
    Ok(())
}

#[tauri::command]
pub async fn setup_pin(pin: String, state: State<'_, AppState>) -> Result<(), AppError> {
    if state.is_locked() {
        return Err(AppError::Locked);
    }

    if pin.len() < 4 || pin.len() > 8 {
        return Err(AppError::Validation("PIN must be 4-8 digits".into()));
    }

    let pin_hash = kdf::hash_password(pin.as_bytes())?;
    let now = chrono::Utc::now().to_rfc3339();

    state.with_db(|conn| {
        conn.execute(
            "UPDATE master_auth SET pin_hash = ?1, updated_at = ?2 WHERE id = 1",
            rusqlite::params![pin_hash, now],
        )?;
        Ok(())
    })?;

    if let Ok(mut guard) = state.has_pin.lock() {
        *guard = true;
    }
    Ok(())
}

#[tauri::command]
pub async fn verify_pin(pin: String, state: State<'_, AppState>) -> Result<(), AppError> {
    // PIN only works while soft-locked: db_key and field_key are still in memory.
    let db_key = state
        .db_key
        .lock()
        .map_err(|e| AppError::Crypto(format!("Lock poisoned: {}", e)))?
        .clone()
        .ok_or(AppError::InvalidPin)?;

    let db_path = state
        .db_path
        .lock()
        .map_err(|e| AppError::Io(format!("Lock poisoned: {}", e)))?
        .clone()
        .ok_or(AppError::NotInitialized)?;

    // Open DB to verify PIN
    let conn = connection::open_db(&db_path, &db_key)?;
    let pin_hash: String = conn
        .query_row(
            "SELECT pin_hash FROM master_auth WHERE id = 1 AND pin_hash IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|_| AppError::InvalidPin)?;

    if !kdf::verify_password(pin.as_bytes(), &pin_hash)? {
        return Err(AppError::InvalidPin);
    }

    *state.db.lock().unwrap() = Some(conn);
    *state.is_locked.lock().unwrap() = false;
    // field_key was kept across soft lock — nothing to restore.

    Ok(())
}

// ── Helpers ──

fn salt_path_for(db_path: &str) -> String {
    format!("{}.salt", db_path)
}

fn get_or_init_db_path(
    state: &State<'_, AppState>,
    app: &tauri::AppHandle,
) -> Result<String, AppError> {
    let mut path_guard = state
        .db_path
        .lock()
        .map_err(|e| AppError::Io(format!("Lock poisoned: {}", e)))?;

    if let Some(ref path) = *path_guard {
        return Ok(path.clone());
    }

    let path = connection::default_db_path(app)?;
    *path_guard = Some(path.clone());
    Ok(path)
}

fn read_salt_file(salt_path: &str, state: &State<'_, AppState>) -> Result<[u8; 32], AppError> {
    // Try cache first
    if let Ok(guard) = state.salt.lock() {
        if let Some(salt) = *guard {
            return Ok(salt);
        }
    }

    // Read from file
    let salt_bytes = std::fs::read(salt_path)
        .map_err(|_| AppError::NotInitialized)?;

    if salt_bytes.len() != 32 {
        return Err(AppError::Crypto("Invalid salt file".into()));
    }

    let mut salt = [0u8; 32];
    salt.copy_from_slice(&salt_bytes);

    if let Ok(mut s) = state.salt.lock() {
        *s = Some(salt);
    }

    Ok(salt)
}
