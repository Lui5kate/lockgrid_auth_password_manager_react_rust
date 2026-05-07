use tauri::State;
use uuid::Uuid;

use crate::crypto::cipher;
use crate::db::models::Attachment;
use crate::db::queries::attachments as att_queries;
use crate::errors::AppError;
use crate::state::AppState;

const MAX_ATTACHMENT_BYTES: u64 = 25 * 1024 * 1024; // 25 MiB

#[tauri::command]
pub async fn list_attachments(
    credential_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Attachment>, AppError> {
    state.with_db(|conn| att_queries::list_attachments(conn, &credential_id))
}

#[tauri::command]
pub async fn upload_attachment(
    credential_id: String,
    source_path: String,
    state: State<'_, AppState>,
) -> Result<Attachment, AppError> {
    let field_key = state.get_field_key()?;

    let metadata = std::fs::metadata(&source_path)
        .map_err(|e| AppError::Io(format!("Cannot read file: {}", e)))?;

    if metadata.len() > MAX_ATTACHMENT_BYTES {
        return Err(AppError::Validation(format!(
            "File exceeds maximum size of {} MiB",
            MAX_ATTACHMENT_BYTES / 1024 / 1024
        )));
    }

    let bytes = std::fs::read(&source_path)
        .map_err(|e| AppError::Io(format!("Cannot read file: {}", e)))?;

    let filename = std::path::Path::new(&source_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("attachment")
        .to_string();

    let mime_type = guess_mime_type(&filename);

    let encrypted = cipher::encrypt(&field_key, &bytes)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let size = bytes.len() as i64;

    state.with_db(|conn| {
        att_queries::insert_attachment(
            conn,
            &id,
            &credential_id,
            &filename,
            &mime_type,
            &encrypted,
            size,
            &now,
        )?;
        Ok(Attachment {
            id: id.clone(),
            credential_id: credential_id.clone(),
            filename: filename.clone(),
            mime_type: mime_type.clone(),
            size_bytes: size,
            created_at: now.clone(),
        })
    })
}

#[tauri::command]
pub async fn download_attachment(
    id: String,
    target_path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let field_key = state.get_field_key()?;

    let (_filename, encrypted) = state.with_db(|conn| att_queries::get_attachment_data(conn, &id))?;
    let decrypted = cipher::decrypt(&field_key, &encrypted)?;

    std::fs::write(&target_path, decrypted.as_slice())
        .map_err(|e| AppError::Io(format!("Cannot write file: {}", e)))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_attachment(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.with_db(|conn| att_queries::delete_attachment(conn, &id))
}

fn guess_mime_type(filename: &str) -> String {
    let ext = std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        "txt" | "log" => "text/plain",
        "json" => "application/json",
        "md" => "text/markdown",
        "zip" => "application/zip",
        "doc" | "docx" => "application/msword",
        _ => "application/octet-stream",
    }
    .to_string()
}
