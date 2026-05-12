import { useEffect, useRef } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useUIStore } from "../stores/uiStore";

const MINI_W = 420;
const MINI_H = 240;

const DEFAULT_W = 1440;
const DEFAULT_H = 900;

const MIN_NORMAL_W = 1024;
const MIN_NORMAL_H = 640;

const MIN_MINI_W = 320;
const MIN_MINI_H = 200;

/**
 * Sync the OS window state to the `miniMode` UI flag.
 *
 * Mini mode shrinks the window to a 420×240 always-on-top tile. Toggling
 * back restores the previous size (we snapshot it on entry, fall back to
 * a sensible default if the user resized while in mini).
 *
 * Min-size constraints are also tightened so the OS resize handles can
 * actually drag the mini window down to its target. We restore the
 * normal-mode constraints on exit.
 */
export function useMiniWindow() {
  const miniMode = useUIStore((s) => s.miniMode);
  const lastNormalSizeRef = useRef<{ width: number; height: number } | null>(null);
  const everToggledRef = useRef(false);

  useEffect(() => {
    const win = getCurrentWindow();

    (async () => {
      try {
        if (miniMode) {
          // Snapshot current size so we can restore it on exit.
          const size = await win.outerSize();
          const scale = await win.scaleFactor();
          lastNormalSizeRef.current = {
            width: Math.round(size.width / scale),
            height: Math.round(size.height / scale),
          };

          await win.setMinSize(new LogicalSize(MIN_MINI_W, MIN_MINI_H));
          await win.setSize(new LogicalSize(MINI_W, MINI_H));
          await win.setAlwaysOnTop(true);
        } else {
          // Skip the very first render where miniMode === false: we don't
          // want to thrash a freshly-launched window. Only undo when the
          // user explicitly leaves mini mode.
          if (!everToggledRef.current) return;

          await win.setAlwaysOnTop(false);
          await win.setMinSize(new LogicalSize(MIN_NORMAL_W, MIN_NORMAL_H));
          const restore =
            lastNormalSizeRef.current ?? { width: DEFAULT_W, height: DEFAULT_H };
          await win.setSize(new LogicalSize(restore.width, restore.height));
        }
      } catch (e) {
        console.warn("[mini-window] toggle failed", e);
      }
    })();

    everToggledRef.current = everToggledRef.current || miniMode;
  }, [miniMode]);
}
