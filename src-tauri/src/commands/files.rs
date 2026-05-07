use tauri::State;

use crate::crypto::cipher;
use crate::db::queries::credentials as cred_queries;
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn open_url(url: String, app: tauri::AppHandle) -> Result<(), AppError> {
    use tauri_plugin_shell::ShellExt;
    let normalized = normalize_url(&url);
    app.shell()
        .open(&normalized, None)
        .map_err(|e| AppError::Io(format!("Failed to open URL: {}", e)))?;
    Ok(())
}

/// Add `https://` when the URL has no recognizable scheme.
/// Without this, Windows shell treats bare hosts like `instagram.com` as file paths.
fn normalize_url(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return trimmed.to_string();
    }
    let has_scheme = trimmed
        .split_once("://")
        .map(|(s, _)| !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.'))
        .unwrap_or(false)
        || trimmed.starts_with("mailto:")
        || trimmed.starts_with("tel:");
    if has_scheme {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), AppError> {
    // Use Windows shell to open the file with its default handler
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn execute_command(
    command: String,
    args: Vec<String>,
) -> Result<String, AppError> {
    // Security: only allow whitelisted commands
    let allowed = [
        "mstsc", "mstsc.exe",
        "ssh", "ssh.exe",
        "ping", "ping.exe",
        "nslookup", "nslookup.exe",
    ];

    let cmd_name = std::path::Path::new(&command)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&command)
        .to_lowercase();

    if !allowed.iter().any(|a| cmd_name == *a) {
        return Err(AppError::Validation(format!(
            "Command '{}' is not in the allowlist. Allowed: {:?}",
            command, allowed
        )));
    }

    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| AppError::Io(format!("Command execution failed: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !stderr.is_empty() && !output.status.success() {
        return Err(AppError::Io(format!("Command error: {}", stderr)));
    }

    Ok(stdout)
}

/// Guided Connection: orchestrates opening a service and copying credentials
#[tauri::command]
pub async fn guided_connect(
    credential_id: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let field_key = state.get_field_key()?;

    let (username, password, url, connection_type, connection_config) = state.with_db(|conn| {
        let row = cred_queries::get_credential_by_id(conn, &credential_id)?;
        let username = match row.username {
            Some(ref u) => Some(cipher::decrypt_string(&field_key, u)?.to_string()),
            None => None,
        };
        let password = match row.password {
            Some(ref p) => Some(cipher::decrypt_string(&field_key, p)?.to_string()),
            None => None,
        };
        let url = match row.url {
            Some(ref u) => Some(cipher::decrypt_string(&field_key, u)?.to_string()),
            None => None,
        };
        Ok((username, password, url, row.connection_type, row.connection_config))
    })?;

    // Step 1: Copy username to clipboard
    if let Some(ref user) = username {
        use tauri_plugin_clipboard_manager::ClipboardExt;
        app.clipboard()
            .write_text(user)
            .map_err(|e| AppError::Io(format!("Clipboard failed: {}", e)))?;
    }

    // Step 2: Open the URL/file/command
    if let Some(ref conn_type) = connection_type {
        match conn_type.as_str() {
            "web" => {
                if let Some(ref url) = url {
                    open_url(url.clone(), app.clone()).await?;
                }
            }
            "rdp" | "ssh" | "file" => {
                if let Some(ref config) = connection_config {
                    let decrypted = cipher::decrypt_string(&field_key, config)?.to_string();
                    // Parse config JSON to get file path
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&decrypted) {
                        if let Some(path) = parsed.get("path").and_then(|v| v.as_str()) {
                            open_file(path.to_string()).await?;
                        }
                    }
                }
            }
            "command" => {
                if let Some(ref config) = connection_config {
                    let decrypted = cipher::decrypt_string(&field_key, config)?.to_string();
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&decrypted) {
                        let cmd = parsed.get("command").and_then(|v| v.as_str()).unwrap_or("");
                        let args: Vec<String> = parsed
                            .get("args")
                            .and_then(|v| v.as_array())
                            .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                            .unwrap_or_default();
                        execute_command(cmd.to_string(), args).await?;
                    }
                }
            }
            _ => {
                if let Some(ref url) = url {
                    open_url(url.clone(), app.clone()).await?;
                }
            }
        }
    } else if let Some(ref url) = url {
        open_url(url.clone(), app.clone()).await?;
    }

    // Step 3: After a delay, copy password
    if let Some(pass) = password {
        let app_handle = app.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            use tauri_plugin_clipboard_manager::ClipboardExt;
            let _ = app_handle.clipboard().write_text(&pass);

            // Auto-clear after 15 seconds
            tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;
            let _ = app_handle.clipboard().write_text("");
        });
    }

    Ok(())
}
