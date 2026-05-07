use rusqlite::Connection;

use crate::errors::AppError;

/// Current schema version
const CURRENT_VERSION: i32 = 1;

/// Run all pending migrations on the database.
pub fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    // Create version tracking table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL
        );",
    )?;

    let current: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 1 {
        migrate_v1(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "
        -- Master authentication (singleton row)
        CREATE TABLE IF NOT EXISTS master_auth (
            id              INTEGER PRIMARY KEY CHECK (id = 1),
            password_hash   TEXT    NOT NULL,
            salt            BLOB   NOT NULL,
            pin_hash        TEXT,
            pin_salt        BLOB,
            created_at      TEXT    NOT NULL,
            updated_at      TEXT    NOT NULL
        );

        -- Categories for organizing credentials
        CREATE TABLE IF NOT EXISTS categories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            icon        TEXT NOT NULL DEFAULT 'folder',
            color       TEXT NOT NULL DEFAULT '#4c6ef5',
            sort_order  INTEGER NOT NULL DEFAULT 0,
            parent_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        -- Main credentials table
        CREATE TABLE IF NOT EXISTS credentials (
            id                TEXT PRIMARY KEY,
            title             TEXT NOT NULL,
            username          TEXT,
            password          TEXT,
            url               TEXT,
            notes_plain       TEXT,
            category_id       TEXT REFERENCES categories(id) ON DELETE SET NULL,
            is_favorite       INTEGER NOT NULL DEFAULT 0,
            icon_url          TEXT,
            connection_type   TEXT CHECK (connection_type IN ('web', 'rdp', 'ssh', 'file', 'command')),
            connection_config TEXT,
            totp_secret       TEXT,
            sort_order        INTEGER NOT NULL DEFAULT 0,
            created_at        TEXT NOT NULL,
            updated_at        TEXT NOT NULL,
            deleted_at        TEXT
        );

        -- Custom fields per credential
        CREATE TABLE IF NOT EXISTS custom_fields (
            id              TEXT PRIMARY KEY,
            credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
            field_name      TEXT NOT NULL,
            field_value     TEXT NOT NULL,
            field_type      TEXT NOT NULL DEFAULT 'text'
                            CHECK (field_type IN ('text', 'password', 'url', 'email', 'textarea')),
            sort_order      INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL
        );

        -- Tags
        CREATE TABLE IF NOT EXISTS tags (
            id      TEXT PRIMARY KEY,
            name    TEXT NOT NULL UNIQUE,
            color   TEXT DEFAULT '#868e96'
        );

        -- Junction: credentials <-> tags
        CREATE TABLE IF NOT EXISTS credential_tags (
            credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
            tag_id          TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (credential_id, tag_id)
        );

        -- Credential change history
        CREATE TABLE IF NOT EXISTS credential_history (
            id              TEXT PRIMARY KEY,
            credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
            field_name      TEXT NOT NULL,
            old_value       TEXT,
            new_value       TEXT,
            changed_at      TEXT NOT NULL
        );

        -- File attachments
        CREATE TABLE IF NOT EXISTS attachments (
            id              TEXT PRIMARY KEY,
            credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
            filename        TEXT NOT NULL,
            mime_type       TEXT NOT NULL,
            data            BLOB NOT NULL,
            thumbnail       BLOB,
            size_bytes      INTEGER NOT NULL,
            created_at      TEXT NOT NULL
        );

        -- User settings (key-value store)
        CREATE TABLE IF NOT EXISTS user_settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_credentials_category
            ON credentials(category_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_credentials_favorite
            ON credentials(is_favorite) WHERE deleted_at IS NULL AND is_favorite = 1;
        CREATE INDEX IF NOT EXISTS idx_credentials_deleted
            ON credentials(deleted_at) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_custom_fields_credential
            ON custom_fields(credential_id);
        CREATE INDEX IF NOT EXISTS idx_credential_tags_tag
            ON credential_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_credential_history_credential
            ON credential_history(credential_id);
        CREATE INDEX IF NOT EXISTS idx_attachments_credential
            ON attachments(credential_id);

        -- Record schema version
        INSERT INTO schema_version (version) VALUES (1);

        -- Insert default categories
        INSERT INTO categories (id, name, icon, color, sort_order, created_at, updated_at)
        VALUES
            ('cat-web', 'Web', 'globe', '#4c6ef5', 0, datetime('now'), datetime('now')),
            ('cat-ssh', 'SSH / Servers', 'terminal', '#40c057', 1, datetime('now'), datetime('now')),
            ('cat-rdp', 'Remote Desktop', 'monitor', '#fab005', 2, datetime('now'), datetime('now')),
            ('cat-database', 'Databases', 'database', '#e64980', 3, datetime('now'), datetime('now')),
            ('cat-email', 'Email', 'mail', '#7950f2', 4, datetime('now'), datetime('now')),
            ('cat-api', 'APIs & Tokens', 'key', '#fd7e14', 5, datetime('now'), datetime('now')),
            ('cat-other', 'Other', 'folder', '#868e96', 6, datetime('now'), datetime('now'));

        -- Insert default settings
        INSERT INTO user_settings (key, value, updated_at)
        VALUES
            ('theme', '\"system\"', datetime('now')),
            ('auto_lock_minutes', '5', datetime('now')),
            ('clipboard_clear_seconds', '15', datetime('now')),
            ('compact_mode', 'false', datetime('now')),
            ('language', '\"en\"', datetime('now'));
        ",
    )?;

    Ok(())
}
