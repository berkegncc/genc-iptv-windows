import { useEffect, useRef, useState } from "react";
import { mpvApi } from "../lib/tauri";

export type HealthState = "loading" | "playing" | "retrying" | "failed";

const POLL_MS = 1000;
const STUCK_AFTER_MS = 12_000;
const RETRY_GRACE_MS = 10_000;

/**
 * Watches mpv playback for "no progress" stalls. The classic IPTV failure
 * mode is that `loadfile` succeeds but no bytes flow — mpv reports
 * `time-pos = 0` and `paused = false` indefinitely.
 *
 * We poll status once a second:
 *   - As soon as `time-pos` has moved we mark the stream `playing`
 *   - If 12 s pass without any time-pos delta (and we're not paused) we
 *     auto-retry once: call mpv stop then ask the host to re-issue the
 *     play call (the host owns the URL + cred params, we don't)
 *   - If the retry also stalls, settle into `failed`
 *
 * Maps loosely to the "HLS fallback ladder" in the engineering brief 11.3:
 * because libmpv handles container variation natively, the ladder collapses
 * into "try once, retry once, give up". The proactive `.m3u8 → .ts` swap
 * already happens server-side in `play_stream`.
 *
 * Pass `key` to reset state when the underlying stream changes (e.g. user
 * navigates to a new channel) — `streamUrl` is the natural key.
 */
export function usePlaybackHealth({
  key,
  isReady,
  onAutoRetry,
}: {
  key: string;
  isReady: boolean;
  onAutoRetry: () => void;
}): HealthState {
  const [state, setState] = useState<HealthState>("loading");

  const lastPosRef = useRef(0);
  const lastChangeRef = useRef<number>(Date.now());
  const retryAttemptedRef = useRef(false);
  const failTimerRef = useRef<number | null>(null);

  // Reset on stream change
  useEffect(() => {
    setState("loading");
    lastPosRef.current = 0;
    lastChangeRef.current = Date.now();
    retryAttemptedRef.current = false;
    if (failTimerRef.current != null) {
      window.clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
  }, [key]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const poll = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await mpvApi.status();
        if (status.paused) {
          // User paused on purpose — pause the stuck timer.
          lastChangeRef.current = Date.now();
          return;
        }
        // VOD reaching EOF: mpv leaves `paused=false` but stops advancing
        // time-pos. Don't false-flag that as a stall.
        if (
          status.durationSecs > 0
          && status.positionSecs >= status.durationSecs - 2
        ) {
          lastChangeRef.current = Date.now();
          return;
        }
        if (status.positionSecs > 0 && status.positionSecs !== lastPosRef.current) {
          lastPosRef.current = status.positionSecs;
          lastChangeRef.current = Date.now();
          setState((prev) =>
            prev === "loading" || prev === "retrying" ? "playing" : prev,
          );
          return;
        }
        const sinceChange = Date.now() - lastChangeRef.current;
        if (sinceChange < STUCK_AFTER_MS) return;

        if (!retryAttemptedRef.current) {
          retryAttemptedRef.current = true;
          setState("retrying");
          try {
            await mpvApi.stop();
          } catch {
            /* swallow — we want to retry regardless */
          }
          onAutoRetry();
          // Reset the change timer so the retry gets a fresh window.
          lastChangeRef.current = Date.now();
          // If the retry also stalls, mark as failed.
          if (failTimerRef.current != null) {
            window.clearTimeout(failTimerRef.current);
          }
          failTimerRef.current = window.setTimeout(() => {
            // If we're still in retrying state after the grace window, no
            // bytes have flowed — give up and let the user decide.
            setState((prev) => (prev === "retrying" ? "failed" : prev));
          }, RETRY_GRACE_MS);
        }
      } catch {
        /* mpv may not be initialised yet — keep polling */
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (failTimerRef.current != null) {
        window.clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, key]);

  return state;
}
