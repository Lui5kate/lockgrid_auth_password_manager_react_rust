use serde::{Deserialize, Serialize};

// ── Auth ──

#[derive(Debug, Serialize, Deserialize)]
pub struct MasterAuth {
    pub password_hash: String,
    pub salt: Vec<u8>,
    pub pin_hash: Option<String>,
    pub pin_salt: Option<Vec<u8>>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Categories ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub sort_order: i32,
    pub parent_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Credentials ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credential {
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
    pub sort_order: i32,
    pub tags: Vec<Tag>,
    pub custom_fields: Vec<CustomField>,
    pub created_at: String,
    pub updated_at: String,
}

/// Summary view for lists (no password, no notes)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialSummary {
    pub id: String,
    pub title: String,
    pub username: Option<String>,
    pub url: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: bool,
    pub icon_url: Option<String>,
    pub connection_type: Option<String>,
    pub tags: Vec<Tag>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCredentialInput {
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
    pub custom_fields: Vec<CreateCustomFieldInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCredentialInput {
    pub title: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes_plain: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: Option<bool>,
    pub icon_url: Option<String>,
    pub connection_type: Option<String>,
    pub connection_config: Option<String>,
    pub totp_secret: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub custom_fields: Option<Vec<CreateCustomFieldInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialFilter {
    pub category_id: Option<String>,
    pub tag_id: Option<String>,
    pub favorites_only: bool,
    pub search_query: Option<String>,
}

// ── Custom Fields ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomField {
    pub id: String,
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomFieldInput {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
    pub sort_order: i32,
}

// ── Tags ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

// ── History ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub credential_id: String,
    pub field_name: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub changed_at: String,
}

// ── Attachments ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub credential_id: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub created_at: String,
}

// ── Settings ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub theme: String,
    pub auto_lock_minutes: u32,
    pub clipboard_clear_seconds: u32,
    pub compact_mode: bool,
    pub language: String,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 15,
            compact_mode: false,
            language: "en".to_string(),
        }
    }
}
