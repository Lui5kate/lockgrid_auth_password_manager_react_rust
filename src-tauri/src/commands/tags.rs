use tauri::State;
use uuid::Uuid;

use crate::db::models::Tag;
use crate::db::queries::tags as tag_queries;
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, AppError> {
    state.with_db(|conn| tag_queries::list_tags(conn))
}

#[tauri::command]
pub async fn create_tag(
    name: String,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<Tag, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Tag name cannot be empty".into()));
    }

    let id = Uuid::new_v4().to_string();
    let color_ref = color.as_deref();

    state.with_db(|conn| {
        tag_queries::insert_tag(conn, &id, trimmed, color_ref)?;
        Ok(Tag {
            id: id.clone(),
            name: trimmed.to_string(),
            color: color.clone(),
        })
    })
}

#[tauri::command]
pub async fn delete_tag(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.with_db(|conn| tag_queries::delete_tag(conn, &id))
}
