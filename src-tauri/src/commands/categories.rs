use tauri::State;
use uuid::Uuid;

use crate::db::models::Category;
use crate::db::queries::categories as cat_queries;
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, AppError> {
    state.with_db(|conn| cat_queries::list_categories(conn))
}

#[tauri::command]
pub async fn create_category(
    name: String,
    icon: String,
    color: String,
    state: State<'_, AppState>,
) -> Result<Category, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    state.with_db(|conn| {
        // Get next sort order
        let max_order: i32 = conn
            .query_row("SELECT COALESCE(MAX(sort_order), -1) FROM categories", [], |row| {
                row.get(0)
            })
            .unwrap_or(-1);

        cat_queries::insert_category(conn, &id, &name, &icon, &color, max_order + 1, None, &now)?;

        Ok(Category {
            id: id.clone(),
            name,
            icon,
            color,
            sort_order: max_order + 1,
            parent_id: None,
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

#[tauri::command]
pub async fn update_category(
    id: String,
    name: String,
    icon: String,
    color: String,
    sort_order: i32,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    state.with_db(|conn| cat_queries::update_category(conn, &id, &name, &icon, &color, sort_order, &now))
}

#[tauri::command]
pub async fn delete_category(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.with_db(|conn| cat_queries::delete_category(conn, &id))
}
