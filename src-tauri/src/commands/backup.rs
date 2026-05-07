use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::crypto::{cipher, kdf};
use crate::db::queries::{credentials as cred_queries, tags as tag_queries};
use crate::errors::AppError;
use crate::state::AppState;

const BACKUP_MAGIC: &[u8; 4] = b"LGBK";
const BACKUP_VERSION: u32 = 2;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupData {
    pub version: u32,
    pub credentials: Vec<BackupCredential>,
    pub categories: Vec<BackupCategory>,
    pub tags: Vec<BackupTag>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupCredential {
    pub id: String,
    pub title: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes_plain: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: bool,
    pub icon_url: Option<String>,
    pub connection_type: Option<String>,
    pub connection_config: Option<String>,
    pub totp_secret: Option<String>,
    pub tag_ids: Vec<String>,
    pub custom_fields: Vec<BackupCustomField>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupCustomField {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupCategory {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub sort_order: i32,
    pub parent_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupTag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub credentials_imported: u32,
    pub credentials_skipped: u32,
    pub categories_imported: u32,
    pub tags_imported: u32,
}

#[tauri::command]
pub async fn export_backup(
    path: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let field_key = state.get_field_key()?;

    let data = state.with_db(|conn| {
        let credentials = collect_credentials(conn, &field_key)?;
        let categories = collect_categories(conn)?;
        let tags = tag_queries::list_tags(conn)?
            .into_iter()
            .map(|t| BackupTag {
                id: t.id,
                name: t.name,
                color: t.color,
            })
            .collect();

        Ok(BackupData {
            version: BACKUP_VERSION,
            credentials,
            categories,
            tags,
        })
    })?;

    let json = serde_json::to_vec(&data)
        .map_err(|e| AppError::Io(format!("Serialization failed: {}", e)))?;

    let salt = kdf::generate_salt();
    let backup_key = kdf::derive_key(password.as_bytes(), &salt, b"lockgrid-backup-key")?;
    let encrypted = cipher::encrypt(&backup_key, &json)?;

    let mut file_data = Vec::new();
    file_data.extend_from_slice(BACKUP_MAGIC);
    file_data.extend_from_slice(&BACKUP_VERSION.to_le_bytes());
    file_data.extend_from_slice(&salt);
    file_data.extend_from_slice(&encrypted);

    std::fs::write(&path, &file_data)?;
    Ok(())
}

#[tauri::command]
pub async fn import_backup(
    path: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<ImportResult, AppError> {
    let file_data = std::fs::read(&path)?;

    if file_data.len() < 40 || &file_data[0..4] != BACKUP_MAGIC {
        return Err(AppError::Validation("Invalid backup file format".into()));
    }

    let version = u32::from_le_bytes([file_data[4], file_data[5], file_data[6], file_data[7]]);
    if version != BACKUP_VERSION {
        return Err(AppError::Validation(format!(
            "Unsupported backup version {}. Expected {}.",
            version, BACKUP_VERSION
        )));
    }

    let mut salt = [0u8; 32];
    salt.copy_from_slice(&file_data[8..40]);
    let encrypted = &file_data[40..];

    let backup_key = kdf::derive_key(password.as_bytes(), &salt, b"lockgrid-backup-key")?;
    let decrypted = cipher::decrypt(&backup_key, encrypted)
        .map_err(|_| AppError::Validation("Invalid backup password or corrupted file".into()))?;

    let backup: BackupData = serde_json::from_slice(&decrypted)
        .map_err(|e| AppError::Io(format!("Invalid backup data: {}", e)))?;

    let field_key = state.get_field_key()?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut result = ImportResult {
        credentials_imported: 0,
        credentials_skipped: 0,
        categories_imported: 0,
        tags_imported: 0,
    };

    state.with_db(|conn| {
        // Merge categories (skip if id exists)
        for cat in &backup.categories {
            let exists: bool = conn
                .query_row(
                    "SELECT 1 FROM categories WHERE id = ?1",
                    rusqlite::params![cat.id],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if exists {
                continue;
            }
            conn.execute(
                "INSERT INTO categories (id, name, icon, color, sort_order, parent_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
                rusqlite::params![
                    cat.id, cat.name, cat.icon, cat.color, cat.sort_order, cat.parent_id, now
                ],
            )?;
            result.categories_imported += 1;
        }

        // Merge tags (skip if id exists or name collides)
        for tag in &backup.tags {
            let exists: bool = conn
                .query_row(
                    "SELECT 1 FROM tags WHERE id = ?1 OR name = ?2",
                    rusqlite::params![tag.id, tag.name],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if exists {
                continue;
            }
            tag_queries::insert_tag(conn, &tag.id, &tag.name, tag.color.as_deref())?;
            result.tags_imported += 1;
        }

        // Merge credentials (if id collides, generate new id)
        for cred in &backup.credentials {
            let id_exists: bool = conn
                .query_row(
                    "SELECT 1 FROM credentials WHERE id = ?1",
                    rusqlite::params![cred.id],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if id_exists {
                result.credentials_skipped += 1;
                continue;
            }

            let enc_title = cipher::encrypt_string(&field_key, &cred.title)?;
            let enc_username = encrypt_opt(&field_key, cred.username.as_deref())?;
            let enc_password = encrypt_opt(&field_key, cred.password.as_deref())?;
            let enc_url = encrypt_opt(&field_key, cred.url.as_deref())?;
            let enc_notes = encrypt_opt(&field_key, cred.notes_plain.as_deref())?;
            let enc_config = encrypt_opt(&field_key, cred.connection_config.as_deref())?;
            let enc_totp = encrypt_opt(&field_key, cred.totp_secret.as_deref())?;

            cred_queries::insert_credential(
                conn,
                &cred.id,
                &enc_title,
                enc_username.as_deref(),
                enc_password.as_deref(),
                enc_url.as_deref(),
                enc_notes.as_deref(),
                cred.category_id.as_deref(),
                cred.is_favorite,
                cred.icon_url.as_deref(),
                cred.connection_type.as_deref(),
                enc_config.as_deref(),
                &now,
            )?;

            if let Some(ref secret) = enc_totp {
                conn.execute(
                    "UPDATE credentials SET totp_secret = ?1 WHERE id = ?2",
                    rusqlite::params![secret, cred.id],
                )?;
            }

            for cf in &cred.custom_fields {
                let cf_id = Uuid::new_v4().to_string();
                let enc_name = cipher::encrypt_string(&field_key, &cf.field_name)?;
                let enc_value = cipher::encrypt_string(&field_key, &cf.field_value)?;
                cred_queries::insert_custom_field(
                    conn,
                    &cf_id,
                    &cred.id,
                    &enc_name,
                    &enc_value,
                    &cf.field_type,
                    cf.sort_order,
                    &now,
                )?;
            }

            if !cred.tag_ids.is_empty() {
                // Only attach tags that actually exist after merge
                let existing_tag_ids: Vec<String> = cred
                    .tag_ids
                    .iter()
                    .filter(|tid| {
                        conn.query_row(
                            "SELECT 1 FROM tags WHERE id = ?1",
                            rusqlite::params![tid],
                            |_| Ok(true),
                        )
                        .unwrap_or(false)
                    })
                    .cloned()
                    .collect();
                if !existing_tag_ids.is_empty() {
                    tag_queries::set_credential_tags(conn, &cred.id, &existing_tag_ids)?;
                }
            }

            result.credentials_imported += 1;
        }

        Ok(())
    })?;

    Ok(result)
}

// ── Helpers ──

fn collect_credentials(
    conn: &rusqlite::Connection,
    field_key: &[u8; 32],
) -> Result<Vec<BackupCredential>, AppError> {
    let rows = cred_queries::list_credentials_raw(conn, None, false)?;
    let mut out = Vec::with_capacity(rows.len());

    for row in rows {
        let title = cipher::decrypt_string(field_key, &row.title)?.to_string();
        let username = decrypt_opt(field_key, row.username.as_deref())?;
        let password = decrypt_opt(field_key, row.password.as_deref())?;
        let url = decrypt_opt(field_key, row.url.as_deref())?;
        let notes_plain = decrypt_opt(field_key, row.notes_plain.as_deref())?;
        let connection_config = decrypt_opt(field_key, row.connection_config.as_deref())?;
        let totp_secret = decrypt_opt(field_key, row.totp_secret.as_deref())?;

        let custom_field_rows = cred_queries::get_custom_fields(conn, &row.id)?;
        let mut custom_fields = Vec::with_capacity(custom_field_rows.len());
        for cf in custom_field_rows {
            custom_fields.push(BackupCustomField {
                field_name: cipher::decrypt_string(field_key, &cf.field_name)?.to_string(),
                field_value: cipher::decrypt_string(field_key, &cf.field_value)?.to_string(),
                field_type: cf.field_type,
                sort_order: cf.sort_order,
            });
        }

        let tags = tag_queries::get_tags_for_credential(conn, &row.id)?;
        let tag_ids = tags.into_iter().map(|t| t.id).collect();

        out.push(BackupCredential {
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
            tag_ids,
            custom_fields,
            created_at: row.created_at,
            updated_at: row.updated_at,
        });
    }

    Ok(out)
}

fn collect_categories(conn: &rusqlite::Connection) -> Result<Vec<BackupCategory>, AppError> {
    let cats = crate::db::queries::categories::list_categories(conn)?;
    Ok(cats
        .into_iter()
        .map(|c| BackupCategory {
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            sort_order: c.sort_order,
            parent_id: c.parent_id,
        })
        .collect())
}

fn encrypt_opt(key: &[u8; 32], v: Option<&str>) -> Result<Option<String>, AppError> {
    match v {
        Some(s) if !s.is_empty() => Ok(Some(cipher::encrypt_string(key, s)?)),
        _ => Ok(None),
    }
}

fn decrypt_opt(key: &[u8; 32], v: Option<&str>) -> Result<Option<String>, AppError> {
    match v {
        Some(s) if !s.is_empty() => Ok(Some(cipher::decrypt_string(key, s)?.to_string())),
        _ => Ok(None),
    }
}
