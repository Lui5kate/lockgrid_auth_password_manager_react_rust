use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Algorithm, Params, Version,
};
use zeroize::Zeroizing;

use crate::errors::AppError;

const MEMORY_COST_KIB: u32 = 65536; // 64 MiB
const TIME_COST: u32 = 3;
const PARALLELISM: u32 = 4;
const OUTPUT_LEN: usize = 32;

fn argon2_instance() -> Argon2<'static> {
    let params = Params::new(MEMORY_COST_KIB, TIME_COST, PARALLELISM, Some(OUTPUT_LEN))
        .expect("valid Argon2 params");
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
}

/// Derive a 32-byte encryption key from a password using Argon2id.
/// The `context` parameter differentiates keys (e.g., "db-key" vs "field-key").
pub fn derive_key(
    password: &[u8],
    salt: &[u8; 32],
    context: &[u8],
) -> Result<Zeroizing<[u8; 32]>, AppError> {
    let argon2 = argon2_instance();

    let mut combined_salt = [0u8; 32];
    for i in 0..32 {
        combined_salt[i] = salt[i] ^ context.get(i).copied().unwrap_or(0);
    }

    let mut output = Zeroizing::new([0u8; 32]);
    argon2
        .hash_password_into(password, &combined_salt, output.as_mut())
        .map_err(|e| AppError::Crypto(format!("Key derivation failed: {}", e)))?;

    Ok(output)
}

/// Hash a password for storage/verification using Argon2id with a random salt.
/// Returns the PHC-format hash string.
pub fn hash_password(password: &[u8]) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = argon2_instance();
    let hash = argon2
        .hash_password(password, &salt)?
        .to_string();
    Ok(hash)
}

/// Verify a password against a stored PHC-format hash string.
pub fn verify_password(password: &[u8], hash: &str) -> Result<bool, AppError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|e| AppError::Crypto(format!("Invalid hash: {}", e)))?;
    let argon2 = argon2_instance();
    Ok(argon2.verify_password(password, &parsed_hash).is_ok())
}

/// Generate a random 32-byte salt.
pub fn generate_salt() -> [u8; 32] {
    let mut salt = [0u8; 32];
    use rand::RngCore;
    OsRng.fill_bytes(&mut salt);
    salt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_deterministic() {
        let password = b"test-password";
        let salt = [42u8; 32];
        let context = b"test-context";

        let key1 = derive_key(password, &salt, context).unwrap();
        let key2 = derive_key(password, &salt, context).unwrap();
        assert_eq!(*key1, *key2);
    }

    #[test]
    fn test_different_contexts_yield_different_keys() {
        let password = b"test-password";
        let salt = [42u8; 32];

        let key1 = derive_key(password, &salt, b"db-key").unwrap();
        let key2 = derive_key(password, &salt, b"field-key").unwrap();
        assert_ne!(*key1, *key2);
    }

    #[test]
    fn test_hash_and_verify() {
        let password = b"my-secure-password";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password(b"wrong-password", &hash).unwrap());
    }
}
