//! Domain models. Mirror Android `data/model/*.kt` 1:1.
//!
//! All structs derive `Serialize` so they can be returned from Tauri
//! `#[command]`s, and `Deserialize` where they may come back from JS via
//! `invoke()`. Field names are camelCase via `serde(rename_all)` so JS sees
//! the convention it expects without manual renaming.

use serde::{Deserialize, Serialize};

// ─── Playlist ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PlaylistType {
    M3u,
    Xtream,
}

impl PlaylistType {
    // Note: there used to be an `as_db_str()` here, but every INSERT writes
    // the literal 'M3U' / 'XTREAM' value directly so it was never called.
    // We only need the decode side.
    pub fn from_db_str(s: &str) -> Self {
        match s {
            "XTREAM" => PlaylistType::Xtream,
            _ => PlaylistType::M3u,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XtreamUserInfo {
    pub username: String,
    pub status: String,
    pub exp_date_millis: Option<i64>,
    pub is_trial: bool,
    pub max_connections: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: PlaylistType,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub epg_url: Option<String>,
    pub user_agent: Option<String>,
    pub is_active: bool,
    pub last_synced_at: i64,
    pub channel_count: i32,
    pub user_info: Option<XtreamUserInfo>,
}

// ─── Channel ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub id: String,
    pub playlist_id: i64,
    pub name: String,
    pub logo_url: Option<String>,
    pub stream_url: String,
    pub group_title: Option<String>,
    pub epg_channel_id: Option<String>,
    pub is_hd: bool,
    pub sort_order: i32,
    pub group_sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryWithCount {
    pub name: String,
    pub count: i64,
}

// ─── Program (EPG) ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Program {
    pub id: i64,
    pub channel_epg_id: String,
    pub playlist_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub start_millis: i64,
    pub stop_millis: i64,
    pub category: Option<String>,
}

// New program without an id yet (parser output).
#[derive(Debug, Clone)]
pub struct NewProgram {
    pub channel_epg_id: String,
    pub playlist_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub start_millis: i64,
    pub stop_millis: i64,
    pub category: Option<String>,
}

// ─── Cast (shared by VOD movie + Series) ────────────────────────────────────

/// A single cast member with optional headshot URL.
///
/// Persisted as JSON in `vod_items.cast_json` / `series.cast_json`. The
/// JSON is decoded by a tolerant parser in `data::rows` that also accepts
/// the legacy `Vec<String>` shape — rows synced before this change carry
/// only names and deserialize with `photo_url: None`. Re-running the
/// poster enricher fills in photos from TMDB.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CastMember {
    pub name: String,
    pub photo_url: Option<String>,
}

impl CastMember {
    pub fn name_only(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            photo_url: None,
        }
    }
}

// ─── VOD ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum VodKind {
    Movie,
    Series,
}

impl VodKind {
    pub fn as_db_str(&self) -> &'static str {
        match self {
            VodKind::Movie => "MOVIE",
            VodKind::Series => "SERIES",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VodItem {
    pub id: String,
    pub playlist_id: i64,
    pub title: String,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub stream_url: String,
    pub kind: VodKind,
    pub year: Option<i32>,
    pub rating: Option<f64>,
    pub plot: Option<String>,
    pub genres: Vec<String>,
    pub cast: Vec<CastMember>,
    pub director: Option<String>,
    pub duration_secs: Option<i32>,
    pub category_id: Option<String>,
    /// Unix epoch ms when the provider added this item. Drives the Home
    /// "Son Eklenen Filmler" rail and may be NULL when the upstream
    /// playlist/provider doesn't ship the field.
    pub added_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Series {
    pub id: String,
    pub playlist_id: i64,
    pub title: String,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub plot: Option<String>,
    pub year: Option<i32>,
    pub rating: Option<f64>,
    pub genres: Vec<String>,
    pub cast: Vec<CastMember>,
    pub category_id: Option<String>,
    /// Upstream `last_modified` mapped to epoch ms; same role as
    /// `VodItem::added_at`.
    pub added_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Episode {
    pub id: String,
    pub series_id: String,
    pub playlist_id: i64,
    pub season: i32,
    pub episode: i32,
    pub title: String,
    pub stream_url: String,
    pub duration_secs: Option<i32>,
    pub plot: Option<String>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VodCategory {
    pub id: String,
    pub playlist_id: i64,
    pub name: String,
    pub kind: VodKind,
}

// ─── Favorites + Continue Watching ───────────────────────────────────────────

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum TargetType {
    Channel,
    Movie,
    Series,
}

impl TargetType {
    pub fn as_db_str(&self) -> &'static str {
        match self {
            TargetType::Channel => "CHANNEL",
            TargetType::Movie => "MOVIE",
            TargetType::Series => "SERIES",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Favorite {
    pub target_id: String,
    pub target_type: TargetType,
    pub added_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContinueWatching {
    pub target_id: String,
    pub target_type: TargetType,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub updated_at: i64,
    pub title: String,
    pub subtitle: Option<String>,
    pub thumbnail_url: Option<String>,
    pub resume_episode_id: Option<String>,
}
