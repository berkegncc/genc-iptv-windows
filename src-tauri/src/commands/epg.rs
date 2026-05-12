//! Tauri commands for reading EPG data after `sync_epg` has populated the
//! `programs` table.
//!
//! Three query shapes:
//!  - `get_now_program` — single programme airing right now on a channel.
//!    Drives the "şu an" pill on the Channels list.
//!  - `get_programs_for_channel` — every programme on one channel inside
//!    a half-open time window. Drives the channel detail / EPG drilldown.
//!  - `get_epg_grid` — left-join channels × programmes inside a time
//!    window. Drives the Guide page's time-axis grid.

use serde::Serialize;
use sqlx::FromRow;
use tauri::State;

use crate::data::models::Program;
use crate::data::rows::{ChannelRow, ProgramRow};
use crate::data::Db;

use super::CommandResult;

/// Programme currently airing on `channel_epg_id` (server-side `now`),
/// or `None` if there isn't one in the DB.
#[tauri::command]
pub async fn get_now_program(
    db: State<'_, Db>,
    playlist_id: i64,
    channel_epg_id: String,
) -> CommandResult<Option<Program>> {
    let now = chrono::Utc::now().timestamp_millis();
    let row: Option<ProgramRow> = sqlx::query_as(
        r#"
        SELECT id, channel_epg_id, playlist_id, title, description,
               start_millis, stop_millis, category
        FROM programs
        WHERE playlist_id = ? AND channel_epg_id = ?
          AND start_millis <= ? AND stop_millis > ?
        ORDER BY start_millis DESC
        LIMIT 1
        "#,
    )
    .bind(playlist_id)
    .bind(&channel_epg_id)
    .bind(now)
    .bind(now)
    .fetch_optional(&db.pool)
    .await?;
    Ok(row.map(ProgramRow::into_domain))
}

/// All programmes on a single channel inside a time window. Ordered
/// chronologically. Use this for a channel-row drilldown.
///
/// `start_millis` is inclusive; `end_millis` is exclusive. Both are epoch ms.
#[tauri::command]
pub async fn get_programs_for_channel(
    db: State<'_, Db>,
    playlist_id: i64,
    channel_epg_id: String,
    start_millis: i64,
    end_millis: i64,
) -> CommandResult<Vec<Program>> {
    let rows: Vec<ProgramRow> = sqlx::query_as(
        r#"
        SELECT id, channel_epg_id, playlist_id, title, description,
               start_millis, stop_millis, category
        FROM programs
        WHERE playlist_id = ? AND channel_epg_id = ?
          AND stop_millis > ? AND start_millis < ?
        ORDER BY start_millis ASC
        "#,
    )
    .bind(playlist_id)
    .bind(&channel_epg_id)
    .bind(start_millis)
    .bind(end_millis)
    .fetch_all(&db.pool)
    .await?;
    Ok(rows.into_iter().map(ProgramRow::into_domain).collect())
}

/// Compact channel projection used by the EPG grid (full Channel struct is
/// noisy here). Stays separate so changes to the Channels API don't ripple
/// through Guide formatting.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GuideChannel {
    pub id: String,
    pub name: String,
    pub logo_url: Option<String>,
    pub epg_channel_id: Option<String>,
    pub group_title: Option<String>,
    pub sort_order: i32,
    pub group_sort_order: i32,
}

impl From<ChannelRow> for GuideChannel {
    fn from(c: ChannelRow) -> Self {
        Self {
            id: c.id,
            name: c.name,
            logo_url: c.logo_url,
            epg_channel_id: c.epg_channel_id,
            group_title: c.group_title,
            sort_order: c.sort_order as i32,
            group_sort_order: c.group_sort_order as i32,
        }
    }
}

/// One row of the Guide grid: a channel + its programmes that overlap the
/// requested time window. Channels with no programmes still appear (so the
/// grid stays tidy) but with an empty `programs` array.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EpgGridRow {
    pub channel: GuideChannel,
    pub programs: Vec<Program>,
}

/// Build the EPG grid for a playlist inside a time window. Channels are
/// returned in the same order as the Channels page (group_sort_order then
/// sort_order then name) so users see a familiar lineup.
///
/// Fetches all rows in two queries (channels + programs) then joins
/// in-process to avoid a 1×N query storm. `start_millis` inclusive,
/// `end_millis` exclusive (both epoch ms).
#[tauri::command]
pub async fn get_epg_grid(
    db: State<'_, Db>,
    playlist_id: i64,
    start_millis: i64,
    end_millis: i64,
) -> CommandResult<Vec<EpgGridRow>> {
    // Pull every channel for the playlist that has an epg_channel_id.
    let channels: Vec<ChannelRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, name, logo_url, stream_url, group_title,
               epg_channel_id, is_hd, sort_order, group_sort_order
        FROM channels
        WHERE playlist_id = ?
          AND epg_channel_id IS NOT NULL
          AND epg_channel_id != ''
        ORDER BY group_sort_order ASC, sort_order ASC, name ASC
        "#,
    )
    .bind(playlist_id)
    .fetch_all(&db.pool)
    .await?;

    // Pull every programme overlapping the window once. Then bucket by
    // channel_epg_id. Avoids issuing one query per channel.
    let programs: Vec<ProgramRow> = sqlx::query_as(
        r#"
        SELECT id, channel_epg_id, playlist_id, title, description,
               start_millis, stop_millis, category
        FROM programs
        WHERE playlist_id = ?
          AND stop_millis > ?
          AND start_millis < ?
        ORDER BY channel_epg_id ASC, start_millis ASC
        "#,
    )
    .bind(playlist_id)
    .bind(start_millis)
    .bind(end_millis)
    .fetch_all(&db.pool)
    .await?;

    use std::collections::HashMap;
    let mut bucket: HashMap<String, Vec<Program>> = HashMap::new();
    for r in programs {
        bucket
            .entry(r.channel_epg_id.clone())
            .or_default()
            .push(ProgramRow::into_domain(r));
    }

    let rows: Vec<EpgGridRow> = channels
        .into_iter()
        .map(|c| {
            let epg_id = c.epg_channel_id.clone().unwrap_or_default();
            let programs = bucket.remove(&epg_id).unwrap_or_default();
            EpgGridRow {
                channel: GuideChannel::from(c),
                programs,
            }
        })
        .collect();

    Ok(rows)
}

/// Bulk variant of `get_now_program` — returns a (epg_channel_id → program)
/// map for every channel on the playlist that has anything airing now.
/// One query, used by the Channels list to paint the "şu an" pills without
/// firing N requests.
#[tauri::command]
pub async fn get_now_programs_bulk(
    db: State<'_, Db>,
    playlist_id: i64,
) -> CommandResult<Vec<(String, Program)>> {
    let now = chrono::Utc::now().timestamp_millis();
    // GROUP BY picks one programme per channel; the MIN(start_millis) tie-
    // breaker keeps things deterministic on overlapping schedules.
    let rows: Vec<NowRow> = sqlx::query_as(
        r#"
        SELECT id, channel_epg_id, playlist_id, title, description,
               start_millis, stop_millis, category
        FROM programs
        WHERE playlist_id = ?
          AND start_millis <= ? AND stop_millis > ?
        GROUP BY channel_epg_id
        ORDER BY channel_epg_id ASC
        "#,
    )
    .bind(playlist_id)
    .bind(now)
    .bind(now)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.channel_epg_id.clone(),
                Program {
                    id: r.id,
                    channel_epg_id: r.channel_epg_id,
                    playlist_id: r.playlist_id,
                    title: r.title,
                    description: r.description,
                    start_millis: r.start_millis,
                    stop_millis: r.stop_millis,
                    category: r.category,
                },
            )
        })
        .collect())
}

#[derive(FromRow)]
struct NowRow {
    id: i64,
    channel_epg_id: String,
    playlist_id: i64,
    title: String,
    description: Option<String>,
    start_millis: i64,
    stop_millis: i64,
    category: Option<String>,
}
