use rusqlite::{params, Connection};

use crate::db::models::*;
use crate::errors::AppError;

pub fn insert_credential(
    conn: &Connection,
    id: &str,
    title: &str,
    username: Option<&str>,
    password: Option<&str>,
    url: Option<&str>,
    notes_plain: Option<&str>,
    category_id: Option<&str>,
    is_favorite: bool,
    icon_url: Option<&str>,
    connection_type: Option<&str>,
    connection_config: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO credentials (id, title, username, password, url, notes_plain,
         category_id, is_favorite, icon_url, connection_type, connection_config,
         created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
        params![
            id,
            title,
            username,
            password,
            url,
            notes_plain,
            category_id,
            is_favorite as i32,
            icon_url,
            connection_type,
            connection_config,
            now,
        ],
    )?;
    Ok(())
}

pub fn update_credential_field(
    conn: &Connection,
    id: &str,
    field: &str,
    value: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    let sql = format!(
        "UPDATE credentials SET {} = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        field
    );
    let rows = conn.execute(&sql, params![value, now, id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Credential {}", id)));
    }
    Ok(())
}

pub fn soft_delete_credential(conn: &Connection, id: &str, now: &str) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE credentials SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Credential {}", id)));
    }
    Ok(())
}

pub fn get_credential_by_id(conn: &Connection, id: &str) -> Result<CredentialRow, AppError> {
    conn.query_row(
        "SELECT id, title, username, password, url, notes_plain,
                category_id, is_favorite, icon_url, connection_type,
                connection_config, totp_secret, sort_order, created_at, updated_at
         FROM credentials WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| {
            Ok(CredentialRow {
                id: row.get(0)?,
                title: row.get(1)?,
                username: row.get(2)?,
                password: row.get(3)?,
                url: row.get(4)?,
                notes_plain: row.get(5)?,
                category_id: row.get(6)?,
                is_favorite: row.get::<_, i32>(7)? != 0,
                icon_url: row.get(8)?,
                connection_type: row.get(9)?,
                connection_config: row.get(10)?,
                totp_secret: row.get(11)?,
                sort_order: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Credential {}", id))
        }
        _ => AppError::Database(e.to_string()),
    })
}

pub fn list_credentials_raw(
    conn: &Connection,
    category_id: Option<&str>,
    favorites_only: bool,
) -> Result<Vec<CredentialRow>, AppError> {
    let mut sql = String::from(
        "SELECT id, title, username, password, url, notes_plain,
                category_id, is_favorite, icon_url, connection_type,
                connection_config, totp_secret, sort_order, created_at, updated_at
         FROM credentials WHERE deleted_at IS NULL",
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    if let Some(cat_id) = category_id {
        sql.push_str(&format!(" AND category_id = ?{}", param_idx));
        param_values.push(Box::new(cat_id.to_string()));
        param_idx += 1;
    }

    if favorites_only {
        sql.push_str(" AND is_favorite = 1");
    }

    let _ = param_idx; // suppress unused warning
    sql.push_str(" ORDER BY sort_order ASC, updated_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(CredentialRow {
            id: row.get(0)?,
            title: row.get(1)?,
            username: row.get(2)?,
            password: row.get(3)?,
            url: row.get(4)?,
            notes_plain: row.get(5)?,
            category_id: row.get(6)?,
            is_favorite: row.get::<_, i32>(7)? != 0,
            icon_url: row.get(8)?,
            connection_type: row.get(9)?,
            connection_config: row.get(10)?,
            totp_secret: row.get(11)?,
            sort_order: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

/// Raw DB row (fields still encrypted)
#[derive(Debug)]
pub struct CredentialRow {
    pub id: String,
    pub title: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes_plain: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: bool,
    pub icon_url: Option<String>,
    pub connection_type: Option<String>,
    pub connection_config: Option<String>,
    pub totp_secret: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

pub fn get_custom_fields(
    conn: &Connection,
    credential_id: &str,
) -> Result<Vec<CustomFieldRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, field_name, field_value, field_type, sort_order, created_at
         FROM custom_fields WHERE credential_id = ?1 ORDER BY sort_order ASC",
    )?;

    let rows = stmt.query_map(params![credential_id], |row| {
        Ok(CustomFieldRow {
            id: row.get(0)?,
            field_name: row.get(1)?,
            field_value: row.get(2)?,
            field_type: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

#[derive(Debug)]
pub struct CustomFieldRow {
    pub id: String,
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
    pub sort_order: i32,
    pub created_at: String,
}

pub fn insert_custom_field(
    conn: &Connection,
    id: &str,
    credential_id: &str,
    field_name: &str,
    field_value: &str,
    field_type: &str,
    sort_order: i32,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO custom_fields (id, credential_id, field_name, field_value, field_type, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, credential_id, field_name, field_value, field_type, sort_order, now],
    )?;
    Ok(())
}

pub fn delete_custom_fields_for_credential(
    conn: &Connection,
    credential_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM custom_fields WHERE credential_id = ?1",
        params![credential_id],
    )?;
    Ok(())
}

pub fn insert_history(
    conn: &Connection,
    id: &str,
    credential_id: &str,
    field_name: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO credential_history (id, credential_id, field_name, old_value, new_value, changed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, credential_id, field_name, old_value, new_value, now],
    )?;
    Ok(())
}

pub fn get_history(
    conn: &Connection,
    credential_id: &str,
) -> Result<Vec<HistoryEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, credential_id, field_name, old_value, new_value, changed_at
         FROM credential_history WHERE credential_id = ?1 ORDER BY changed_at DESC",
    )?;

    let rows = stmt.query_map(params![credential_id], |row| {
        Ok(HistoryEntry {
            id: row.get(0)?,
            credential_id: row.get(1)?,
            field_name: row.get(2)?,
            old_value: row.get(3)?,
            new_value: row.get(4)?,
            changed_at: row.get(5)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}
