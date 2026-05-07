use rusqlite::{params, Connection};

use crate::db::models::Category;
use crate::errors::AppError;

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, color, sort_order, parent_id, created_at, updated_at
         FROM categories ORDER BY sort_order ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            color: row.get(3)?,
            sort_order: row.get(4)?,
            parent_id: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn insert_category(
    conn: &Connection,
    id: &str,
    name: &str,
    icon: &str,
    color: &str,
    sort_order: i32,
    parent_id: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO categories (id, name, icon, color, sort_order, parent_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![id, name, icon, color, sort_order, parent_id, now],
    )?;
    Ok(())
}

pub fn update_category(
    conn: &Connection,
    id: &str,
    name: &str,
    icon: &str,
    color: &str,
    sort_order: i32,
    now: &str,
) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE categories SET name = ?1, icon = ?2, color = ?3, sort_order = ?4, updated_at = ?5
         WHERE id = ?6",
        params![name, icon, color, sort_order, now, id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Category {}", id)));
    }
    Ok(())
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Category {}", id)));
    }
    Ok(())
}
