//! Row structs for sqlx::query_as. Kept separate from `models` so that
//! `models` stays a clean domain layer (no sqlx dependency on every struct).
//!
//! Each Row has `into_domain()` to convert to the public model. This avoids
//! needing `sqlx::query!` macros (which require DATABASE_URL at compile time).

use sqlx::FromRow;

use super::models::{
    CastMember, Channel, ContinueWatching, Episode, Favorite, Playlist, PlaylistType,
    Program, Series, TargetType, VodItem, VodKind, XtreamUserInfo,
};

/// Decode a `cast_json` column into `Vec<CastMember>`. Accepts both the
/// new object shape (`[{"name":"...","photoUrl":"..."}]`) AND the legacy
/// string-array shape (`["Name 1","Name 2"]`) so rows synced before the
/// CastMember refactor still load. Anything that fails both shapes
/// returns an empty list — the UI just renders the cast section empty.
fn parse_cast_json(s: &str) -> Vec<CastMember> {
    if let Ok(v) = serde_json::from_str::<Vec<CastMember>>(s) {
        return v;
    }
    if let Ok(v) = serde_json::from_str::<Vec<String>>(s) {
        return v.into_iter().map(CastMember::name_only).collect();
    }
    Vec::new()
}

// ─── Playlist ────────────────────────────────────────────────────────────────

#[derive(FromRow)]
pub struct PlaylistRow {
    pub id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    pub kind: String,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub epg_url: Option<String>,
    pub user_agent: Option<String>,
    pub is_active: i64,
    pub last_synced_at: i64,
    pub channel_count: i64,
    pub xtream_username: Option<String>,
    pub xtream_status: Option<String>,
    pub xtream_exp_date_millis: Option<i64>,
    pub xtream_is_trial: Option<i64>,
    pub xtream_max_connections: Option<i64>,
}

impl PlaylistRow {
    pub fn into_domain(self) -> Playlist {
        let user_info = self.xtream_username.map(|u| XtreamUserInfo {
            username: u,
            status: self.xtream_status.unwrap_or_else(|| "Unknown".into()),
            exp_date_millis: self.xtream_exp_date_millis,
            is_trial: self.xtream_is_trial.unwrap_or(0) != 0,
            max_connections: self.xtream_max_connections.map(|n| n as i32),
        });
        Playlist {
            id: self.id,
            name: self.name,
            kind: PlaylistType::from_db_str(&self.kind),
            url: self.url,
            username: self.username,
            password: self.password,
            epg_url: self.epg_url,
            user_agent: self.user_agent,
            is_active: self.is_active != 0,
            last_synced_at: self.last_synced_at,
            channel_count: self.channel_count as i32,
            user_info,
        }
    }
}

// ─── Channel ─────────────────────────────────────────────────────────────────

#[derive(FromRow)]
pub struct ChannelRow {
    pub id: String,
    pub playlist_id: i64,
    pub name: String,
    pub logo_url: Option<String>,
    pub stream_url: String,
    pub group_title: Option<String>,
    pub epg_channel_id: Option<String>,
    pub is_hd: i64,
    pub sort_order: i64,
    pub group_sort_order: i64,
}

impl ChannelRow {
    pub fn into_domain(self) -> Channel {
        Channel {
            id: self.id,
            playlist_id: self.playlist_id,
            name: self.name,
            logo_url: self.logo_url,
            stream_url: self.stream_url,
            group_title: self.group_title,
            epg_channel_id: self.epg_channel_id,
            is_hd: self.is_hd != 0,
            sort_order: self.sort_order as i32,
            group_sort_order: self.group_sort_order as i32,
        }
    }
}

// ─── Program ─────────────────────────────────────────────────────────────────

#[derive(FromRow)]
pub struct ProgramRow {
    pub id: i64,
    pub channel_epg_id: String,
    pub playlist_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub start_millis: i64,
    pub stop_millis: i64,
    pub category: Option<String>,
}

impl ProgramRow {
    pub fn into_domain(self) -> Program {
        Program {
            id: self.id,
            channel_epg_id: self.channel_epg_id,
            playlist_id: self.playlist_id,
            title: self.title,
            description: self.description,
            start_millis: self.start_millis,
            stop_millis: self.stop_millis,
            category: self.category,
        }
    }
}

// ─── VOD ─────────────────────────────────────────────────────────────────────

#[derive(FromRow)]
pub struct VodItemRow {
    pub id: String,
    pub playlist_id: i64,
    pub title: String,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub stream_url: String,
    pub kind: String,
    pub year: Option<i64>,
    pub rating: Option<f64>,
    pub plot: Option<String>,
    pub genres_json: String,
    pub cast_json: String,
    pub director: Option<String>,
    pub duration_secs: Option<i64>,
    pub category_id: Option<String>,
    pub added_at: Option<i64>,
}

impl VodItemRow {
    pub fn into_domain(self) -> VodItem {
        VodItem {
            id: self.id,
            playlist_id: self.playlist_id,
            title: self.title,
            poster_url: self.poster_url,
            backdrop_url: self.backdrop_url,
            stream_url: self.stream_url,
            kind: match self.kind.as_str() {
                "SERIES" => VodKind::Series,
                _ => VodKind::Movie,
            },
            year: self.year.map(|y| y as i32),
            rating: self.rating,
            plot: self.plot,
            genres: serde_json::from_str(&self.genres_json).unwrap_or_default(),
            cast: parse_cast_json(&self.cast_json),
            director: self.director,
            duration_secs: self.duration_secs.map(|d| d as i32),
            category_id: self.category_id,
            added_at: self.added_at,
        }
    }
}

#[derive(FromRow)]
pub struct SeriesRow {
    pub id: String,
    pub playlist_id: i64,
    pub title: String,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub plot: Option<String>,
    pub year: Option<i64>,
    pub rating: Option<f64>,
    pub genres_json: String,
    pub cast_json: String,
    pub category_id: Option<String>,
    pub added_at: Option<i64>,
}

impl SeriesRow {
    pub fn into_domain(self) -> Series {
        Series {
            id: self.id,
            playlist_id: self.playlist_id,
            title: self.title,
            poster_url: self.poster_url,
            backdrop_url: self.backdrop_url,
            plot: self.plot,
            year: self.year.map(|y| y as i32),
            rating: self.rating,
            genres: serde_json::from_str(&self.genres_json).unwrap_or_default(),
            cast: parse_cast_json(&self.cast_json),
            category_id: self.category_id,
            added_at: self.added_at,
        }
    }
}

#[derive(FromRow)]
pub struct EpisodeRow {
    pub id: String,
    pub series_id: String,
    pub playlist_id: i64,
    pub season: i64,
    pub episode: i64,
    pub title: String,
    pub stream_url: String,
    pub duration_secs: Option<i64>,
    pub plot: Option<String>,
    pub thumbnail_url: Option<String>,
}

impl EpisodeRow {
    pub fn into_domain(self) -> Episode {
        Episode {
            id: self.id,
            series_id: self.series_id,
            playlist_id: self.playlist_id,
            season: self.season as i32,
            episode: self.episode as i32,
            title: self.title,
            stream_url: self.stream_url,
            duration_secs: self.duration_secs.map(|d| d as i32),
            plot: self.plot,
            thumbnail_url: self.thumbnail_url,
        }
    }
}

// `VodCategoryRow` lived here but was never queried directly — the
// `get_vod_categories` command joins against vod_items / series and uses
// its own ad-hoc Row struct (see commands/vod.rs). Removed to keep the
// row-mapping surface honest.

// ─── Favorites + Continue Watching ───────────────────────────────────────────

#[derive(FromRow)]
pub struct FavoriteRow {
    pub target_id: String,
    pub target_type: String,
    pub added_at: i64,
}

impl FavoriteRow {
    pub fn into_domain(self) -> Favorite {
        Favorite {
            target_id: self.target_id,
            target_type: parse_target_type(&self.target_type),
            added_at: self.added_at,
        }
    }
}

#[derive(FromRow)]
pub struct ContinueWatchingRow {
    pub target_id: String,
    pub target_type: String,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub updated_at: i64,
    pub title: String,
    pub subtitle: Option<String>,
    pub thumbnail_url: Option<String>,
    pub resume_episode_id: Option<String>,
}

impl ContinueWatchingRow {
    pub fn into_domain(self) -> ContinueWatching {
        ContinueWatching {
            target_id: self.target_id,
            target_type: parse_target_type(&self.target_type),
            position_ms: self.position_ms,
            duration_ms: self.duration_ms,
            updated_at: self.updated_at,
            title: self.title,
            subtitle: self.subtitle,
            thumbnail_url: self.thumbnail_url,
            resume_episode_id: self.resume_episode_id,
        }
    }
}

fn parse_target_type(s: &str) -> TargetType {
    match s {
        "MOVIE" => TargetType::Movie,
        "SERIES" => TargetType::Series,
        _ => TargetType::Channel,
    }
}

// ─── Category aggregation ────────────────────────────────────────────────────

#[derive(FromRow)]
pub struct CategoryWithCountRow {
    pub name: String,
    pub count: i64,
}
