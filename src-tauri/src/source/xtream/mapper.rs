//! Xtream DTO → domain Channel/VodItem/Series mapping. Direct port of
//! Android `XtreamMapper.kt`, including the relative-image-URL normaliser.

use crate::data::models::{
    CastMember, Channel, Episode, Playlist, VodItem, VodKind, XtreamUserInfo,
};

use super::dto::*;
use super::url as url_builder;

// ─── User info ───────────────────────────────────────────────────────────────

pub fn to_user_info(resp: &AuthResponse) -> Option<XtreamUserInfo> {
    let u = resp.user_info.as_ref()?;
    let username = u.username.clone()?;
    Some(XtreamUserInfo {
        username,
        status: u.status.clone().unwrap_or_else(|| "Unknown".into()),
        exp_date_millis: u.exp_date.as_deref().and_then(|s| s.parse::<i64>().ok()).map(|s| s * 1000),
        is_trial: matches!(u.is_trial.as_deref(), Some("1")),
        max_connections: u.max_connections.as_deref().and_then(|s| s.parse::<i32>().ok()),
    })
}

// ─── Channels (live) ─────────────────────────────────────────────────────────

/// Map a single Xtream live stream DTO to a domain [`Channel`].
/// Returns `None` if the playlist is missing username/password (shouldn't
/// happen for an Xtream playlist, but kept for parity with Android).
pub fn to_channel(
    dto: &LiveStreamDto,
    playlist: &Playlist,
    sort_order: i32,
    category_name_by_id: &std::collections::HashMap<String, String>,
    category_order_by_id: &std::collections::HashMap<String, i32>,
) -> Option<Channel> {
    let username = playlist.username.as_deref()?;
    let password = playlist.password.as_deref()?;
    let stream_url = url_builder::live_stream(&playlist.url, username, password, dto.stream_id);
    let raw_cat_id = dto.category_id_string();
    let group_name = raw_cat_id
        .as_ref()
        .and_then(|id| category_name_by_id.get(id).cloned())
        .or_else(|| raw_cat_id.clone());
    let group_order = raw_cat_id
        .as_ref()
        .and_then(|id| category_order_by_id.get(id).copied())
        .unwrap_or(i32::MAX);

    let name = dto.name.clone();
    let is_hd = name.to_ascii_uppercase().contains("HD") || name.contains("1080");
    let logo_url = normalise_image_url(dto.stream_icon.as_deref(), &playlist.url);
    let epg = dto.epg_channel_id.clone().filter(|s| !s.is_empty());

    Some(Channel {
        id: format!("{}:{}", playlist.id, dto.stream_id),
        playlist_id: playlist.id,
        name,
        logo_url,
        stream_url,
        group_title: group_name,
        epg_channel_id: epg,
        is_hd,
        sort_order,
        group_sort_order: group_order,
    })
}

// ─── VOD (movies) ────────────────────────────────────────────────────────────

pub fn to_vod_item(dto: &VodDto, playlist: &Playlist) -> Option<VodItem> {
    let username = playlist.username.as_deref()?;
    let password = playlist.password.as_deref()?;
    let ext = dto.container_extension.as_deref().filter(|s| !s.is_empty()).unwrap_or("mp4");
    let stream_url = url_builder::vod_stream(&playlist.url, username, password, dto.stream_id, ext);
    let raw_poster = dto.stream_icon.as_deref().filter(|s| !s.is_empty())
        .or_else(|| dto.cover.as_deref().filter(|s| !s.is_empty()));
    let poster = normalise_image_url(raw_poster, &playlist.url);
    let cat_id = dto.category_id_string();
    let rating = dto.rating.as_ref().and_then(value_to_double);

    Some(VodItem {
        id: format!("{}:movie:{}", playlist.id, dto.stream_id),
        playlist_id: playlist.id,
        title: dto.name.clone(),
        poster_url: poster,
        backdrop_url: None,
        stream_url,
        kind: VodKind::Movie,
        year: None,
        rating,
        plot: dto.plot.clone(),
        genres: vec![],
        cast: vec![],
        director: None,
        duration_secs: None,
        category_id: cat_id.map(|c| format!("{}:MOVIE:{}", playlist.id, c)),
        added_at: parse_unix_timestamp_ms(dto.added.as_deref()),
    })
}

/// Apply enriched info from `get_vod_info` onto a baseline VodItem. Mutates
/// only the fields the info block carries — leaves everything else alone so
/// you can safely combine the cheap list call with the expensive detail call.
pub fn enrich_vod(item: &mut VodItem, info: &VodInfoResponse, playlist: &Playlist) {
    if let Some(block) = info.info.as_ref() {
        if let Some(plot) = block.plot.as_deref().filter(|s| !s.is_empty()) {
            item.plot = Some(plot.to_string());
        }
        if let Some(director) = block.director.as_deref().filter(|s| !s.is_empty()) {
            item.director = Some(director.to_string());
        }
        if let Some(genre) = block.genre.as_deref().filter(|s| !s.is_empty()) {
            item.genres = split_csv(Some(genre));
        }
        if let Some(cast) = block.cast.as_deref().filter(|s| !s.is_empty()) {
            // Xtream gives us bare names — no headshots. TMDB enrichment
            // later will overwrite this list with photo'd entries when it
            // can find a match.
            item.cast = split_csv_to_cast(Some(cast));
        }
        if let Some(rating) = block.rating.as_ref().and_then(value_to_double) {
            item.rating = Some(rating);
        }
        if let Some(secs) = block.duration_secs {
            item.duration_secs = Some(secs);
        } else if let Some(dur) = block.duration.as_deref() {
            item.duration_secs = parse_duration_str(dur);
        }
        if let Some(year) = block.releasedate.as_deref()
            .and_then(|s| s.get(..4))
            .and_then(|s| s.parse::<i32>().ok())
        {
            item.year = Some(year);
        }
        if let Some(poster) = block.movie_image.as_deref().filter(|s| !s.is_empty()) {
            // Only override an empty poster — a working list-call poster
            // is usually fine.
            if item.poster_url.is_none() {
                item.poster_url = normalise_image_url(Some(poster), &playlist.url);
            }
        }
        if let Some(backdrop) = block.backdrop_path.as_ref().and_then(value_to_string) {
            item.backdrop_url = normalise_image_url(Some(&backdrop), &playlist.url);
        }
    }
}

/// `"1:23:45"` / `"1h23m"` / `"83 min"` → seconds. Best-effort; returns None
/// if nothing parses.
fn parse_duration_str(raw: &str) -> Option<i32> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }
    // Try "HH:MM:SS" or "MM:SS"
    let parts: Vec<&str> = s.split(':').collect();
    if parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit())) {
        let nums: Option<Vec<i32>> = parts.iter().map(|p| p.parse::<i32>().ok()).collect();
        if let Some(nums) = nums {
            return match nums.len() {
                3 => Some(nums[0] * 3600 + nums[1] * 60 + nums[2]),
                2 => Some(nums[0] * 60 + nums[1]),
                _ => None,
            };
        }
    }
    // Fallback: pull the first integer and assume minutes
    let mut digits = String::new();
    for c in s.chars() {
        if c.is_ascii_digit() {
            digits.push(c);
        } else if !digits.is_empty() {
            break;
        }
    }
    digits.parse::<i32>().ok().map(|m| m * 60)
}

// ─── Series ──────────────────────────────────────────────────────────────────

pub fn to_series(dto: &SeriesDto, playlist: &Playlist) -> crate::data::models::Series {
    let cat_id = dto.category_id_string();
    crate::data::models::Series {
        id: format!("{}:series:{}", playlist.id, dto.series_id),
        playlist_id: playlist.id,
        title: dto.name.clone(),
        poster_url: normalise_image_url(dto.cover.as_deref(), &playlist.url),
        backdrop_url: dto.backdrop_path.as_ref()
            .and_then(value_to_string)
            .as_deref()
            .and_then(|s| normalise_image_url(Some(s), &playlist.url)),
        plot: dto.plot.clone(),
        year: dto.release_date.as_deref().and_then(|s| s.get(..4)).and_then(|s| s.parse::<i32>().ok()),
        rating: dto.rating.as_ref().and_then(value_to_double),
        genres: split_csv(dto.genre.as_deref()),
        cast: split_csv_to_cast(dto.cast.as_deref()),
        category_id: cat_id.map(|c| format!("{}:SERIES:{}", playlist.id, c)),
        added_at: parse_unix_timestamp_ms(dto.last_modified.as_deref()),
    }
}

/// Xtream emits `added` / `last_modified` as a unix-seconds string. Convert
/// to epoch ms so it lines up with everything else stored in SQLite. Returns
/// None for missing / malformed input — the home rail tolerates that
/// gracefully (those rows just sort to the bottom).
fn parse_unix_timestamp_ms(raw: Option<&str>) -> Option<i64> {
    let secs: i64 = raw?.trim().parse().ok()?;
    if secs <= 0 {
        return None;
    }
    Some(secs * 1000)
}

// ─── Episodes ────────────────────────────────────────────────────────────────

/// Map one episode DTO under a given season into a domain [`Episode`]. Returns
/// `None` if the playlist isn't a properly authenticated Xtream account.
///
/// Stream URL pattern: `{server}/series/{user}/{pass}/{episodeId}.{ext}`
/// — same shape as the player_api spec; mpv handles the actual demux.
pub fn to_episode(
    dto: &EpisodeDto,
    season: i32,
    series_id: &str,
    playlist: &Playlist,
) -> Option<Episode> {
    let username = playlist.username.as_deref()?;
    let password = playlist.password.as_deref()?;
    let ext = dto
        .container_extension
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("mp4");
    let id_str = dto.id_string();
    let stream_url = url_builder::series_stream(&playlist.url, username, password, &id_str, ext);
    let title = dto.title.clone().unwrap_or_else(|| format!("Bölüm {}", dto.episode_number()));
    let info = dto.info.as_ref();
    let duration_secs = info
        .and_then(|i| i.duration_secs)
        .or_else(|| info.and_then(|i| parse_duration_str(i.duration.as_deref().unwrap_or(""))));
    let plot = info.and_then(|i| i.plot.clone()).filter(|s| !s.is_empty());
    let thumb = info
        .and_then(|i| i.movie_image.clone())
        .or_else(|| info.and_then(|i| i.cover_big.clone()))
        .filter(|s| !s.is_empty());
    let thumb_url = normalise_image_url(thumb.as_deref(), &playlist.url);

    Some(Episode {
        id: format!("{}:episode:{}", playlist.id, id_str),
        series_id: series_id.to_string(),
        playlist_id: playlist.id,
        season,
        episode: dto.episode_number(),
        title,
        stream_url,
        duration_secs,
        plot,
        thumbnail_url: thumb_url,
    })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Some providers return relative paths (`images/x.png` or `/images/x.png`).
/// Prepend the server base in those cases; leave absolute http(s) URLs alone.
pub fn normalise_image_url(raw: Option<&str>, server_base: &str) -> Option<String> {
    let trimmed = raw?.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Some(trimmed.to_string());
    }
    let base = server_base.trim_end_matches('/');
    if let Some(stripped) = trimmed.strip_prefix('/') {
        Some(format!("{base}/{stripped}"))
    } else {
        Some(format!("{base}/{trimmed}"))
    }
}

fn value_to_double(v: &serde_json::Value) -> Option<f64> {
    match v {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.parse::<f64>().ok(),
        _ => None,
    }
}

fn value_to_string(v: &serde_json::Value) -> Option<String> {
    match v {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn split_csv(raw: Option<&str>) -> Vec<String> {
    let Some(s) = raw else { return vec![]; };
    s.split(|c| c == ',' || c == '/')
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect()
}

/// Same split as [`split_csv`], but wraps each name in a [`CastMember`]
/// with no photo. Used for cast lists coming from Xtream (which never
/// ship headshots). The poster enricher later replaces these with
/// TMDB-derived entries when it can find a matching credit.
fn split_csv_to_cast(raw: Option<&str>) -> Vec<CastMember> {
    split_csv(raw).into_iter().map(CastMember::name_only).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalise_absolute_url_unchanged() {
        let r = normalise_image_url(Some("https://logos.com/x.png"), "http://srv.com:8080");
        assert_eq!(r.as_deref(), Some("https://logos.com/x.png"));
    }

    #[test]
    fn normalise_relative_with_slash() {
        let r = normalise_image_url(Some("/images/x.png"), "http://srv.com:8080/");
        assert_eq!(r.as_deref(), Some("http://srv.com:8080/images/x.png"));
    }

    #[test]
    fn normalise_relative_no_slash() {
        let r = normalise_image_url(Some("images/x.png"), "http://srv.com:8080");
        assert_eq!(r.as_deref(), Some("http://srv.com:8080/images/x.png"));
    }

    #[test]
    fn normalise_empty_returns_none() {
        assert!(normalise_image_url(Some(""), "http://srv.com").is_none());
        assert!(normalise_image_url(Some("   "), "http://srv.com").is_none());
        assert!(normalise_image_url(None, "http://srv.com").is_none());
    }

    // ── parse_unix_timestamp_ms ────────────────────────────────────────────

    #[test]
    fn parses_unix_timestamp_string() {
        // 2024-01-01T00:00:00Z = 1704067200 unix seconds
        let ms = parse_unix_timestamp_ms(Some("1704067200")).unwrap();
        assert_eq!(ms, 1_704_067_200_000);
    }

    #[test]
    fn rejects_zero_or_negative_timestamps() {
        // Some providers ship "0" for "unknown" rather than omitting the
        // field. We treat that as None so it sorts to the bottom of recent
        // rails instead of pinning to 1970.
        assert!(parse_unix_timestamp_ms(Some("0")).is_none());
        assert!(parse_unix_timestamp_ms(Some("-5")).is_none());
    }

    #[test]
    fn rejects_non_numeric_timestamps() {
        assert!(parse_unix_timestamp_ms(Some("not-a-time")).is_none());
        assert!(parse_unix_timestamp_ms(Some("")).is_none());
        assert!(parse_unix_timestamp_ms(None).is_none());
    }

    #[test]
    fn timestamp_strips_surrounding_whitespace() {
        let ms = parse_unix_timestamp_ms(Some(" 1704067200 ")).unwrap();
        assert_eq!(ms, 1_704_067_200_000);
    }

    // ── parse_duration_str ─────────────────────────────────────────────────

    #[test]
    fn parses_hh_mm_ss_runtime() {
        // 1h 23m 45s = 5025
        assert_eq!(parse_duration_str("01:23:45"), Some(1 * 3600 + 23 * 60 + 45));
    }

    #[test]
    fn parses_mm_ss_runtime() {
        // 12m 30s = 750
        assert_eq!(parse_duration_str("12:30"), Some(12 * 60 + 30));
    }

    #[test]
    fn parses_minutes_with_suffix() {
        // "83 min" → 83 minutes → 4980 sec
        assert_eq!(parse_duration_str("83 min"), Some(83 * 60));
    }

    #[test]
    fn parses_minutes_with_text_prefix() {
        // The fallback only looks at the first integer run.
        assert_eq!(parse_duration_str("about 110 minutes"), Some(110 * 60));
    }

    #[test]
    fn duration_unparseable_returns_none() {
        assert!(parse_duration_str("").is_none());
        assert!(parse_duration_str("    ").is_none());
        assert!(parse_duration_str("abc").is_none());
    }

    // ── to_episode ─────────────────────────────────────────────────────────

    fn xtream_playlist() -> Playlist {
        Playlist {
            id: 7,
            name: "Test".into(),
            kind: crate::data::models::PlaylistType::Xtream,
            url: "http://srv.com:8080".into(),
            username: Some("u".into()),
            password: Some("p".into()),
            epg_url: None,
            user_agent: None,
            is_active: true,
            last_synced_at: 0,
            channel_count: 0,
            user_info: None,
        }
    }

    #[test]
    fn maps_episode_with_full_info() {
        let dto = EpisodeDto {
            id: serde_json::Value::Number(42.into()),
            episode_num: Some(serde_json::Value::Number(3.into())),
            title: Some("Pilot".into()),
            container_extension: Some("mkv".into()),
            info: Some(EpisodeInfoDto {
                plot: Some("Açılış bölümü.".into()),
                duration_secs: Some(2640),
                duration: None,
                movie_image: Some("http://cdn/ep3.jpg".into()),
                cover_big: None,
                release_date: None,
            }),
        };
        let pl = xtream_playlist();
        let ep = to_episode(&dto, /*season=*/ 1, "7:series:99", &pl).unwrap();
        assert_eq!(ep.id, "7:episode:42");
        assert_eq!(ep.series_id, "7:series:99");
        assert_eq!(ep.season, 1);
        assert_eq!(ep.episode, 3);
        assert_eq!(ep.title, "Pilot");
        assert_eq!(ep.duration_secs, Some(2640));
        assert_eq!(ep.thumbnail_url.as_deref(), Some("http://cdn/ep3.jpg"));
        assert!(ep.stream_url.contains("/series/u/p/42.mkv"));
    }

    #[test]
    fn episode_falls_back_to_default_extension() {
        // No `container_extension` → mp4 by default.
        let dto = EpisodeDto {
            id: serde_json::Value::String("100".into()),
            episode_num: Some(serde_json::Value::Number(1.into())),
            title: None,
            container_extension: None,
            info: None,
        };
        let pl = xtream_playlist();
        let ep = to_episode(&dto, 2, "sid", &pl).unwrap();
        assert!(ep.stream_url.ends_with(".mp4"));
        // Title falls back to "Bölüm N"
        assert_eq!(ep.title, "Bölüm 1");
    }

    #[test]
    fn episode_returns_none_without_credentials() {
        // M3U-style playlist with no username/password — we can't build a
        // working episode URL so we drop the row.
        let mut pl = xtream_playlist();
        pl.username = None;
        let dto = EpisodeDto {
            id: serde_json::Value::Number(1.into()),
            episode_num: None,
            title: None,
            container_extension: None,
            info: None,
        };
        assert!(to_episode(&dto, 1, "sid", &pl).is_none());
    }
}
