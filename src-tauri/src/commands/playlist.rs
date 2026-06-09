//! Tauri commands for playlist CRUD + sync. Frontend invokes via:
//!   `invoke('add_m3u_playlist', { ... })`
//!
//! All commands return either the requested data or a `CommandError` which
//! serializes as a plain string for JS to display in a Toast.

use serde::Deserialize;
use tauri::State;

use crate::data::crypto;
use crate::data::models::Playlist;
use crate::data::rows::PlaylistRow;
use crate::data::Db;
use crate::service::sync_service;
use crate::source::xtream;

use super::{CommandError, CommandResult};

// ─── List / get ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_playlists(db: State<'_, Db>) -> CommandResult<Vec<Playlist>> {
    let rows: Vec<PlaylistRow> = sqlx::query_as(
        r#"
        SELECT id, name, type, url, username, password, epg_url, user_agent,
               is_active, last_synced_at, channel_count,
               xtream_username, xtream_status, xtream_exp_date_millis,
               xtream_is_trial, xtream_max_connections
        FROM playlists ORDER BY id ASC
        "#,
    )
    .fetch_all(&db.pool)
    .await?;

    let playlists = rows
        .into_iter()
        .map(PlaylistRow::into_domain)
        .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(playlists)
}

#[tauri::command]
pub async fn get_active_playlist(db: State<'_, Db>) -> CommandResult<Option<Playlist>> {
    let row: Option<PlaylistRow> = sqlx::query_as(
        r#"
        SELECT id, name, type, url, username, password, epg_url, user_agent,
               is_active, last_synced_at, channel_count,
               xtream_username, xtream_status, xtream_exp_date_millis,
               xtream_is_trial, xtream_max_connections
        FROM playlists WHERE is_active = 1 LIMIT 1
        "#,
    )
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(PlaylistRow::into_domain).transpose()?)
}

// ─── Add / sync / delete ─────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddM3uPayload {
    pub name: String,
    pub url: String,
    pub epg_url: Option<String>,
    pub user_agent: Option<String>,
}

#[tauri::command]
pub async fn add_m3u_playlist(
    db: State<'_, Db>,
    payload: AddM3uPayload,
) -> CommandResult<i64> {
    // Insert as inactive first; sync; then mark active.
    let res = sqlx::query(
        "INSERT INTO playlists (name, type, url, epg_url, user_agent, is_active) VALUES (?, 'M3U', ?, ?, ?, 0)",
    )
    .bind(&payload.name)
    .bind(&payload.url)
    .bind(payload.epg_url.as_deref())
    .bind(payload.user_agent.as_deref())
    .execute(&db.pool)
    .await?;
    let id = res.last_insert_rowid();

    sync_service::sync_playlist(&db.pool, id).await?;
    activate(&db.pool, id).await?;
    Ok(id)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddXtreamPayload {
    pub name: String,
    pub server_url: String,
    pub username: String,
    pub password: String,
}

#[tauri::command]
pub async fn add_xtream_playlist(
    db: State<'_, Db>,
    payload: AddXtreamPayload,
) -> CommandResult<i64> {
    // Validate auth first — fast feedback if creds are wrong.
    let client = xtream::api::XtreamClient::new(
        payload.server_url.clone(),
        payload.username.clone(),
        payload.password.clone(),
    );
    let auth = client.user_info().await.map_err(|e| {
        CommandError::Message(format!("Xtream doğrulama başarısız: {e:#}"))
    })?;
    let info = xtream::mapper::to_user_info(&auth)
        .ok_or_else(|| CommandError::Message("Xtream sunucusu kimlik bilgilerini doğrulamadı.".into()))?;

    // Encrypt credentials before storage. Validation above uses raw
    // payload.username/password — encryption only happens at the write site.
    let enc_user = crypto::encrypt(&payload.username)
        .map_err(|e| CommandError::Message(e.to_string()))?;
    let enc_pass = crypto::encrypt(&payload.password)
        .map_err(|e| CommandError::Message(e.to_string()))?;

    let is_trial_int = info.is_trial as i32;
    let res = sqlx::query(
        r#"
        INSERT INTO playlists
            (name, type, url, username, password, is_active,
             xtream_username, xtream_status, xtream_exp_date_millis,
             xtream_is_trial, xtream_max_connections)
        VALUES (?, 'XTREAM', ?, ?, ?, 0, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.server_url)
    .bind(&enc_user)
    .bind(&enc_pass)
    .bind(&info.username)  // xtream_username is the display field — stays plaintext
    .bind(&info.status)
    .bind(info.exp_date_millis)
    .bind(is_trial_int)
    .bind(info.max_connections)
    .execute(&db.pool)
    .await?;
    let id = res.last_insert_rowid();

    sync_service::sync_playlist(&db.pool, id).await?;
    activate(&db.pool, id).await?;
    Ok(id)
}

#[tauri::command]
pub async fn sync_playlist(db: State<'_, Db>, id: i64) -> CommandResult<i64> {
    let count = sync_service::sync_playlist(&db.pool, id).await?;
    Ok(count)
}

#[tauri::command]
pub async fn set_active_playlist(db: State<'_, Db>, id: i64) -> CommandResult<()> {
    activate(&db.pool, id).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_playlist(db: State<'_, Db>, id: i64) -> CommandResult<()> {
    sqlx::query("DELETE FROM playlists WHERE id = ?")
        .bind(id)
        .execute(&db.pool)
        .await?;
    Ok(())
}

async fn activate(pool: &sqlx::SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE playlists SET is_active = 0").execute(&mut *tx).await?;
    sqlx::query("UPDATE playlists SET is_active = 1 WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await
}
