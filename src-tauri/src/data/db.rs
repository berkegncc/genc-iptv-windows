use anyhow::{Context, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;
use std::str::FromStr;

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

        tracing::info!("database ready");
        Ok(Self { pool })
    }
}
