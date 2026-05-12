//! Recently-played channels — backs the Home page's "Son izlenen kanallar"
//! rail. We stamp `played_at` on every player open and trim to a max of 30
//! rows so an old channel naturally falls off.
//!
//! Mirrors Android `UserPreferencesService.recentChannels` (FIFO, dedup'd)
//! but lives in SQLite here so we can join against the channels table for
//! display fields without round-tripping through prefs.

use tauri::State;

use crate::data::models::Channel;
use crate::data::rows::ChannelRow;
use crate::data::Db;

use super::CommandResult;

const MAX_RECENT: i64 = 30;

#[tauri::command]
pub async fn add_recent_channel(
    db: State<'_, Db>,
    channel_id: String,
) -> CommandResult<()> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut tx = db.pool.begin().await?;
    sqlx::query(
        r#"
        INSERT INTO recent_channels (channel_id, played_at)
        VALUES (?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET played_at = excluded.played_at
        "#,
    )
    .bind(&channel_id)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    // Trim oldest rows beyond MAX_RECENT. Cheap because the index makes the
    // ordering query fast and we delete by rowid.
    sqlx::query(
        r#"
        DELETE FROM recent_channels
        WHERE channel_id IN (
            SELECT channel_id FROM recent_channels
            ORDER BY played_at DESC
            LIMIT -1 OFFSET ?
        )
        "#,
    )
    .bind(MAX_RECENT)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

/// Last N channels played on the given playlist, most recent first. Channels
/// from other playlists are filtered out because their stream URLs/credentials
/// belong to a different account.
#[tauri::command]
pub async fn get_recent_channels(
    db: State<'_, Db>,
    playlist_id: i64,
    limit: Option<i64>,
) -> CommandResult<Vec<Channel>> {
    let lim = limit.unwrap_or(8).clamp(1, MAX_RECENT);
    let rows: Vec<ChannelRow> = sqlx::query_as(
        r#"
        SELECT c.id, c.playlist_id, c.name, c.logo_url, c.stream_url,
               c.group_title, c.epg_channel_id, c.is_hd, c.sort_order,
               c.group_sort_order
        FROM recent_channels r
        INNER JOIN channels c ON c.id = r.channel_id
        WHERE c.playlist_id = ?
        ORDER BY r.played_at DESC
        LIMIT ?
        "#,
    )
    .bind(playlist_id)
    .bind(lim)
    .fetch_all(&db.pool)
    .await?;
    Ok(rows.into_iter().map(ChannelRow::into_domain).collect())
}
