import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  sidebarMini: boolean;
  searchOpen: boolean;
  /** Mini-player widget mode: shrinks the main window, hides chrome, pins
   *  always-on-top. Toggled from the tray menu and the player overlay. */
  miniMode: boolean;
  /** `?` cheat-sheet modal listing every keyboard binding the app
   *  recognises. Toggled by the `?` key and the help button. */
  shortcutsOpen: boolean;
  setSidebarMini: (mini: boolean) => void;
  toggleSidebar: () => void;
  setSearchOpen: (open: boolean) => void;
  setMiniMode: (on: boolean) => void;
  toggleMiniMode: () => void;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarMini: false,
      searchOpen: false,
      miniMode: false,
      shortcutsOpen: false,
      setSidebarMini: (mini) => set({ sidebarMini: mini }),
      toggleSidebar: () => set({ sidebarMini: !get().sidebarMini }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setMiniMode: (on) => set({ miniMode: on }),
      toggleMiniMode: () => set({ miniMode: !get().miniMode }),
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
    }),
    {
      name: "genc-iptv-ui",
      storage: createJSONStorage(() => localStorage),
      // Only persist sidebar pref. miniMode + searchOpen are session-bound.
      partialize: (state) => ({ sidebarMini: state.sidebarMini }),
    }
  )
);
