use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, AeadCore, Nonce,
};
use zeroize::Zeroizing;

use crate::errors::AppError;

const NONCE_SIZE: usize = 12;

/// Encrypt plaintext using AES-256-GCM.
/// Returns nonce (12 bytes) prepended to ciphertext.
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, AppError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Crypto(format!("Invalid key: {}", e)))?;

    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|_| AppError::Crypto("Encryption failed".into()))?;

    let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Decrypt data that was encrypted with `encrypt`.
/// Expects nonce (12 bytes) prepended to ciphertext.
pub fn decrypt(key: &[u8; 32], data: &[u8]) -> Result<Zeroizing<Vec<u8>>, AppError> {
    if data.len() < NONCE_SIZE {
        return Err(AppError::Crypto("Ciphertext too short".into()));
    }

    let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Crypto(format!("Invalid key: {}", e)))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::Crypto("Decryption failed — wrong key or corrupted data".into()))?;

    Ok(Zeroizing::new(plaintext))
}

/// Encrypt a UTF-8 string, returning base64-encoded ciphertext.
pub fn encrypt_string(key: &[u8; 32], plaintext: &str) -> Result<String, AppError> {
    let encrypted = encrypt(key, plaintext.as_bytes())?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &encrypted,
    ))
}

/// Decrypt a base64-encoded ciphertext back to a UTF-8 string.
pub fn decrypt_string(key: &[u8; 32], encoded: &str) -> Result<Zeroizing<String>, AppError> {
    let data = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        encoded,
    )
    .map_err(|e| AppError::Crypto(format!("Invalid base64: {}", e)))?;

    let plaintext_bytes = decrypt(key, &data)?;
    let plaintext = String::from_utf8(plaintext_bytes.to_vec())
        .map_err(|e| AppError::Crypto(format!("Invalid UTF-8: {}", e)))?;

    Ok(Zeroizing::new(plaintext))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = [0xABu8; 32];
        let plaintext = b"Hello, LockGrid!";

        let encrypted = encrypt(&key, plaintext).unwrap();
        assert_ne!(&encrypted[NONCE_SIZE..], plaintext);

        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted.as_slice(), plaintext);
    }

    #[test]
    fn test_string_encrypt_decrypt() {
        let key = [0xCDu8; 32];
        let plaintext = "my-secret-password-123!@#";

        let encrypted = encrypt_string(&key, plaintext).unwrap();
        assert_ne!(&encrypted, plaintext);

        let decrypted = decrypt_string(&key, &encrypted).unwrap();
        assert_eq!(decrypted.as_str(), plaintext);
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = [0xAAu8; 32];
        let key2 = [0xBBu8; 32];
        let plaintext = b"secret data";

        let encrypted = encrypt(&key1, plaintext).unwrap();
        assert!(decrypt(&key2, &encrypted).is_err());
    }
}
