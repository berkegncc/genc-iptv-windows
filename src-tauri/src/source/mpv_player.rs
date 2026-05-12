//! libmpv FFI player. Phase 1.7 replacement for the mpv.exe sidecar:
//! attaches mpv directly to a Win32 child window (`wid` property) so video
//! renders inside our Tauri window instead of a separate process window.

#![cfg(target_os = "windows")]

use anyhow::{anyhow, Result};
use libmpv2::Mpv;

/// Wrap libmpv's non-`std::error::Error` `Error` into anyhow.
fn mpv_err(prefix: &str, e: libmpv2::Error) -> anyhow::Error {
    anyhow!("{prefix}: {e:?}")
}

/// Best-effort `set_property` — used for IPTV-tuned defaults during
/// Player init where some keys are codec/build-conditional. Failures
/// are logged at `debug` level instead of silently dropped so we can
/// diagnose stream issues without piping every miss into `INFO`.
macro_rules! try_set {
    ($mpv:expr, $key:expr, $value:expr) => {{
        if let Err(err) = $mpv.set_property($key, $value) {
            tracing::debug!(
                key = $key,
                error = ?err,
                "mpv property set failed (best-effort)",
            );
        }
    }};
}

pub struct Player {
    mpv: Mpv,
}

impl Player {
    pub fn new() -> Result<Self> {
        let mpv = Mpv::new().map_err(|e| mpv_err("init libmpv", e))?;

        // ── Debug log ────────────────────────────────────────────────────
        // Route mpv's internal log to %APPDATA%\com.genciptv.player\mpv.log
        // so we can see why a stream refuses to play (codec missing,
        // network error, etc.). Verbose msg-level captures HTTP status,
        // demuxer guesses, decoder choice — everything useful for triage.
        if let Ok(appdata) = std::env::var("APPDATA") {
            let dir = format!(r"{appdata}\com.genciptv.player");
            if let Err(err) = std::fs::create_dir_all(&dir) {
                tracing::debug!(path = %dir, error = ?err, "mpv log dir create failed");
            }
            let log_path = format!(r"{dir}\mpv.log");
            try_set!(mpv, "log-file", log_path.as_str());
            tracing::info!(path = %log_path, "mpv log routed to file");
        }
        try_set!(mpv, "msg-level", "all=v");

        // ── IPTV-tuned defaults ───────────────────────────────────────────
        // All `try_set!` calls are best-effort. Some keys are
        // codec/build-conditional (e.g. `hwdec` value depends on what's
        // compiled in) and failures land on a `tracing::debug` line for
        // later triage — they don't bubble up.

        // Hardware decode — d3d11va is the modern Windows accelerator;
        // `auto-safe` falls through to it when available, software when not.
        // Many 4K HEVC streams will *only* play at full framerate via HW.
        try_set!(mpv, "hwdec", "auto-safe");
        try_set!(mpv, "hwdec-codecs", "all");

        // Modern GPU video output. `gpu-next` (mpv >=0.36) is faster + has
        // better HDR / wide-gamut handling than the legacy `gpu`.
        try_set!(mpv, "vo", "gpu-next");
        try_set!(mpv, "gpu-api", "d3d11");
        try_set!(mpv, "gpu-context", "d3d11");

        // mpv built-in UI bits — keep these on so users get a familiar OSC
        // when they hit Space / hover the bottom of the video.
        try_set!(mpv, "osc", "yes");
        try_set!(mpv, "osd-bar", "yes");

        // Don't stay open at end-of-stream (live IPTV has no real EOF; we
        // close the window when the user navigates away, not when the
        // upstream blips).
        try_set!(mpv, "keep-open", "no");

        // ── Network + buffering ───────────────────────────────────────────
        // 4K HEVC at high bitrate needs more demuxer headroom or it stalls
        // mid-segment. Bump generously — these are RAM caps, not preallocs.
        try_set!(mpv, "cache", "yes");
        try_set!(mpv, "cache-secs", "20");
        try_set!(mpv, "demuxer-max-bytes", "400MiB");
        try_set!(mpv, "demuxer-max-back-bytes", "100MiB");

        // Network resilience for IPTV — auto-reconnect on TCP drops, longer
        // timeouts, larger socket buffer. Without these mpv just gives up
        // on the first hiccup and the user sees a black screen.
        try_set!(mpv, "network-timeout", "60");
        try_set!(mpv, "stream-buffer-size", "8MiB");
        try_set!(
            mpv,
            "stream-lavf-o",
            "reconnect=1,reconnect_streamed=1,reconnect_on_network_error=1,reconnect_delay_max=5"
        );

        // ── Sync + audio ──────────────────────────────────────────────────
        // `display-resample` keeps video on the monitor's refresh and
        // resamples audio to match — smooth for live HD/4K.
        try_set!(mpv, "video-sync", "display-resample");
        // Match upstream container's audio sample rate when possible
        // (DTS/AC3 friendly).
        try_set!(mpv, "audio-channels", "auto-safe");
        // Force volume scaling in dB so mpv volume + Tauri slider line up.
        try_set!(mpv, "volume-max", "100");

        Ok(Self { mpv })
    }

    /// Bind mpv's render output to a parent Win32 window.
    pub fn set_window(&self, hwnd: isize) -> Result<()> {
        self.mpv
            .set_property("wid", hwnd as i64)
            .map_err(|e| mpv_err("set wid", e))?;
        Ok(())
    }

    pub fn load_url(
        &self,
        url: &str,
        user_agent: Option<&str>,
        trust_all_certs: bool,
    ) -> Result<()> {
        if let Some(ua) = user_agent {
            try_set!(self.mpv, "user-agent", ua);
        }
        // mpv's `tls-verify` defaults to `yes`. Flip it to `no` when the
        // user has opted into trust-all-certs in Settings → Oynatıcı; the
        // default stays strict so plain users can't accidentally accept
        // a man-in-the-middle.
        try_set!(self.mpv, "tls-verify", !trust_all_certs);
        self.mpv
            .command("loadfile", &[url])
            .map_err(|e| mpv_err("loadfile", e))?;
        Ok(())
    }

    pub fn stop(&self) -> Result<()> {
        self.mpv
            .command("stop", &[])
            .map_err(|e| mpv_err("stop", e))?;
        Ok(())
    }

    pub fn pause_toggle(&self) -> Result<()> {
        self.mpv
            .command("cycle", &["pause"])
            .map_err(|e| mpv_err("cycle pause", e))?;
        Ok(())
    }

    pub fn set_volume(&self, percent: f64) -> Result<()> {
        self.mpv
            .set_property("volume", percent)
            .map_err(|e| mpv_err("set volume", e))?;
        Ok(())
    }

    pub fn toggle_mute(&self) -> Result<()> {
        self.mpv
            .command("cycle", &["mute"])
            .map_err(|e| mpv_err("cycle mute", e))?;
        Ok(())
    }

    pub fn seek(&self, seconds: f64) -> Result<()> {
        self.mpv
            .command("seek", &[&seconds.to_string(), "relative"])
            .map_err(|e| mpv_err("seek", e))?;
        Ok(())
    }

    /// Jump to an absolute timestamp (seconds). Used by the VOD scrub bar.
    pub fn seek_absolute(&self, seconds: f64) -> Result<()> {
        self.mpv
            .command("seek", &[&seconds.to_string(), "absolute"])
            .map_err(|e| mpv_err("seek absolute", e))?;
        Ok(())
    }

    /// Current playback position in seconds, or 0.0 when nothing is loaded.
    pub fn position(&self) -> f64 {
        self.mpv
            .get_property::<f64>("time-pos")
            .unwrap_or(0.0)
    }

    /// Total duration in seconds. Live streams (no EOF) report 0.0.
    pub fn duration(&self) -> f64 {
        self.mpv
            .get_property::<f64>("duration")
            .unwrap_or(0.0)
    }

    /// Whether mpv is currently paused.
    pub fn is_paused(&self) -> bool {
        self.mpv.get_property::<bool>("pause").unwrap_or(false)
    }

    /// Seconds of buffered video ahead of the current playhead. 0 when
    /// nothing's loaded; very low values (<2s) mean the player is one
    /// network hiccup away from a buffering stall.
    pub fn buffer_duration(&self) -> f64 {
        self.mpv
            .get_property::<f64>("demuxer-cache-duration")
            .unwrap_or(0.0)
    }

    /// True while mpv has stalled playback waiting for the demuxer
    /// cache to refill. This is the canonical "actually buffering"
    /// signal — `is_paused` would be false during the stall because
    /// the user didn't pause; mpv did.
    pub fn paused_for_cache(&self) -> bool {
        self.mpv
            .get_property::<bool>("paused-for-cache")
            .unwrap_or(false)
    }

    // ─── Audio + subtitle tracks ───────────────────────────────────────────

    /// Snapshot of every track libmpv knows about (audio, subtitle, video).
    /// Walked manually via `track-list/<N>/<field>` rather than parsing the
    /// stringified JSON because libmpv2 exposes the indexed form natively
    /// and it's resilient to mpv's evolving JSON schema.
    pub fn tracks(&self) -> Vec<Track> {
        let count: i64 = match self.mpv.get_property("track-list/count") {
            Ok(n) => n,
            Err(_) => return Vec::new(),
        };
        let mut out = Vec::with_capacity(count as usize);
        for i in 0..count {
            let kind: String = match self.mpv.get_property(&format!("track-list/{i}/type")) {
                Ok(s) => s,
                Err(_) => continue,
            };
            let id: i64 = match self.mpv.get_property(&format!("track-list/{i}/id")) {
                Ok(n) => n,
                Err(_) => continue,
            };
            let title: Option<String> = self
                .mpv
                .get_property(&format!("track-list/{i}/title"))
                .ok();
            let lang: Option<String> = self
                .mpv
                .get_property(&format!("track-list/{i}/lang"))
                .ok();
            let selected: bool = self
                .mpv
                .get_property(&format!("track-list/{i}/selected"))
                .unwrap_or(false);
            let default: bool = self
                .mpv
                .get_property(&format!("track-list/{i}/default"))
                .unwrap_or(false);
            let codec: Option<String> = self
                .mpv
                .get_property(&format!("track-list/{i}/codec"))
                .ok();
            out.push(Track {
                id,
                kind,
                title,
                lang,
                selected,
                default,
                codec,
            });
        }
        out
    }

    /// Switch the active audio track. mpv's `aid` accepts numeric IDs
    /// (1-indexed within audio tracks) or the special string `"no"` to
    /// mute / disable. We always pass the numeric id from the track list.
    pub fn set_audio_track(&self, id: i64) -> Result<()> {
        self.mpv
            .set_property("aid", id)
            .map_err(|e| mpv_err("set aid", e))?;
        Ok(())
    }

    /// Apply user-tunable buffer prefs from Settings → Oynatıcı. mpv
    /// keeps these as runtime properties — change once, the new values
    /// take effect on the current and future streams.
    ///
    /// `cache_secs` ≈ how far ahead the demuxer tries to stay (5-120s).
    /// `network_timeout_secs` ≈ patience before mpv gives up on a
    /// stalled read (10-120s).
    pub fn apply_buffer_prefs(
        &self,
        cache_secs: i64,
        network_timeout_secs: i64,
    ) -> Result<()> {
        let cache = cache_secs.clamp(5, 120);
        let timeout = network_timeout_secs.clamp(10, 120);
        try_set!(self.mpv, "cache-secs", cache.to_string().as_str());
        try_set!(self.mpv, "network-timeout", timeout.to_string().as_str());
        Ok(())
    }

    /// Set playback speed. `1.0` is normal, `2.0` double-speed, `0.5`
    /// half-speed. mpv accepts the full 0.01..100 range but the UI clamps
    /// to a sensible set of presets.
    pub fn set_speed(&self, speed: f64) -> Result<()> {
        self.mpv
            .set_property("speed", speed.clamp(0.25, 4.0))
            .map_err(|e| mpv_err("set speed", e))?;
        Ok(())
    }

    /// Shift subtitle timing in seconds (positive = subs appear later,
    /// negative = earlier). Used by the in-player +/- sync controls.
    pub fn set_subtitle_delay(&self, seconds: f64) -> Result<()> {
        self.mpv
            .set_property("sub-delay", seconds)
            .map_err(|e| mpv_err("set sub-delay", e))?;
        Ok(())
    }

    /// Switch the active subtitle track, or disable subtitles entirely
    /// when `id` is `None`. `sid` accepts numeric IDs or `"no"` for off.
    pub fn set_subtitle_track(&self, id: Option<i64>) -> Result<()> {
        match id {
            Some(n) => {
                self.mpv
                    .set_property("sid", n)
                    .map_err(|e| mpv_err("set sid", e))?;
            }
            None => {
                self.mpv
                    .set_property("sid", "no")
                    .map_err(|e| mpv_err("set sid no", e))?;
            }
        }
        Ok(())
    }

    // ─── Subtitle styling ──────────────────────────────────────────────────
    //
    // Maps Settings → Altyazı prefs onto mpv's `sub-*` properties. Each
    // `set_property` is fire-and-forget (failures are logged but ignored)
    // because some properties are codec-conditional and an unsupported
    // value on one shouldn't poison the whole batch.

    pub fn apply_subtitle_style(
        &self,
        prefs: &crate::commands::stream::SubtitlePrefs,
    ) -> Result<()> {
        use crate::commands::stream::{
            SubtitleEdgeType, SubtitleFontFamily, SubtitleFontStyle,
            SubtitleVerticalPosition,
        };

        // Force mpv to honour our styling for ASS/SSA subs too. Default
        // (`no`) keeps the embedded style and would silently ignore the
        // user's preferences for any MKV with proper subtitle styling
        // baked in — which is most of them.
        try_set!(self.mpv, "sub-ass-override", "force");

        // Font family — use CSS-style generic names so mpv resolves
        // against whatever the OS has installed locally.
        let font = match prefs.font_family {
            SubtitleFontFamily::Sans => "sans-serif",
            SubtitleFontFamily::Serif => "serif",
            SubtitleFontFamily::Mono => "monospace",
        };
        try_set!(self.mpv, "sub-font", font);

        // Weight / italic. Only takes effect on text subs + ASS subs
        // when sub-ass-override is on (set above).
        let bold = matches!(prefs.font_style, SubtitleFontStyle::Bold);
        let italic = matches!(prefs.font_style, SubtitleFontStyle::Italic);
        try_set!(self.mpv, "sub-bold", bold);
        try_set!(self.mpv, "sub-italic", italic);

        // Scale — mpv default font is ~55px on 1080p; `sub-scale` is the
        // multiplier the user effectively controls via "%".
        let scale = (prefs.text_size_percent / 100.0).clamp(0.1, 4.0);
        try_set!(self.mpv, "sub-scale", scale);

        // Colours. mpv accepts "#AARRGGBB" — alpha first, NOT the CSS order.
        let text = ass_color(&prefs.text_color, prefs.text_opacity_percent);
        try_set!(self.mpv, "sub-color", text.as_str());
        let back = ass_color(&prefs.background_color, prefs.background_opacity_percent);
        try_set!(self.mpv, "sub-back-color", back.as_str());
        // `windowColor` doesn't have a clean mpv equivalent (mpv has no
        // outer subtitle window concept beyond `sub-back-color`); skipped
        // intentionally so it doesn't fight with backgroundColor.

        // Edge type — none / outline / drop shadow / raised.
        let edge_rgba = ass_color(&prefs.edge_color, 100.0);
        match prefs.edge_type {
            SubtitleEdgeType::None => {
                try_set!(self.mpv, "sub-border-size", 0.0_f64);
                try_set!(self.mpv, "sub-shadow-offset", 0.0_f64);
            }
            SubtitleEdgeType::Outline => {
                try_set!(self.mpv, "sub-border-color", edge_rgba.as_str());
                try_set!(self.mpv, "sub-border-size", 2.5_f64);
                try_set!(self.mpv, "sub-shadow-offset", 0.0_f64);
            }
            SubtitleEdgeType::DropShadow => {
                try_set!(self.mpv, "sub-border-size", 0.0_f64);
                try_set!(self.mpv, "sub-shadow-color", edge_rgba.as_str());
                try_set!(self.mpv, "sub-shadow-offset", 3.0_f64);
            }
            SubtitleEdgeType::Raised => {
                try_set!(self.mpv, "sub-border-color", edge_rgba.as_str());
                try_set!(self.mpv, "sub-border-size", 1.0_f64);
                try_set!(self.mpv, "sub-shadow-color", edge_rgba.as_str());
                try_set!(self.mpv, "sub-shadow-offset", 1.5_f64);
            }
        }

        // Vertical anchor.
        let align_y = match prefs.vertical_position {
            SubtitleVerticalPosition::Top => "top",
            SubtitleVerticalPosition::Middle => "center",
            SubtitleVerticalPosition::Bottom => "bottom",
        };
        try_set!(self.mpv, "sub-align-y", align_y);

        Ok(())
    }
}

/// Convert `"#RRGGBB"` + opacity % to mpv's `"#AARRGGBB"` colour format.
/// Returns opaque white on parse failure so a bad value never silences
/// the subtitles entirely.
fn ass_color(hex: &str, opacity_percent: f64) -> String {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 || !h.chars().all(|c| c.is_ascii_hexdigit()) {
        return "#FFFFFFFF".to_string();
    }
    let a = ((opacity_percent.clamp(0.0, 100.0) / 100.0) * 255.0).round() as u8;
    format!("#{:02X}{}", a, h.to_uppercase())
}

/// Single track entry surfaced from mpv's `track-list`. `kind` is one of
/// `"audio"`, `"sub"`, `"video"` — we only show audio + sub in the UI.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    pub kind: String,
    pub title: Option<String>,
    pub lang: Option<String>,
    pub selected: bool,
    pub default: bool,
    pub codec: Option<String>,
}
