use std::collections::HashMap;
use tauri::State;

use crate::db::queries::settings as settings_queries;
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, AppError> {
    state.with_db(|conn| settings_queries::get_all_settings(conn))
}

#[tauri::command]
pub async fn get_setting(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, AppError> {
    state.with_db(|conn| settings_queries::get_setting(conn, &key))
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    state.with_db(|conn| settings_queries::set_setting(conn, &key, &value, &now))
}
