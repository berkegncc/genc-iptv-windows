//! TMDB-backed poster + cast enrichment for VOD items + series.
//!
//! Direct port of Android `PosterEnricher.kt` (engineering brief 11.4):
//!  - Per-call dedup set so we don't re-query the same title twice
//!  - Bounded concurrency (Semaphore, 6 in flight) — TMDB free tier likes
//!    ≤50 req/s and we want headroom for other HTTP work
//!  - Updates the row even when only one of (poster, cast) is found, so
//!    partial successes still help the UI

use anyhow::Result;
use futures::stream::{FuturesUnordered, StreamExt};
use sqlx::SqlitePool;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::data::rows::{SeriesRow, VodItemRow};
use crate::source::tmdb::TmdbClient;

const MAX_INFLIGHT: usize = 6;

#[derive(Default, Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichmentReport {
    pub movies_seen: usize,
    pub movies_enriched: usize,
    pub series_seen: usize,
    pub series_enriched: usize,
    pub skipped_disabled: bool,
}

/// Walk every VOD item and series for a playlist; for those missing a poster
/// or cast, look them up on TMDB and write the results back. Idempotent —
/// safe to run repeatedly (already-enriched rows are skipped).
pub async fn enrich_playlist(pool: &SqlitePool, playlist_id: i64) -> Result<EnrichmentReport> {
    let tmdb = TmdbClient::from_env();
    let mut report = EnrichmentReport::default();
    if !tmdb.enabled() {
        report.skipped_disabled = true;
        return Ok(report);
    }

    let movies: Vec<VodItemRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, stream_url, kind,
               year, rating, plot, genres_json, cast_json, director,
               duration_secs, category_id, added_at
        FROM vod_items
        WHERE playlist_id = ? AND kind = 'MOVIE'
          -- Bulk enrichment only fills rows that genuinely lack data
          -- (no poster, or empty cast). Rows whose cast is in the legacy
          -- string-array shape but otherwise populated are left alone —
          -- the per-detail TMDB lookup in `enrich_movie` upgrades them
          -- on the fly when the user actually opens the film. That keeps
          -- this batch from re-scanning 10k+ rows on every click.
          AND (poster_url IS NULL OR poster_url = '' OR cast_json = '[]')
        "#,
    )
    .bind(playlist_id)
    .fetch_all(pool)
    .await?;
    report.movies_seen = movies.len();

    let series: Vec<SeriesRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, title, poster_url, backdrop_url, plot, year,
               rating, genres_json, cast_json, category_id, added_at
        FROM series
        WHERE playlist_id = ?
          -- Bulk enrichment only fills rows that genuinely lack data
          -- (no poster, or empty cast). Rows whose cast is in the legacy
          -- string-array shape but otherwise populated are left alone —
          -- the per-detail TMDB lookup in `enrich_movie` upgrades them
          -- on the fly when the user actually opens the film. That keeps
          -- this batch from re-scanning 10k+ rows on every click.
          AND (poster_url IS NULL OR poster_url = '' OR cast_json = '[]')
        "#,
    )
    .bind(playlist_id)
    .fetch_all(pool)
    .await?;
    report.series_seen = series.len();

    let sem = Arc::new(Semaphore::new(MAX_INFLIGHT));
    let pool = pool.clone();
    let tmdb = Arc::new(tmdb);
    let mut attempted: HashSet<String> = HashSet::new();

    // ── Movies ───────────────────────────────────────────────────────────
    let mut tasks = FuturesUnordered::new();
    for m in movies {
        let key = format!("movie::{}::{:?}", m.title, m.year);
        if !attempted.insert(key) {
            continue;
        }
        let sem = sem.clone();
        let pool = pool.clone();
        let tmdb = tmdb.clone();
        tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire_owned().await.ok()?;
            match tmdb.lookup_movie(&m.title, m.year.map(|y| y as i32)).await {
                Ok(Some(hit)) => {
                    if let Err(e) = persist_movie(&pool, &m.id, &hit).await {
                        tracing::warn!(id = %m.id, error = %e, "tmdb persist movie failed");
                        return None;
                    }
                    Some(())
                }
                Ok(None) => None,
                Err(e) => {
                    tracing::warn!(title = %m.title, error = %e, "tmdb movie lookup failed");
                    None
                }
            }
        }));
    }
    while let Some(joined) = tasks.next().await {
        if matches!(joined, Ok(Some(()))) {
            report.movies_enriched += 1;
        }
    }

    // ── Series ───────────────────────────────────────────────────────────
    let mut tasks = FuturesUnordered::new();
    for s in series {
        let key = format!("series::{}::{:?}", s.title, s.year);
        if !attempted.insert(key) {
            continue;
        }
        let sem = sem.clone();
        let pool = pool.clone();
        let tmdb = tmdb.clone();
        tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire_owned().await.ok()?;
            match tmdb.lookup_series(&s.title, s.year.map(|y| y as i32)).await {
                Ok(Some(hit)) => {
                    if let Err(e) = persist_series(&pool, &s.id, &hit).await {
                        tracing::warn!(id = %s.id, error = %e, "tmdb persist series failed");
                        return None;
                    }
                    Some(())
                }
                Ok(None) => None,
                Err(e) => {
                    tracing::warn!(title = %s.title, error = %e, "tmdb series lookup failed");
                    None
                }
            }
        }));
    }
    while let Some(joined) = tasks.next().await {
        if matches!(joined, Ok(Some(()))) {
            report.series_enriched += 1;
        }
    }

    tracing::info!(
        target: "genc_iptv::enrich",
        playlist_id,
        movies_seen = report.movies_seen,
        movies_enriched = report.movies_enriched,
        series_seen = report.series_seen,
        series_enriched = report.series_enriched,
        "TMDB enrichment complete"
    );
    Ok(report)
}

async fn persist_movie(
    pool: &SqlitePool,
    id: &str,
    hit: &crate::source::tmdb::TmdbHit,
) -> Result<()> {
    let cast_json = serde_json::to_string(&hit.cast).unwrap_or_else(|_| "[]".into());
    sqlx::query(
        r#"
        UPDATE vod_items SET
            poster_url = COALESCE(NULLIF(poster_url, ''), ?),
            backdrop_url = COALESCE(NULLIF(backdrop_url, ''), ?),
            plot = COALESCE(NULLIF(plot, ''), ?),
            rating = COALESCE(rating, ?),
            -- Overwrite cast when it's empty OR still in the legacy
            -- string-array shape (no photos). Already-photo'd rows are
            -- left alone so manual edits / future fields aren't clobbered.
            cast_json = CASE
                WHEN cast_json = '[]' THEN ?
                WHEN cast_json LIKE '["%' THEN ?
                ELSE cast_json
            END
        WHERE id = ?
        "#,
    )
    .bind(hit.poster_url.as_deref())
    .bind(hit.backdrop_url.as_deref())
    .bind(hit.plot.as_deref())
    .bind(hit.rating)
    .bind(&cast_json)
    .bind(&cast_json)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

async fn persist_series(
    pool: &SqlitePool,
    id: &str,
    hit: &crate::source::tmdb::TmdbHit,
) -> Result<()> {
    let cast_json = serde_json::to_string(&hit.cast).unwrap_or_else(|_| "[]".into());
    sqlx::query(
        r#"
        UPDATE series SET
            poster_url = COALESCE(NULLIF(poster_url, ''), ?),
            backdrop_url = COALESCE(NULLIF(backdrop_url, ''), ?),
            plot = COALESCE(NULLIF(plot, ''), ?),
            rating = COALESCE(rating, ?),
            -- Overwrite cast when it's empty OR still in the legacy
            -- string-array shape (no photos). Already-photo'd rows are
            -- left alone so manual edits / future fields aren't clobbered.
            cast_json = CASE
                WHEN cast_json = '[]' THEN ?
                WHEN cast_json LIKE '["%' THEN ?
                ELSE cast_json
            END
        WHERE id = ?
        "#,
    )
    .bind(hit.poster_url.as_deref())
    .bind(hit.backdrop_url.as_deref())
    .bind(hit.plot.as_deref())
    .bind(hit.rating)
    .bind(&cast_json)
    .bind(&cast_json)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}
