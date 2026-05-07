use tauri::State;
use uuid::Uuid;

use crate::crypto::cipher;
use crate::db::models::*;
use crate::db::queries::{credentials as cred_queries, tags as tag_queries};
use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn create_credential(
    input: CreateCredentialInput,
    state: State<'_, AppState>,
) -> Result<Credential, AppError> {
    let field_key = state.get_field_key()?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Encrypt sensitive fields
    let enc_title = cipher::encrypt_string(&field_key, &input.title)?;
    let enc_username = encrypt_optional(&field_key, input.username.as_deref())?;
    let enc_password = encrypt_optional(&field_key, input.password.as_deref())?;
    let enc_url = encrypt_optional(&field_key, input.url.as_deref())?;
    let enc_notes = encrypt_optional(&field_key, input.notes_plain.as_deref())?;
    let enc_conn_config = encrypt_optional(&field_key, input.connection_config.as_deref())?;
    let enc_totp = encrypt_optional(&field_key, input.totp_secret.as_deref())?;

    state.with_db(|conn| {
        cred_queries::insert_credential(
            conn,
            &id,
            &enc_title,
            enc_username.as_deref(),
            enc_password.as_deref(),
            enc_url.as_deref(),
            enc_notes.as_deref(),
            input.category_id.as_deref(),
            input.is_favorite,
            input.icon_url.as_deref(),
            input.connection_type.as_deref(),
            enc_conn_config.as_deref(),
            &now,
        )?;

        if let Some(ref secret) = enc_totp {
            conn.execute(
                "UPDATE credentials SET totp_secret = ?1 WHERE id = ?2",
                rusqlite::params![secret, id],
            )?;
        }

        // Insert custom fields
        for cf in input.custom_fields.iter() {
            let cf_id = Uuid::new_v4().to_string();
            let enc_name = cipher::encrypt_string(&field_key, &cf.field_name)?;
            let enc_value = cipher::encrypt_string(&field_key, &cf.field_value)?;
            cred_queries::insert_custom_field(
                conn, &cf_id, &id, &enc_name, &enc_value, &cf.field_type,
                cf.sort_order, &now,
            )?;
        }

        // Set tags
        if !input.tag_ids.is_empty() {
            tag_queries::set_credential_tags(conn, &id, &input.tag_ids)?;
        }

        Ok(())
    })?;

    // Return the created credential (decrypted)
    get_credential(id, state).await
}

#[tauri::command]
pub async fn get_credential(
    id: String,
    state: State<'_, AppState>,
) -> Result<Credential, AppError> {
    let field_key = state.get_field_key()?;

    state.with_db(|conn| {
        let row = cred_queries::get_credential_by_id(conn, &id)?;
        let custom_field_rows = cred_queries::get_custom_fields(conn, &id)?;
        let tags = tag_queries::get_tags_for_credential(conn, &id)?;

        // Decrypt fields
        let title = cipher::decrypt_string(&field_key, &row.title)?.to_string();
        let username = decrypt_optional(&field_key, row.username.as_deref())?;
        let password = decrypt_optional(&field_key, row.password.as_deref())?;
        let url = decrypt_optional(&field_key, row.url.as_deref())?;
        let notes_plain = decrypt_optional(&field_key, row.notes_plain.as_deref())?;
        let connection_config = decrypt_optional(&field_key, row.connection_config.as_deref())?;
        let totp_secret = decrypt_optional(&field_key, row.totp_secret.as_deref())?;

        let custom_fields: Vec<CustomField> = custom_field_rows
            .into_iter()
            .map(|cf| {
                Ok(CustomField {
                    id: cf.id,
                    field_name: cipher::decrypt_string(&field_key, &cf.field_name)?.to_string(),
                    field_value: cipher::decrypt_string(&field_key, &cf.field_value)?.to_string(),
                    field_type: cf.field_type,
                    sort_order: cf.sort_order,
                })
            })
            .collect::<Result<Vec<_>, AppError>>()?;

        Ok(Credential {
            id: row.id,
            title,
            username,
            password,
            url,
            notes_plain,
            category_id: row.category_id,
            is_favorite: row.is_favorite,
            icon_url: row.icon_url,
            connection_type: row.connection_type,
            connection_config,
            totp_secret,
            sort_order: row.sort_order,
            tags,
            custom_fields,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    })
}

#[tauri::command]
pub async fn list_credentials(
    filter: CredentialFilter,
    state: State<'_, AppState>,
) -> Result<Vec<CredentialSummary>, AppError> {
    let field_key = state.get_field_key()?;

    state.with_db(|conn| {
        let rows = cred_queries::list_credentials_raw(
            conn,
            filter.category_id.as_deref(),
            filter.favorites_only,
        )?;

        let mut results: Vec<CredentialSummary> = Vec::new();

        for row in rows {
            let title = cipher::decrypt_string(&field_key, &row.title)?.to_string();
            let username = decrypt_optional(&field_key, row.username.as_deref())?;
            let url = decrypt_optional(&field_key, row.url.as_deref())?;
            let tags = tag_queries::get_tags_for_credential(conn, &row.id)?;

            // Apply search filter (on decrypted data)
            if let Some(ref query) = filter.search_query {
                let q = query.to_lowercase();
                let matches = title.to_lowercase().contains(&q)
                    || username.as_deref().unwrap_or("").to_lowercase().contains(&q)
                    || url.as_deref().unwrap_or("").to_lowercase().contains(&q);
                if !matches {
                    continue;
                }
            }

            // Apply tag filter
            if let Some(ref tag_id) = filter.tag_id {
                if !tags.iter().any(|t| &t.id == tag_id) {
                    continue;
                }
            }

            results.push(CredentialSummary {
                id: row.id,
                title,
                username,
                url,
                category_id: row.category_id,
                is_favorite: row.is_favorite,
                icon_url: row.icon_url,
                connection_type: row.connection_type,
                tags,
                created_at: row.created_at,
                updated_at: row.updated_at,
            });
        }

        Ok(results)
    })
}

#[tauri::command]
pub async fn update_credential(
    id: String,
    input: UpdateCredentialInput,
    state: State<'_, AppState>,
) -> Result<Credential, AppError> {
    let field_key = state.get_field_key()?;
    let now = chrono::Utc::now().to_rfc3339();

    state.with_db(|conn| {
        // Get current state for history
        let current = cred_queries::get_credential_by_id(conn, &id)?;

        // Helper: decrypt the currently stored encrypted value back to plaintext.
        // Returns an empty string when the column was NULL so comparisons are trivial.
        let decrypt_current = |value: Option<&str>| -> Result<String, AppError> {
            match value {
                Some(v) if !v.is_empty() => {
                    Ok(cipher::decrypt_string(&field_key, v)?.to_string())
                }
                _ => Ok(String::new()),
            }
        };

        // Update each field if provided, recording history ONLY when the plaintext changed.
        if let Some(ref title) = input.title {
            let old_plain = decrypt_current(Some(&current.title))?;
            if *title != old_plain {
                let encrypted = cipher::encrypt_string(&field_key, title)?;
                record_history(conn, &field_key, &id, "title", Some(&old_plain), title, &now)?;
                cred_queries::update_credential_field(conn, &id, "title", Some(&encrypted), &now)?;
            }
        }

        if let Some(ref username) = input.username {
            let old_plain = decrypt_current(current.username.as_deref())?;
            if *username != old_plain {
                let encrypted = cipher::encrypt_string(&field_key, username)?;
                record_history(conn, &field_key, &id, "username", Some(&old_plain), username, &now)?;
                cred_queries::update_credential_field(conn, &id, "username", Some(&encrypted), &now)?;
            }
        }

        if let Some(ref password) = input.password {
            let old_plain = decrypt_current(current.password.as_deref())?;
            if *password != old_plain {
                let encrypted = cipher::encrypt_string(&field_key, password)?;
                record_history(conn, &field_key, &id, "password", Some(&old_plain), password, &now)?;
                cred_queries::update_credential_field(conn, &id, "password", Some(&encrypted), &now)?;
            }
        }

        if let Some(ref url) = input.url {
            let old_plain = decrypt_current(current.url.as_deref())?;
            if *url != old_plain {
                let encrypted = cipher::encrypt_string(&field_key, url)?;
                record_history(conn, &field_key, &id, "url", Some(&old_plain), url, &now)?;
                cred_queries::update_credential_field(conn, &id, "url", Some(&encrypted), &now)?;
            }
        }

        if let Some(ref notes) = input.notes_plain {
            let old_plain = decrypt_current(current.notes_plain.as_deref())?;
            if *notes != old_plain {
                let encrypted = cipher::encrypt_string(&field_key, notes)?;
                cred_queries::update_credential_field(conn, &id, "notes_plain", Some(&encrypted), &now)?;
            }
        }

        if let Some(ref cat_id) = input.category_id {
            cred_queries::update_credential_field(conn, &id, "category_id", Some(cat_id), &now)?;
        }

        if let Some(is_fav) = input.is_favorite {
            let val = if is_fav { "1" } else { "0" };
            cred_queries::update_credential_field(conn, &id, "is_favorite", Some(val), &now)?;
        }

        if let Some(ref conn_type) = input.connection_type {
            cred_queries::update_credential_field(conn, &id, "connection_type", Some(conn_type), &now)?;
        }

        if let Some(ref conn_config) = input.connection_config {
            let encrypted = cipher::encrypt_string(&field_key, conn_config)?;
            cred_queries::update_credential_field(conn, &id, "connection_config", Some(&encrypted), &now)?;
        }

        if let Some(ref totp) = input.totp_secret {
            if totp.is_empty() {
                cred_queries::update_credential_field(conn, &id, "totp_secret", None, &now)?;
            } else {
                let encrypted = cipher::encrypt_string(&field_key, totp)?;
                cred_queries::update_credential_field(conn, &id, "totp_secret", Some(&encrypted), &now)?;
            }
        }

        // Update tags if provided
        if let Some(ref tag_ids) = input.tag_ids {
            tag_queries::set_credential_tags(conn, &id, tag_ids)?;
        }

        // Update custom fields if provided
        if let Some(ref custom_fields) = input.custom_fields {
            cred_queries::delete_custom_fields_for_credential(conn, &id)?;
            for cf in custom_fields {
                let cf_id = Uuid::new_v4().to_string();
                let enc_name = cipher::encrypt_string(&field_key, &cf.field_name)?;
                let enc_value = cipher::encrypt_string(&field_key, &cf.field_value)?;
                cred_queries::insert_custom_field(
                    conn, &cf_id, &id, &enc_name, &enc_value, &cf.field_type,
                    cf.sort_order, &now,
                )?;
            }
        }

        Ok(())
    })?;

    get_credential(id, state).await
}

#[tauri::command]
pub async fn delete_credential(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    state.with_db(|conn| cred_queries::soft_delete_credential(conn, &id, &now))
}

#[tauri::command]
pub async fn get_credential_history(
    credential_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<HistoryEntry>, AppError> {
    let field_key = state.get_field_key()?;
    state.with_db(|conn| {
        let raw = cred_queries::get_history(conn, &credential_id)?;
        let mut out = Vec::with_capacity(raw.len());
        for entry in raw {
            // Password history is kept encrypted on disk but also masked here —
            // we only expose a redacted marker and the timestamp. Other fields
            // are decrypted for display.
            let redact_value = entry.field_name == "password";
            let old_value = match entry.old_value.as_deref() {
                Some(_) if redact_value => Some("••••••••••••".to_string()),
                Some(v) => decrypt_optional(&field_key, Some(v))?,
                None => None,
            };
            let new_value = match entry.new_value.as_deref() {
                Some(_) if redact_value => Some("••••••••••••".to_string()),
                Some(v) => decrypt_optional(&field_key, Some(v))?,
                None => None,
            };
            out.push(HistoryEntry {
                id: entry.id,
                credential_id: entry.credential_id,
                field_name: entry.field_name,
                old_value,
                new_value,
                changed_at: entry.changed_at,
            });
        }
        Ok(out)
    })
}

#[tauri::command]
pub async fn generate_password(
    config: crate::crypto::password_gen::PasswordGenConfig,
) -> Result<String, AppError> {
    Ok(crate::crypto::password_gen::generate_password(&config))
}

#[tauri::command]
pub async fn calculate_password_strength(password: String) -> Result<u32, AppError> {
    Ok(crate::crypto::password_gen::calculate_strength(&password))
}

// ── Helpers ──

fn encrypt_optional(key: &[u8; 32], value: Option<&str>) -> Result<Option<String>, AppError> {
    match value {
        Some(v) if !v.is_empty() => Ok(Some(cipher::encrypt_string(key, v)?)),
        _ => Ok(None),
    }
}

fn decrypt_optional(key: &[u8; 32], value: Option<&str>) -> Result<Option<String>, AppError> {
    match value {
        Some(v) if !v.is_empty() => Ok(Some(cipher::decrypt_string(key, v)?.to_string())),
        _ => Ok(None),
    }
}

fn record_history(
    conn: &rusqlite::Connection,
    field_key: &[u8; 32],
    credential_id: &str,
    field_name: &str,
    old_plain: Option<&str>,
    new_plain: &str,
    now: &str,
) -> Result<(), AppError> {
    let history_id = Uuid::new_v4().to_string();
    let old_encrypted = match old_plain {
        Some(v) => Some(cipher::encrypt_string(field_key, v)?),
        None => None,
    };
    let new_encrypted = cipher::encrypt_string(field_key, new_plain)?;
    cred_queries::insert_history(
        conn,
        &history_id,
        credential_id,
        field_name,
        old_encrypted.as_deref(),
        Some(&new_encrypted),
        now,
    )
}
