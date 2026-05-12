import { useEffect, useRef } from "react";
import {
  useActivePlaylist,
  useSyncPlaylist,
} from "./usePlaylists";

/**
 * Cold-start auto-sync gate. If the active playlist's `lastSyncedAt` is
 * older than `STALE_AFTER_MS`, kick off a background sync.
 *
 * Behaviour mirrors Android `StartDestinationViewModel` (engineering brief
 * 11.1):
 *  - Latched: only fires once per app session (the ref guard). After the
 *    user lands on Home a fresh `lastSyncedAt` won't bounce them back into
 *    a syncing flow.
 *  - Non-blocking: the sync runs in the background; the existing pages
 *    show their own loading states while we wait.
 */
// Daily: only kick off a background sync if the playlist is at least 24
// hours stale. Anything more aggressive starts surprising the user with
// bandwidth use on every cold start (Xtream syncs can move 100 MB+ on
// large libraries).
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function useAutoSyncGate() {
  const { data: active } = useActivePlaylist();
  const sync = useSyncPlaylist();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!active) return;

    const age = Date.now() - active.lastSyncedAt;
    if (age >= STALE_AFTER_MS) {
      ranRef.current = true;
      sync.mutate(active.id, {
        onError: (e) => {
          // Don't disrupt the UI for an auto-sync failure — the user can
          // still browse cached data and trigger a manual sync from
          // Settings → Playlist Yönetimi if they need to.
          console.warn("[auto-sync] background sync failed", e);
        },
      });
    } else {
      // Mark as run even when fresh, so we don't re-evaluate on every
      // active-playlist refetch.
      ranRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.lastSyncedAt]);
}
