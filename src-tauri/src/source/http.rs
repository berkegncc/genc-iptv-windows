//! Shared HTTP client. Single reqwest instance with sane defaults; passed
//! around via `Arc` (reqwest::Client is already Arc-ed internally).
//!
//! Per-call User-Agent and trust-all-certs overrides come from playlist
//! settings (`Playlist.user_agent`) — the default client is used when no
//! override applies.

use anyhow::Result;
use once_cell::sync::OnceCell;
use reqwest::Client;
use std::time::Duration;

static SHARED_CLIENT: OnceCell<Client> = OnceCell::new();

/// Default User-Agent. IPTV providers sometimes block generic UAs (curl,
/// reqwest defaults), so we mimic VLC which is universally accepted.
pub const DEFAULT_USER_AGENT: &str =
    "VLC/3.0.20 LibVLC/3.0.20 GencIPTV/1.0 (Windows)";

/// Shared, default-configured HTTP client.
pub fn shared() -> &'static Client {
    SHARED_CLIENT.get_or_init(|| build_client(None, false).expect("default client"))
}

/// Build a fresh client with optional User-Agent override and SSL bypass.
/// Use for per-playlist requests where the default doesn't fit.
pub fn build_client(user_agent: Option<&str>, trust_all_certs: bool) -> Result<Client> {
    let mut builder = Client::builder()
        .user_agent(user_agent.unwrap_or(DEFAULT_USER_AGENT))
        .gzip(true)
        .timeout(Duration::from_secs(30))
        .pool_idle_timeout(Duration::from_secs(60));

    if trust_all_certs {
        builder = builder.danger_accept_invalid_certs(true);
    }

    Ok(builder.build()?)
}

/// Redact credentials from a URL before logging it. Never panics; on any
/// parse failure returns `"<redacted-url>"` so no raw credential leaks.
///
/// Masks:
/// - URL userinfo (`http://user:pass@host/…`)  → `***`
/// - Xtream-style path creds (`/live/<user>/<pass>/…`,
///   `/movie/<user>/<pass>/…`, `/series/<user>/<pass>/…`)
/// - Query params named `username` or `password`
pub fn sanitize_url(raw: &str) -> String {
    // Parse with the `url` crate. On failure, refuse to echo the raw string.
    let mut parsed = match url::Url::parse(raw) {
        Ok(u) => u,
        Err(_) => return "<redacted-url>".to_string(),
    };

    // 1. Mask URL userinfo.
    if !parsed.username().is_empty() || parsed.password().is_some() {
        // set_username / set_password return Err only for cannot-be-a-base
        // URLs; we already parsed successfully so these are safe to ignore.
        let _ = parsed.set_username("***");
        let _ = parsed.set_password(Some("***"));
    }

    // 2. Mask Xtream path segments: /live/<u>/<p>/…  /movie/<u>/<p>/…
    //    /series/<u>/<p>/…  — second and third segments after the keyword.
    {
        let path = parsed.path().to_string();
        let segments: Vec<&str> = path.splitn(5, '/').collect();
        // segments[0] is always "" (leading slash); segments[1] is keyword.
        if segments.len() >= 4 {
            let keyword = segments[1].to_ascii_lowercase();
            if matches!(keyword.as_str(), "live" | "movie" | "series") {
                // Replace segments[2] (user) and segments[3] (pass) with ***.
                let rest = if segments.len() == 5 { segments[4] } else { "" };
                let new_path = format!("/{}/***/***/{}",
                    segments[1],
                    rest);
                parsed.set_path(&new_path);
            }
        }
    }

    // 3. Mask query params named `username` or `password`.
    let pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .map(|(k, v)| {
            let value = if k == "username" || k == "password" {
                "***".to_string()
            } else {
                v.into_owned()
            };
            (k.into_owned(), value)
        })
        .collect();

    if parsed.query().is_some() {
        parsed.query_pairs_mut().clear().extend_pairs(&pairs);
    }

    parsed.to_string()
}

#[cfg(test)]
mod tests {
    use super::sanitize_url;

    #[test]
    fn masks_xtream_live_path_creds() {
        let url = "http://provider.com/live/myuser/mysecret/12345.ts";
        let out = sanitize_url(url);
        assert!(!out.contains("myuser"), "user leaked: {out}");
        assert!(!out.contains("mysecret"), "pass leaked: {out}");
        assert!(out.contains("/live/***/***/"), "path structure wrong: {out}");
    }

    #[test]
    fn masks_xmltv_query_creds() {
        let url = "http://provider.com/xmltv.php?username=alice&password=hunter2";
        let out = sanitize_url(url);
        assert!(!out.contains("alice"), "username leaked: {out}");
        assert!(!out.contains("hunter2"), "password leaked: {out}");
        assert!(out.contains("username=***"), "username param wrong: {out}");
        assert!(out.contains("password=***"), "password param wrong: {out}");
    }

    #[test]
    fn masks_userinfo() {
        let url = "http://alice:hunter2@provider.com/stream";
        let out = sanitize_url(url);
        assert!(!out.contains("alice"), "userinfo user leaked: {out}");
        assert!(!out.contains("hunter2"), "userinfo pass leaked: {out}");
    }

    #[test]
    fn returns_redacted_on_parse_failure() {
        let out = sanitize_url("not a url !! @@");
        assert_eq!(out, "<redacted-url>");
    }

    #[test]
    fn safe_url_unchanged_structure() {
        let url = "https://cdn.example.com/img/logo.png";
        let out = sanitize_url(url);
        assert!(out.contains("cdn.example.com"), "safe URL mangled: {out}");
    }
}
