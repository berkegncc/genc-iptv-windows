import { useEffect } from "react";
import { mpvApi } from "../lib/tauri";

/**
 * Hold a Windows "display required" lock for the lifetime of the calling
 * component. Mount this from any view that drives full-screen-ish playback
 * (live channel player, VOD watch shell) so the system doesn't dim or
 * sleep while the user is watching but not touching the keyboard.
 *
 * `SetThreadExecutionState` (the Rust side) is process-global without a
 * real refcount, so calling acquire from two routes simultaneously is
 * fine — they share the same flag — but each component still needs a
 * matched release on unmount or the lock outlives playback.
 */
export function useDisplayLock(active = true) {
  useEffect(() => {
    if (!active) return;
    mpvApi.acquireDisplayLock().catch(() => {
      /* best-effort — non-Windows platforms no-op anyway */
    });
    return () => {
      mpvApi.releaseDisplayLock().catch(() => {});
    };
  }, [active]);
}
