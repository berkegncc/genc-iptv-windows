//! DPAPI-backed credential encryption for Xtream username/password at rest.
//!
//! `encrypt` returns a tagged, base64-encoded DPAPI blob prefixed with
//! `"dpapi:v1:"`.  `decrypt` accepts either a tagged blob (decrypts with DPAPI)
//! or a bare legacy plaintext string (passes through unchanged — important for
//! migrating existing databases without bricking them).
//!
//! # Non-portability
//! DPAPI (`CryptProtectData` / `CryptUnprotectData`) is a Windows-only API that
//! binds the ciphertext to the current Windows user account *and* machine.
//! There is no portable equivalent; the product is Windows-only at runtime.
//! The non-Windows arm below compiles and passes through, but credentials are
//! stored in plaintext on non-Windows builds (which we never ship).

/// Every DPAPI ciphertext stored in the DB is prefixed with this tag so we can
/// distinguish encrypted values from legacy plaintext during migration and
/// during the legacy passthrough in `decrypt`.
const TAG: &str = "dpapi:v1:";

// ─── Windows arm ─────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod imp {
    use super::TAG;
    use anyhow::Context;
    use base64::Engine as _;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB,
    };

    pub fn encrypt(plaintext: &str) -> anyhow::Result<String> {
        let bytes = plaintext.as_bytes();
        let mut in_blob = CRYPT_INTEGER_BLOB {
            cbData: bytes.len() as u32,
            pbData: bytes.as_ptr() as *mut u8,
        };
        let mut out_blob = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        // SAFETY: CryptProtectData is a thread-safe Win32 API. `in_blob` is
        // valid for the duration of the call. `out_blob.pbData` is allocated by
        // the OS and must be freed with LocalFree once we have copied its bytes.
        let ok = unsafe {
            CryptProtectData(
                &mut in_blob,
                std::ptr::null(),    // pwszDataDescr — optional label, unused
                std::ptr::null_mut(), // pOptionalEntropy — none
                std::ptr::null_mut(), // pvReserved — must be NULL
                std::ptr::null_mut(), // pPromptStruct — no UI prompt
                0,                    // dwFlags = 0 → CurrentUser scope (NOT LOCAL_MACHINE)
                &mut out_blob,
            )
        };

        if ok == 0 {
            anyhow::bail!("DPAPI encrypt failed");
        }

        // Copy the encrypted bytes out before freeing the OS buffer.
        let encrypted: Vec<u8> = unsafe {
            // SAFETY: out_blob.pbData points to cbData valid bytes allocated by
            // CryptProtectData. We copy them immediately then LocalFree the ptr.
            std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize).to_vec()
        };

        // SAFETY: out_blob.pbData was allocated by CryptProtectData and must be
        // freed with LocalFree. We never use the pointer again after this call.
        unsafe {
            LocalFree(out_blob.pbData as _);
        }

        let b64 = base64::engine::general_purpose::STANDARD.encode(&encrypted);
        Ok(format!("{TAG}{b64}"))
    }

    pub fn decrypt(stored: &str) -> anyhow::Result<String> {
        // Legacy plaintext passthrough — existing untagged values are returned
        // as-is so the app keeps working before the migration runs.
        if !stored.starts_with(TAG) {
            return Ok(stored.to_string());
        }

        let b64 = &stored[TAG.len()..];
        let ciphertext = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .context("DPAPI: base64 decode failed")?;

        let mut in_blob = CRYPT_INTEGER_BLOB {
            cbData: ciphertext.len() as u32,
            pbData: ciphertext.as_ptr() as *mut u8,
        };
        let mut out_blob = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        // SAFETY: CryptUnprotectData is a thread-safe Win32 API. `in_blob` is
        // valid for the duration of the call. `out_blob.pbData` is allocated by
        // the OS (if the call succeeds) and must be freed with LocalFree.
        let ok = unsafe {
            CryptUnprotectData(
                &mut in_blob,
                std::ptr::null_mut(), // ppszDataDescr — optional, we don't need it
                std::ptr::null_mut(), // pOptionalEntropy — must match encrypt call (none)
                std::ptr::null_mut(), // pvReserved — must be NULL
                std::ptr::null_mut(), // pPromptStruct — no UI prompt
                0,                    // dwFlags
                &mut out_blob,
            )
        };

        if ok == 0 {
            // This covers tampered ciphertext, wrong user/machine, or corrupt data.
            anyhow::bail!("DPAPI decrypt failed (tampered, wrong user, or wrong machine)");
        }

        let plaintext_bytes: Vec<u8> = unsafe {
            // SAFETY: out_blob.pbData points to cbData valid bytes allocated by
            // CryptUnprotectData. We copy them immediately then LocalFree the ptr.
            std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize).to_vec()
        };

        // SAFETY: out_blob.pbData was allocated by CryptUnprotectData and must
        // be freed with LocalFree. We never use the pointer again after this call.
        unsafe {
            LocalFree(out_blob.pbData as _);
        }

        String::from_utf8(plaintext_bytes).context("DPAPI decrypt: invalid UTF-8 in plaintext")
    }
}

// ─── Non-Windows passthrough arm ─────────────────────────────────────────────

#[cfg(not(target_os = "windows"))]
mod imp {
    /// Non-Windows passthrough. DPAPI has no portable equivalent; this product
    /// is Windows-only at runtime so this arm exists only to keep `cargo check`
    /// green on non-Windows CI. Credentials are NOT encrypted on this path.
    pub fn encrypt(plaintext: &str) -> anyhow::Result<String> {
        Ok(plaintext.to_string())
    }

    /// Non-Windows passthrough. Returns the stored value unchanged.
    pub fn decrypt(stored: &str) -> anyhow::Result<String> {
        Ok(stored.to_string())
    }
}

// ─── Public surface ───────────────────────────────────────────────────────────

/// Encrypt a plaintext credential string. On Windows, returns a
/// `"dpapi:v1:<base64>"` string bound to the current user/machine. On other
/// platforms returns the input unchanged (passthrough, product is Windows-only).
pub fn encrypt(plaintext: &str) -> anyhow::Result<String> {
    imp::encrypt(plaintext)
}

/// Decrypt a credential string. Accepts either:
/// - A `"dpapi:v1:<base64>"` tagged blob — decrypts with DPAPI.
/// - A bare legacy plaintext string (no tag) — returned as-is (migration
///   passthrough so existing rows keep working before the startup migration runs).
pub fn decrypt(stored: &str) -> anyhow::Result<String> {
    imp::decrypt(stored)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;

    #[test]
    fn round_trip_normal_password() {
        let plaintext = "my_secret_password";
        let enc = encrypt(plaintext).expect("encrypt should succeed");
        let dec = decrypt(&enc).expect("decrypt should succeed");
        assert_eq!(dec, plaintext);
    }

    #[test]
    fn encrypted_value_has_tag() {
        let enc = encrypt("x").expect("encrypt should succeed");
        assert!(
            enc.starts_with("dpapi:v1:"),
            "encrypted value should start with dpapi:v1: tag, got: {enc}"
        );
    }

    #[test]
    fn legacy_plaintext_passthrough() {
        // A bare untagged string (legacy DB row) must pass through unchanged.
        let legacy = "plainuser";
        let result = decrypt(legacy).expect("decrypt of legacy plaintext should succeed");
        assert_eq!(result, legacy);
    }

    #[test]
    fn tampered_ciphertext_returns_error() {
        let enc = encrypt("some_password").expect("encrypt should succeed");
        // Corrupt a character in the middle of the base64 payload (after the tag).
        let tag_len = "dpapi:v1:".len();
        let mut corrupted = enc.clone();
        // Flip a character in the middle of the base64 blob.
        let mid = tag_len + (enc.len() - tag_len) / 2;
        let ch = corrupted.chars().nth(mid).unwrap();
        let replacement = if ch == 'A' { 'B' } else { 'A' };
        corrupted.replace_range(mid..mid + 1, &replacement.to_string());
        assert!(
            decrypt(&corrupted).is_err(),
            "decrypting tampered ciphertext should fail"
        );
    }

    #[test]
    fn empty_string_round_trips() {
        let enc = encrypt("").expect("encrypt empty string should succeed");
        let dec = decrypt(&enc).expect("decrypt empty string should succeed");
        assert_eq!(dec, "");
    }
}
