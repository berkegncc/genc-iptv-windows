/**
 * User preferences persisted via tauri-plugin-store at
 * `%APPDATA%/com.genciptv.player/settings.json`.
 *
 * The store is the source of truth; React state mirrors it. We hydrate
 * once at app start (`loadSettings`) and write through on every change
 * (`updateSettings`). The defaults below match the engineering brief.
 */
import { Store } from "@tauri-apps/plugin-store";

const STORE_FILE = "settings.json";
const KEY = "preferences";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DecoderPref = "auto" | "hardware" | "software";
export type DefaultQuality = "auto" | "1080p" | "720p" | "480p";

export interface PlayerPrefs {
  defaultQuality: DefaultQuality;
  decoderPref: DecoderPref;
  preferredAudioLang: string;
  loudnessNormalization: boolean;
  pipEnabled: boolean;
  userAgentOverride: string;
  trustAllCerts: boolean;
  /** Seconds of upcoming video mpv tries to keep buffered ahead of the
   *  playhead. Larger = smoother on flaky networks, longer startup
   *  delay, more RAM. 5–120 range; default 20. */
  cacheSecs: number;
  /** How long mpv waits on a stalled network read before erroring out.
   *  Larger = more patience on slow upstreams. 10–120 range; default 60. */
  networkTimeoutSecs: number;
}

export type SubtitleFontFamily = "SANS" | "SERIF" | "MONO";
export type SubtitleFontStyle = "REGULAR" | "BOLD" | "ITALIC";
export type SubtitleEdgeType = "NONE" | "OUTLINE" | "DROP_SHADOW" | "RAISED";
export type SubtitleVerticalPosition = "TOP" | "MIDDLE" | "BOTTOM";

export interface SubtitlePrefs {
  fontFamily: SubtitleFontFamily;
  fontStyle: SubtitleFontStyle;
  textSizePercent: number; // 50..200
  textColor: string;       // #RRGGBB
  textOpacityPercent: number; // 0..100
  backgroundColor: string;
  backgroundOpacityPercent: number;
  windowColor: string;
  windowOpacityPercent: number;
  edgeType: SubtitleEdgeType;
  edgeColor: string;
  verticalPosition: SubtitleVerticalPosition;
}

export interface ProfilePrefs {
  /** Görünen ad — onboarding'de girilir, Home'daki "Hoş geldin, X." +
   *  Sidebar profil rozetinde geçer. Boş değer = avatar/kart sadece "•". */
  displayName: string;
  /** Set to `true` once the user has completed onboarding at least once.
   *  Acts as a latch (engineering brief 11.1 family): if they later delete
   *  every playlist we route them to Settings → Playlist Yönetimi rather
   *  than re-running the welcome flow. */
  onboardingCompleted: boolean;
}

export interface UserSettings {
  profile: ProfilePrefs;
  player: PlayerPrefs;
  subtitles: SubtitlePrefs;
}

export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
  defaultQuality: "auto",
  decoderPref: "auto",
  preferredAudioLang: "tr",
  loudnessNormalization: false,
  pipEnabled: true,
  userAgentOverride: "",
  trustAllCerts: false,
  cacheSecs: 20,
  networkTimeoutSecs: 60,
};

export const DEFAULT_SUBTITLE_PREFS: SubtitlePrefs = {
  fontFamily: "SANS",
  fontStyle: "REGULAR",
  textSizePercent: 100,
  textColor: "#FFFFFF",
  textOpacityPercent: 100,
  backgroundColor: "#000000",
  backgroundOpacityPercent: 75,
  windowColor: "#000000",
  windowOpacityPercent: 0,
  edgeType: "NONE",
  edgeColor: "#000000",
  verticalPosition: "BOTTOM",
};

export const DEFAULT_PROFILE_PREFS: ProfilePrefs = {
  displayName: "",
  onboardingCompleted: false,
};

export const DEFAULT_SETTINGS: UserSettings = {
  profile: DEFAULT_PROFILE_PREFS,
  player: DEFAULT_PLAYER_PREFS,
  subtitles: DEFAULT_SUBTITLE_PREFS,
};

// ─── Store wrapper ──────────────────────────────────────────────────────────

let cachedStore: Store | null = null;
async function store(): Promise<Store> {
  if (!cachedStore) cachedStore = await Store.load(STORE_FILE);
  return cachedStore;
}

/**
 * Read the persisted settings, merging with defaults so newly-added
 * preferences fall through cleanly when older saved files don't have them.
 */
export async function loadSettings(): Promise<UserSettings> {
  const s = await store();
  const raw = await s.get<Partial<UserSettings>>(KEY);
  return mergeWithDefaults(raw ?? null);
}

export async function saveSettings(next: UserSettings): Promise<void> {
  const s = await store();
  await s.set(KEY, next);
  await s.save();
}

function mergeWithDefaults(raw: Partial<UserSettings> | null): UserSettings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    profile: { ...DEFAULT_PROFILE_PREFS, ...(raw.profile ?? {}) },
    player: { ...DEFAULT_PLAYER_PREFS, ...(raw.player ?? {}) },
    subtitles: { ...DEFAULT_SUBTITLE_PREFS, ...(raw.subtitles ?? {}) },
  };
}
