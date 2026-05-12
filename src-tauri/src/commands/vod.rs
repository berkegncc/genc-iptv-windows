//! Tauri commands for reading VOD movies, series, and episodes.
//!
//! Lazy episode loading: the Series sync only writes the series list; an
//! episode list for any single series is fetched on demand the first time
//! the user opens its detail page (and any time the user pulls to refresh).

use sqlx::SqlitePool;
use tauri::State;

use crate::data::models::{Episode, Series, VodCategory, VodItem, VodKind};
use crate::data::rows::{EpisodeRow, PlaylistRow, SeriesRow, VodItemRow};
use crate::data::Db;
use crate::service::sync_service;
use crate::source::xtream;

use super::{CommandError, CommandResult};

// ─── Movies (VOD) ────────────────────────────────────────────────────────────

/// VOD movies for a playlist with optional name search + category filter.
/// `category_id` is the canonical "{playlistId}:MOVIE:{xtreamCatId}" form.
#[tauri::command]
pub async fn get_movies(
    db: State<'_, Db>,
    playlist_id: i64,
    query: Option<String>,
    category_id: Option<String>,
) -> CommandResult<Vec<VodItem>> {
    let q = query.unwrap_or_default();
    let q_pattern = format!("%{}%", q);
    let has_query = !q.is_empty();
    let has_cat = category_id.is_some();
    let cat = category_id.unwrap_or_default();

    let rows: Vec<VodItemRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items
        WHERE playlist_id = ? AND kind = 'MOVIE'
          AND (?2 = 0 OR title LIKE ?3)
          AND (?4 = 0 OR category_id = ?5)
        ORDER BY title ASC
        "#,
    )
    .bind(playlist_id)
    .bind(has_query as i32)
    .bind(&q_pattern)
    .bind(has_cat as i32)
    .bind(&cat)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(VodItemRow::into_domain).collect())
}

#[tauri::command]
pub async fn get_movie(db: State<'_, Db>, id: String) -> CommandResult<Option<VodItem>> {
    let row: Option<VodItemRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(VodItemRow::into_domain))
}

/// Lazy enrichment — call `get_vod_info` for one item then save the enriched
/// row back to SQLite. The frontend triggers this when opening the film
/// detail screen (so the cheap list call stays fast for the grid).
#[tauri::command]
pub async fn enrich_movie(db: State<'_, Db>, id: String) -> CommandResult<VodItem> {
    let row: VodItemRow = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&db.pool)
    .await?
    .ok_or_else(|| CommandError::Message("Film bulunamadı.".into()))?;

    let mut item = row.into_domain();

    // Pull stream_id back out of the canonical id "{playlistId}:movie:{streamId}"
    let stream_id: i64 = item
        .id
        .rsplit(':')
        .next()
        .and_then(|s| s.parse::<i64>().ok())
        .ok_or_else(|| CommandError::Message("Geçersiz film kimliği.".into()))?;

    let playlist = load_playlist_required(&db.pool, item.playlist_id).await?;
    if !matches!(playlist.kind, crate::data::models::PlaylistType::Xtream) {
        // Non-Xtream playlists don't have a vod_info endpoint.
        return Ok(item);
    }
    let username = playlist.username.clone()
        .ok_or_else(|| CommandError::Message("Xtream kullanıcı adı yok.".into()))?;
    let password = playlist.password.clone()
        .ok_or_else(|| CommandError::Message("Xtream parolası yok.".into()))?;

    let client = xtream::api::XtreamClient::new(playlist.url.clone(), username, password);
    match client.vod_info(stream_id).await {
        Ok(info) => {
            xtream::mapper::enrich_vod(&mut item, &info, &playlist);
        }
        Err(e) => {
            tracing::warn!(error = %e, %id, "vod_info failed; returning baseline");
        }
    }

    persist_movie(&db.pool, &item).await?;
    Ok(item)
}

// ─── Series + Episodes ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_series_list(
    db: State<'_, Db>,
    playlist_id: i64,
    query: Option<String>,
    category_id: Option<String>,
) -> CommandResult<Vec<Series>> {
    let q = query.unwrap_or_default();
    let q_pattern = format!("%{}%", q);
    let has_query = !q.is_empty();
    let has_cat = category_id.is_some();
    let cat = category_id.unwrap_or_default();

    let rows: Vec<SeriesRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, plot, year,
               rating, genres_json, cast_json, category_id, added_at
        FROM series
        WHERE playlist_id = ?
          AND (?2 = 0 OR title LIKE ?3)
          AND (?4 = 0 OR category_id = ?5)
        ORDER BY title ASC
        "#,
    )
    .bind(playlist_id)
    .bind(has_query as i32)
    .bind(&q_pattern)
    .bind(has_cat as i32)
    .bind(&cat)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(SeriesRow::into_domain).collect())
}

#[tauri::command]
pub async fn get_series_one(db: State<'_, Db>, id: String) -> CommandResult<Option<Series>> {
    let row: Option<SeriesRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, plot, year,
               rating, genres_json, cast_json, category_id, added_at
        FROM series WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(SeriesRow::into_domain))
}

/// Episodes already in the local DB. Empty if we haven't fetched yet —
/// frontend should call `sync_episodes_for_series` first.
#[tauri::command]
pub async fn get_episodes(
    db: State<'_, Db>,
    series_id: String,
) -> CommandResult<Vec<Episode>> {
    let rows: Vec<EpisodeRow> = sqlx::query_as(
        r#"
        SELECT id, series_id, playlist_id, season, episode, title, stream_url,
               duration_secs, plot, thumbnail_url
        FROM episodes WHERE series_id = ?
        ORDER BY season ASC, episode ASC
        "#,
    )
    .bind(&series_id)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(EpisodeRow::into_domain).collect())
}

/// Fetch the series_info endpoint, replace the local episode list, return
/// the new list. Idempotent — call any time to refresh.
#[tauri::command]
pub async fn sync_episodes_for_series(
    db: State<'_, Db>,
    series_id: String,
) -> CommandResult<Vec<Episode>> {
    // Locate the series row to find playlist + xtream series id
    let series: SeriesRow = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, plot, year,
               rating, genres_json, cast_json, category_id, added_at
        FROM series WHERE id = ?
        "#,
    )
    .bind(&series_id)
    .fetch_optional(&db.pool)
    .await?
    .ok_or_else(|| CommandError::Message("Dizi bulunamadı.".into()))?;

    let playlist = load_playlist_required(&db.pool, series.playlist_id).await?;

    if !matches!(playlist.kind, crate::data::models::PlaylistType::Xtream) {
        return Err(CommandError::Message(
            "M3U playlist'lerde dizi bölümleri desteklenmiyor.".into(),
        ));
    }

    // Series id format: "{playlistId}:series:{xtream_series_id}"
    let xtream_series_id: i64 = series
        .id
        .rsplit(':')
        .next()
        .and_then(|s| s.parse::<i64>().ok())
        .ok_or_else(|| CommandError::Message("Geçersiz dizi kimliği.".into()))?;

    let username = playlist.username.clone()
        .ok_or_else(|| CommandError::Message("Xtream kullanıcı adı yok.".into()))?;
    let password = playlist.password.clone()
        .ok_or_else(|| CommandError::Message("Xtream parolası yok.".into()))?;
    let client = xtream::api::XtreamClient::new(playlist.url.clone(), username, password);

    let info = client.series_info(xtream_series_id).await
        .map_err(|e| CommandError::Message(format!("Bölüm listesi alınamadı: {e:#}")))?;

    let mut episodes: Vec<Episode> = Vec::new();
    for (season_key, eps) in info.episodes.iter() {
        let season: i32 = season_key.parse().unwrap_or(0);
        for ep in eps {
            if let Some(ep_domain) = xtream::mapper::to_episode(ep, season, &series_id, &playlist) {
                episodes.push(ep_domain);
            }
        }
    }
    episodes.sort_by_key(|e| (e.season, e.episode));

    sync_service::replace_episodes_for_series(&db.pool, &series_id, &episodes).await?;
    Ok(episodes)
}

// ─── Categories (movies + series) ────────────────────────────────────────────

/// Categories for one VOD kind, with item counts, ordered by name.
#[tauri::command]
pub async fn get_vod_categories(
    db: State<'_, Db>,
    playlist_id: i64,
    kind: String,
) -> CommandResult<Vec<VodCategoryWithCount>> {
    let kind_filter = match kind.to_uppercase().as_str() {
        "SERIES" => "SERIES",
        _ => "MOVIE",
    };

    // Counts come from the items table — for SERIES that's the `series` table,
    // for MOVIE it's `vod_items`. UNION-style query keeps the SQL simple.
    let rows: Vec<VodCategoryWithCountRow> = if kind_filter == "MOVIE" {
        sqlx::query_as(
            r#"
            SELECT c.id, c.playlist_id, c.name, c.kind,
                   COALESCE(COUNT(i.id), 0) AS item_count
            FROM vod_categories c
            LEFT JOIN vod_items i ON i.category_id = c.id
            WHERE c.playlist_id = ? AND c.kind = 'MOVIE'
            GROUP BY c.id
            ORDER BY c.name COLLATE NOCASE ASC
            "#,
        )
    } else {
        sqlx::query_as(
            r#"
            SELECT c.id, c.playlist_id, c.name, c.kind,
                   COALESCE(COUNT(s.id), 0) AS item_count
            FROM vod_categories c
            LEFT JOIN series s ON s.category_id = c.id
            WHERE c.playlist_id = ? AND c.kind = 'SERIES'
            GROUP BY c.id
            ORDER BY c.name COLLATE NOCASE ASC
            "#,
        )
    }
    .bind(playlist_id)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(|r| VodCategoryWithCount {
        category: VodCategory {
            id: r.id,
            playlist_id: r.playlist_id,
            name: r.name,
            kind: match r.kind.as_str() {
                "SERIES" => VodKind::Series,
                _ => VodKind::Movie,
            },
        },
        count: r.item_count,
    }).collect())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VodCategoryWithCount {
    #[serde(flatten)]
    pub category: VodCategory,
    pub count: i64,
}

#[derive(sqlx::FromRow)]
struct VodCategoryWithCountRow {
    id: String,
    playlist_id: i64,
    name: String,
    kind: String,
    item_count: i64,
}

// ─── "Son eklenen" feeds ────────────────────────────────────────────────────

/// Last-N most recently added movies for the playlist. Sorted by upstream
/// `added_at` (epoch ms, set during sync from Xtream's `added` field). Items
/// without an added_at fall to the bottom — typically older M3U sources.
#[tauri::command]
pub async fn get_recent_movies(
    db: State<'_, Db>,
    playlist_id: i64,
    limit: Option<i64>,
) -> CommandResult<Vec<VodItem>> {
    let lim = limit.unwrap_or(12).clamp(1, 50);
    let rows: Vec<VodItemRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items
        WHERE playlist_id = ? AND kind = 'MOVIE'
        ORDER BY (added_at IS NULL) ASC, added_at DESC, title ASC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(lim)
    .fetch_all(&db.pool)
    .await?;
    Ok(rows.into_iter().map(VodItemRow::into_domain).collect())
}

/// N random movies for the Top 10 / "Önerilen" rail. The `_seed` arg is
/// ignored by the backend (sqlite RANDOM() doesn't take a seed) but is
/// part of the call signature so React Query can cache-key on it — the
/// frontend rolls a per-session seed once at boot, which means we get one
/// fresh shuffle per app launch and a stable list within the session.
#[tauri::command]
pub async fn get_random_movies(
    db: State<'_, Db>,
    playlist_id: i64,
    limit: Option<i64>,
    _seed: Option<i64>,
) -> CommandResult<Vec<VodItem>> {
    let lim = limit.unwrap_or(20).clamp(1, 100);
    let rows: Vec<VodItemRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items
        WHERE playlist_id = ? AND kind = 'MOVIE'
        ORDER BY RANDOM()
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(lim)
    .fetch_all(&db.pool)
    .await?;
    Ok(rows.into_iter().map(VodItemRow::into_domain).collect())
}

#[tauri::command]
pub async fn get_recent_series(
    db: State<'_, Db>,
    playlist_id: i64,
    limit: Option<i64>,
) -> CommandResult<Vec<Series>> {
    let lim = limit.unwrap_or(12).clamp(1, 50);
    let rows: Vec<SeriesRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, plot, year,
               rating, genres_json, cast_json, category_id, added_at
        FROM series
        WHERE playlist_id = ?
        ORDER BY (added_at IS NULL) ASC, added_at DESC, title ASC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(lim)
    .fetch_all(&db.pool)
    .await?;
    Ok(rows.into_iter().map(SeriesRow::into_domain).collect())
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn load_playlist_required(
    pool: &SqlitePool,
    id: i64,
) -> Result<crate::data::models::Playlist, CommandError> {
    let row: Option<PlaylistRow> = sqlx::query_as(
        r#"
        SELECT id, name, type, url, username, password, epg_url, user_agent,
               is_active, last_synced_at, channel_count,
               xtream_username, xtream_status, xtream_exp_date_millis,
               xtream_is_trial, xtream_max_connections
        FROM playlists WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| CommandError::Message(e.to_string()))?;

    row.map(PlaylistRow::into_domain)
        .ok_or_else(|| CommandError::Message(format!("Playlist {id} bulunamadı.")))
}

async fn persist_movie(pool: &SqlitePool, item: &VodItem) -> Result<(), CommandError> {
    let genres = serde_json::to_string(&item.genres).unwrap_or_else(|_| "[]".into());
    let cast = serde_json::to_string(&item.cast).unwrap_or_else(|_| "[]".into());
    sqlx::query(
        r#"
        UPDATE vod_items SET
            poster_url = ?, backdrop_url = ?, year = ?, rating = ?, plot = ?,
            genres_json = ?, cast_json = ?, director = ?, duration_secs = ?
        WHERE id = ?
        "#,
    )
    .bind(item.poster_url.as_deref())
    .bind(item.backdrop_url.as_deref())
    .bind(item.year)
    .bind(item.rating)
    .bind(item.plot.as_deref())
    .bind(genres)
    .bind(cast)
    .bind(item.director.as_deref())
    .bind(item.duration_secs)
    .bind(&item.id)
    .execute(pool)
    .await
    .map_err(|e| CommandError::Message(e.to_string()))?;
    Ok(())
}
