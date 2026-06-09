import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useChannel,
  useChannels,
  useMarkChannelPlayed,
} from "../features/channels/useChannels";
import { useSettingsStore } from "../stores/settingsStore";
import { ChannelLogo } from "../components/ui/ChannelLogo";
import { mpvApi } from "../lib/tauri";
import { usePlaybackHealth } from "../hooks/usePlaybackHealth";
import { PlaybackFailedOverlay } from "../components/ui/PlaybackFailedOverlay";
import { CenterButton, PlayIcon, PauseIcon } from "../components/ui/PlayerControls";
import { WinButtons } from "../components/ui/WinButtons";
import { useDisplayLock } from "../hooks/useDisplayLock";
import { useFirstFrameReady } from "../hooks/useFirstFrameReady";

/**
 * Player route — drives a singleton libmpv instance bound to the Tauri
 * main HWND. Video renders directly in our window (the wrapper is
 * pointerEvents:none + background:transparent so the libmpv child window
 * shows through). The HTML overlay is just a slim top + bottom bar that
 * fades out after a few seconds of inactivity, the way Apple TV / Stremio /
 * Plex Desktop handle full-bleed playback.
 */
const AUTO_HIDE_MS = 3000;

export default function Player() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { data: channel, isLoading } = useChannel(channelId);

  const { data: siblings = [] } = useChannels(channel?.playlistId, {
    category: channel?.groupTitle ?? null,
  });

  if (isLoading) {
    return <FullscreenMessage>Yükleniyor…</FullscreenMessage>;
  }
  if (!channel) {
    return (
      <FullscreenMessage>
        <h2 className="h-serif" style={{ fontSize: 28, margin: 0 }}>
          Kanal bulunamadı
        </h2>
        <button
          onClick={() => navigate(-1)}
          style={solidButtonStyle}
          onMouseEnter={(e) => solidButtonHover(e, true)}
          onMouseLeave={(e) => solidButtonHover(e, false)}
        >
          ← Geri
        </button>
      </FullscreenMessage>
    );
  }

  return (
    <PlayerInner
      channel={channel}
      siblings={siblings}
      onBack={() => navigate(-1)}
    />
  );
}

function PlayerInner({
  channel,
  siblings,
  onBack,
}: {
  channel: {
    id: string;
    name: string;
    logoUrl: string | null;
    groupTitle: string | null;
    streamUrl: string;
  };
  siblings: Array<{ id: string; name: string; streamUrl: string }>;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const markPlayed = useMarkChannelPlayed();
  const playerPrefs = useSettingsStore((s) => s.settings.player);

  // Keep the display awake while a channel is on screen.
  useDisplayLock();
  const inactivityTimer = useRef<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  // Bump on manual retry so `useFirstFrameReady` sees a fresh streamKey
  // and re-enters its polling loop. The URL itself doesn't change on a
  // retry, so we have to encode the attempt count in the key.
  const [retryNonce, setRetryNonce] = useState(0);
  // Backdrop stays opaque until mpv has actually decoded the first frame.
  // We poll mpv's status until position/duration first registers, instead
  // of the old fixed 1.2 s timeout — channels that take longer than that
  // (slow demuxer / network warm-up) used to flash the desktop briefly.
  const isReady = useFirstFrameReady(`${channel.streamUrl}#${retryNonce}`);

  // Stamp the channel as recently played so the Home rail picks it up.
  // Fires once per channel switch — non-blocking, errors are swallowed.
  useEffect(() => {
    markPlayed.mutate(channel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  // Sibling navigation
  const currentIdx = siblings.findIndex((c) => c.id === channel.id);
  const prevId = currentIdx > 0 ? siblings[currentIdx - 1].id : null;
  const nextId =
    currentIdx >= 0 && currentIdx < siblings.length - 1
      ? siblings[currentIdx + 1].id
      : null;

  // Reusable play call — used both by the channel-switch effect AND by
  // the playback-health hook when it auto-retries a stalled stream.
  const issuePlay = useCallback(() => {
    return mpvApi.play(
      channel.streamUrl,
      playerPrefs.userAgentOverride || null,
      playerPrefs.trustAllCerts,
    );
  }, [channel.streamUrl, playerPrefs.userAgentOverride, playerPrefs.trustAllCerts]);

  // Push buffer prefs (cache-secs, network-timeout) whenever the
  // Settings → Oynatıcı sliders change. Live channels are the most
  // latency-sensitive surface in the app (sports broadcasts!), so the
  // user's tuning matters here even more than for VOD.
  useEffect(() => {
    mpvApi
      .applyBufferPrefs(
        playerPrefs.cacheSecs,
        playerPrefs.networkTimeoutSecs,
      )
      .catch(() => {
        // Silent — values will apply on the next stream load.
      });
  }, [playerPrefs.cacheSecs, playerPrefs.networkTimeoutSecs]);

  // ── Spawn libmpv whenever the channel URL changes ─────────────────────────
  // `useFirstFrameReady` (above) handles the loading→ready transition by
  // polling mpv status; we only fire play here and seed volume.
  useEffect(() => {
    let cancelled = false;
    issuePlay()
      .then(() => {
        if (!cancelled) {
          setIsPlaying(true);
          mpvApi.setVolume(isMuted ? 0 : volume).catch(() => {});
          // Mount-race fix: if this is the first play() in the session
          // the libmpv instance is freshly born and the prefs effect
          // above may have no-op'd. Re-apply now so the live channel
          // honours the user's tuning from cold start.
          mpvApi
            .applyBufferPrefs(
              playerPrefs.cacheSecs,
              playerPrefs.networkTimeoutSecs,
            )
            .catch(() => {});
        }
      })
      .catch((e) => {
        if (!cancelled) console.error("[Player] mpv.play failed", e);
      });
    return () => {
      cancelled = true;
    };
    // intentionally only depend on streamUrl — volume/mute changes are
    // sent through their own handlers, no need to re-fire play here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.streamUrl]);

  // Detect "stream loaded but no bytes flowing" — libmpv's loadfile rarely
  // errors outright; instead the connection just sits there. The hook
  // auto-retries once after ~12 s and then surfaces a `failed` state.
  // The nonce is included so manual retries reset the stuck timer too.
  const health = usePlaybackHealth({
    key: `${channel.streamUrl}#${retryNonce}`,
    isReady,
    onAutoRetry: () => {
      issuePlay().catch((e) =>
        console.warn("[Player] auto-retry failed", e),
      );
    },
  });

  // ── Stop mpv when leaving the player route ────────────────────────────────
  useEffect(() => {
    return () => {
      mpvApi.stop().catch((e) => console.warn("[Player] mpv.stop failed", e));
    };
  }, []);

  // ── Auto-hide controls after inactivity ───────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimer.current) {
      window.clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    showControls();
    const handler = () => showControls();
    window.addEventListener("mousemove", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("keydown", handler);
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    };
  }, [showControls]);

  // ── Navigation actions ────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    if (prevId) navigate(`/player/${encodeURIComponent(prevId)}`, { replace: true });
  }, [navigate, prevId]);

  const goNext = useCallback(() => {
    if (nextId) navigate(`/player/${encodeURIComponent(nextId)}`, { replace: true });
  }, [navigate, nextId]);

  // ── Playback controls (talk to libmpv via Tauri) ──────────────────────────
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
    mpvApi.pauseToggle().catch((e) => console.warn("[Player] pauseToggle", e));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
    mpvApi.toggleMute().catch((e) => console.warn("[Player] toggleMute", e));
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    mpvApi.setVolume(clamped).catch((e) => console.warn("[Player] setVolume", e));
  }, []);

  const toggleFullscreen = useCallback(() => {
    mpvApi
      .toggleFullscreen()
      .catch((e) => console.warn("[Player] toggleFullscreen", e));
  }, []);

  // Reload the stream — re-issues the libmpv loadfile, which reconnects at
  // the live edge. Fixes the "froze during a network blip, came back behind
  // live" case: one click jumps back to the current broadcast.
  const handleReload = useCallback(() => {
    setIsPlaying(true);
    showControls();
    issuePlay().catch((e) => console.warn("[Player] reload failed", e));
  }, [issuePlay, showControls]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Tauri-side: ←/→ kanal, Esc geri. Playback (Space/F/M/seek) mpv'nin kendi
  // keybind'leri ile (mpv child window focus aldığında).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case "Escape":
          e.preventDefault();
          onBack();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    goPrev,
    goNext,
    onBack,
    togglePlay,
    toggleFullscreen,
    toggleMute,
    handleVolumeChange,
    volume,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  // Wrapper background = opaque while loading, transparent once mpv has
  // started rendering (`isReady`). pointerEvents:none keeps the libmpv
  // child window underneath fully clickable for mpv's own UI; only the
  // bars + center button capture clicks.
  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        // Solid dark while loading — radial gradient + transparent in a
        // transparent Tauri window can momentarily blend the desktop
        // through. Plain opaque colour avoids any kompozisyon artefakt.
        background: isReady ? "transparent" : "#0E1213",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      {/* Loading overlay — visible until mpv has had a moment to render */}
      {!isReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            zIndex: 5,
          }}
        >
          <LoadingSpinner />
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.62)",
              fontFamily: "var(--sans)",
            }}
          >
            {channel.name} yükleniyor…
          </div>
        </div>
      )}

      {/* Mid-playback failure overlay. The health hook flips to "retrying"
          on its own (auto-retry); we only paint a UI when it gives up
          ("failed"). A small inline pill announces the retry attempt so
          the user knows we're trying. */}
      {health === "retrying" && isReady && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.85)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            zIndex: 8,
            backdropFilter: "blur(8px)",
            pointerEvents: "auto",
          }}
        >
          YENİDEN BAĞLANIYOR…
        </div>
      )}
      {health === "failed" && (
        <PlaybackFailedOverlay
          title={channel.name}
          onRetry={() => {
            // Bumping the nonce restarts both useFirstFrameReady (loading
            // overlay re-shows) and usePlaybackHealth (stuck timer
            // resets), so the user sees a clean reload state.
            setRetryNonce((n) => n + 1);
            issuePlay().catch((e) =>
              console.warn("[Player] manual retry failed", e),
            );
          }}
          onBack={onBack}
        />
      )}

      {/* Controls overlay — ONLY visible once playback is ready AND the
          user is currently interacting (auto-hide gate). During loading
          the overlay (top bar, center play/pause, bottom controls) stays
          completely hidden so the spinner has the screen to itself. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          opacity: isReady && controlsVisible ? 1 : 0,
          transition: "opacity 220ms ease",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
      {/* Top bar — doubles as the window drag handle (these fullscreen
          player routes render outside Layout, so they don't inherit the
          TitleBar's drag region). "deep" lets clicks anywhere in the bar
          drag the window; the back button is a <button> so Tauri skips it. */}
      <div
        data-tauri-drag-region="deep"
        style={{
          position: "relative",
          // Right padding reserves space for the 138px-wide caption buttons
          // pinned to the top-right corner so the LivePill never slides under.
          padding: "16px 150px 16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flex: "0 0 auto",
          pointerEvents: controlsVisible ? "auto" : "none",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.72), rgba(0,0,0,0))",
        }}
      >
        <GlassButton onClick={onBack} title="Geri (Esc)">
          ←
        </GlassButton>
        <ChannelLogo name={channel.name} url={channel.logoUrl} size={40} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {channel.name}
          </span>
          {channel.groupTitle && (
            <span
              className="meta-caps"
              style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}
            >
              {channel.groupTitle}
            </span>
          )}
        </div>
        <LivePill />
        {/* Classic Windows caption buttons (minimize / maximize / close),
            flush to the top-right corner. They live inside the auto-hiding
            controls overlay, so they fade with the rest of the chrome. The
            buttons are <button>s, so the drag region above ignores them. */}
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <WinButtons />
        </div>
      </div>

      {/* Middle = video area; mpv renders here. We overlay one big
          play/pause button dead-centre that toggles libmpv. */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: controlsVisible ? "auto" : "none" }}>
          <CenterButton
            variant="play"
            onClick={togglePlay}
            title={isPlaying ? "Duraklat (Space)" : "Oynat (Space)"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </CenterButton>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flex: "0 0 auto",
          pointerEvents: controlsVisible ? "auto" : "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))",
        }}
      >
        {/* Left cluster — channel nav + mute */}
        <PillButton onClick={goPrev} disabled={!prevId} title="Önceki kanal (←)">
          ⏮ Önceki
        </PillButton>

        <GlassButton onClick={toggleMute} title={isMuted ? "Sesi aç (M)" : "Sustur (M)"}>
          {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
        </GlassButton>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          style={{
            width: 140,
            accentColor: "var(--accent)",
            cursor: "pointer",
          }}
        />

        {/* Centre — shortcuts hint pushes left + right clusters apart */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <ShortcutsHint />
        </div>

        {/* Right cluster — reload (back to live) + fullscreen + next channel */}
        <GlassButton onClick={handleReload} title="Yayını yenile (canlıya dön)">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </GlassButton>
        <GlassButton onClick={toggleFullscreen} title="Tam ekran (F)">
          ⛶
        </GlassButton>
        <PillButton onClick={goNext} disabled={!nextId} title="Sonraki kanal (→)">
          Sonraki ⏭
        </PillButton>
      </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function GlassButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.50)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "#fff",
        fontSize: 16,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 160ms",
        flex: "0 0 auto",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.20)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,0,0,0.50)";
      }}
    >
      {children}
    </button>
  );
}

function PillButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: 34,
        padding: "0 16px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.50)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: disabled ? "rgba(255,255,255,0.30)" : "#fff",
        fontSize: 12.5,
        fontFamily: "var(--sans)",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,0,0,0.50)";
      }}
    >
      {children}
    </button>
  );
}

function LivePill() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 999,
        fontFamily: "var(--mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--teal)",
        background: "color-mix(in oklab, var(--teal) 10%, rgba(0,0,0,0.40))",
        border: "1px solid color-mix(in oklab, var(--teal) 30%, transparent)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--teal)",
          boxShadow:
            "0 0 0 4px color-mix(in oklab, var(--teal) 18%, transparent)",
        }}
      />
      Canlı
    </span>
  );
}

function ShortcutsHint() {
  const items: Array<[string, string]> = [
    ["Space", "Oynat/Duraklat"],
    ["F", "Tam ekran"],
    ["M", "Sustur"],
    ["↑/↓", "Ses"],
    ["←/→", "Kanal"],
    ["Esc", "Geri"],
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        opacity: 0.7,
      }}
    >
      {items.map(([key, label]) => (
        <span
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: "rgba(255,255,255,0.65)",
            fontFamily: "var(--mono)",
          }}
        >
          <kbd
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.40)",
              border: "1px solid rgba(255,255,255,0.15)",
              fontSize: 9.5,
              fontFamily: "var(--mono)",
              minWidth: 16,
              textAlign: "center",
            }}
          >
            {key}
          </kbd>
          <span style={{ fontFamily: "var(--sans)" }}>{label}</span>
        </span>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.10)",
          borderTopColor: "var(--accent)",
          animation: "gi-spin 0.9s linear infinite",
        }}
      />
      <style>{`
        @keyframes gi-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function FullscreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#000",
        color: "#fff",
      }}
    >
      {children}
    </div>
  );
}

const solidButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 500,
  transition: "background 160ms",
};

function solidButtonHover(
  e: React.MouseEvent<HTMLButtonElement>,
  hovered: boolean,
) {
  e.currentTarget.style.background = hovered
    ? "rgba(255,255,255,0.18)"
    : "rgba(255,255,255,0.10)";
}
