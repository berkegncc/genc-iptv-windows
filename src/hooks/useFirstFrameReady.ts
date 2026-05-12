import { useEffect, useState } from "react";
import { mpvApi } from "../lib/tauri";

const POLL_MS = 150;
const MAX_WAIT_MS = 6000;

/**
 * Watches libmpv until the first decoded frame has actually landed, instead
 * of the previous fixed 1.2 s setTimeout that fired blind. We poll
 * `mpvApi.status()` and consider playback "ready" the first time we see:
 *   - `position > 0` (any time-pos increment, true for live + VOD), or
 *   - `duration > 0` (parsed VOD container — close enough, mpv flips this
 *     after the demuxer has identified the file).
 *
 * Hard cap of `MAX_WAIT_MS` so a permanently stalled stream still flips
 * `isReady` and shows the controls / lets the playback-health hook take
 * over the failure path.
 *
 * Pass `streamKey` (typically the stream URL) to reset on stream change.
 */
export function useFirstFrameReady(streamKey: string): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    let cancelled = false;
    const startedAt = Date.now();

    const handle = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await mpvApi.status();
        if (status.positionSecs > 0 || status.durationSecs > 0) {
          setReady(true);
          window.clearInterval(handle);
          return;
        }
      } catch {
        /* mpv may not have spawned yet; keep polling */
      }
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        // Bail-out: even with no signal we let the overlay drop so the
        // playback-health hook can decide failure on its own timer.
        setReady(true);
        window.clearInterval(handle);
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [streamKey]);

  return ready;
}
