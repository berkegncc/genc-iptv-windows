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
