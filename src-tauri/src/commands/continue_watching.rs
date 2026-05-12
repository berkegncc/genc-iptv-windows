//! Continue Watching — periodic position save + recently-watched list.
//!
//! Behaviour matches Android `VodPlayerViewModel.savePosition` (engineering
//! brief 11.2):
//!  - Movies: target_id = movieId,    resume_episode_id = NULL
//!  - Series: target_id = seriesId,   resume_episode_id = currentEpisodeId
//!  - Composite PK (target_id, target_type) collapses an entire series down
//!    to a single row → "Devam Et" never shows two rows for the same show.
//!  - Series row gets upserted on every save, so the resume episode always
//!    points at the most recent episode the user touched.

use tauri::State;

use crate::data::models::{ContinueWatching, TargetType};
use crate::data::rows::ContinueWatchingRow;
use crate::data::Db;

use super::{CommandError, CommandResult};

fn parse_target(t: &str) -> Result<TargetType, CommandError> {
    match t {
        "CHANNEL" => Ok(TargetType::Channel),
        "MOVIE" => Ok(TargetType::Movie),
        "SERIES" => Ok(TargetType::Series),
        _ => Err(CommandError::Message(format!("Bilinmeyen tür: {t}"))),
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePositionPayload {
    pub target_id: String,
    pub target_type: String,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub title: String,
    pub subtitle: Option<String>,
    pub thumbnail_url: Option<String>,
    /// For series only: the ID of the episode the user is currently on.
    pub resume_episode_id: Option<String>,
}

/// Upsert a continue-watching row. Frontend calls this every ~5s during
/// playback and once on player close.
///
/// Special case: if `position_ms` >= ~95% of `duration_ms` (i.e. the user
/// finished it), we delete the row instead — the next session shouldn't
/// resume something they already finished.
#[tauri::command]
pub async fn save_position(
    db: State<'_, Db>,
    payload: SavePositionPayload,
) -> CommandResult<()> {
    let tt = parse_target(&payload.target_type)?;

    // Treat 95%+ as "finished" — drop the row.
    if payload.duration_ms > 0
        && payload.position_ms * 100 >= payload.duration_ms * 95
    {
        sqlx::query("DELETE FROM continue_watching WHERE target_id = ? AND target_type = ?")
            .bind(&payload.target_id)
            .bind(tt.as_db_str())
            .execute(&db.pool)
            .await?;
        return Ok(());
    }

    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        r#"
        INSERT INTO continue_watching
            (target_id, target_type, position_ms, duration_ms, updated_at,
             title, subtitle, thumbnail_url, resume_episode_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(target_id, target_type) DO UPDATE SET
            position_ms = excluded.position_ms,
            duration_ms = excluded.duration_ms,
            updated_at = excluded.updated_at,
            title = excluded.title,
            subtitle = excluded.subtitle,
            thumbnail_url = excluded.thumbnail_url,
            resume_episode_id = excluded.resume_episode_id
        "#,
    )
    .bind(&payload.target_id)
    .bind(tt.as_db_str())
    .bind(payload.position_ms)
    .bind(payload.duration_ms)
    .bind(now)
    .bind(&payload.title)
    .bind(payload.subtitle.as_deref())
    .bind(payload.thumbnail_url.as_deref())
    .bind(payload.resume_episode_id.as_deref())
    .execute(&db.pool)
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn get_continue_watching(
    db: State<'_, Db>,
    limit: Option<i64>,
) -> CommandResult<Vec<ContinueWatching>> {
    let limit = limit.unwrap_or(20).clamp(1, 100);
    let rows: Vec<ContinueWatchingRow> = sqlx::query_as(
        r#"
        SELECT target_id, target_type, position_ms, duration_ms, updated_at,
               title, subtitle, thumbnail_url, resume_episode_id
        FROM continue_watching
        ORDER BY updated_at DESC
        LIMIT ?
        "#,
    )
    .bind(limit)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(ContinueWatchingRow::into_domain).collect())
}

#[tauri::command]
pub async fn get_position(
    db: State<'_, Db>,
    target_id: String,
    target_type: String,
) -> CommandResult<Option<ContinueWatching>> {
    let tt = parse_target(&target_type)?;
    let row: Option<ContinueWatchingRow> = sqlx::query_as(
        r#"
        SELECT target_id, target_type, position_ms, duration_ms, updated_at,
               title, subtitle, thumbnail_url, resume_episode_id
        FROM continue_watching WHERE target_id = ? AND target_type = ?
        "#,
    )
    .bind(&target_id)
    .bind(tt.as_db_str())
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(ContinueWatchingRow::into_domain))
}

#[tauri::command]
pub async fn delete_continue_watching(
    db: State<'_, Db>,
    target_id: String,
    target_type: String,
) -> CommandResult<()> {
    let tt = parse_target(&target_type)?;
    sqlx::query("DELETE FROM continue_watching WHERE target_id = ? AND target_type = ?")
        .bind(&target_id)
        .bind(tt.as_db_str())
        .execute(&db.pool)
        .await?;
    Ok(())
}
