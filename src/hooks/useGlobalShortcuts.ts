import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../stores/uiStore";
import { mpvApi } from "../lib/tauri";

/**
 * Single global keydown handler. Centralised here so we don't grow a
 * forest of duplicate `window.addEventListener('keydown')` blocks across
 * pages. Per-page handlers (Player overlay, modals) still own their own
 * key handling for context-sensitive shortcuts (Space, ←/→ during playback,
 * etc.); only app-wide bindings live here.
 *
 * Bindings:
 *   Ctrl+F  ·  arama paleti
 *   Ctrl+1  ·  Anasayfa
 *   Ctrl+2  ·  Kanallar
 *   Ctrl+3  ·  Filmler
 *   Ctrl+4  ·  Diziler
 *   Ctrl+5  ·  Program Rehberi
 *   Ctrl+6  ·  Favoriler
 *   Ctrl+,  ·  Ayarlar
 *   F11     ·  Tam ekran
 *
 * Skips when the focus is inside an editable element so the user's typing
 * isn't hijacked. Cmd takes the place of Ctrl on macOS for free since we
 * accept either modifier.
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isEditable(target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key;
      const lower = key.toLowerCase();

      // `?` opens the cheat-sheet. Shift+/ on most layouts, but accept
      // the literal `?` key value to cover variants. No modifier check
      // — pressing `?` anywhere except in a text field surfaces help.
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (mod && lower === "f") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (mod && key === ",") {
        e.preventDefault();
        navigate("/settings");
        return;
      }

      if (mod) {
        const route = NUMBER_TO_ROUTE[key];
        if (route) {
          e.preventDefault();
          navigate(route);
          return;
        }
      }

      if (key === "F11") {
        e.preventDefault();
        mpvApi.toggleFullscreen().catch(() => {
          /* swallow — mpv may not be initialised yet */
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, setSearchOpen, setShortcutsOpen]);
}

const NUMBER_TO_ROUTE: Record<string, string> = {
  "1": "/",
  "2": "/channels",
  "3": "/films",
  "4": "/series",
  "5": "/guide",
  "6": "/favorites",
};

function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}
