//! Tauri commands for reading channels + categories.

use tauri::State;

use crate::data::models::{CategoryWithCount, Channel};
use crate::data::rows::{CategoryWithCountRow, ChannelRow};
use crate::data::Db;

use super::CommandResult;

/// All channels for a playlist, sorted by group then sort_order then name.
/// Optional fuzzy filter on name + exact category filter.
#[tauri::command]
pub async fn get_channels(
    db: State<'_, Db>,
    playlist_id: i64,
    query: Option<String>,
    category: Option<String>,
) -> CommandResult<Vec<Channel>> {
    let q = query.unwrap_or_default();
    let q_pattern = format!("%{}%", q);
    let has_query = !q.is_empty();
    let has_category = category.is_some();
    let cat = category.unwrap_or_default();

    let rows: Vec<ChannelRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, name, logo_url, stream_url, group_title,
               epg_channel_id, is_hd, sort_order, group_sort_order
        FROM channels
        WHERE playlist_id = ?
          AND (?2 = 0 OR name LIKE ?3)
          AND (?4 = 0 OR group_title = ?5)
        ORDER BY group_sort_order ASC, sort_order ASC, name ASC
        "#,
    )
    .bind(playlist_id)
    .bind(has_query as i32)
    .bind(&q_pattern)
    .bind(has_category as i32)
    .bind(&cat)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(ChannelRow::into_domain).collect())
}

#[tauri::command]
pub async fn get_channel(db: State<'_, Db>, id: String) -> CommandResult<Option<Channel>> {
    let row: Option<ChannelRow> = sqlx::query_as(
        r#"
        SELECT id, playlist_id, name, logo_url, stream_url, group_title,
               epg_channel_id, is_hd, sort_order, group_sort_order
        FROM channels WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(ChannelRow::into_domain))
}

/// Distinct group titles with channel counts, sorted by provider order then alpha.
/// Uses MIN(group_sort_order) so categories with mixed orders surface earliest.
#[tauri::command]
pub async fn get_categories(
    db: State<'_, Db>,
    playlist_id: i64,
) -> CommandResult<Vec<CategoryWithCount>> {
    let rows: Vec<CategoryWithCountRow> = sqlx::query_as(
        r#"
        SELECT group_title AS name, COUNT(*) AS count
        FROM channels
        WHERE playlist_id = ? AND group_title IS NOT NULL
        GROUP BY group_title
        ORDER BY MIN(group_sort_order) ASC, group_title ASC
        "#,
    )
    .bind(playlist_id)
    .fetch_all(&db.pool)
    .await?;

    Ok(rows.into_iter().map(|r| CategoryWithCount {
        name: r.name,
        count: r.count,
    }).collect())
}
