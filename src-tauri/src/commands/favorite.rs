//! Favorites — channel / movie / series toggling and listing.
//!
//! The favorites table uses a composite (target_id, target_type) PK so
//! adding the same item twice is a no-op. Toggle returns the new state so
//! the frontend can update an in-place star icon without a second query.

use tauri::State;

use crate::data::models::{Favorite, TargetType};
use crate::data::rows::FavoriteRow;
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

/// Toggle favorite status. Returns true if the item is now a favorite,
/// false if it was just removed.
#[tauri::command]
pub async fn toggle_favorite(
    db: State<'_, Db>,
    target_id: String,
    target_type: String,
) -> CommandResult<bool> {
    let tt = parse_target(&target_type)?;
    let tt_str = tt.as_db_str();

    let exists: Option<(String,)> = sqlx::query_as(
        "SELECT target_id FROM favorites WHERE target_id = ? AND target_type = ?",
    )
    .bind(&target_id)
    .bind(tt_str)
    .fetch_optional(&db.pool)
    .await?;

    if exists.is_some() {
        sqlx::query("DELETE FROM favorites WHERE target_id = ? AND target_type = ?")
            .bind(&target_id)
            .bind(tt_str)
            .execute(&db.pool)
            .await?;
        Ok(false)
    } else {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query(
            "INSERT INTO favorites (target_id, target_type, added_at) VALUES (?, ?, ?)",
        )
        .bind(&target_id)
        .bind(tt_str)
        .bind(now)
        .execute(&db.pool)
        .await?;
        Ok(true)
    }
}

#[tauri::command]
pub async fn is_favorite(
    db: State<'_, Db>,
    target_id: String,
    target_type: String,
) -> CommandResult<bool> {
    let tt = parse_target(&target_type)?;
    let exists: Option<(String,)> = sqlx::query_as(
        "SELECT target_id FROM favorites WHERE target_id = ? AND target_type = ?",
    )
    .bind(&target_id)
    .bind(tt.as_db_str())
    .fetch_optional(&db.pool)
    .await?;
    Ok(exists.is_some())
}

/// All favorites of one type (or all if `target_type` is None), most recently
/// added first.
#[tauri::command]
pub async fn get_favorites(
    db: State<'_, Db>,
    target_type: Option<String>,
) -> CommandResult<Vec<Favorite>> {
    let rows: Vec<FavoriteRow> = if let Some(t) = target_type {
        let tt = parse_target(&t)?;
        sqlx::query_as(
            "SELECT target_id, target_type, added_at FROM favorites
             WHERE target_type = ? ORDER BY added_at DESC",
        )
        .bind(tt.as_db_str())
        .fetch_all(&db.pool)
        .await?
    } else {
        sqlx::query_as(
            "SELECT target_id, target_type, added_at FROM favorites
             ORDER BY added_at DESC",
        )
        .fetch_all(&db.pool)
        .await?
    };

    Ok(rows.into_iter().map(FavoriteRow::into_domain).collect())
}
