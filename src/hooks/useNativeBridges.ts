import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useUIStore } from "../stores/uiStore";

/**
 * Bridges a couple of Rust → JS event channels into React state:
 *
 *  - `tray-action` payload ∈ { "open", "resume", "mini", "settings" } —
 *    the system-tray menu fires this. We only have to react to the
 *    routing-flavoured ones; bringing the window forward is already done
 *    on the Rust side before this lands.
 *
 *  - `open-file` payload is an absolute path to a `.m3u`/`.m3u8` file the
 *    user double-clicked (file association) or that arrived as the second-
 *    instance startup args. We route to `/onboarding?file=…` so the same
 *    drop-pre-fill flow handles it.
 */
export function useNativeBridges() {
  const navigate = useNavigate();
  const setMiniMode = useUIStore((s) => s.setMiniMode);

  useEffect(() => {
    const unsubs: UnlistenFn[] = [];
    let cancelled = false;

    (async () => {
      try {
        const unTray = await listen<string>("tray-action", (e) => {
          switch (e.payload) {
            case "open":
              navigate("/");
              break;
            case "resume":
              navigate("/");
              // The Devam Et rail is on Home; the user will see it on top.
              break;
            case "settings":
              navigate("/settings");
              break;
            case "mini":
              setMiniMode(true);
              break;
          }
        });
        if (cancelled) {
          unTray();
        } else {
          unsubs.push(unTray);
        }

        const unOpen = await listen<string>("open-file", (e) => {
          const path = e.payload;
          if (!path) return;
          if (!/\.(m3u8?)$/i.test(path)) return;
          navigate(`/onboarding?file=${encodeURIComponent(path)}`);
        });
        if (cancelled) {
          unOpen();
        } else {
          unsubs.push(unOpen);
        }
      } catch (e) {
        console.warn("[native-bridges] subscribe failed", e);
      }
    })();

    return () => {
      cancelled = true;
      for (const off of unsubs) off();
    };
  }, [navigate, setMiniMode]);
}
