//! Fanart.tv v3 client.
//!
//! Used as a backdrop fallback when TMDB's `/images` endpoint has
//! nothing for a film/series. Fanart.tv is the IPTV / Kodi / Plex
//! community's standard artwork library and often has high-quality
//! widescreen art for titles TMDB has skipped — especially TV shows
//! and lower-budget / local-language films.
//!
//! API key: read from `FANART_TV_API_KEY` env var. Free key from
//! `https://fanart.tv/get-an-api-key` (project key). When unset the
//! client is a no-op and callers fall through to whatever TMDB had.
//!
//! Movie endpoint is keyed by TMDB id (no extra resolution step).
//! TV endpoint is keyed by **TVDB** id — TMDB → TVDB resolution is
//! done in the caller via TMDB's `/tv/{id}/external_ids` endpoint.

use reqwest::Client;
use serde::Deserialize;

const API_BASE: &str = "https://webservice.fanart.tv/v3";

#[derive(Clone)]
pub struct FanartClient {
    client: Client,
    api_key: Option<String>,
}

impl FanartClient {
    pub fn from_env() -> Self {
        let api_key = std::env::var("FANART_TV_API_KEY")
            .ok()
            .filter(|s| !s.is_empty());
        Self {
            client: super::http::shared().clone(),
            api_key,
        }
    }

    pub fn enabled(&self) -> bool {
        self.api_key.is_some()
    }

    /// Highest-rated `moviebackground` URL for a TMDB movie id, or
    /// `None` if the key is unset / Fanart has no entry. Sorted by the
    /// community's `likes` count which is Fanart's quality signal.
    pub async fn movie_background(&self, tmdb_id: i64) -> Option<String> {
        let key = self.api_key.as_deref()?;
        let url = format!("{API_BASE}/movies/{tmdb_id}?api_key={key}");
        let resp = self.client.get(&url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let body: MovieResponse = resp.json().await.ok()?;
        best_by_likes(body.moviebackground)
    }

    /// Highest-rated `showbackground` URL for a TVDB series id.
    /// Caller is responsible for resolving TMDB → TVDB (Fanart's TV
    /// catalogue is keyed by TVDB, not TMDB).
    pub async fn show_background(&self, tvdb_id: i64) -> Option<String> {
        let key = self.api_key.as_deref()?;
        let url = format!("{API_BASE}/tv/{tvdb_id}?api_key={key}");
        let resp = self.client.get(&url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let body: ShowResponse = resp.json().await.ok()?;
        best_by_likes(body.showbackground)
    }
}

/// Pick the artwork entry with the most community likes. Fanart ships
/// `likes` as a string for legacy reasons, so we parse defensively.
fn best_by_likes(art: Vec<Art>) -> Option<String> {
    art.into_iter()
        .max_by_key(|a| a.likes.parse::<i64>().unwrap_or(0))
        .map(|a| a.url)
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct MovieResponse {
    #[serde(default)]
    moviebackground: Vec<Art>,
}

#[derive(Deserialize)]
struct ShowResponse {
    #[serde(default)]
    showbackground: Vec<Art>,
}

#[derive(Deserialize)]
struct Art {
    url: String,
    /// Fanart sends this as a string in the JSON. We parse it on read
    /// (see `best_by_likes`) rather than fighting serde's number-vs-
    /// string coercion every time we touch the type.
    #[serde(default = "default_likes")]
    likes: String,
}

fn default_likes() -> String {
    "0".to_string()
}
