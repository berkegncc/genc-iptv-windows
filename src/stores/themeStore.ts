import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type AccentKey =
  | "teal"
  | "copper"
  | "purple"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "gray";

export type TypographyKey =
  | "archive"     // default — Spectral · Schibsted Grotesk
  | "magazine"    // Newsreader · Hanken Grotesk
  | "couture"     // Bodoni Moda · Albert Sans
  | "boutique"    // Cormorant Garamond · Inter Tight
  | "default";    // Original — Instrument Serif · Geist

export type HomeStyleKey =
  | "classic-billboard"  // default — saf Netflix tarzı (HomeNetflixA)
  | "top10"              // Top 10 + cinematic hero (HomeNetflixB)
  | "editorial-hybrid"   // Editorial × Netflix hibrit (HomeNetflixC)
  | "wide-tile"          // Apple TV+ hibrit (HomeNetflixD)
  | "editorial-rails";   // Klasik editorial rails (HomeScreen)

interface ThemeState {
  themeMode: ThemeMode;
  theme: ResolvedTheme;
  accent: AccentKey;
  typography: TypographyKey;
  homeStyle: HomeStyleKey;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setTypography: (typography: TypographyKey) => void;
  setHomeStyle: (homeStyle: HomeStyleKey) => void;
}

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      theme: "dark",
      accent: "teal",
      typography: "archive",
      homeStyle: "classic-billboard",
      setThemeMode: (mode) => set({ themeMode: mode, theme: resolveTheme(mode) }),
      setAccent: (accent) => set({ accent }),
      setTypography: (typography) => set({ typography }),
      setHomeStyle: (homeStyle) => set({ homeStyle }),
    }),
    {
      name: "genc-iptv-theme",
      storage: createJSONStorage(() => localStorage),
      // After hydration re-resolve theme in case system prefers changed
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.theme = resolveTheme(state.themeMode);
        }
      },
    }
  )
);

// React to system theme changes when mode === 'system'
if (typeof window !== "undefined" && window.matchMedia) {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { themeMode } = useThemeStore.getState();
      if (themeMode === "system") {
        useThemeStore.setState({ theme: resolveTheme("system") });
      }
    });
}
