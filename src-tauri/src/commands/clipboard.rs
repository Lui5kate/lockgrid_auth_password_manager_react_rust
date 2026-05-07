use crate::errors::AppError;

#[tauri::command]
pub async fn copy_and_clear(
    text: String,
    clear_after_seconds: u32,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(&text)
        .map_err(|e| AppError::Io(format!("Clipboard write failed: {}", e)))?;

    let app_handle = app.clone();
    let seconds = clear_after_seconds;
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(seconds as u64)).await;
        use tauri_plugin_clipboard_manager::ClipboardExt;
        let _ = app_handle.clipboard().write_text("");
    });

    Ok(())
}

#[tauri::command]
pub async fn clear_clipboard(app: tauri::AppHandle) -> Result<(), AppError> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text("")
        .map_err(|e| AppError::Io(format!("Clipboard clear failed: {}", e)))?;
    Ok(())
}
