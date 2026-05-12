import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useThemeStore } from "./stores/themeStore";
import { useActivePlaylist } from "./features/playlist/usePlaylists";
import { useAutoSyncGate } from "./features/playlist/useAutoSyncGate";
import { useHydrateSettings, useSettingsStore } from "./stores/settingsStore";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useDropM3uHandler } from "./hooks/useDropM3u";
import { useNativeBridges } from "./hooks/useNativeBridges";
import { useMiniWindow } from "./hooks/useMiniWindow";
import { Layout } from "./components/Layout";
import { SearchModal } from "./components/SearchModal";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { SplashGate } from "./components/AnimatedSplash";
import Home from "./pages/Home";
import Channels from "./pages/Channels";
import Films from "./pages/Films";
import FilmDetail from "./pages/FilmDetail";
import Series from "./pages/Series";
import SeriesDetail from "./pages/SeriesDetail";
import Guide from "./pages/Guide";
import Favorites from "./pages/Favorites";
import Search from "./pages/Search";
import Onboarding from "./pages/Onboarding";
import Player from "./pages/Player";
import Watch from "./pages/Watch";
import Settings from "./pages/Settings";
import ThemeSettings from "./pages/Settings/Theme";
import PlaylistsSettings from "./pages/Settings/Playlists";
import PlayerSettings from "./pages/Settings/Player";
import SubtitlesSettings from "./pages/Settings/Subtitles";

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const typography = useThemeStore((s) => s.typography);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.type = typography;
  }, [theme, accent, typography]);

  // Single source of truth for app-wide keyboard bindings.
  useGlobalShortcuts();
  // Listen for .m3u files dropped onto the window → onboarding pre-fill.
  useDropM3uHandler();
  // Tray menu actions + file-association double-clicks → React Router.
  useNativeBridges();
  // Mini-player widget: shrink window + always-on-top when miniMode flips.
  useMiniWindow();

  const { data: activePlaylist, isLoading } = useActivePlaylist();
  // Cold-start sync gate. Runs once per session, latched.
  useAutoSyncGate();
  // Hydrate persisted Settings → Zustand store on app start.
  useHydrateSettings();
  // Onboarding latch: once the user has finished onboarding at least once
  // we don't drag them back through it on a "no playlists" state. They
  // get sent to Settings → Playlist Yönetimi instead so they can re-add.
  const onboardingCompleted = useSettingsStore(
    (s) => s.settings.profile.onboardingCompleted,
  );
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  // Splash overlays the rest of the app until BOTH the choreographed
  // animation has played AND the data layer has settled (active-playlist
  // query + persisted settings hydration). Routes mount underneath so
  // React Query gets a head start on warm caches.
  return (
    <SplashGate dataReady={!isLoading && settingsHydrated}>
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      {isLoading || !settingsHydrated ? (
        // While the active-playlist query is in flight, render nothing
        // underneath the splash. The splash already covers the screen, and
        // we don't know yet whether to show /onboarding or the main app.
        <Route path="*" element={null} />
      ) : activePlaylist == null ? (
        // First-run: never onboarded → /onboarding.
        // Returning user with all playlists deleted: show Layout with
        // Settings → Playlist Yönetimi pre-selected so they can re-add
        // without re-running the welcome screens.
        onboardingCompleted ? (
          <Route element={<Layout />}>
            <Route
              path="/settings/playlists"
              element={<PlaylistsSettings />}
            />
            <Route path="/settings" element={<Settings />}>
              <Route path="theme" element={<ThemeSettings />} />
              <Route path="playlists" element={<PlaylistsSettings />} />
              <Route path="player" element={<PlayerSettings />} />
              <Route path="subtitles" element={<SubtitlesSettings />} />
            </Route>
            <Route
              path="*"
              element={<Navigate to="/settings/playlists" replace />}
            />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        )
      ) : (
        <>
          {/* Fullscreen routes — no chrome. Player drives libmpv directly. */}
          <Route path="/player/:channelId" element={<Player />} />
          <Route path="/watch/:type/:id" element={<Watch />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/films" element={<Films />} />
            <Route path="/films/:id" element={<FilmDetail />} />
            <Route path="/series" element={<Series />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />}>
              <Route path="theme" element={<ThemeSettings />} />
              <Route path="playlists" element={<PlaylistsSettings />} />
              <Route path="player" element={<PlayerSettings />} />
              <Route path="subtitles" element={<SubtitlesSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </>
      )}
    </Routes>
    {/* Mounted globally so Ctrl+F works from any route, including the
        fullscreen player. */}
    <SearchModal />
    {/* `?` cheat-sheet, also global. */}
    <ShortcutsModal />
    </SplashGate>
  );
}
