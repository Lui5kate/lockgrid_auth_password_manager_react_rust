use zeroize::{Zeroize, Zeroizing};

/// A wrapper for sensitive byte arrays that zeroizes on drop.
pub type SecureKey = Zeroizing<[u8; 32]>;

/// Create a new zeroed secure key.
pub fn new_secure_key() -> SecureKey {
    Zeroizing::new([0u8; 32])
}

/// Zeroize a mutable byte slice in place.
pub fn zeroize_bytes(data: &mut [u8]) {
    data.zeroize();
}

/// Zeroize a String in place.
pub fn zeroize_string(data: &mut String) {
    data.zeroize();
}
