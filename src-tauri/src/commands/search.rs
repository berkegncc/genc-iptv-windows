//! Global Ctrl+F search. Three categories (channels / movies / series)
//! returned in one round-trip so the modal can render all groups
//! simultaneously without firing N queries.
//!
//! Result count is capped per category — the modal shows a "+N more" link
//! that drops the user into the relevant page with the query pre-filled
//! when there's overflow.

use serde::Serialize;
use sqlx::FromRow;
use tauri::State;

use crate::data::Db;

use super::CommandResult;

const PER_CATEGORY_LIMIT: i64 = 8;
const MIN_QUERY_LEN: usize = 2;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub id: String,
    pub title: String,
    /// Group/category for channels, year+rating for movies/series.
    pub subtitle: Option<String>,
    pub poster_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub channels: Vec<SearchHit>,
    pub movies: Vec<SearchHit>,
    pub series: Vec<SearchHit>,
    /// True when at least one category has more rows than `limit` returned.
    pub channels_truncated: bool,
    pub movies_truncated: bool,
    pub series_truncated: bool,
}

/// Global cross-content search. The active playlist scopes everything; we
/// don't search across all playlists because that would surface duplicates
/// (the same channel often appears in multiple lists for the same user).
#[tauri::command]
pub async fn search_all(
    db: State<'_, Db>,
    playlist_id: i64,
    query: String,
) -> CommandResult<SearchResults> {
    let q = query.trim();
    if q.len() < MIN_QUERY_LEN {
        return Ok(SearchResults {
            channels: vec![],
            movies: vec![],
            series: vec![],
            channels_truncated: false,
            movies_truncated: false,
            series_truncated: false,
        });
    }
    let pattern = format!("%{q}%");
    let probe = PER_CATEGORY_LIMIT + 1; // ask for +1 to detect overflow

    // Channels — name LIKE
    let ch_rows: Vec<ChannelHitRow> = sqlx::query_as(
        r#"
        SELECT id, name AS title, group_title AS subtitle, logo_url AS poster_url
        FROM channels
        WHERE playlist_id = ? AND name LIKE ?
        ORDER BY group_sort_order ASC, sort_order ASC, name ASC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(&pattern)
    .bind(probe)
    .fetch_all(&db.pool)
    .await?;

    // Movies — title LIKE; subtitle = year · rating when present
    let mv_rows: Vec<MovieHitRow> = sqlx::query_as(
        r#"
        SELECT id, title, year, rating, poster_url
        FROM vod_items
        WHERE playlist_id = ? AND kind = 'MOVIE' AND title LIKE ?
        ORDER BY title ASC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(&pattern)
    .bind(probe)
    .fetch_all(&db.pool)
    .await?;

    // Series — same shape as movies
    let sr_rows: Vec<SeriesHitRow> = sqlx::query_as(
        r#"
        SELECT id, title, year, rating, poster_url
        FROM series
        WHERE playlist_id = ? AND title LIKE ?
        ORDER BY title ASC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(&pattern)
    .bind(probe)
    .fetch_all(&db.pool)
    .await?;

    let channels_truncated = ch_rows.len() as i64 > PER_CATEGORY_LIMIT;
    let movies_truncated = mv_rows.len() as i64 > PER_CATEGORY_LIMIT;
    let series_truncated = sr_rows.len() as i64 > PER_CATEGORY_LIMIT;

    let channels: Vec<SearchHit> = ch_rows
        .into_iter()
        .take(PER_CATEGORY_LIMIT as usize)
        .map(|r| SearchHit {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            poster_url: r.poster_url,
        })
        .collect();

    let movies: Vec<SearchHit> = mv_rows
        .into_iter()
        .take(PER_CATEGORY_LIMIT as usize)
        .map(|r| SearchHit {
            id: r.id,
            title: r.title,
            subtitle: meta_subtitle(r.year, r.rating),
            poster_url: r.poster_url,
        })
        .collect();

    let series: Vec<SearchHit> = sr_rows
        .into_iter()
        .take(PER_CATEGORY_LIMIT as usize)
        .map(|r| SearchHit {
            id: r.id,
            title: r.title,
            subtitle: meta_subtitle(r.year, r.rating),
            poster_url: r.poster_url,
        })
        .collect();

    Ok(SearchResults {
        channels,
        movies,
        series,
        channels_truncated,
        movies_truncated,
        series_truncated,
    })
}

fn meta_subtitle(year: Option<i64>, rating: Option<f64>) -> Option<String> {
    let mut parts: Vec<String> = Vec::new();
    if let Some(y) = year { parts.push(y.to_string()); }
    if let Some(r) = rating { parts.push(format!("{:.1}", r)); }
    if parts.is_empty() { None } else { Some(parts.join(" · ")) }
}

#[derive(FromRow)]
struct ChannelHitRow {
    id: String,
    title: String,
    subtitle: Option<String>,
    poster_url: Option<String>,
}

#[derive(FromRow)]
struct MovieHitRow {
    id: String,
    title: String,
    year: Option<i64>,
    rating: Option<f64>,
    poster_url: Option<String>,
}

#[derive(FromRow)]
struct SeriesHitRow {
    id: String,
    title: String,
    year: Option<i64>,
    rating: Option<f64>,
    poster_url: Option<String>,
}
