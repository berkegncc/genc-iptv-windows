import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  channelApi,
  recentApi,
  type CategoryWithCount,
  type Channel,
} from "../../lib/tauri";

export const CHANNEL_KEYS = {
  list: (playlistId: number, query?: string, category?: string | null) =>
    ["channels", playlistId, query ?? "", category ?? null] as const,
  one: (id: string) => ["channels", "one", id] as const,
  categories: (playlistId: number) => ["categories", playlistId] as const,
};

export function useChannels(
  playlistId: number | undefined,
  opts: { query?: string; category?: string | null } = {},
) {
  return useQuery<Channel[]>({
    queryKey: CHANNEL_KEYS.list(playlistId ?? -1, opts.query, opts.category),
    queryFn: () => channelApi.list(playlistId!, opts.query, opts.category),
    enabled: playlistId != null && playlistId > 0,
  });
}

export function useChannel(id: string | undefined) {
  return useQuery<Channel | null>({
    queryKey: CHANNEL_KEYS.one(id ?? ""),
    queryFn: () => channelApi.get(id!),
    enabled: !!id,
  });
}

export function useCategories(playlistId: number | undefined) {
  return useQuery<CategoryWithCount[]>({
    queryKey: CHANNEL_KEYS.categories(playlistId ?? -1),
    queryFn: () => channelApi.categories(playlistId!),
    enabled: playlistId != null && playlistId > 0,
  });
}

// ─── Recent channels ────────────────────────────────────────────────────────

const RECENT_KEY = (playlistId: number) =>
  ["channels", "recent", playlistId] as const;

export function useRecentChannels(
  playlistId: number | undefined,
  limit?: number,
) {
  return useQuery<Channel[]>({
    queryKey: RECENT_KEY(playlistId ?? -1),
    queryFn: () => recentApi.list(playlistId!, limit),
    enabled: playlistId != null && playlistId > 0,
  });
}

/**
 * Stamp a channel as "just played". Called from the player route on every
 * load — silently swallows errors because failing to record a recent play
 * shouldn't disrupt playback.
 */
export function useMarkChannelPlayed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => recentApi.add(channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels", "recent"] });
    },
  });
}
