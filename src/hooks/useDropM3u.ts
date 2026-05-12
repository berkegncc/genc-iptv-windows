import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWebview } from "@tauri-apps/api/webview";

/**
 * Listen for `.m3u` / `.m3u8` files dropped onto the app window. When the
 * user drops one we navigate to `/onboarding?file=<path>` so the M3U form
 * can pre-fill — the existing `add_m3u_playlist` command was extended to
 * accept local paths so the same submit handler covers both URL and file
 * cases.
 *
 * Mounted once at app root. The listener stays attached for the app's
 * lifetime; unsubscribing on unmount keeps StrictMode-double-mount safe.
 */
export function useDropM3uHandler() {
  const navigate = useNavigate();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    let unlisten: (() => void) | null = null;

    (async () => {
      try {
        const webview = getCurrentWebview();
        const off = await webview.onDragDropEvent((event) => {
          if (event.payload.type !== "drop") return;
          const paths = event.payload.paths;
          if (!paths || paths.length === 0) return;
          // First .m3u-ish file wins. Anything else (random files / images)
          // is silently ignored — we don't want to swallow drops the rest
          // of the app might want for future features (e.g. dragging an
          // image onto a profile editor).
          const m3u = paths.find((p) => /\.(m3u8?|M3U8?)$/.test(p));
          if (!m3u) return;
          const target = `/onboarding?file=${encodeURIComponent(m3u)}`;
          navigate(target);
        });
        unlisten = off;
      } catch (e) {
        // Drag-drop may not be available in some Tauri configs (e.g. when
        // `dragDropEnabled: false`). Don't crash the app on subscribe failure.
        console.warn("[drop-m3u] subscribe failed", e);
      }
    })();

    return () => {
      unlisten?.();
    };
  }, [navigate]);
}
