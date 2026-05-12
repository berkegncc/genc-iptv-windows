/**
 * Typed Tauri invoke wrapper. Each backend `#[tauri::command]` gets a
 * matching TS function here so feature code never calls `invoke()` with
 * a stringly-typed name + free-form args.
 *
 * Errors come back as plain strings (see `CommandError` in Rust) — we
 * surface them as JS Error so React Query / try/catch handle them naturally.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { SubtitlePrefs } from "./settings";

export type Playlist = {
  id: number;
  name: string;
  type: "M3U" | "XTREAM";
  url: string;
  username: string | null;
  password: string | null;
  epgUrl: string | null;
  userAgent: string | null;
  isActive: boolean;
  lastSyncedAt: number;
  channelCount: number;
  userInfo: XtreamUserInfo | null;
};

export type XtreamUserInfo = {
  username: string;
  status: string;
  expDateMillis: number | null;
  isTrial: boolean;
  maxConnections: number | null;
};

export type Channel = {
  id: string;
  playlistId: number;
  name: string;
  logoUrl: string | null;
  streamUrl: string;
  groupTitle: string | null;
  epgChannelId: string | null;
  isHd: boolean;
  sortOrder: number;
  groupSortOrder: number;
};

export type CategoryWithCount = {
  name: string;
  count: number;
};

export type AddM3uPayload = {
  name: string;
  url: string;
  epgUrl?: string | null;
  userAgent?: string | null;
};

export type AddXtreamPayload = {
  name: string;
  serverUrl: string;
  username: string;
  password: string;
};

// ─── Wrapper ────────────────────────────────────────────────────────────────

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    // Tauri throws plain strings for our CommandError; wrap as Error so
    // React Query, try/catch, etc. behave normally.
    if (typeof e === "string") throw new Error(e);
    throw e;
  }
}

// ─── Playlist ───────────────────────────────────────────────────────────────

export const playlistApi = {
  getAll: () => invoke<Playlist[]>("get_playlists"),
  getActive: () => invoke<Playlist | null>("get_active_playlist"),
  addM3u: (payload: AddM3uPayload) =>
    invoke<number>("add_m3u_playlist", { payload }),
  addXtream: (payload: AddXtreamPayload) =>
    invoke<number>("add_xtream_playlist", { payload }),
  sync: (id: number) => invoke<number>("sync_playlist", { id }),
  setActive: (id: number) => invoke<void>("set_active_playlist", { id }),
  delete: (id: number) => invoke<void>("delete_playlist", { id }),
};

// ─── Channels ───────────────────────────────────────────────────────────────

export const channelApi = {
  list: (playlistId: number, query?: string, category?: string | null) =>
    invoke<Channel[]>("get_channels", {
      playlistId,
      query: query ?? null,
      category: category ?? null,
    }),
  get: (id: string) => invoke<Channel | null>("get_channel", { id }),
  categories: (playlistId: number) =>
    invoke<CategoryWithCount[]>("get_categories", { playlistId }),
};

// ─── Stream proxy ───────────────────────────────────────────────────────────

let cachedProxyBase: string | null = null;

/**
 * Local HTTP proxy base URL (e.g. `http://127.0.0.1:54321`). Wraps an
 * upstream stream URL by appending `?url=<encoded>` (+ optional `&ua=...`).
 * Cached for the app lifetime — the port is fixed once Rust starts.
 */
export async function getProxyBase(): Promise<string> {
  if (cachedProxyBase == null) {
    cachedProxyBase = await invoke<string>("get_proxy_base");
  }
  return cachedProxyBase;
}

/** Build the proxied URL for an upstream stream URL. */
export function proxiedUrl(
  base: string,
  upstreamUrl: string,
  userAgent?: string | null,
): string {
  const params = new URLSearchParams({ url: upstreamUrl });
  if (userAgent) params.set("ua", userAgent);
  return `${base}/stream?${params.toString()}`;
}

// ─── VOD (movies + series + episodes) ───────────────────────────────────────

export type VodKind = "MOVIE" | "SERIES";

/** A single cast member. `photoUrl` is null when Xtream didn't supply
 *  a headshot — the detail page falls back to initials in that case. */
export type CastMember = {
  name: string;
  photoUrl: string | null;
};

export type VodItem = {
  id: string;
  playlistId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  streamUrl: string;
  kind: VodKind;
  year: number | null;
  rating: number | null;
  plot: string | null;
  genres: string[];
  cast: CastMember[];
  director: string | null;
  durationSecs: number | null;
  categoryId: string | null;
  /** Epoch ms — provider's "added to library" time, may be null. */
  addedAt: number | null;
};

export type SeriesItem = {
  id: string;
  playlistId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  plot: string | null;
  year: number | null;
  rating: number | null;
  genres: string[];
  cast: CastMember[];
  categoryId: string | null;
  addedAt: number | null;
};

export type Episode = {
  id: string;
  seriesId: string;
  playlistId: number;
  season: number;
  episode: number;
  title: string;
  streamUrl: string;
  durationSecs: number | null;
  plot: string | null;
  thumbnailUrl: string | null;
};

export type VodCategoryWithCount = {
  id: string;
  playlistId: number;
  name: string;
  kind: VodKind;
  count: number;
};

export const vodApi = {
  movies: (playlistId: number, query?: string, categoryId?: string | null) =>
    invoke<VodItem[]>("get_movies", {
      playlistId,
      query: query ?? null,
      categoryId: categoryId ?? null,
    }),
  movie: (id: string) => invoke<VodItem | null>("get_movie", { id }),
  /** Lazy fetch full info from upstream + persist; idempotent. */
  enrichMovie: (id: string) => invoke<VodItem>("enrich_movie", { id }),

  series: (playlistId: number, query?: string, categoryId?: string | null) =>
    invoke<SeriesItem[]>("get_series_list", {
      playlistId,
      query: query ?? null,
      categoryId: categoryId ?? null,
    }),
  seriesOne: (id: string) =>
    invoke<SeriesItem | null>("get_series_one", { id }),

  /** Episodes already cached locally; empty until a sync happens. */
  episodes: (seriesId: string) =>
    invoke<Episode[]>("get_episodes", { seriesId }),
  /** Hit upstream get_series_info; replaces local episodes; returns the new list. */
  syncEpisodes: (seriesId: string) =>
    invoke<Episode[]>("sync_episodes_for_series", { seriesId }),

  categories: (playlistId: number, kind: VodKind) =>
    invoke<VodCategoryWithCount[]>("get_vod_categories", { playlistId, kind }),

  recentMovies: (playlistId: number, limit?: number) =>
    invoke<VodItem[]>("get_recent_movies", {
      playlistId,
      limit: limit ?? null,
    }),
  recentSeries: (playlistId: number, limit?: number) =>
    invoke<SeriesItem[]>("get_recent_series", {
      playlistId,
      limit: limit ?? null,
    }),
  randomMovies: (playlistId: number, limit?: number, seed?: number) =>
    invoke<VodItem[]>("get_random_movies", {
      playlistId,
      limit: limit ?? null,
      seed: seed ?? null,
    }),
};

// ─── Favorites ──────────────────────────────────────────────────────────────

export type FavoriteTargetType = "CHANNEL" | "MOVIE" | "SERIES";

export type Favorite = {
  targetId: string;
  targetType: FavoriteTargetType;
  addedAt: number;
};

export const favoriteApi = {
  toggle: (targetId: string, targetType: FavoriteTargetType) =>
    invoke<boolean>("toggle_favorite", { targetId, targetType }),
  is: (targetId: string, targetType: FavoriteTargetType) =>
    invoke<boolean>("is_favorite", { targetId, targetType }),
  list: (targetType?: FavoriteTargetType) =>
    invoke<Favorite[]>("get_favorites", { targetType: targetType ?? null }),
};

// ─── Continue Watching ──────────────────────────────────────────────────────

export type ContinueWatching = {
  targetId: string;
  targetType: FavoriteTargetType;
  positionMs: number;
  durationMs: number;
  updatedAt: number;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  resumeEpisodeId: string | null;
};

export type SavePositionPayload = {
  targetId: string;
  targetType: FavoriteTargetType;
  positionMs: number;
  durationMs: number;
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  resumeEpisodeId?: string | null;
};

export const continueWatchingApi = {
  save: (payload: SavePositionPayload) =>
    invoke<void>("save_position", { payload }),
  list: (limit?: number) =>
    invoke<ContinueWatching[]>("get_continue_watching", { limit: limit ?? null }),
  get: (targetId: string, targetType: FavoriteTargetType) =>
    invoke<ContinueWatching | null>("get_position", { targetId, targetType }),
  delete: (targetId: string, targetType: FavoriteTargetType) =>
    invoke<void>("delete_continue_watching", { targetId, targetType }),
};

// ─── Recent channels ────────────────────────────────────────────────────────

export const recentApi = {
  add: (channelId: string) =>
    invoke<void>("add_recent_channel", { channelId }),
  list: (playlistId: number, limit?: number) =>
    invoke<Channel[]>("get_recent_channels", {
      playlistId,
      limit: limit ?? null,
    }),
};

// ─── Search ─────────────────────────────────────────────────────────────────

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string | null;
  posterUrl: string | null;
};

export type SearchResults = {
  channels: SearchHit[];
  movies: SearchHit[];
  series: SearchHit[];
  channelsTruncated: boolean;
  moviesTruncated: boolean;
  seriesTruncated: boolean;
};

export const searchApi = {
  all: (playlistId: number, query: string) =>
    invoke<SearchResults>("search_all", { playlistId, query }),
};

// ─── EPG ────────────────────────────────────────────────────────────────────

export type Program = {
  id: number;
  channelEpgId: string;
  playlistId: number;
  title: string;
  description: string | null;
  startMillis: number;
  stopMillis: number;
  category: string | null;
};

export type GuideChannel = {
  id: string;
  name: string;
  logoUrl: string | null;
  epgChannelId: string | null;
  groupTitle: string | null;
  sortOrder: number;
  groupSortOrder: number;
};

export type EpgGridRow = {
  channel: GuideChannel;
  programs: Program[];
};

export const epgApi = {
  now: (playlistId: number, channelEpgId: string) =>
    invoke<Program | null>("get_now_program", { playlistId, channelEpgId }),

  /** Bulk now-playing — one entry per channel that has anything airing now. */
  nowBulk: (playlistId: number) =>
    invoke<Array<[string, Program]>>("get_now_programs_bulk", { playlistId }),

  channelPrograms: (
    playlistId: number,
    channelEpgId: string,
    startMillis: number,
    endMillis: number,
  ) =>
    invoke<Program[]>("get_programs_for_channel", {
      playlistId,
      channelEpgId,
      startMillis,
      endMillis,
    }),

  grid: (playlistId: number, startMillis: number, endMillis: number) =>
    invoke<EpgGridRow[]>("get_epg_grid", { playlistId, startMillis, endMillis }),
};

// ─── Player (mpv) ───────────────────────────────────────────────────────────

export type PlayerStatus = {
  positionSecs: number;
  durationSecs: number;
  paused: boolean;
  /** Seconds of upcoming video already in the demuxer cache. Low
   *  (<5s) drives the in-player buffer-health pill. */
  bufferSecs: number;
  /** `true` while mpv has stalled playback waiting for cache refill. */
  pausedForCache: boolean;
};

/** A single audio / subtitle / video track surfaced from libmpv's
 *  `track-list`. The Watch overlay's "CC" popover renders audio + sub
 *  rows from this. `kind` is `"audio"`, `"sub"`, or `"video"`. */
export type Track = {
  id: number;
  kind: "audio" | "sub" | "video" | string;
  title: string | null;
  lang: string | null;
  selected: boolean;
  default: boolean;
  codec: string | null;
};

export const mpvApi = {
  /**
   * Load + play `url` on the singleton libmpv instance attached to our
   * main Tauri window. Channel switches reuse the same instance.
   */
  play: (
    url: string,
    userAgent?: string | null,
    trustAllCerts?: boolean,
  ) =>
    invoke<void>("play_stream", {
      url,
      userAgent: userAgent ?? null,
      trustAllCerts: trustAllCerts ?? null,
    }),
  /** Stop playback (keeps mpv alive). Idempotent. */
  stop: () => invoke<void>("stop_stream"),

  /** Toggle paused state. mpv keeps its own play/pause state. */
  pauseToggle: () => invoke<void>("pause_toggle_stream"),

  /** Set volume (0..1 range; clamped to libmpv's 0..100 internally). */
  setVolume: (volume: number) =>
    invoke<void>("set_volume_stream", { volume }),

  /** Toggle mute. */
  toggleMute: () => invoke<void>("toggle_mute_stream"),

  /** Toggle Tauri main window fullscreen — mpv child resizes automatically. */
  toggleFullscreen: () => invoke<void>("toggle_fullscreen"),

  /** Relative seek (negative = backwards). For ±10s skip buttons. */
  seekRelative: (seconds: number) =>
    invoke<void>("seek_relative_stream", { seconds }),

  /** Absolute seek to a position in seconds. For scrub bar drags. */
  seekAbsolute: (seconds: number) =>
    invoke<void>("seek_absolute_stream", { seconds }),

  /** Polling endpoint for VOD overlay: time-pos + duration + paused. */
  status: () => invoke<PlayerStatus>("get_player_status"),

  /** All audio + subtitle tracks libmpv has parsed from the current
   *  stream. Empty until mpv finishes demuxing — re-fetch a beat after
   *  playback starts. */
  tracks: () => invoke<Track[]>("get_tracks"),

  /** Switch the active audio track to mpv's track id (1-indexed within
   *  the audio set, taken from `Track.id`). */
  setAudioTrack: (id: number) =>
    invoke<void>("set_audio_track", { id }),

  /** Switch the subtitle track. Pass `null` to disable subtitles. */
  setSubtitleTrack: (id: number | null) =>
    invoke<void>("set_subtitle_track", { id }),

  /** Push the user's subtitle styling prefs (font, size, colours, edge,
   *  position) to libmpv. Idempotent — call on every settings update;
   *  mpv stores the property values across stream changes. */
  applySubtitleStyle: (prefs: SubtitlePrefs) =>
    invoke<void>("apply_subtitle_style", { prefs }),

  /** Set playback speed multiplier (1.0 = normal, 2.0 = 2×, etc.). */
  setSpeed: (speed: number) => invoke<void>("set_speed", { speed }),

  /** Shift subtitle timing in seconds (positive = subs delayed, negative
   *  = subs earlier). Useful when an upstream stream has subs out of sync. */
  setSubtitleDelay: (seconds: number) =>
    invoke<void>("set_subtitle_delay", { seconds }),

  /** Push the user's buffer prefs (cache-ahead seconds, network timeout)
   *  to libmpv. Apply on Watch mount + every time the prefs change. */
  applyBufferPrefs: (cacheSecs: number, networkTimeoutSecs: number) =>
    invoke<void>("apply_player_buffer_prefs", {
      cacheSecs,
      networkTimeoutSecs,
    }),

  /** Tell Windows not to dim the display / sleep the system while an active
   *  stream is on screen. Pair every acquire with a release on dismount. */
  acquireDisplayLock: () => invoke<void>("acquire_display_lock"),
  releaseDisplayLock: () => invoke<void>("release_display_lock"),
};
