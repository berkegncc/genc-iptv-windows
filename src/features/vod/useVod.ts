import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  vodApi,
  type Episode,
  type SeriesItem,
  type VodCategoryWithCount,
  type VodItem,
  type VodKind,
} from "../../lib/tauri";

// Global episode → series-id index, populated as a side effect of
// `useEpisodes` so the /watch/episode/:id route can resolve back to the
// owning series even after a cold reload (cache miss path).
declare global {
  interface Window {
    __GENC_EPISODE_INDEX__?: Map<string, string>;
  }
}
function rememberEpisodes(seriesId: string, episodes: Episode[]) {
  if (!window.__GENC_EPISODE_INDEX__)
    window.__GENC_EPISODE_INDEX__ = new Map();
  for (const ep of episodes) {
    window.__GENC_EPISODE_INDEX__.set(ep.id, seriesId);
  }
}

export const VOD_KEYS = {
  movies: (playlistId: number, query?: string, categoryId?: string | null) =>
    ["vod", "movies", playlistId, query ?? "", categoryId ?? null] as const,
  movie: (id: string) => ["vod", "movie", id] as const,
  seriesList: (playlistId: number, query?: string, categoryId?: string | null) =>
    ["vod", "series", playlistId, query ?? "", categoryId ?? null] as const,
  seriesOne: (id: string) => ["vod", "series", "one", id] as const,
  episodes: (seriesId: string) => ["vod", "episodes", seriesId] as const,
  categories: (playlistId: number, kind: VodKind) =>
    ["vod", "categories", playlistId, kind] as const,
};

export function useMovies(
  playlistId: number | undefined,
  opts: { query?: string; categoryId?: string | null } = {},
) {
  return useQuery<VodItem[]>({
    queryKey: VOD_KEYS.movies(playlistId ?? -1, opts.query, opts.categoryId),
    queryFn: () => vodApi.movies(playlistId!, opts.query, opts.categoryId),
    enabled: playlistId != null && playlistId > 0,
  });
}

export function useMovie(id: string | undefined) {
  return useQuery<VodItem | null>({
    queryKey: VOD_KEYS.movie(id ?? ""),
    queryFn: () => vodApi.movie(id!),
    enabled: !!id,
  });
}

/// Trigger an enrichment fetch on demand. Returns the freshly enriched item.
export function useEnrichMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vodApi.enrichMovie(id),
    onSuccess: (data) => {
      qc.setQueryData(VOD_KEYS.movie(data.id), data);
      qc.invalidateQueries({ queryKey: ["vod", "movies"] });
    },
  });
}

export function useSeriesList(
  playlistId: number | undefined,
  opts: { query?: string; categoryId?: string | null } = {},
) {
  return useQuery<SeriesItem[]>({
    queryKey: VOD_KEYS.seriesList(playlistId ?? -1, opts.query, opts.categoryId),
    queryFn: () => vodApi.series(playlistId!, opts.query, opts.categoryId),
    enabled: playlistId != null && playlistId > 0,
  });
}

export function useSeriesOne(id: string | undefined) {
  return useQuery<SeriesItem | null>({
    queryKey: VOD_KEYS.seriesOne(id ?? ""),
    queryFn: () => vodApi.seriesOne(id!),
    enabled: !!id,
  });
}

export function useEpisodes(seriesId: string | undefined) {
  const query = useQuery<Episode[]>({
    queryKey: VOD_KEYS.episodes(seriesId ?? ""),
    queryFn: () => vodApi.episodes(seriesId!),
    enabled: !!seriesId,
  });
  // Populate the global episode-id index so the Watch route can resolve
  // episodeId → seriesId without explicit URL plumbing.
  useEffect(() => {
    if (seriesId && query.data && query.data.length > 0) {
      rememberEpisodes(seriesId, query.data);
    }
  }, [seriesId, query.data]);
  return query;
}

/// Lazy episode sync: hit upstream + replace local cache. Returns the new list.
export function useSyncEpisodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seriesId: string) => vodApi.syncEpisodes(seriesId),
    onSuccess: (eps, seriesId) => {
      qc.setQueryData(VOD_KEYS.episodes(seriesId), eps);
      rememberEpisodes(seriesId, eps);
    },
  });
}

export function useVodCategories(
  playlistId: number | undefined,
  kind: VodKind,
) {
  return useQuery<VodCategoryWithCount[]>({
    queryKey: VOD_KEYS.categories(playlistId ?? -1, kind),
    queryFn: () => vodApi.categories(playlistId!, kind),
    enabled: playlistId != null && playlistId > 0,
  });
}

export function useRecentMovies(
  playlistId: number | undefined,
  limit?: number,
) {
  return useQuery<VodItem[]>({
    queryKey: ["vod", "recent-movies", playlistId ?? -1, limit ?? 12] as const,
    queryFn: () => vodApi.recentMovies(playlistId!, limit),
    enabled: playlistId != null && playlistId > 0,
  });
}

export function useRecentSeries(
  playlistId: number | undefined,
  limit?: number,
) {
  return useQuery<SeriesItem[]>({
    queryKey: ["vod", "recent-series", playlistId ?? -1, limit ?? 12] as const,
    queryFn: () => vodApi.recentSeries(playlistId!, limit),
    enabled: playlistId != null && playlistId > 0,
  });
}

/**
 * Per-launch random shuffle. The seed lives at module scope so it stays
 * stable for the entire session — every call to `useRandomMovies` shares
 * the same React Query cache key and gets the same shuffle. Restarting
 * the app re-evaluates the module → new seed → fresh 20.
 *
 * Note: the backend doesn't actually use the seed (sqlite's RANDOM()
 * doesn't accept one); we just thread it through the cache key so
 * different sessions land in different cache buckets.
 */
const SESSION_RANDOM_SEED = Math.floor(Math.random() * 1_000_000);

export function useRandomMovies(
  playlistId: number | undefined,
  limit?: number,
) {
  return useQuery<VodItem[]>({
    queryKey: [
      "vod",
      "random-movies",
      playlistId ?? -1,
      limit ?? 20,
      SESSION_RANDOM_SEED,
    ] as const,
    queryFn: () =>
      vodApi.randomMovies(playlistId!, limit, SESSION_RANDOM_SEED),
    enabled: playlistId != null && playlistId > 0,
    // Lock the cache so navigating away and back doesn't reshuffle.
    staleTime: Infinity,
  });
}
