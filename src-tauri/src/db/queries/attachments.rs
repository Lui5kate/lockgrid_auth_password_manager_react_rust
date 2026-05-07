use rusqlite::{params, Connection};

use crate::db::models::Attachment;
use crate::errors::AppError;

pub fn insert_attachment(
    conn: &Connection,
    id: &str,
    credential_id: &str,
    filename: &str,
    mime_type: &str,
    data: &[u8],
    size_bytes: i64,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO attachments (id, credential_id, filename, mime_type, data, size_bytes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, credential_id, filename, mime_type, data, size_bytes, now],
    )?;
    Ok(())
}

pub fn list_attachments(
    conn: &Connection,
    credential_id: &str,
) -> Result<Vec<Attachment>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, credential_id, filename, mime_type, size_bytes, created_at
         FROM attachments WHERE credential_id = ?1 ORDER BY created_at DESC",
    )?;

    let rows = stmt.query_map(params![credential_id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            credential_id: row.get(1)?,
            filename: row.get(2)?,
            mime_type: row.get(3)?,
            size_bytes: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn get_attachment_data(conn: &Connection, id: &str) -> Result<(String, Vec<u8>), AppError> {
    conn.query_row(
        "SELECT filename, data FROM attachments WHERE id = ?1",
        params![id],
        |row| {
            let filename: String = row.get(0)?;
            let data: Vec<u8> = row.get(1)?;
            Ok((filename, data))
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Attachment {}", id)),
        _ => AppError::Database(e.to_string()),
    })
}

pub fn delete_attachment(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Attachment {}", id)));
    }
    Ok(())
}
