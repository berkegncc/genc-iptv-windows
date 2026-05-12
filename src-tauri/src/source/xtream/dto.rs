//! Xtream Codes API JSON DTOs. Match Android `XtreamDtos.kt` field-for-field.
//! Many fields use `serde_json::Value` because providers wildly disagree on
//! whether a field is a string or number — we coerce in the mapper.
//!
//! `dead_code` is allowed module-wide because most fields exist purely so
//! serde can decode the upstream JSON faithfully; only a subset is actually
//! consumed by the mapper layer. Keeping the full shape documents the
//! provider contract.
#![allow(dead_code)]

use serde::Deserialize;
use serde_json::Value;

// ─── Auth ────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AuthResponse {
    pub user_info: Option<UserInfoDto>,
    pub server_info: Option<ServerInfoDto>,
}

#[derive(Debug, Deserialize)]
pub struct UserInfoDto {
    pub username: Option<String>,
    pub password: Option<String>,
    /// "Active", "Expired", "Disabled", ...
    pub status: Option<String>,
    /// Unix seconds as string or null.
    pub exp_date: Option<String>,
    /// "1" or "0".
    pub is_trial: Option<String>,
    /// String in some servers.
    pub max_connections: Option<String>,
    pub auth: Option<i32>,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ServerInfoDto {
    pub url: Option<String>,
    pub port: Option<String>,
    pub https_port: Option<String>,
    pub server_protocol: Option<String>,
    pub timezone: Option<String>,
    pub time_now: Option<String>,
}

// ─── Categories ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CategoryDto {
    pub category_id: Value,
    pub category_name: String,
    pub parent_id: Option<Value>,
}

impl CategoryDto {
    /// Xtream returns category_id as either a string or an integer.
    pub fn id_string(&self) -> String {
        match &self.category_id {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            other => other.to_string(),
        }
    }
}

// ─── Live Streams ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LiveStreamDto {
    pub num: Option<Value>,
    pub name: String,
    pub stream_type: Option<String>,
    pub stream_id: i64,
    pub stream_icon: Option<String>,
    pub epg_channel_id: Option<String>,
    pub added: Option<String>,
    /// Number or string depending on provider.
    pub category_id: Option<Value>,
    pub custom_sid: Option<String>,
    pub tv_archive: Option<i32>,
    pub direct_source: Option<String>,
    pub tv_archive_duration: Option<Value>,
}

impl LiveStreamDto {
    pub fn category_id_string(&self) -> Option<String> {
        match &self.category_id {
            Some(Value::String(s)) => Some(s.clone()),
            Some(Value::Number(n)) => Some(n.to_string()),
            _ => None,
        }
    }
}

// ─── VOD ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VodDto {
    pub num: Option<Value>,
    pub name: String,
    pub stream_type: Option<String>,
    pub stream_id: i64,
    pub stream_icon: Option<String>,
    /// Some providers use `cover` instead of `stream_icon`.
    pub cover: Option<String>,
    pub rating: Option<Value>,
    pub rating_5based: Option<Value>,
    pub added: Option<String>,
    pub category_id: Option<Value>,
    pub container_extension: Option<String>,
    pub custom_sid: Option<String>,
    pub direct_source: Option<String>,
    pub plot: Option<String>,
}

impl VodDto {
    pub fn category_id_string(&self) -> Option<String> {
        match &self.category_id {
            Some(Value::String(s)) => Some(s.clone()),
            Some(Value::Number(n)) => Some(n.to_string()),
            _ => None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct VodInfoResponse {
    pub info: Option<VodInfoDto>,
    pub movie_data: Option<MovieDataDto>,
}

#[derive(Debug, Deserialize)]
pub struct VodInfoDto {
    pub plot: Option<String>,
    pub cast: Option<String>,
    pub director: Option<String>,
    pub genre: Option<String>,
    pub duration: Option<String>,
    pub duration_secs: Option<i32>,
    pub rating: Option<Value>,
    pub releasedate: Option<String>,
    pub movie_image: Option<String>,
    pub backdrop_path: Option<Value>,
    pub youtube_trailer: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MovieDataDto {
    pub stream_id: Option<i64>,
    pub name: Option<String>,
    pub added: Option<String>,
    pub container_extension: Option<String>,
    pub category_id: Option<String>,
}

// ─── Series ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SeriesDto {
    pub num: Option<Value>,
    pub name: String,
    pub series_id: i64,
    pub cover: Option<String>,
    pub plot: Option<String>,
    pub cast: Option<String>,
    pub director: Option<String>,
    pub genre: Option<String>,
    #[serde(rename = "releaseDate")]
    pub release_date: Option<String>,
    pub last_modified: Option<String>,
    pub rating: Option<Value>,
    pub rating_5based: Option<Value>,
    pub backdrop_path: Option<Value>,
    pub episode_run_time: Option<String>,
    pub category_id: Option<Value>,
}

impl SeriesDto {
    pub fn category_id_string(&self) -> Option<String> {
        match &self.category_id {
            Some(Value::String(s)) => Some(s.clone()),
            Some(Value::Number(n)) => Some(n.to_string()),
            _ => None,
        }
    }
}

// ─── Series info (episodes) ──────────────────────────────────────────────────
//
// `get_series_info&series_id=` returns three top-level keys:
//   - info: same flat metadata block as get_series, sometimes richer
//   - seasons: array of season objects (often present, sometimes empty)
//   - episodes: { "1": [...], "2": [...] } — keyed by season number AS STRING
//
// We model `episodes` as a HashMap so serde tolerates either an empty object
// `{}` or a populated dict. Some providers occasionally return `episodes` as
// an empty array instead of an object — we handle that in the deserializer.

#[derive(Debug, Deserialize)]
pub struct SeriesInfoResponse {
    pub info: Option<SeriesInfoBlockDto>,
    #[serde(default, deserialize_with = "deserialize_episodes_map")]
    pub episodes: std::collections::HashMap<String, Vec<EpisodeDto>>,
}

#[derive(Debug, Deserialize)]
pub struct SeriesInfoBlockDto {
    pub name: Option<String>,
    pub cover: Option<String>,
    pub plot: Option<String>,
    pub cast: Option<String>,
    pub director: Option<String>,
    pub genre: Option<String>,
    #[serde(rename = "releaseDate")]
    pub release_date: Option<String>,
    pub rating: Option<Value>,
    pub backdrop_path: Option<Value>,
}

#[derive(Debug, Deserialize)]
pub struct EpisodeDto {
    /// Episode id — numeric or string depending on provider.
    pub id: Value,
    pub episode_num: Option<Value>,
    pub title: Option<String>,
    pub container_extension: Option<String>,
    pub info: Option<EpisodeInfoDto>,
}

#[derive(Debug, Deserialize)]
pub struct EpisodeInfoDto {
    pub plot: Option<String>,
    pub duration_secs: Option<i32>,
    pub duration: Option<String>,
    pub movie_image: Option<String>,
    /// Some providers use `cover_big` for episode thumbnails.
    pub cover_big: Option<String>,
    pub release_date: Option<String>,
}

impl EpisodeDto {
    /// Stringify the episode id (Xtream returns it as int or string).
    pub fn id_string(&self) -> String {
        match &self.id {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            other => other.to_string(),
        }
    }

    /// Episode number — same dance, defaults to 0 if unparseable.
    pub fn episode_number(&self) -> i32 {
        match &self.episode_num {
            Some(Value::Number(n)) => n.as_i64().map(|v| v as i32).unwrap_or(0),
            Some(Value::String(s)) => s.parse::<i32>().unwrap_or(0),
            _ => 0,
        }
    }
}

/// Tolerate `episodes: []` (some providers send an array when the dict is
/// empty rather than `{}`) by treating it as an empty map.
fn deserialize_episodes_map<'de, D>(
    deserializer: D,
) -> Result<std::collections::HashMap<String, Vec<EpisodeDto>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    let v = Value::deserialize(deserializer)?;
    match v {
        Value::Object(map) => map
            .into_iter()
            .map(|(k, v)| {
                let eps: Vec<EpisodeDto> =
                    serde_json::from_value(v).map_err(D::Error::custom)?;
                Ok((k, eps))
            })
            .collect(),
        Value::Array(_) => Ok(Default::default()),
        Value::Null => Ok(Default::default()),
        other => Err(D::Error::custom(format!(
            "episodes must be object or array, got {other:?}"
        ))),
    }
}

// EPG short-form DTOs lived here (`ShortEpgResponse` / `EpgEntryDto`) but
// the corresponding `get_short_epg` Xtream endpoint was never wired into
// a command. Removed to keep the DTO surface honest. Re-add when (if)
// we surface a per-channel "next 5 programmes" pop-out.
