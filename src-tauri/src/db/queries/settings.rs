use rusqlite::{params, Connection};
use std::collections::HashMap;

use crate::errors::AppError;

pub fn get_all_settings(conn: &Connection) -> Result<HashMap<String, String>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM user_settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut result = HashMap::new();
    for row in rows {
        let (key, value) = row?;
        result.insert(key, value);
    }
    Ok(result)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT value FROM user_settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str, now: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO user_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        params![key, value, now],
    )?;
    Ok(())
}
