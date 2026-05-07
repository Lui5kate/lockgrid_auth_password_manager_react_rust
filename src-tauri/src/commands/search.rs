use tauri::State;

use crate::db::models::{CredentialFilter, CredentialSummary};
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn search_credentials(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<CredentialSummary>, AppError> {
    // Delegate to list_credentials with search filter
    super::credentials::list_credentials(
        CredentialFilter {
            category_id: None,
            tag_id: None,
            favorites_only: false,
            search_query: Some(query),
        },
        state,
    )
    .await
}
