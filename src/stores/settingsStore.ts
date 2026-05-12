/**
 * Settings store — Zustand mirror of the persisted `settings.json`.
 *
 * Hydration: `useHydrateSettings()` loads the file on app start and pushes
 * it into the store. Subsequent setters write through to disk via
 * `saveSettings`, fire-and-forget.
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type PlayerPrefs,
  type ProfilePrefs,
  type SubtitlePrefs,
  type UserSettings,
} from "../lib/settings";

interface SettingsState {
  settings: UserSettings;
  hydrated: boolean;
  setHydrated: (next: UserSettings) => void;
  updateProfile: (patch: Partial<ProfilePrefs>) => void;
  updatePlayer: (patch: Partial<PlayerPrefs>) => void;
  updateSubtitles: (patch: Partial<SubtitlePrefs>) => void;
  resetPlayer: () => void;
  resetSubtitles: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  setHydrated: (next) => set({ settings: next, hydrated: true }),
  updateProfile: (patch) => {
    const next: UserSettings = {
      ...get().settings,
      profile: { ...get().settings.profile, ...patch },
    };
    set({ settings: next });
    void saveSettings(next);
  },
  updatePlayer: (patch) => {
    const next: UserSettings = {
      ...get().settings,
      player: { ...get().settings.player, ...patch },
    };
    set({ settings: next });
    void saveSettings(next);
  },
  updateSubtitles: (patch) => {
    const next: UserSettings = {
      ...get().settings,
      subtitles: { ...get().settings.subtitles, ...patch },
    };
    set({ settings: next });
    void saveSettings(next);
  },
  resetPlayer: () => {
    const next: UserSettings = {
      ...get().settings,
      player: DEFAULT_SETTINGS.player,
    };
    set({ settings: next });
    void saveSettings(next);
  },
  resetSubtitles: () => {
    const next: UserSettings = {
      ...get().settings,
      subtitles: DEFAULT_SETTINGS.subtitles,
    };
    set({ settings: next });
    void saveSettings(next);
  },
}));

/**
 * Mount once at app root to load `settings.json` from disk into the store.
 * Idempotent — guarded by an internal ref so re-renders don't refetch.
 */
export function useHydrateSettings() {
  const setHydrated = useSettingsStore((s) => s.setHydrated);
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    loadSettings()
      .then((s) => setHydrated(s))
      .catch((e) => {
        console.warn("[settings] hydrate failed; using defaults", e);
        setHydrated(DEFAULT_SETTINGS);
      });
  }, [setHydrated]);
}
