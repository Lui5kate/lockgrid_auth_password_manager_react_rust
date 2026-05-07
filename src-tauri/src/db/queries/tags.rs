use rusqlite::{params, Connection};

use crate::db::models::Tag;
use crate::errors::AppError;

pub fn list_tags(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM tags ORDER BY name ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn insert_tag(
    conn: &Connection,
    id: &str,
    name: &str,
    color: Option<&str>,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
        params![id, name, color],
    )?;
    Ok(())
}

pub fn delete_tag(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM credential_tags WHERE tag_id = ?1", params![id])?;
    let rows = conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Tag {}", id)));
    }
    Ok(())
}

pub fn get_tags_for_credential(conn: &Connection, credential_id: &str) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color FROM tags t
         INNER JOIN credential_tags ct ON ct.tag_id = t.id
         WHERE ct.credential_id = ?1
         ORDER BY t.name ASC",
    )?;

    let rows = stmt.query_map(params![credential_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn set_credential_tags(
    conn: &Connection,
    credential_id: &str,
    tag_ids: &[String],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM credential_tags WHERE credential_id = ?1",
        params![credential_id],
    )?;

    let mut stmt = conn.prepare(
        "INSERT INTO credential_tags (credential_id, tag_id) VALUES (?1, ?2)",
    )?;

    for tag_id in tag_ids {
        stmt.execute(params![credential_id, tag_id])?;
    }
    Ok(())
}
