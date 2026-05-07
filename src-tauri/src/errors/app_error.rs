use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("Application is locked")]
    Locked,

    #[error("Invalid master password")]
    InvalidPassword,

    #[error("Invalid PIN")]
    InvalidPin,

    #[error("Database error: {0}")]
    Database(String),

    #[error("Encryption error: {0}")]
    Crypto(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Already initialized")]
    AlreadyInitialized,

    #[error("Not initialized — please set up a master password")]
    NotInitialized,

    #[error("Validation error: {0}")]
    Validation(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<aes_gcm::Error> for AppError {
    fn from(_: aes_gcm::Error) -> Self {
        AppError::Crypto("AES-GCM encryption/decryption failed".into())
    }
}

impl From<argon2::Error> for AppError {
    fn from(e: argon2::Error) -> Self {
        AppError::Crypto(format!("Argon2 error: {}", e))
    }
}

impl From<argon2::password_hash::Error> for AppError {
    fn from(e: argon2::password_hash::Error) -> Self {
        AppError::Crypto(format!("Password hash error: {}", e))
    }
}
