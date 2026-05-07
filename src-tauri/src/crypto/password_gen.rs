use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct PasswordGenConfig {
    pub length: usize,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub symbols: bool,
    pub exclude_ambiguous: bool,
}

impl Default for PasswordGenConfig {
    fn default() -> Self {
        Self {
            length: 20,
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true,
            exclude_ambiguous: false,
        }
    }
}

const UPPERCASE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const UPPERCASE_UNAMBIGUOUS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const LOWERCASE_UNAMBIGUOUS: &[u8] = b"abcdefghjkmnpqrstuvwxyz";
const NUMBERS: &[u8] = b"0123456789";
const NUMBERS_UNAMBIGUOUS: &[u8] = b"23456789";
const SYMBOLS: &[u8] = b"!@#$%^&*()-_=+[]{}|;:,.<>?";

pub fn generate_password(config: &PasswordGenConfig) -> String {
    let mut charset = Vec::new();

    if config.uppercase {
        charset.extend_from_slice(if config.exclude_ambiguous {
            UPPERCASE_UNAMBIGUOUS
        } else {
            UPPERCASE
        });
    }
    if config.lowercase {
        charset.extend_from_slice(if config.exclude_ambiguous {
            LOWERCASE_UNAMBIGUOUS
        } else {
            LOWERCASE
        });
    }
    if config.numbers {
        charset.extend_from_slice(if config.exclude_ambiguous {
            NUMBERS_UNAMBIGUOUS
        } else {
            NUMBERS
        });
    }
    if config.symbols {
        charset.extend_from_slice(SYMBOLS);
    }

    if charset.is_empty() {
        charset.extend_from_slice(LOWERCASE);
        charset.extend_from_slice(NUMBERS);
    }

    let length = config.length.clamp(4, 128);
    let mut rng = rand::thread_rng();

    let password: String = (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset.len());
            charset[idx] as char
        })
        .collect();

    password
}

/// Calculate password strength score (0-100).
pub fn calculate_strength(password: &str) -> u32 {
    let len = password.len();
    if len == 0 {
        return 0;
    }

    let mut score: u32 = 0;

    // Length contribution (up to 40 points)
    score += (len as u32 * 3).min(40);

    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_symbol = password.chars().any(|c| !c.is_ascii_alphanumeric());

    let variety = [has_lower, has_upper, has_digit, has_symbol]
        .iter()
        .filter(|&&v| v)
        .count();

    // Variety contribution (up to 40 points)
    score += (variety as u32) * 10;

    // Unique character ratio (up to 20 points)
    let unique: std::collections::HashSet<char> = password.chars().collect();
    let ratio = unique.len() as f64 / len as f64;
    score += (ratio * 20.0) as u32;

    score.min(100)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_password_length() {
        let config = PasswordGenConfig {
            length: 24,
            ..Default::default()
        };
        let pw = generate_password(&config);
        assert_eq!(pw.len(), 24);
    }

    #[test]
    fn test_strength_empty() {
        assert_eq!(calculate_strength(""), 0);
    }

    #[test]
    fn test_strength_strong() {
        let score = calculate_strength("Tr0ub4dor&3!xYz");
        assert!(score >= 70);
    }
}
