import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useEpisodes,
  useMovie,
  useSeriesOne,
  useSyncEpisodes,
} from "../features/vod/useVod";
import {
  usePosition,
  useSavePosition,
} from "../features/continue-watching/useContinueWatching";
import { AnimatePresence, motion } from "framer-motion";
import { mpvApi } from "../lib/tauri";
import type { Track, VodItem } from "../lib/tauri";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";
import { useDisplayLock } from "../hooks/useDisplayLock";
import { useFirstFrameReady } from "../hooks/useFirstFrameReady";
import { usePlaybackHealth } from "../hooks/usePlaybackHealth";
import { PlaybackFailedOverlay } from "../components/ui/PlaybackFailedOverlay";
import {
  CenterButton,
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "../components/ui/PlayerControls";
import { WinButtons } from "../components/ui/WinButtons";
import { t, tFmt } from "../lib/i18n";

/**
 * Unified VOD player route. Two URL shapes:
 *   /watch/movie/:id     — full-length film
 *   /watch/episode/:id   — single TV series episode
 *
 * Live channel playback still goes through `/player/:channelId` because it
 * needs no scrubber + sibling channel switching, not the VOD overlay below.
 *
 * The overlay renders on top of the libmpv child window via the same trick
 * the live player uses (transparent wrapper + pointer-events on the bars).
 *
 * Behaviour matched to Android `VodPlayerViewModel.savePosition` (engineering
 * brief 11.2):
 *   - Movies: target_id = movieId,    resume_episode_id = NULL
 *   - Series: target_id = seriesId,   resume_episode_id = currentEpisodeId
 *     → composite PK collapses an entire show to one CW row
 *   - Save every 5 s during playback + once on stop
 *   - Skip the save when the series id isn't loaded yet (race protection)
 */
const AUTO_HIDE_MS = 3000;
const POSITION_POLL_MS = 1000;
const SAVE_INTERVAL_MS = 5000;
const SKIP_SECONDS = 10;
/** Show the "Sonraki bölüm" overlay this many seconds before EOF. */
const AUTO_NEXT_WINDOW = 15;
/** Playback rate presets surfaced in the "Oynatma" popover. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function Watch() {
  const { type, id } = useParams<{ type: string; id: string }>();

  if (type === "movie" && id) return <WatchMovie movieId={id} />;
  if (type === "episode" && id) return <WatchEpisode episodeId={id} />;
  return <FullscreenMessage>{t("watch.unknown_type")}</FullscreenMessage>;
}

// ─── Movie player ───────────────────────────────────────────────────────────

function WatchMovie({ movieId }: { movieId: string }) {
  const navigate = useNavigate();
  const { data: movie, isLoading: loadingMovie } = useMovie(movieId);
  // Position query has to resolve BEFORE we mount PlayerShell —
  // otherwise the shell's stream-load effect fires with `resumeMs=0`
  // and the seek never happens (the effect only re-runs when streamUrl
  // changes, not when the lagging position query finally lands).
  // The wait is a single DB-row lookup, typically <50 ms — barely a
  // flicker on the loading screen but it's what makes "Kaldığın yerden
  // devam et" actually resume.
  const positionQuery = usePosition(movieId, "MOVIE");
  const position = positionQuery.data;
  const savePos = useSavePosition();

  const [resumed, setResumed] = useState(false);

  if (loadingMovie || positionQuery.isLoading)
    return <FullscreenMessage>{t("common.loading")}</FullscreenMessage>;
  if (!movie) {
    return (
      <FullscreenMessage>
        <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
          {t("watch.not_found_movie")}
        </h2>
        <button onClick={() => navigate(-1)} style={glassButtonStyle}>
          {t("watch.btn_back")}
        </button>
      </FullscreenMessage>
    );
  }

  const resumeMs =
    !resumed && position && position.positionMs > 5000
      ? position.positionMs
      : 0;

  return (
    <PlayerShell
      title={movie.title}
      subtitle={subtitleFor(movie)}
      streamUrl={movie.streamUrl}
      resumeMs={resumeMs}
      onResumeApplied={() => setResumed(true)}
      onSavePosition={(pos, dur) => {
        if (dur > 0) {
          savePos.mutate({
            targetId: movie.id,
            targetType: "MOVIE",
            positionMs: pos,
            durationMs: dur,
            title: movie.title,
            subtitle: subtitleFor(movie),
            thumbnailUrl: movie.posterUrl,
          });
        }
      }}
      onBack={() => navigate(-1)}
    />
  );
}

function subtitleFor(movie: VodItem): string | null {
  const parts: string[] = [];
  if (movie.year != null) parts.push(String(movie.year));
  if (movie.genres[0]) parts.push(movie.genres[0]);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── Episode player ─────────────────────────────────────────────────────────

function WatchEpisode({ episodeId }: { episodeId: string }) {
  const navigate = useNavigate();
  // `?series=<id>` hint, set by every callsite that knows the seriesId
  // (Continue Watching click, Series detail page, Watch prev/next).
  // Lets `useEpisodeContext` skip the cache-scanning fallback and
  // resolve directly — important for cold opens where the in-memory
  // episode→series index hasn't been warmed yet.
  const [searchParams] = useSearchParams();
  const seriesIdHint = searchParams.get("series");
  const { episode, series, allEpisodes, isLoading, error } =
    useEpisodeContext(episodeId, seriesIdHint);

  // Same race-fix as WatchMovie: position needs to be resolved BEFORE
  // PlayerShell mounts, or its first stream-load effect runs with
  // `resumeMs=0` and the seek never fires. The query enables only
  // after series.id is known, so we wait on that conditionally.
  const positionQuery = usePosition(series?.id, "SERIES");
  const position = positionQuery.data;
  const savePos = useSavePosition();
  const [resumed, setResumed] = useState(false);

  // Sibling navigation — previous/next episode within the same series
  const idx = useMemo(
    () => allEpisodes.findIndex((e) => e.id === episodeId),
    [allEpisodes, episodeId],
  );
  const prev = idx > 0 ? allEpisodes[idx - 1] : null;
  const next = idx >= 0 && idx < allEpisodes.length - 1
    ? allEpisodes[idx + 1]
    : null;

  if (isLoading)
    return <FullscreenMessage>{t("common.loading")}</FullscreenMessage>;
  // Once series has loaded we still wait one more tick for the
  // position lookup to settle, otherwise the resume seek is racy.
  if (series && positionQuery.isLoading)
    return <FullscreenMessage>{t("common.loading")}</FullscreenMessage>;
  if (error || !episode || !series) {
    return (
      <FullscreenMessage>
        <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
          {t("watch.not_found_episode")}
        </h2>
        <button onClick={() => navigate(-1)} style={glassButtonStyle}>
          {t("watch.btn_back")}
        </button>
      </FullscreenMessage>
    );
  }

  // Resume the matching episode position only — switching episodes within
  // the same series resets the resume state.
  const resumeMs =
    !resumed
      && position
      && position.resumeEpisodeId === episode.id
      && position.positionMs > 5000
      ? position.positionMs
      : 0;

  return (
    <PlayerShell
      title={series.title}
      subtitle={tFmt("watch.episode_subtitle", {
        season: episode.season,
        episode: episode.episode,
        title: episode.title,
      })}
      streamUrl={episode.streamUrl}
      resumeMs={resumeMs}
      onResumeApplied={() => setResumed(true)}
      onPrev={
        prev
          ? () =>
              navigate(
                `/watch/episode/${encodeURIComponent(
                  prev.id,
                )}?series=${encodeURIComponent(series.id)}`,
                { replace: true },
              )
          : null
      }
      onNext={
        next
          ? () =>
              navigate(
                `/watch/episode/${encodeURIComponent(
                  next.id,
                )}?series=${encodeURIComponent(series.id)}`,
                { replace: true },
              )
          : null
      }
      prevLabel={prev ? `S${prev.season}·B${prev.episode}` : null}
      nextLabel={next ? `S${next.season}·B${next.episode}` : null}
      autoNext={
        next
          ? {
              onPlay: () =>
                navigate(
                  `/watch/episode/${encodeURIComponent(
                    next.id,
                  )}?series=${encodeURIComponent(series.id)}`,
                  { replace: true },
                ),
              eyebrow: `S${next.season} · B${next.episode}`,
              title: next.title,
              plot: next.plot,
            }
          : null
      }
      onSavePosition={(pos, dur) => {
        // Series.id null is a hard-skip per Android brief 11.2 — keeps
        // the CW table from holding a row whose target_id we can't match
        // on the next launch.
        if (!series.id) return;
        if (dur <= 0) return;
        savePos.mutate({
          targetId: series.id,
          targetType: "SERIES",
          positionMs: pos,
          durationMs: dur,
          title: series.title,
          subtitle: tFmt("watch.episode_subtitle", {
            season: episode.season,
            episode: episode.episode,
            title: episode.title,
          }),
          thumbnailUrl: series.posterUrl,
          resumeEpisodeId: episode.id,
        });
      }}
      onBack={() => navigate(-1)}
    />
  );
}

/**
 * Resolve an episode id back to its `(series, episode, allEpisodes)` tuple.
 *
 * Resolution order:
 *   1. `seriesIdHint` from the URL — the canonical path. Every callsite
 *      that knows the seriesId (Continue Watching, Series detail page,
 *      prev/next within Watch) tacks `?series=<id>` onto the URL.
 *   2. In-memory `__GENC_EPISODE_INDEX__` populated by `useEpisodes` —
 *      good for warm navigations during the same session.
 *   3. Error — without either, we can't cheaply look up which series
 *      this episode belongs to. The user is sent back through Series
 *      detail to seed the cache.
 */
function useEpisodeContext(episodeId: string, seriesIdHint: string | null) {
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: series, isLoading: loadingSeries } = useSeriesOne(seriesId ?? undefined);
  const { data: episodes = [], isLoading: loadingEps } = useEpisodes(seriesId ?? undefined);
  const syncEpisodes = useSyncEpisodes();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    // 1) URL hint wins. No fallback chain needed — this is the canonical
    //    path the rest of the app sends us through.
    if (seriesIdHint) {
      if (!cancelled) setSeriesId(seriesIdHint);
      return () => {
        cancelled = true;
      };
    }
    // 2) Warm-cache fallback for legacy or external nav.
    const fromCache = findSeriesIdFromCache(episodeId);
    if (fromCache) {
      if (!cancelled) setSeriesId(fromCache);
      return () => {
        cancelled = true;
      };
    }
    // 3) Cold path: give up cleanly.
    if (!cancelled) setError(t("watch.episode_resolve_error"));
    return () => {
      cancelled = true;
    };
  }, [episodeId, seriesIdHint]);

  const episode = episodes.find((e) => e.id === episodeId) ?? null;

  // If we have the series but the episode list is empty, force a sync.
  useEffect(() => {
    if (!seriesId) return;
    if (loadingEps) return;
    if (episodes.length === 0 && !syncEpisodes.isPending) {
      syncEpisodes.mutate(seriesId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, episodes.length, loadingEps]);

  return {
    episode,
    series: series ?? null,
    allEpisodes: episodes,
    isLoading: loadingSeries || loadingEps || (!seriesId && !error),
    error,
  };
}

/**
 * Best-effort cache lookup. Walks the react-query devtools-style key list
 * stored on `window.__GENC_EPISODE_INDEX__` — populated below as a side
 * effect of `useEpisodes`.
 */
function findSeriesIdFromCache(episodeId: string): string | null {
  const idx = (window as any).__GENC_EPISODE_INDEX__ as
    | Map<string, string>
    | undefined;
  return idx?.get(episodeId) ?? null;
}

// ─── PlayerShell ────────────────────────────────────────────────────────────

interface PlayerShellProps {
  title: string;
  subtitle: string | null;
  streamUrl: string;
  resumeMs: number;
  onResumeApplied: () => void;
  onSavePosition: (positionMs: number, durationMs: number) => void;
  onBack: () => void;
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
  prevLabel?: string | null;
  nextLabel?: string | null;
  /** When supplied, the player shows a "Sonraki bölüm" countdown card
   *  in the lower-right during the final ~15 seconds of the current
   *  stream. Five seconds after the card appears it auto-invokes
   *  `autoNext.onPlay` unless the user dismisses with `İptal`. Movies
   *  shouldn't pass this; only series episode flows. */
  autoNext?: {
    onPlay: () => void;
    eyebrow: string;   // e.g. "S1 · B5"
    title: string;     // e.g. the episode title
    plot?: string | null;
  } | null;
}

function PlayerShell({
  title,
  subtitle,
  streamUrl,
  resumeMs,
  onResumeApplied,
  onSavePosition,
  onBack,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  autoNext,
}: PlayerShellProps) {
  const inactivityTimer = useRef<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  // Track popover state — list of audio/subtitle tracks plus an open flag.
  // Tracks aren't available until mpv finishes demuxing the stream, so we
  // (re)fetch when the user opens the menu.
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksOpen, setTracksOpen] = useState(false);
  // Auto-next dismissed flag — flips true when the user clicks "İptal"
  // on the next-episode countdown so it doesn't keep re-appearing if
  // they scrub backward into the trigger window. Reset whenever the
  // stream URL changes (= new episode loaded → fresh state).
  const [autoNextDismissed, setAutoNextDismissed] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);
  // Playback rate + subtitle sync — exposed via the "Oynatma" popover
  // next to the CC button. Both reset on stream change so a quirky
  // setting on episode N doesn't carry into N+1 silently.
  const [speed, setSpeed] = useState(1.0);
  const [subDelay, setSubDelay] = useState(0.0);
  const [toolsOpen, setToolsOpen] = useState(false);
  // Buffer health — polled alongside position/duration. Drives the
  // top-right pill that surfaces when the demuxer cache is running
  // low or mpv has stalled waiting for the network.
  const [bufferSecs, setBufferSecs] = useState(0);
  const [pausedForCache, setPausedForCache] = useState(false);
  // Manual retry counter. Bumping it changes the `usePlaybackHealth`
  // key so the stall timer resets cleanly and the `streamUrl` effect
  // re-fires the play call. Auto-retry inside the health hook also
  // resets the timer but does NOT bump this counter.
  const [retryNonce, setRetryNonce] = useState(0);
  // Status-driven readiness — flips true when mpv first reports a non-zero
  // time-pos or duration. Replaces the previous fixed 1.1 s timeout.
  const isReady = useFirstFrameReady(streamUrl);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const playerPrefs = useSettingsStore((s) => s.settings.player);
  const subtitlePrefs = useSettingsStore((s) => s.settings.subtitles);
  // Mini-window mode: when on, Layout has collapsed to a 420×240 always-
  // on-top tile and only renders the MiniBar + routedContent. We strip
  // the overlay so the user sees a pure video pane; MiniBar's "Büyüt"
  // button (Layout-owned) is the path back to full size. Playback keeps
  // running because Watch stays mounted — only the chrome is hidden.
  const miniMode = useUIStore((s) => s.miniMode);
  const setMiniMode = useUIStore((s) => s.setMiniMode);

  // Keep the display awake during playback.
  useDisplayLock();

  // Push subtitle styling to libmpv whenever it changes (and once on
  // mount). mpv stores `sub-*` properties globally, so this also
  // ensures a freshly-loaded stream picks up the user's preferences
  // even if no setting has changed since boot. Without this effect the
  // Subtitles settings page was effectively cosmetic — the values
  // landed in the store but never reached the player.
  useEffect(() => {
    mpvApi.applySubtitleStyle(subtitlePrefs).catch(() => {
      // Silent — settings may apply on the next stream load.
    });
  }, [subtitlePrefs]);

  // Push buffer prefs (cache-ahead + network timeout) to mpv whenever
  // Settings → Oynatıcı changes them. Same pattern as the subtitle
  // effect: properties persist on the libmpv instance, so this is also
  // a safety net that re-applies on every mount.
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

  // Reset auto-next state when the underlying stream changes (= new
  // episode loaded). Without this, dismissing the overlay on episode N
  // would carry over and silently skip the countdown on N+1.
  useEffect(() => {
    setAutoNextDismissed(false);
    setAutoNextCountdown(5);
    setSpeed(1.0);
    setSubDelay(0.0);
  }, [streamUrl]);

  const lastSavedRef = useRef(0);

  // Reusable play call — fires the libmpv loadfile with current creds.
  // Used by the streamUrl effect AND by usePlaybackHealth's auto-retry
  // path. The user-agent + trust flags are owned by Settings, not the
  // health hook, so we centralise here.
  const issuePlay = useCallback(() => {
    return mpvApi.play(
      streamUrl,
      playerPrefs.userAgentOverride || null,
      playerPrefs.trustAllCerts,
    );
  }, [streamUrl, playerPrefs.userAgentOverride, playerPrefs.trustAllCerts]);

  // ── Spawn libmpv whenever the stream URL changes ─────────────────────────
  // Readiness is now `useFirstFrameReady` above; this effect only fires
  // play and applies the optional resume seek. `retryNonce` is in the
  // deps so the manual "Tekrar dene" button re-fires the load cleanly.
  useEffect(() => {
    let cancelled = false;
    setPosition(0);
    setDuration(0);
    issuePlay()
      .then(async () => {
        if (cancelled) return;
        setIsPlaying(true);
        await mpvApi.setVolume(isMuted ? 0 : volume).catch(() => {});
        // Re-apply subtitle styling now that the Player exists. The
        // separate `subtitlePrefs` effect fired on mount before this
        // play() had created the libmpv instance, so its first call
        // silently no-ops. This pass guarantees the user's settings
        // land on the freshly-spawned player.
        mpvApi.applySubtitleStyle(subtitlePrefs).catch(() => {});
        // Same race fix for buffer prefs.
        mpvApi
          .applyBufferPrefs(
            playerPrefs.cacheSecs,
            playerPrefs.networkTimeoutSecs,
          )
          .catch(() => {});
        if (resumeMs > 0) {
          // mpv needs a moment to demux + decode the first frames before
          // a seek can land. Wait a beat then jump.
          setTimeout(() => {
            if (cancelled) return;
            mpvApi
              .seekAbsolute(resumeMs / 1000)
              .catch((e) => console.warn("[Watch] resume seek failed", e));
            onResumeApplied();
          }, 600);
        }
      })
      .catch((e) => {
        if (!cancelled) console.error("[Watch] mpv.play failed", e);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, retryNonce]);

  // ── Stall detection + auto-retry ─────────────────────────────────────────
  // Reuses the same hook the live player uses: polls mpv `time-pos`
  // for 12 s of zero motion, retries once, then settles to "failed".
  // Key includes `retryNonce` so the manual retry button gives the hook
  // a fresh start instead of inheriting a stuck timer.
  const health = usePlaybackHealth({
    key: `${streamUrl}#${retryNonce}`,
    isReady,
    onAutoRetry: () => {
      issuePlay().catch((e) =>
        console.warn("[Watch] auto-retry failed", e),
      );
    },
  });

  // ── Stop mpv + flush save on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      // Final position save on the way out
      if (duration > 0 && position > 0) {
        onSavePosition(Math.round(position * 1000), Math.round(duration * 1000));
      }
      mpvApi.stop().catch((e) => console.warn("[Watch] mpv.stop failed", e));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll mpv for position/duration ───────────────────────────────────────
  useEffect(() => {
    const handle = window.setInterval(async () => {
      try {
        const status = await mpvApi.status();
        if (status.durationSecs > 0) setDuration(status.durationSecs);
        if (scrubbing == null) {
          setPosition(status.positionSecs);
        }
        setIsPlaying(!status.paused);
        setBufferSecs(status.bufferSecs);
        setPausedForCache(status.pausedForCache);
      } catch (e) {
        // mpv may return an error if not initialised yet — safe to ignore.
      }
    }, POSITION_POLL_MS);
    return () => window.clearInterval(handle);
  }, [scrubbing]);

  // ── Periodic save while playing ──────────────────────────────────────────
  useEffect(() => {
    const handle = window.setInterval(() => {
      if (!isPlaying) return;
      if (duration <= 0) return;
      const now = Date.now();
      if (now - lastSavedRef.current < SAVE_INTERVAL_MS) return;
      lastSavedRef.current = now;
      onSavePosition(Math.round(position * 1000), Math.round(duration * 1000));
    }, SAVE_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [isPlaying, position, duration, onSavePosition]);

  // ── Auto-next overlay visibility + countdown ───────────────────────────
  // Visible during the final AUTO_NEXT_WINDOW seconds of the stream when
  // a next episode is queued and the user hasn't dismissed. Once it
  // appears, a 5-second countdown ticks down; at 0 we auto-invoke
  // `autoNext.onPlay()` (navigates to next episode).
  const autoNextVisible =
    !!autoNext &&
    duration > 30 &&
    !autoNextDismissed &&
    duration - position <= AUTO_NEXT_WINDOW;

  useEffect(() => {
    if (!autoNextVisible) {
      // Reset countdown when window closes so a subsequent re-enter
      // (user scrubs back into the window) starts fresh.
      setAutoNextCountdown(5);
      return;
    }
    const id = window.setInterval(() => {
      setAutoNextCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          autoNext?.onPlay();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // `autoNext.onPlay` is captured at effect mount; that's fine — the
    // identity changes only when streamUrl changes (parent rebuilds the
    // callback), which also reshapes `autoNextVisible` and re-runs us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNextVisible]);

  // ── Auto-hide controls ───────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
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

  // ── Playback controls ────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
    mpvApi.pauseToggle().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
    mpvApi.toggleMute().catch(() => {});
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    mpvApi.setVolume(clamped).catch(() => {});
  }, []);

  const skip = useCallback((delta: number) => {
    mpvApi.seekRelative(delta).catch(() => {});
  }, []);

  const seekTo = useCallback((seconds: number) => {
    mpvApi.seekAbsolute(seconds).catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    mpvApi.toggleFullscreen().catch(() => {});
  }, []);

  // Re-fetch the track list. Tracks become available once mpv finishes
  // demuxing the first segments — calling this on demand (when the user
  // opens the panel) is more reliable than polling on a schedule.
  const refreshTracks = useCallback(async () => {
    try {
      const list = await mpvApi.tracks();
      setTracks(list);
    } catch {
      setTracks([]);
    }
  }, []);

  const openTracksPanel = useCallback(async () => {
    await refreshTracks();
    setTracksOpen(true);
  }, [refreshTracks]);

  // Optimistic-first: move the selected dot the instant the user clicks
  // so they get feedback even while mpv is still chewing on the switch
  // (sub track changes on IPTV streams can take 1-2s while mpv seeks).
  // If the underlying call fails we re-fetch the truth from mpv.
  const chooseAudio = useCallback(
    async (id: number) => {
      setTracks((prev) =>
        prev.map((tr) =>
          tr.kind === "audio" ? { ...tr, selected: tr.id === id } : tr,
        ),
      );
      try {
        await mpvApi.setAudioTrack(id);
      } catch {
        refreshTracks();
      }
    },
    [refreshTracks],
  );

  const chooseSubtitle = useCallback(
    async (id: number | null) => {
      setTracks((prev) =>
        prev.map((tr) =>
          tr.kind === "sub"
            ? { ...tr, selected: id != null && tr.id === id }
            : tr,
        ),
      );
      try {
        await mpvApi.setSubtitleTrack(id);
      } catch {
        refreshTracks();
      }
    },
    [refreshTracks],
  );

  // Auto-prefetch tracks when the stream becomes ready, so the first click
  // on the CC button doesn't show an empty panel during the round-trip.
  useEffect(() => {
    if (!isReady) return;
    const t = window.setTimeout(refreshTracks, 600);
    return () => window.clearTimeout(t);
  }, [isReady, refreshTracks]);

  // Apply playback speed + subtitle delay whenever they change. mpv
  // keeps these properties across the lifetime of the libmpv instance,
  // so the reset effect above (streamUrl-keyed) is what ensures a new
  // episode starts at 1.0× and 0s.
  const applySpeed = useCallback((next: number) => {
    setSpeed(next);
    mpvApi.setSpeed(next).catch(() => {});
  }, []);
  const applySubDelay = useCallback((next: number) => {
    setSubDelay(next);
    mpvApi.setSubtitleDelay(next).catch(() => {});
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
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
          skip(-SKIP_SECONDS);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(SKIP_SECONDS);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case "n":
        case "N":
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "p":
        case "P":
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
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
    togglePlay,
    toggleFullscreen,
    toggleMute,
    skip,
    handleVolumeChange,
    volume,
    onNext,
    onPrev,
    onBack,
  ]);

  // ── Render ───────────────────────────────────────────────────────────────
  const displayedPosition = scrubbing ?? position;

  // Mini mode: the Tauri window has collapsed to 420×240 and Layout is
  // showing just routedContent + a thin top bar (MiniBar). Render only
  // the transparent video pane so libmpv shines through; full overlay
  // would be cramped in 420×240 and competes with MiniBar's chrome.
  if (miniMode) {
    return (
      <div
        style={{
          position: "relative",
          height: "100vh",
          background: "transparent",
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        background: isReady ? "transparent" : "#0E1213",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      {!isReady && health !== "failed" && (
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
          <Spinner />
          <div
            style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", fontFamily: "var(--sans)" }}
          >
            {tFmt("watch.loading", { title })}
          </div>
        </div>
      )}

      {/* Mid-playback stall pill — visible only while the health hook is
          in its first-retry window. Keeps the cinematic frame intact and
          tells the user "we noticed, we're trying". */}
      {health === "retrying" && isReady && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 14px",
            background: "rgba(8, 11, 12, 0.78)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            color: "#fff",
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            zIndex: 11,
          }}
        >
          {t("watch.reconnecting")}
        </div>
      )}

      {/* Fatal-failure overlay — auto-retry already happened and the
          stream still isn't producing bytes. User-driven retry bumps
          `retryNonce` which re-keys the health hook AND re-fires
          `issuePlay` via the streamUrl effect's deps. */}
      {health === "failed" && (
        <PlaybackFailedOverlay
          title={title}
          onRetry={() => {
            setRetryNonce((n) => n + 1);
          }}
          onBack={onBack}
        />
      )}

      {/* Overlay only visible once ready + the user is interacting */}
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
        {/* Top bar — doubles as the window drag handle (this fullscreen
            player route renders outside Layout, so it doesn't inherit the
            TitleBar's drag region). "deep" lets clicks anywhere in the bar
            drag the window; the buttons are <button>s so Tauri skips them. */}
        <div
          data-tauri-drag-region="deep"
          style={{
            position: "relative",
            // Right padding reserves space for the 138px-wide caption buttons
            // pinned to the top-right corner so the top-bar items never slide
            // under them.
            padding: "16px 150px 16px 22px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            pointerEvents: controlsVisible ? "auto" : "none",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,0))",
          }}
        >
          <GlassButton onClick={onBack} title={t("watch.controls_back")}>
            ←
          </GlassButton>
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
              {title}
            </span>
            {subtitle && (
              <span
                className="meta-caps"
                style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}
              >
                {subtitle}
              </span>
            )}
          </div>
          <BufferPill bufferSecs={bufferSecs} stalled={pausedForCache} />
          {/* Mini-mode toggle — collapses Layout to a 420×240 always-on-top
              tile. Watch stays mounted so mpv keeps playing through. */}
          <GlassButton
            onClick={() => setMiniMode(true)}
            title={t("watch.controls_mini")}
          >
            ⊟
          </GlassButton>
          {/* Classic Windows caption buttons (minimize / maximize / close),
              flush to the top-right corner. They live inside the auto-hiding
              controls overlay, so they fade with the rest of the chrome. The
              buttons are <button>s, so the drag region above ignores them. */}
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <WinButtons />
          </div>
        </div>

        {/* Center cluster: ⟲10  ⏯  ⟳10  — three frosted-glass orbs in a
            single row, perfectly centred on the viewport. The skip
            buttons used to sit down on the bottom bar and felt
            disconnected from the play action; grouping them here makes
            the player feel like a piece of hardware. */}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 36,
              pointerEvents: controlsVisible ? "auto" : "none",
            }}
          >
            <CenterButton
              variant="skip"
              onClick={() => skip(-SKIP_SECONDS)}
              title={t("watch.controls_skip_back")}
            >
              <SkipBackIcon />
            </CenterButton>
            <CenterButton
              variant="play"
              onClick={togglePlay}
              title={
                isPlaying
                  ? t("watch.controls_pause")
                  : t("watch.controls_play")
              }
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </CenterButton>
            <CenterButton
              variant="skip"
              onClick={() => skip(SKIP_SECONDS)}
              title={t("watch.controls_skip_forward")}
            >
              <SkipForwardIcon />
            </CenterButton>
          </div>
        </div>

        {/* Auto-next "Sonraki Bölüm" countdown card. Slides up from the
            lower-right when the final AUTO_NEXT_WINDOW seconds of the
            current episode are playing. */}
        <AnimatePresence>
          {autoNextVisible && autoNext && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              style={{
                position: "absolute",
                right: 22,
                bottom: 110,
                width: 360,
                background: "rgba(15,18,20,0.92)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "16px 18px",
                pointerEvents: "auto",
                zIndex: 11,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="meta-caps"
                style={{
                  fontSize: 9.5,
                  color: "var(--accent)",
                  marginBottom: 8,
                  letterSpacing: "0.16em",
                }}
              >
                {t("watch.autonext_eyebrow")}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#fff",
                }}
              >
                {autoNext.eyebrow}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                  marginBottom: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {autoNext.title}
              </div>
              {autoNext.plot && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.45,
                    marginBottom: 14,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {autoNext.plot}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => autoNext.onPlay()}
                  style={{
                    flex: 1,
                    height: 36,
                    background: "#fff",
                    color: "#0E1213",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  ▶ {tFmt("watch.autonext_play_now", {
                    seconds: autoNextCountdown,
                  })}
                </button>
                <button
                  onClick={() => setAutoNextDismissed(true)}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                  }}
                >
                  {t("watch.autonext_dismiss")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Oynatma" popover — playback rate + subtitle delay knobs.
            Same anchor convention as the track popover, slightly to its
            left so the two can coexist on screen if user toggles both. */}
        <AnimatePresence>
          {toolsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                position: "absolute",
                right: 22,
                bottom: 96,
                width: 320,
                background: "rgba(15,18,20,0.92)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12,
                padding: "10px 0",
                pointerEvents: "auto",
                zIndex: 11,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 14px 8px",
                  gap: 8,
                }}
              >
                <span
                  className="meta-caps"
                  style={{ fontSize: 9.5, color: "var(--text-3)", flex: 1 }}
                >
                  {t("watch.tools_title")}
                </span>
                <button
                  onClick={() => setToolsOpen(false)}
                  title={t("watch.tracks_close")}
                  style={trackHeaderBtn}
                >
                  ✕
                </button>
              </div>

              <TrackSection title={t("watch.tools_speed")}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    padding: "4px 14px 12px",
                  }}
                >
                  {SPEED_OPTIONS.map((opt) => (
                    <SpeedChip
                      key={opt}
                      value={opt}
                      active={Math.abs(speed - opt) < 0.001}
                      onClick={() => applySpeed(opt)}
                    />
                  ))}
                </div>
              </TrackSection>

              <TrackSection title={t("watch.tools_subdelay")}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 14px 12px",
                    flexWrap: "wrap",
                  }}
                >
                  <DelayChip
                    label="−1s"
                    onClick={() => applySubDelay(subDelay - 1)}
                  />
                  <DelayChip
                    label="−0.1s"
                    onClick={() => applySubDelay(subDelay - 0.1)}
                  />
                  <DelayChip
                    label="0"
                    onClick={() => applySubDelay(0)}
                    primary={Math.abs(subDelay) < 0.001}
                  />
                  <DelayChip
                    label="+0.1s"
                    onClick={() => applySubDelay(subDelay + 0.1)}
                  />
                  <DelayChip
                    label="+1s"
                    onClick={() => applySubDelay(subDelay + 1)}
                  />
                  <span
                    className="mono"
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--text-2)",
                      minWidth: 50,
                      textAlign: "right",
                    }}
                  >
                    {subDelay >= 0 ? "+" : ""}
                    {subDelay.toFixed(1)}s
                  </span>
                </div>
              </TrackSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Track popover — floats above the bottom bar, anchored right.
            Lists audio + subtitle tracks; clicking switches mpv. */}
        <AnimatePresence>
          {tracksOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                position: "absolute",
                right: 22,
                bottom: 96,
                width: 320,
                maxHeight: "60vh",
                overflow: "auto",
                background: "rgba(15,18,20,0.92)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12,
                padding: "10px 0",
                pointerEvents: "auto",
                zIndex: 11,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              <TrackPanel
                tracks={tracks}
                onAudio={chooseAudio}
                onSubtitle={chooseSubtitle}
                onRefresh={refreshTracks}
                onClose={() => setTracksOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div
          style={{
            padding: "14px 22px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            pointerEvents: controlsVisible ? "auto" : "none",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))",
          }}
        >
          <ScrubBar
            position={displayedPosition}
            duration={duration}
            onScrubStart={(s) => setScrubbing(s)}
            onScrub={(s) => setScrubbing(s)}
            onScrubEnd={(s) => {
              setScrubbing(null);
              seekTo(s);
              setPosition(s);
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {onPrev && prevLabel && (
              <PillButton onClick={onPrev} title={t("watch.controls_prev_ep")}>
                ⏮ {prevLabel}
              </PillButton>
            )}
            <span
              className="mono"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "rgba(255,255,255,0.86)",
                minWidth: 110,
              }}
            >
              {formatTime(displayedPosition)} <span style={{ opacity: 0.5 }}>/</span>{" "}
              {formatTime(duration)}
            </span>
            <div style={{ flex: 1 }} />
            <GlassButton
              onClick={toggleMute}
              title={
                isMuted
                  ? t("watch.controls_mute_on")
                  : t("watch.controls_mute_off")
              }
            >
              {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </GlassButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              style={{ width: 110, accentColor: "var(--accent)" }}
            />
            <GlassButton
              onClick={() => setToolsOpen((o) => !o)}
              title={t("watch.controls_tools")}
            >
              {speed === 1 ? "⚙" : `${speed}×`}
            </GlassButton>
            <GlassButton
              onClick={() => (tracksOpen ? setTracksOpen(false) : openTracksPanel())}
              title={t("watch.controls_tracks")}
            >
              CC
            </GlassButton>
            <GlassButton
              onClick={toggleFullscreen}
              title={t("watch.controls_fullscreen")}
            >
              ⛶
            </GlassButton>
            {onNext && nextLabel && (
              <PillButton onClick={onNext} title={t("watch.controls_next_ep")}>
                {nextLabel} ⏭
              </PillButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function TrackPanel({
  tracks,
  onAudio,
  onSubtitle,
  onRefresh,
  onClose,
}: {
  tracks: Track[];
  onAudio: (id: number) => void;
  onSubtitle: (id: number | null) => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const audio = tracks.filter((t) => t.kind === "audio");
  const subs = tracks.filter((t) => t.kind === "sub");
  const subSelected = subs.some((s) => s.selected);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 14px 8px",
          gap: 8,
        }}
      >
        <span
          className="meta-caps"
          style={{ fontSize: 9.5, color: "var(--text-3)", flex: 1 }}
        >
          {t("watch.tracks_title")}
        </span>
        <button
          onClick={onRefresh}
          title={t("watch.tracks_refresh")}
          style={trackHeaderBtn}
        >
          ↻
        </button>
        <button onClick={onClose} title={t("watch.tracks_close")} style={trackHeaderBtn}>
          ✕
        </button>
      </div>

      {/* Audio */}
      <TrackSection title={t("watch.tracks_audio")}>
        {audio.length === 0 ? (
          <TrackEmpty>{t("watch.tracks_audio_empty")}</TrackEmpty>
        ) : (
          audio.map((tr) => (
            <TrackRow
              key={`a${tr.id}`}
              label={trackLabel(tr)}
              selected={tr.selected}
              onClick={() => onAudio(tr.id)}
            />
          ))
        )}
      </TrackSection>

      {/* Subtitle */}
      <TrackSection title={t("watch.tracks_subtitle")}>
        <TrackRow
          label={t("watch.tracks_subtitle_off")}
          selected={!subSelected}
          onClick={() => onSubtitle(null)}
        />
        {subs.map((tr) => (
          <TrackRow
            key={`s${tr.id}`}
            label={trackLabel(tr)}
            selected={tr.selected}
            onClick={() => onSubtitle(tr.id)}
          />
        ))}
      </TrackSection>
    </div>
  );
}

function TrackSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        className="meta-caps"
        style={{
          fontSize: 9,
          color: "var(--text-3)",
          padding: "10px 14px 6px",
          letterSpacing: "0.16em",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function TrackRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        textAlign: "left",
        background: selected
          ? "color-mix(in oklab, var(--accent) 14%, transparent)"
          : "transparent",
        border: "none",
        color: selected ? "var(--accent)" : "rgba(255,255,255,0.86)",
        fontFamily: "var(--sans)",
        fontSize: 12.5,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={{ width: 14, fontFamily: "var(--mono)", fontSize: 11 }}>
        {selected ? "●" : ""}
      </span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function TrackEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px 12px",
        fontSize: 12,
        color: "var(--text-4)",
        fontStyle: "italic",
      }}
    >
      {children}
    </div>
  );
}

/** Build a friendly "Lang · Title (codec)" label from a Track row. */
function trackLabel(tr: Track): string {
  const parts: string[] = [];
  if (tr.lang) parts.push(tr.lang.toUpperCase());
  if (tr.title) parts.push(tr.title);
  if (parts.length === 0) parts.push(`#${tr.id}`);
  if (tr.codec) parts.push(`(${tr.codec})`);
  return parts.join(" · ");
}

/**
 * Buffer health pill — shows in the top bar of the player overlay
 * **only** when the demuxer cache is shallow (<5s ahead) or mpv has
 * stalled outright. When playback is healthy the pill is invisible so
 * we don't add chrome noise to the cinematic frame.
 *
 * Visual states:
 *   • stalled (paused-for-cache=true) → red dot, "Yükleniyor…"
 *   • <2s     → red dot,    "Xs"   (about to stall)
 *   • 2-5s    → amber dot,  "Xs"   (degraded, user should know)
 *   • >=5s    → not rendered
 */
function BufferPill({
  bufferSecs,
  stalled,
}: {
  bufferSecs: number;
  stalled: boolean;
}) {
  const visible = stalled || bufferSecs < 5;
  if (!visible) return null;
  const color = stalled || bufferSecs < 2 ? "#E07A6F" : "#E0B26F";
  const label = stalled
    ? t("watch.buffer_stalled")
    : `${bufferSecs.toFixed(1)}s`;
  return (
    <span
      title={t("watch.buffer_title")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 9px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "#fff",
        fontFamily: "var(--mono)",
        fontSize: 10.5,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 22%, transparent)`,
        }}
      />
      {label}
    </span>
  );
}

function SpeedChip({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        padding: "0 12px",
        borderRadius: 6,
        background: active
          ? "var(--accent)"
          : "rgba(255,255,255,0.08)",
        color: active ? "var(--accent-ink)" : "rgba(255,255,255,0.86)",
        border: active
          ? "none"
          : "1px solid rgba(255,255,255,0.10)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {value === 1 ? "1×" : `${value}×`}
    </button>
  );
}

function DelayChip({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        padding: "0 10px",
        borderRadius: 6,
        background: primary
          ? "color-mix(in oklab, var(--accent) 18%, transparent)"
          : "rgba(255,255,255,0.08)",
        color: primary ? "var(--accent)" : "rgba(255,255,255,0.86)",
        border: primary
          ? "1px solid color-mix(in oklab, var(--accent) 45%, transparent)"
          : "1px solid rgba(255,255,255,0.10)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        cursor: "pointer",
        minWidth: 42,
      }}
    >
      {label}
    </button>
  );
}

const trackHeaderBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.78)",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "var(--mono)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function ScrubBar({
  position,
  duration,
  onScrubStart,
  onScrub,
  onScrubEnd,
}: {
  position: number;
  duration: number;
  onScrubStart: (s: number) => void;
  onScrub: (s: number) => void;
  onScrubEnd: (s: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const seekFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): number => {
      if (!ref.current || duration <= 0) return 0;
      const rect = ref.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      return (x / rect.width) * duration;
    },
    [duration],
  );

  useEffect(() => {
    if (!active) return;
    const move = (e: MouseEvent) => onScrub(seekFromEvent(e));
    const up = (e: MouseEvent) => {
      onScrubEnd(seekFromEvent(e));
      setActive(false);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [active, seekFromEvent, onScrub, onScrubEnd]);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        const s = seekFromEvent(e);
        setActive(true);
        onScrubStart(s);
      }}
      style={{
        height: 22,
        cursor: duration > 0 ? "pointer" : "not-allowed",
        position: "relative",
        display: "flex",
        alignItems: "center",
        opacity: duration > 0 ? 1 : 0.4,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "10px 0",
          background: "rgba(255,255,255,0.18)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "10px 0",
          width: `${pct}%`,
          background: "var(--accent)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(${pct}% - 7px)`,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--accent)",
          boxShadow: "0 0 0 2px rgba(0,0,0,0.45)",
          transition: active ? "none" : "transform 120ms ease",
          transform: active ? "scale(1.15)" : "scale(1)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

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
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 160ms",
        flex: "0 0 auto",
        fontFamily: "var(--mono)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.20)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,0,0,0.50)")
      }
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
        padding: "0 14px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.50)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: disabled ? "rgba(255,255,255,0.30)" : "#fff",
        fontSize: 12,
        fontFamily: "var(--sans)",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) =>
        !disabled &&
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.18)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,0,0,0.50)")
      }
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{ width: 56, height: 56, position: "relative" }}>
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
      <style>{`@keyframes gi-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
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

// ─── Helpers / styles ───────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "--:--";
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const glassButtonStyle: React.CSSProperties = {
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
};

// Episode index — populated by `useEpisodes` (features/vod/useVod.ts) via
// `window.__GENC_EPISODE_INDEX__`. Read here in `findSeriesIdFromCache` to
// resolve episodeId → seriesId for the cold-reload path.
