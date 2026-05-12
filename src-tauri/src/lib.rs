use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{fmt, EnvFilter, Registry};

mod commands;
mod data;
mod service;
mod source;

use commands::stream::PlayerHandle;
use data::Db;
use source::proxy;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Hold the file appender's WorkerGuard alive for the lifetime of the
    // process so the background flush thread sticks around. Dropping it
    // means buffered log lines never reach disk.
    let _log_guard = init_logging();

    tauri::Builder::default()
        // Single-instance lock comes first so the second-launch handler
        // can re-focus the existing window before any other plugin / setup
        // code runs in the duplicate process.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Bring the existing main window forward + emit a deep-link
            // event with any startup args (e.g. file association on a
            // second double-click of an .m3u).
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
            forward_startup_args(app, &args);
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        // Updater is scaffolded so a future endpoint just needs the
        // `plugins.updater` block in tauri.conf.json filled in. With no
        // endpoint configured the plugin's `check()` call surfaces a clean
        // "no updater configured" error — the frontend treats it as "no
        // update available".
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let app_data = handle
                .path()
                .app_data_dir()
                .map_err(|e| -> Box<dyn std::error::Error> { Box::from(e.to_string()) })?;

            // Init DB + start the local stream proxy. Both run on the async
            // runtime; setup runs once at startup and we want both ready
            // before any command can fire.
            let (db, proxy_handle) = tauri::async_runtime::block_on(async {
                let db = Db::init(app_data).await?;
                let proxy_handle = proxy::start_proxy().await?;
                Ok::<_, anyhow::Error>((db, proxy_handle))
            })
            .map_err(|e| -> Box<dyn std::error::Error> { Box::from(e.to_string()) })?;

            handle.manage(db);
            handle.manage(proxy_handle);
            handle.manage(PlayerHandle::new());

            // System tray with the standard menu (Aç / Devam Et / Mini
            // Player / Ayarlar / Çıkış). Each action emits a `tray-action`
            // event the frontend listens for and routes accordingly.
            install_tray(app)?;

            // First-run startup args: if the OS handed us a `.m3u` file
            // path (file association double-click) we forward it to the
            // frontend after the webview is ready.
            let args: Vec<String> = std::env::args().collect();
            forward_startup_args(&handle, &args);

            tracing::info!("Genç IPTV ready");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::playlist::get_playlists,
            commands::playlist::get_active_playlist,
            commands::playlist::add_m3u_playlist,
            commands::playlist::add_xtream_playlist,
            commands::playlist::sync_playlist,
            commands::playlist::set_active_playlist,
            commands::playlist::delete_playlist,
            commands::channel::get_channels,
            commands::channel::get_channel,
            commands::channel::get_categories,
            commands::stream::get_proxy_base,
            commands::stream::play_stream,
            commands::stream::stop_stream,
            commands::stream::pause_toggle_stream,
            commands::stream::set_volume_stream,
            commands::stream::toggle_mute_stream,
            commands::stream::toggle_fullscreen,
            commands::stream::seek_relative_stream,
            commands::stream::seek_absolute_stream,
            commands::stream::get_player_status,
            commands::stream::get_tracks,
            commands::stream::set_audio_track,
            commands::stream::set_subtitle_track,
            commands::stream::apply_subtitle_style,
            commands::stream::set_speed,
            commands::stream::set_subtitle_delay,
            commands::stream::apply_player_buffer_prefs,
            commands::stream::acquire_display_lock,
            commands::stream::release_display_lock,
            commands::vod::get_movies,
            commands::vod::get_movie,
            commands::vod::enrich_movie,
            commands::vod::get_series_list,
            commands::vod::get_series_one,
            commands::vod::get_episodes,
            commands::vod::sync_episodes_for_series,
            commands::vod::get_vod_categories,
            commands::vod::get_recent_movies,
            commands::vod::get_recent_series,
            commands::vod::get_random_movies,
            commands::favorite::toggle_favorite,
            commands::favorite::is_favorite,
            commands::favorite::get_favorites,
            commands::continue_watching::save_position,
            commands::continue_watching::get_continue_watching,
            commands::continue_watching::get_position,
            commands::continue_watching::delete_continue_watching,
            commands::epg::get_now_program,
            commands::epg::get_now_programs_bulk,
            commands::epg::get_programs_for_channel,
            commands::epg::get_epg_grid,
            commands::search::search_all,
            commands::recent::add_recent_channel,
            commands::recent::get_recent_channels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── Logging ────────────────────────────────────────────────────────────────

/// Initialise the tracing subscriber with two layers:
///   - stderr (always on; convenient during `cargo tauri dev`)
///   - daily-rotating file in `%APPDATA%\com.genciptv.player\logs\app.log`
///     (production triage — survives crashes since the appender flushes on
///     a background thread).
///
/// Returns the `WorkerGuard`s for the non-blocking writers; the caller has
/// to keep them alive for the process lifetime. Falls back to stderr-only
/// when the log directory can't be created (CI runners, sandboxes, etc.).
fn init_logging() -> Option<WorkerGuard> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,genc_iptv=debug,sqlx=warn"));

    let log_dir = std::env::var("APPDATA")
        .ok()
        .map(|appdata| std::path::PathBuf::from(appdata).join("com.genciptv.player").join("logs"));

    let (file_layer, guard) = match log_dir {
        Some(dir) if std::fs::create_dir_all(&dir).is_ok() => {
            let appender = tracing_appender::rolling::daily(&dir, "app.log");
            let (writer, guard) = tracing_appender::non_blocking(appender);
            let layer = fmt::layer()
                .with_writer(writer)
                .with_ansi(false)
                .with_target(true)
                .with_thread_ids(false)
                .with_line_number(true);
            (Some(layer), Some(guard))
        }
        _ => (None, None),
    };

    let stderr_layer = fmt::layer()
        .with_writer(std::io::stderr)
        .with_target(true);

    let subscriber = Registry::default().with(env_filter).with(stderr_layer);
    if let Some(layer) = file_layer {
        subscriber.with(layer).init();
    } else {
        subscriber.init();
    }

    if guard.is_some() {
        tracing::info!(
            target: "genc_iptv::boot",
            "logging initialised — daily-rotating file appender active"
        );
    } else {
        tracing::warn!(
            target: "genc_iptv::boot",
            "logging initialised — file appender unavailable, stderr only"
        );
    }
    guard
}

// ─── Tray icon + menu ───────────────────────────────────────────────────────

fn install_tray(app: &tauri::App) -> tauri::Result<()> {
    let handle = app.handle();
    let open = MenuItemBuilder::with_id("open", "Aç").build(handle)?;
    let resume = MenuItemBuilder::with_id("resume", "Devam Et").build(handle)?;
    let mini = MenuItemBuilder::with_id("mini", "Mini Player").build(handle)?;
    let settings = MenuItemBuilder::with_id("settings", "Ayarlar").build(handle)?;
    let quit = MenuItemBuilder::with_id("quit", "Çıkış").build(handle)?;

    let menu = MenuBuilder::new(handle)
        .item(&open)
        .item(&resume)
        .separator()
        .item(&mini)
        .item(&settings)
        .separator()
        .item(&quit)
        .build()?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("Genç IPTV")
        .menu(&menu);
    if let Some(icon) = handle.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "quit" => {
                    app.exit(0);
                }
                "open" | "resume" | "mini" | "settings" => {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                    }
                    // Frontend routes the action (e.g. mini → toggle mini
                    // mode, settings → navigate to /settings, etc.)
                    if let Err(err) = app.emit("tray-action", id.to_string()) {
                        tracing::warn!(
                            action = %id,
                            error = ?err,
                            "tray-action emit failed (frontend may have no listener)",
                        );
                    }
                }
                _ => {}
            }
        })
        // Single left-click on the tray icon shows the window — Windows
        // users expect this on top of the right-click menu.
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ─── Startup args (file association) ────────────────────────────────────────

/// Inspect the process args for an `.m3u` / `.m3u8` path. Windows passes the
/// double-clicked file as the first non-flag arg; we forward it to the
/// frontend via the `open-file` event so the existing drag-drop pre-fill
/// flow handles it the same way.
fn forward_startup_args(handle: &tauri::AppHandle, args: &[String]) {
    let path = args
        .iter()
        .skip(1) // [0] is the executable path
        .find(|a| {
            let lower = a.to_ascii_lowercase();
            lower.ends_with(".m3u") || lower.ends_with(".m3u8")
        })
        .cloned();

    let Some(path) = path else { return };
    tracing::info!(%path, "startup file arg received");
    // The frontend may not yet have its event listener attached when the
    // first-run setup fires; emit twice with a short delay so the second
    // emission lands after React has mounted.
    let handle_clone = handle.clone();
    let payload = path.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = handle_clone.emit("open-file", payload.clone()) {
            tracing::warn!(
                path = %payload,
                error = ?err,
                "open-file emit failed on first attempt",
            );
        }
        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        if let Err(err) = handle_clone.emit("open-file", payload.clone()) {
            tracing::warn!(
                path = %payload,
                error = ?err,
                "open-file emit failed on second attempt",
            );
        }
    });
}
