pub mod channel;
pub mod continue_watching;
pub mod epg;
pub mod favorite;
pub mod playlist;
pub mod recent;
pub mod search;
pub mod stream;
pub mod vod;

/// Standard error type for Tauri commands. Wrapping anyhow::Error keeps the
/// frontend protocol simple (string messages) while we keep rich error chains
/// internally via tracing.
#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("{0}")]
    Message(String),
}

impl From<anyhow::Error> for CommandError {
    fn from(e: anyhow::Error) -> Self {
        CommandError::Message(format!("{e:#}"))
    }
}

impl From<sqlx::Error> for CommandError {
    fn from(e: sqlx::Error) -> Self {
        CommandError::Message(format!("{e:#}"))
    }
}

impl serde::Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type CommandResult<T> = Result<T, CommandError>;
