use anyhow::{Context, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;
use std::str::FromStr;

use super::crypto;

/// SQLite database wrapper. Holds the connection pool used by all repositories.
///
/// One pool per app process; commands receive it via `tauri::State<Db>`.
pub struct Db {
    pub pool: SqlitePool,
}

impl Db {
    /// Open or create the database at `<app_data_dir>/genciptv.db` and run
    /// pending migrations. WAL mode + foreign_keys ON.
    pub async fn init(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir)
            .with_context(|| format!("create app data dir: {}", app_data_dir.display()))?;

        let db_path = app_data_dir.join("genciptv.db");
        // sqlx URI form: sqlite://path
        let url = format!("sqlite://{}", db_path.display().to_string().replace('\\', "/"));
        tracing::info!(path = %db_path.display(), "opening sqlite database");

        let options = SqliteConnectOptions::from_str(&url)?
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .acquire_timeout(std::time::Duration::from_secs(15))
            .connect_with(options)
            .await
            .context("connect sqlite pool")?;

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .context("run sqlx migrations")?;

        // One-time idempotent migration: encrypt any legacy plaintext credentials
        // that were stored before DPAPI encryption was introduced. Warns and
        // continues on error — the passthrough shim in crypto::decrypt keeps
        // reads working even for rows that couldn't be migrated.
        if let Err(e) = encrypt_legacy_xtream_credentials(&pool).await {
            tracing::warn!("legacy credential migration failed (non-fatal): {e:#}");
        }

        tracing::info!("database ready");
        Ok(Self { pool })
    }
}

/// Encrypts any Xtream `username` / `password` rows that are still stored as
/// plaintext (no `"dpapi:v1:"` prefix). Idempotent — already-encrypted rows
/// are skipped, so calling this on every startup is safe.
async fn encrypt_legacy_xtream_credentials(pool: &SqlitePool) -> Result<()> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i64,
        username: Option<String>,
        password: Option<String>,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id, username, password FROM playlists WHERE type = 'XTREAM'",
    )
    .fetch_all(pool)
    .await
    .context("fetch Xtream rows for migration")?;

    let mut updated = 0u32;
    let mut tx = pool.begin().await.context("begin migration tx")?;

    for row in rows {
        let new_user = match row.username.as_deref() {
            Some(v) if !v.starts_with("dpapi:v1:") => {
                match crypto::encrypt(v) {
                    Ok(enc) => Some(enc),
                    Err(e) => {
                        tracing::warn!(id = row.id, "could not encrypt username: {e:#}");
                        continue;
                    }
                }
            }
            _ => None, // already tagged or NULL — skip
        };

        let new_pass = match row.password.as_deref() {
            Some(v) if !v.starts_with("dpapi:v1:") => {
                match crypto::encrypt(v) {
                    Ok(enc) => Some(enc),
                    Err(e) => {
                        tracing::warn!(id = row.id, "could not encrypt password: {e:#}");
                        continue;
                    }
                }
            }
            _ => None, // already tagged or NULL — skip
        };

        // Only write if at least one field needs updating.
        if new_user.is_none() && new_pass.is_none() {
            continue;
        }

        let effective_user = new_user
            .as_deref()
            .or(row.username.as_deref());
        let effective_pass = new_pass
            .as_deref()
            .or(row.password.as_deref());

        sqlx::query("UPDATE playlists SET username = ?, password = ? WHERE id = ?")
            .bind(effective_user)
            .bind(effective_pass)
            .bind(row.id)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("update playlist id={}", row.id))?;

        updated += 1;
    }

    tx.commit().await.context("commit migration tx")?;

    if updated > 0 {
        tracing::info!(count = updated, "encrypted legacy Xtream credentials");
    }
    Ok(())
}
