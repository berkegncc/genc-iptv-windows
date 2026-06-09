//! Playlist sync orchestration. Mirrors Android `PlaylistRepository.sync*`.
//!
//! Two paths:
//!  - `sync_m3u` — fetch the .m3u file, parse, build channel rows with
//!    first-seen group-sort-order tracking, bulk-insert in chunks of 500.
//!  - `sync_xtream` — call `get_live_categories` (id→name + id→order maps)
//!    then `get_live_streams`, map via `XtreamMapper`, bulk-insert.
//!    VOD/Series/EPG sync are wrapped separately so a failing sub-call
//!    doesn't abort the live channels (matches Android behaviour).

use anyhow::{Context, Result};
use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::data::models::{Channel, Episode, NewProgram, Playlist, PlaylistType, Series, VodCategory, VodItem, VodKind};
use crate::data::rows::PlaylistRow;
use crate::source::{m3u, xmltv, xtream};

/// Sync a playlist by id. Branches on type. Returns the channel count synced.
///
/// Xtream playlists run live + VOD + Series sync in sequence, but each in its
/// own `runCatching`-style block (per Android brief 11.5): a failure in one
/// area must not abort the others. Live channels are critical — if they fail
/// we propagate. VOD/Series failures are logged at warn but the function
/// still returns the live channel count successfully.
pub async fn sync_playlist(pool: &SqlitePool, playlist_id: i64) -> Result<i64> {
    let playlist = load_playlist(pool, playlist_id).await
        .with_context(|| format!("load playlist {playlist_id}"))?
        .ok_or_else(|| anyhow::anyhow!("playlist {playlist_id} not found"))?;

    let count = match playlist.kind {
        PlaylistType::M3u => sync_m3u(pool, &playlist).await?,
        PlaylistType::Xtream => {
            // Live channels are critical — surface errors.
            let live_count = sync_xtream_live(pool, &playlist).await?;

            // VOD + Series isolated; survive sub-call failures.
            if let Err(e) = sync_xtream_vod(pool, &playlist).await {
                tracing::warn!(error = %e, "xtream VOD sync failed (non-fatal)");
            }
            if let Err(e) = sync_xtream_series(pool, &playlist).await {
                tracing::warn!(error = %e, "xtream Series sync failed (non-fatal)");
            }
            live_count
        }
    };

    // EPG is always optional. A provider that doesn't ship XMLTV shouldn't
    // brick the rest of sync — log + move on (Android brief 11.5).
    if let Err(e) = sync_epg(pool, &playlist).await {
        tracing::warn!(error = %e, "EPG sync failed (non-fatal)");
    }

    Ok(count)
}

// ─── M3U ─────────────────────────────────────────────────────────────────────

async fn sync_m3u(pool: &SqlitePool, playlist: &Playlist) -> Result<i64> {
    let entries = m3u::fetch_and_parse(&playlist.url, playlist.user_agent.as_deref())
        .await
        .with_context(|| format!("fetch m3u: {}", playlist.url))?;

    if entries.is_empty() {
        anyhow::bail!("Empty playlist: no channels found");
    }

    // Track the order each group is first seen — that becomes its sort key.
    let mut group_order: HashMap<String, i32> = HashMap::new();
    let channels: Vec<Channel> = entries.into_iter().enumerate().map(|(i, e)| {
        let group_idx = match e.group_title.as_deref() {
            Some(g) if !g.is_empty() => {
                let next = group_order.len() as i32;
                *group_order.entry(g.to_string()).or_insert(next)
            }
            _ => i32::MAX,
        };
        let id_key = e.tvg_id.clone().unwrap_or_else(|| {
            // Stable hash of display name — Rust's default hasher is randomised,
            // so we use FNV-1a so the id stays consistent across runs.
            format!("{:x}", fnv1a(&e.display_name))
        });
        let name = e.display_name.clone();
        let is_hd = name.to_ascii_uppercase().contains("HD") || name.contains("1080");
        Channel {
            id: format!("{}:{}-{}", playlist.id, i, id_key),
            playlist_id: playlist.id,
            name,
            logo_url: e.tvg_logo,
            stream_url: e.url,
            group_title: e.group_title,
            epg_channel_id: e.tvg_id,
            is_hd,
            sort_order: i as i32,
            group_sort_order: group_idx,
        }
    }).collect();

    let count = channels.len() as i64;
    replace_channels(pool, playlist.id, &channels).await?;
    update_sync_stats(pool, playlist.id, count).await?;
    Ok(count)
}

// ─── Xtream (live channels only — VOD/EPG come in Phase 2/3) ────────────────

async fn sync_xtream_live(pool: &SqlitePool, playlist: &Playlist) -> Result<i64> {
    let username = playlist.username.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing username"))?;
    let password = playlist.password.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing password"))?;

    let client = xtream::api::XtreamClient::new(
        playlist.url.clone(),
        username.to_string(),
        password.to_string(),
    );

    // Categories first — order in the response is the provider-preferred sort.
    // Don't bail if categories request fails; channels can still sync.
    let categories = client.live_categories().await.unwrap_or_default();
    let category_name_by_id: HashMap<String, String> = categories.iter()
        .map(|c| (c.id_string(), c.category_name.clone()))
        .collect();
    let category_order_by_id: HashMap<String, i32> = categories.iter()
        .enumerate()
        .map(|(idx, c)| (c.id_string(), idx as i32))
        .collect();

    let streams = client.live_streams().await
        .context("fetch xtream live streams")?;

    if streams.is_empty() {
        anyhow::bail!("Empty playlist: no channels in Xtream account");
    }

    let channels: Vec<Channel> = streams.iter().enumerate().filter_map(|(i, dto)| {
        xtream::mapper::to_channel(
            dto,
            playlist,
            i as i32,
            &category_name_by_id,
            &category_order_by_id,
        )
    }).collect();

    // Diagnostic: how many channels carry an epgChannelId? Without one the
    // Guide screen can't match programmes even when the XMLTV is valid.
    let with_epg = channels.iter()
        .filter(|c| c.epg_channel_id.as_deref().is_some_and(|s| !s.is_empty()))
        .count();
    let sample: Vec<&str> = channels.iter()
        .filter_map(|c| c.epg_channel_id.as_deref().filter(|s| !s.is_empty()))
        .take(5)
        .collect();
    tracing::info!(
        target: "genc_iptv::sync",
        total = channels.len(),
        with_epg,
        sample = ?sample,
        "xtream live sync"
    );

    let count = channels.len() as i64;
    replace_channels(pool, playlist.id, &channels).await?;
    update_sync_stats(pool, playlist.id, count).await?;

    Ok(count)
}

// ─── VOD (movies) ────────────────────────────────────────────────────────────

async fn sync_xtream_vod(pool: &SqlitePool, playlist: &Playlist) -> Result<()> {
    let username = playlist.username.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing username"))?;
    let password = playlist.password.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing password"))?;

    let client = xtream::api::XtreamClient::new(
        playlist.url.clone(),
        username.to_string(),
        password.to_string(),
    );

    // Categories first — defaults to empty if the call fails so we still
    // record raw items.
    let categories = client.vod_categories().await.unwrap_or_default();
    let category_name_by_id: HashMap<String, String> = categories.iter()
        .map(|c| (c.id_string(), c.category_name.clone()))
        .collect();

    let streams = client.vod_streams().await.context("fetch xtream vod streams")?;

    // Some Xtream providers ship the same `stream_id` twice (different
    // titles, same id) which collides on our PK `{playlistId}:movie:{streamId}`
    // and hard-fails the entire batch insert under sqlite UNIQUE. Dedup by
    // canonical id, first occurrence wins, log the count we dropped so a
    // future provider regression is visible.
    let raw: Vec<VodItem> = streams.iter()
        .filter_map(|dto| xtream::mapper::to_vod_item(dto, playlist))
        .collect();
    let raw_count = raw.len();
    let items = dedup_by_id(raw, |it| it.id.clone());
    let dropped_dups = raw_count - items.len();

    let cat_rows: Vec<VodCategory> = dedup_by_id(
        categories.iter()
            .map(|c| VodCategory {
                id: format!("{}:MOVIE:{}", playlist.id, c.id_string()),
                playlist_id: playlist.id,
                name: c.category_name.clone(),
                kind: VodKind::Movie,
            })
            .collect(),
        |c| c.id.clone(),
    );

    tracing::info!(
        target: "genc_iptv::sync",
        total_items = items.len(),
        dropped_dups,
        categories = cat_rows.len(),
        sample_category = ?category_name_by_id.values().next(),
        "xtream VOD sync"
    );

    replace_vod(pool, playlist.id, VodKind::Movie, &items, &cat_rows).await?;
    Ok(())
}

// ─── Series ──────────────────────────────────────────────────────────────────

async fn sync_xtream_series(pool: &SqlitePool, playlist: &Playlist) -> Result<()> {
    let username = playlist.username.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing username"))?;
    let password = playlist.password.as_deref()
        .ok_or_else(|| anyhow::anyhow!("xtream playlist missing password"))?;

    let client = xtream::api::XtreamClient::new(
        playlist.url.clone(),
        username.to_string(),
        password.to_string(),
    );

    let categories = client.series_categories().await.unwrap_or_default();
    let series_dtos = client.series().await.context("fetch xtream series list")?;

    // Same dedup strategy as VOD — providers occasionally republish the
    // same `series_id` under multiple titles.
    let raw: Vec<Series> = series_dtos.iter()
        .map(|dto| xtream::mapper::to_series(dto, playlist))
        .collect();
    let raw_count = raw.len();
    let series = dedup_by_id(raw, |s| s.id.clone());
    let dropped_dups = raw_count - series.len();

    let cat_rows: Vec<VodCategory> = dedup_by_id(
        categories.iter()
            .map(|c| VodCategory {
                id: format!("{}:SERIES:{}", playlist.id, c.id_string()),
                playlist_id: playlist.id,
                name: c.category_name.clone(),
                kind: VodKind::Series,
            })
            .collect(),
        |c| c.id.clone(),
    );

    tracing::info!(
        target: "genc_iptv::sync",
        total = series.len(),
        dropped_dups,
        categories = cat_rows.len(),
        "xtream Series sync"
    );

    replace_series_list(pool, playlist.id, &series, &cat_rows).await?;
    Ok(())
}

// ─── EPG (XMLTV) ─────────────────────────────────────────────────────────────

/// Resolve the XMLTV endpoint for a playlist. Two strategies:
///  - M3U:    explicit `epg_url` column on the playlist (set during onboarding)
///  - Xtream: derived from the playlist URL via `xmltv.php?username=&password=`
///            unless an explicit `epg_url` was provided.
fn resolve_epg_url(playlist: &Playlist) -> Option<String> {
    if let Some(url) = playlist.epg_url.as_deref().filter(|s| !s.is_empty()) {
        return Some(url.to_string());
    }
    if matches!(playlist.kind, PlaylistType::Xtream) {
        let user = playlist.username.as_deref()?;
        let pass = playlist.password.as_deref()?;
        return Some(crate::source::xtream::url::xmltv(&playlist.url, user, pass));
    }
    None
}

async fn sync_epg(pool: &SqlitePool, playlist: &Playlist) -> Result<()> {
    let Some(url) = resolve_epg_url(playlist) else {
        tracing::info!(playlist_id = playlist.id, "EPG: no source URL, skipping");
        return Ok(());
    };

    let parsed = xmltv::fetch_and_parse(&url, playlist.user_agent.as_deref(), playlist.id)
        .await
        .with_context(|| format!("fetch xmltv: {url}"))?;

    if parsed.programmes.is_empty() {
        tracing::warn!(playlist_id = playlist.id, "EPG: parsed 0 programmes");
        return Ok(());
    }

    // Diagnostic: how many of our channels actually carry an epg_channel_id
    // that matches at least one programme? This is the #1 reason the Guide
    // shows up empty even when the XMLTV is valid.
    let mut programme_channel_sample: Vec<&str> = parsed
        .programmes
        .iter()
        .map(|p| p.channel_epg_id.as_str())
        .collect();
    programme_channel_sample.sort();
    programme_channel_sample.dedup();
    let distinct_channels = programme_channel_sample.len();
    let sample: Vec<&&str> = programme_channel_sample.iter().take(5).collect();
    tracing::info!(
        target: "genc_iptv::sync",
        playlist_id = playlist.id,
        programmes = parsed.programmes.len(),
        distinct_epg_channels = distinct_channels,
        ?sample,
        "XMLTV programmes loaded"
    );

    replace_programs(pool, playlist.id, &parsed.programmes).await?;
    Ok(())
}

/// Replace the program rows for a playlist atomically. Bulk insert in chunks
/// of up to 500 rows × 7 columns to stay under SQLite's 999-parameter cap.
async fn replace_programs(
    pool: &SqlitePool,
    playlist_id: i64,
    programmes: &[NewProgram],
) -> Result<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM programs WHERE playlist_id = ?")
        .bind(playlist_id)
        .execute(&mut *tx)
        .await?;

    for chunk in programmes.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from(
            "INSERT INTO programs (channel_epg_id, playlist_id, title, description, start_millis, stop_millis, category) VALUES "
        );
        let placeholders = std::iter::repeat("(?,?,?,?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);

        let mut query = sqlx::query(&q);
        for p in chunk {
            query = query
                .bind(&p.channel_epg_id)
                .bind(p.playlist_id)
                .bind(&p.title)
                .bind(p.description.as_deref())
                .bind(p.start_millis)
                .bind(p.stop_millis)
                .bind(p.category.as_deref());
        }
        query.execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async fn load_playlist(pool: &SqlitePool, id: i64) -> Result<Option<Playlist>> {
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
    .await?;

    Ok(row.map(PlaylistRow::into_domain).transpose()?)
}

/// Replace all channels for a playlist atomically. Bulk insert in chunks of
/// up to 500 rows × 10 columns to stay safely under SQLite parameter limits.
async fn replace_channels(pool: &SqlitePool, playlist_id: i64, channels: &[Channel]) -> Result<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM channels WHERE playlist_id = ?")
        .bind(playlist_id)
        .execute(&mut *tx)
        .await?;

    for chunk in channels.chunks(500) {
        if chunk.is_empty() {
            continue;
        }
        let mut q = String::from(
            "INSERT INTO channels (id, playlist_id, name, logo_url, stream_url, group_title, epg_channel_id, is_hd, sort_order, group_sort_order) VALUES "
        );
        let placeholders = std::iter::repeat("(?,?,?,?,?,?,?,?,?,?)")
            .take(chunk.len())
            .collect::<Vec<_>>()
            .join(",");
        q.push_str(&placeholders);

        let mut query = sqlx::query(&q);
        for c in chunk {
            query = query
                .bind(&c.id)
                .bind(c.playlist_id)
                .bind(&c.name)
                .bind(c.logo_url.as_deref())
                .bind(&c.stream_url)
                .bind(c.group_title.as_deref())
                .bind(c.epg_channel_id.as_deref())
                .bind(c.is_hd as i32)
                .bind(c.sort_order)
                .bind(c.group_sort_order);
        }
        query.execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

/// Replace all VOD items + categories of a given kind for a playlist atomically.
/// Movies / Series sync each call this with their own kind.
async fn replace_vod(
    pool: &SqlitePool,
    playlist_id: i64,
    kind: VodKind,
    items: &[VodItem],
    categories: &[VodCategory],
) -> Result<()> {
    let mut tx = pool.begin().await?;

    // Wipe categories of this kind for this playlist
    sqlx::query("DELETE FROM vod_categories WHERE playlist_id = ? AND kind = ?")
        .bind(playlist_id)
        .bind(kind.as_db_str())
        .execute(&mut *tx)
        .await?;

    for chunk in categories.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from("INSERT INTO vod_categories (id, playlist_id, name, kind) VALUES ");
        let placeholders = std::iter::repeat("(?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);
        let mut query = sqlx::query(&q);
        for c in chunk {
            query = query.bind(&c.id).bind(c.playlist_id).bind(&c.name).bind(c.kind.as_db_str());
        }
        query.execute(&mut *tx).await?;
    }

    // Wipe items of this kind for this playlist (only Movie kind goes to
    // vod_items table; Series goes to series table — keep this generic).
    sqlx::query("DELETE FROM vod_items WHERE playlist_id = ? AND kind = ?")
        .bind(playlist_id)
        .bind(kind.as_db_str())
        .execute(&mut *tx)
        .await?;

    for chunk in items.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from(
            "INSERT INTO vod_items (id, playlist_id, title, poster_url, backdrop_url, stream_url, kind, year, rating, plot, genres_json, cast_json, director, duration_secs, category_id, added_at) VALUES "
        );
        let placeholders = std::iter::repeat("(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);
        let mut query = sqlx::query(&q);
        for it in chunk {
            let genres = serde_json::to_string(&it.genres).unwrap_or_else(|_| "[]".into());
            let cast = serde_json::to_string(&it.cast).unwrap_or_else(|_| "[]".into());
            query = query
                .bind(&it.id)
                .bind(it.playlist_id)
                .bind(&it.title)
                .bind(it.poster_url.as_deref())
                .bind(it.backdrop_url.as_deref())
                .bind(&it.stream_url)
                .bind(it.kind.as_db_str())
                .bind(it.year)
                .bind(it.rating)
                .bind(it.plot.as_deref())
                .bind(genres)
                .bind(cast)
                .bind(it.director.as_deref())
                .bind(it.duration_secs)
                .bind(it.category_id.as_deref())
                .bind(it.added_at);
        }
        query.execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

/// Replace all series rows + categories for a playlist atomically.
async fn replace_series_list(
    pool: &SqlitePool,
    playlist_id: i64,
    series: &[Series],
    categories: &[VodCategory],
) -> Result<()> {
    let mut tx = pool.begin().await?;

    sqlx::query("DELETE FROM vod_categories WHERE playlist_id = ? AND kind = 'SERIES'")
        .bind(playlist_id)
        .execute(&mut *tx)
        .await?;
    for chunk in categories.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from("INSERT INTO vod_categories (id, playlist_id, name, kind) VALUES ");
        let placeholders = std::iter::repeat("(?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);
        let mut query = sqlx::query(&q);
        for c in chunk {
            query = query.bind(&c.id).bind(c.playlist_id).bind(&c.name).bind(c.kind.as_db_str());
        }
        query.execute(&mut *tx).await?;
    }

    sqlx::query("DELETE FROM series WHERE playlist_id = ?")
        .bind(playlist_id)
        .execute(&mut *tx)
        .await?;
    for chunk in series.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from(
            "INSERT INTO series (id, playlist_id, title, poster_url, backdrop_url, plot, year, rating, genres_json, cast_json, category_id, added_at) VALUES "
        );
        let placeholders = std::iter::repeat("(?,?,?,?,?,?,?,?,?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);
        let mut query = sqlx::query(&q);
        for s in chunk {
            let genres = serde_json::to_string(&s.genres).unwrap_or_else(|_| "[]".into());
            let cast = serde_json::to_string(&s.cast).unwrap_or_else(|_| "[]".into());
            query = query
                .bind(&s.id)
                .bind(s.playlist_id)
                .bind(&s.title)
                .bind(s.poster_url.as_deref())
                .bind(s.backdrop_url.as_deref())
                .bind(s.plot.as_deref())
                .bind(s.year)
                .bind(s.rating)
                .bind(genres)
                .bind(cast)
                .bind(s.category_id.as_deref())
                .bind(s.added_at);
        }
        query.execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

/// Replace all episodes for a single series. Used by the lazy
/// `sync_episodes_for_series` command — fetches `get_series_info` then writes
/// the response in one transaction.
pub async fn replace_episodes_for_series(
    pool: &SqlitePool,
    series_id: &str,
    episodes: &[Episode],
) -> Result<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM episodes WHERE series_id = ?")
        .bind(series_id)
        .execute(&mut *tx)
        .await?;

    for chunk in episodes.chunks(500) {
        if chunk.is_empty() { continue; }
        let mut q = String::from(
            "INSERT INTO episodes (id, series_id, playlist_id, season, episode, title, stream_url, duration_secs, plot, thumbnail_url) VALUES "
        );
        let placeholders = std::iter::repeat("(?,?,?,?,?,?,?,?,?,?)")
            .take(chunk.len()).collect::<Vec<_>>().join(",");
        q.push_str(&placeholders);
        let mut query = sqlx::query(&q);
        for e in chunk {
            query = query
                .bind(&e.id)
                .bind(&e.series_id)
                .bind(e.playlist_id)
                .bind(e.season)
                .bind(e.episode)
                .bind(&e.title)
                .bind(&e.stream_url)
                .bind(e.duration_secs)
                .bind(e.plot.as_deref())
                .bind(e.thumbnail_url.as_deref());
        }
        query.execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

async fn update_sync_stats(pool: &SqlitePool, playlist_id: i64, count: i64) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query("UPDATE playlists SET last_synced_at = ?, channel_count = ? WHERE id = ?")
        .bind(now)
        .bind(count)
        .bind(playlist_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// First-occurrence dedup keyed by an arbitrary id extractor. Used by the
/// Xtream sync paths to swallow upstream's occasional duplicate
/// `stream_id` / `series_id` rows before they hit the SQL UNIQUE
/// constraint and abort the whole batch insert.
fn dedup_by_id<T, F>(items: Vec<T>, key: F) -> Vec<T>
where
    F: Fn(&T) -> String,
{
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut out: Vec<T> = Vec::with_capacity(items.len());
    for it in items {
        let k = key(&it);
        if seen.insert(k) {
            out.push(it);
        }
    }
    out
}

/// Tiny FNV-1a 32-bit hash — used to derive a stable channel id from M3U
/// display names when the playlist doesn't supply tvg-id.
fn fnv1a(s: &str) -> u32 {
    const FNV_OFFSET: u32 = 0x811c_9dc5;
    const FNV_PRIME: u32 = 0x0100_0193;
    let mut hash = FNV_OFFSET;
    for b in s.bytes() {
        hash ^= b as u32;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}
