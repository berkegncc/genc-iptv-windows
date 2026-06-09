//! Stream playback commands (Phase 1.7 — libmpv FFI).
//!
//! `play_stream(url, ua, trust)` drives a single libmpv instance whose
//! render output is bound to our main Tauri window via the `wid` property.
//! Video lands inside our own window — no separate process, no separate
//! window — and channel switches reuse the same instance (cheaper than
//! re-init).

use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;

use crate::source::http::sanitize_url;

#[cfg(target_os = "windows")]
use crate::source::mpv_player::{Player, Track};

use super::{CommandError, CommandResult};

/// Default User-Agent. Many IPTV providers reject generic UAs; VLC's UA is
/// nearly universally accepted.
const DEFAULT_UA: &str = "VLC/3.0.20 LibVLC/3.0.20 GencIPTV/1.0 (Windows)";

/// Holds the singleton libmpv player. `manage()`d as Tauri state.
#[derive(Clone, Default)]
pub struct PlayerHandle {
    #[cfg(target_os = "windows")]
    inner: Arc<Mutex<Option<Player>>>,
    #[cfg(not(target_os = "windows"))]
    inner: Arc<Mutex<()>>,
}

impl PlayerHandle {
    pub fn new() -> Self {
        Self::default()
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn play_stream(
    app: tauri::AppHandle,
    state: State<'_, PlayerHandle>,
    url: String,
    user_agent: Option<String>,
    trust_all_certs: Option<bool>,
) -> CommandResult<()> {
    // Empty UA strings (from a settings field the user blanked out) fall
    // back to our default UA — passing "" to mpv breaks header signing.
    let ua = user_agent
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_UA.to_string());
    let trust_all = trust_all_certs.unwrap_or(false);

    let mut guard = state.inner.lock().await;

    // Lazy-init the libmpv instance + bind it to the main window the first
    // time we play. Subsequent channel switches reuse the same instance.
    if guard.is_none() {
        let hwnd = {
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| CommandError::Message("main window not found".into()))?;
            let hwnd = window
                .hwnd()
                .map_err(|e| CommandError::Message(format!("HWND alınamadı: {e}")))?;
            hwnd.0 as isize
        };

        let player = Player::new()
            .map_err(|e| CommandError::Message(format!("libmpv init başarısız: {e:#}")))?;
        player
            .set_window(hwnd)
            .map_err(|e| CommandError::Message(format!("libmpv pencerene bağlanamadı: {e:#}")))?;

        tracing::info!(hwnd, "libmpv attached to main window");
        *guard = Some(player);
    }

    let player = guard.as_ref().unwrap();

    // Many XUI-One based IPTV providers ship with HLS_DISABLED on premium
    // tiers — the `.m3u8` endpoint returns an HTML "HLS has been disabled"
    // error page while the raw `.ts` MPEG-TS endpoint works fine. Swap the
    // extension on the way out so we never trip that path.
    let url = if let Some(stripped) = url.strip_suffix(".m3u8") {
        format!("{stripped}.ts")
    } else if let Some(idx) = url.find(".m3u8?") {
        let mut s = url.clone();
        s.replace_range(idx..idx + ".m3u8".len(), ".ts");
        s
    } else {
        url
    };

    tracing::info!(url = %sanitize_url(&url), ua = %ua, trust_all, "libmpv loadfile");
    player
        .load_url(&url, Some(&ua), trust_all)
        .map_err(|e| CommandError::Message(format!("yayın yüklenemedi: {e:#}")))?;

    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn stop_stream(state: State<'_, PlayerHandle>) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tracing::info!("libmpv stop");
        player
            .stop()
            .map_err(|e| CommandError::Message(format!("durdurulamadı: {e:#}")))?;
    }
    Ok(())
}

// ── Playback controls ───────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn pause_toggle_stream(state: State<'_, PlayerHandle>) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        player
            .pause_toggle()
            .map_err(|e| CommandError::Message(format!("pause toggle: {e:#}")))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn set_volume_stream(
    state: State<'_, PlayerHandle>,
    volume: f64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        // libmpv volume is 0..100 (0..130 with --volume-max). UI sends 0..1.
        let pct = (volume * 100.0).clamp(0.0, 100.0);
        player
            .set_volume(pct)
            .map_err(|e| CommandError::Message(format!("set volume: {e:#}")))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn toggle_mute_stream(state: State<'_, PlayerHandle>) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        player
            .toggle_mute()
            .map_err(|e| CommandError::Message(format!("mute toggle: {e:#}")))?;
    }
    Ok(())
}

// ── VOD-specific seek + status ──────────────────────────────────────────────
//
// Live channels never need these (no scrubbing on a live MPEG-TS feed). VOD
// movies + series episodes do — the scrub bar drives `seek_absolute_stream`
// every drag, and the player polls `get_player_status` ~once a second to
// update the time codes + `save_position` to the DB.

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn seek_relative_stream(
    state: State<'_, PlayerHandle>,
    seconds: f64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        player
            .seek(seconds)
            .map_err(|e| CommandError::Message(format!("seek relative: {e:#}")))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn seek_absolute_stream(
    state: State<'_, PlayerHandle>,
    seconds: f64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        player
            .seek_absolute(seconds)
            .map_err(|e| CommandError::Message(format!("seek absolute: {e:#}")))?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerStatus {
    /// Position in seconds (0 if nothing is loaded).
    pub position_secs: f64,
    /// Total duration in seconds (0 for live streams).
    pub duration_secs: f64,
    pub paused: bool,
    /// Seconds of upcoming video already in the demuxer cache. Low
    /// values (<5s) drive the in-player buffer-health pill.
    pub buffer_secs: f64,
    /// `true` when mpv has stalled playback waiting for the cache to
    /// refill — the unambiguous "buffering" indicator.
    pub paused_for_cache: bool,
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn get_player_status(state: State<'_, PlayerHandle>) -> CommandResult<PlayerStatus> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        Ok(PlayerStatus {
            position_secs: player.position(),
            duration_secs: player.duration(),
            paused: player.is_paused(),
            buffer_secs: player.buffer_duration(),
            paused_for_cache: player.paused_for_cache(),
        })
    } else {
        Ok(PlayerStatus {
            position_secs: 0.0,
            duration_secs: 0.0,
            paused: false,
            buffer_secs: 0.0,
            paused_for_cache: false,
        })
    }
}

// ── Audio + subtitle track selection ───────────────────────────────────────
//
// VOD streams from Xtream often ship with multiple audio tracks (Türkçe dub
// + original) and embedded subtitle tracks. The Watch overlay's "CC" button
// reads `get_tracks` to populate a popover, then calls
// `set_audio_track` / `set_subtitle_track` when the user picks one.

// All three of these wrap their libmpv work in `tokio::task::block_in_place`
// because the underlying mpv calls are synchronous and — for subtitle
// switches on IPTV streams — can sit on the thread for 1-2 seconds while
// mpv seeks backwards to find the start of an active sub. Without
// `block_in_place` that stall pins a Tokio worker thread, which serialises
// every other Tauri command behind it (status polls, mouse-hover IPC,
// volume changes) and the whole UI feels frozen. `block_in_place` tells
// Tokio "I'm doing sync work, hand my pending tasks to another worker"
// — only works inside the multi-thread runtime, which Tauri uses.

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn get_tracks(state: State<'_, PlayerHandle>) -> CommandResult<Vec<Track>> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        let tracks = tokio::task::block_in_place(|| player.tracks());
        Ok(tracks)
    } else {
        Ok(Vec::new())
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn set_audio_track(
    state: State<'_, PlayerHandle>,
    id: i64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| player.set_audio_track(id))
            .map_err(|e| CommandError::Message(format!("set audio: {e:#}")))?;
    }
    Ok(())
}

/// `id == None` disables subtitles entirely (mpv `sid = no`).
#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn set_subtitle_track(
    state: State<'_, PlayerHandle>,
    id: Option<i64>,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| player.set_subtitle_track(id))
            .map_err(|e| CommandError::Message(format!("set subtitle: {e:#}")))?;
    }
    Ok(())
}

// ── Buffer prefs (Settings → Oynatıcı) ──────────────────────────────────────

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn apply_player_buffer_prefs(
    state: State<'_, PlayerHandle>,
    cache_secs: i64,
    network_timeout_secs: i64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| {
            player.apply_buffer_prefs(cache_secs, network_timeout_secs)
        })
        .map_err(|e| CommandError::Message(format!("apply buffer: {e:#}")))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn apply_player_buffer_prefs(
    _state: State<'_, PlayerHandle>,
    _cache_secs: i64,
    _network_timeout_secs: i64,
) -> CommandResult<()> {
    Ok(())
}

// ── Playback speed + subtitle delay ─────────────────────────────────────────

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn set_speed(
    state: State<'_, PlayerHandle>,
    speed: f64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| player.set_speed(speed))
            .map_err(|e| CommandError::Message(format!("set speed: {e:#}")))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn set_speed(
    _state: State<'_, PlayerHandle>,
    _speed: f64,
) -> CommandResult<()> {
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn set_subtitle_delay(
    state: State<'_, PlayerHandle>,
    seconds: f64,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| player.set_subtitle_delay(seconds))
            .map_err(|e| CommandError::Message(format!("set sub-delay: {e:#}")))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn set_subtitle_delay(
    _state: State<'_, PlayerHandle>,
    _seconds: f64,
) -> CommandResult<()> {
    Ok(())
}

// ── Subtitle styling ────────────────────────────────────────────────────────
//
// Mirrors `src/lib/settings.ts:SubtitlePrefs`. We accept the whole prefs
// blob on every change and apply each field as the matching `sub-*`
// libmpv property. Cheap enough (no remuxing, no decoder reset) to
// fire on every settings update.

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubtitleFontFamily {
    Sans,
    Serif,
    Mono,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubtitleFontStyle {
    Regular,
    Bold,
    Italic,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubtitleEdgeType {
    None,
    Outline,
    DropShadow,
    Raised,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubtitleVerticalPosition {
    Top,
    Middle,
    Bottom,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitlePrefs {
    pub font_family: SubtitleFontFamily,
    pub font_style: SubtitleFontStyle,
    pub text_size_percent: f64,
    pub text_color: String,
    pub text_opacity_percent: f64,
    pub background_color: String,
    pub background_opacity_percent: f64,
    pub window_color: String,
    pub window_opacity_percent: f64,
    pub edge_type: SubtitleEdgeType,
    pub edge_color: String,
    pub vertical_position: SubtitleVerticalPosition,
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn apply_subtitle_style(
    state: State<'_, PlayerHandle>,
    prefs: SubtitlePrefs,
) -> CommandResult<()> {
    let guard = state.inner.lock().await;
    if let Some(player) = guard.as_ref() {
        tokio::task::block_in_place(|| player.apply_subtitle_style(&prefs))
            .map_err(|e| CommandError::Message(format!("apply subs: {e:#}")))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn apply_subtitle_style(
    _state: State<'_, PlayerHandle>,
    _prefs: SubtitlePrefs,
) -> CommandResult<()> {
    Ok(())
}

// ── Keep-screen-on ──────────────────────────────────────────────────────────
//
// Per Android brief 11.10: while the player has an active stream we tell
// Windows not to dim the display or sleep the system. Released on player
// dismount so a backgrounded app doesn't keep the screen lit forever.
//
// `SetThreadExecutionState` is a process-wide flag without a real refcount,
// so the frontend has to call acquire/release in matched pairs and never
// double-acquire from concurrent player views. We don't try to be clever
// about that here — Player.tsx + Watch.tsx are mutually exclusive routes.

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn acquire_display_lock() -> CommandResult<()> {
    use windows_sys::Win32::System::Power::{
        SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
    };
    // SAFETY: SetThreadExecutionState is a thread-safe Win32 entry point
    // with no buffer parameters — safe to call from anywhere.
    unsafe {
        SetThreadExecutionState(ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn release_display_lock() -> CommandResult<()> {
    use windows_sys::Win32::System::Power::{SetThreadExecutionState, ES_CONTINUOUS};
    unsafe {
        SetThreadExecutionState(ES_CONTINUOUS);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn acquire_display_lock() -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn release_display_lock() -> CommandResult<()> {
    Ok(())
}

/// Toggle the Tauri main window's fullscreen mode. mpv (as a child window)
/// follows the parent automatically.
#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn toggle_fullscreen(app: tauri::AppHandle) -> CommandResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::Message("main window not found".into()))?;
    let is_fs = window
        .is_fullscreen()
        .map_err(|e| CommandError::Message(format!("is_fullscreen: {e}")))?;
    window
        .set_fullscreen(!is_fs)
        .map_err(|e| CommandError::Message(format!("set_fullscreen: {e}")))?;
    Ok(())
}

// Stub the playback controls for non-Windows so the invoke_handler list still compiles.

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn pause_toggle_stream(_state: State<'_, PlayerHandle>) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn set_volume_stream(
    _state: State<'_, PlayerHandle>,
    _volume: f64,
) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn toggle_mute_stream(_state: State<'_, PlayerHandle>) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn toggle_fullscreen(_app: tauri::AppHandle) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn seek_relative_stream(
    _state: State<'_, PlayerHandle>,
    _seconds: f64,
) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn seek_absolute_stream(
    _state: State<'_, PlayerHandle>,
    _seconds: f64,
) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn get_player_status(_state: State<'_, PlayerHandle>) -> CommandResult<PlayerStatus> {
    Ok(PlayerStatus {
        position_secs: 0.0,
        duration_secs: 0.0,
        paused: false,
        buffer_secs: 0.0,
        paused_for_cache: false,
    })
}

// ─── Stub implementations for non-Windows builds ─────────────────────────────

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn play_stream(
    _app: tauri::AppHandle,
    _state: State<'_, PlayerHandle>,
    _url: String,
    _user_agent: Option<String>,
    _trust_all_certs: Option<bool>,
) -> CommandResult<()> {
    Err(CommandError::Message(
        "Player şu an yalnızca Windows'ta destekleniyor".into(),
    ))
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn stop_stream(_state: State<'_, PlayerHandle>) -> CommandResult<()> {
    Ok(())
}

// Non-Windows stubs for the track APIs so the invoke_handler list still
// compiles. Track concept is mpv-specific and we don't have an mpv backend
// on macOS / Linux yet.

#[cfg(not(target_os = "windows"))]
#[derive(serde::Serialize)]
pub struct Track {
    pub id: i64,
    pub kind: String,
    pub title: Option<String>,
    pub lang: Option<String>,
    pub selected: bool,
    pub default: bool,
    pub codec: Option<String>,
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn get_tracks(_state: State<'_, PlayerHandle>) -> CommandResult<Vec<Track>> {
    Ok(Vec::new())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn set_audio_track(
    _state: State<'_, PlayerHandle>,
    _id: i64,
) -> CommandResult<()> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn set_subtitle_track(
    _state: State<'_, PlayerHandle>,
    _id: Option<i64>,
) -> CommandResult<()> {
    Ok(())
}
