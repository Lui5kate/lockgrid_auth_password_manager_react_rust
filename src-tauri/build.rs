fn main() {
    // Add OpenSSL lib directory to linker search path
    println!("cargo:rustc-link-search=native=C:\\Program Files\\OpenSSL-Win64\\lib\\VC\\x64\\MD");
    tauri_build::build()
}
