import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  playlistApi,
  type AddM3uPayload,
  type AddXtreamPayload,
  type Playlist,
} from "../../lib/tauri";

export const PLAYLIST_KEYS = {
  all: ["playlists"] as const,
  active: ["playlists", "active"] as const,
};

export function usePlaylists() {
  return useQuery<Playlist[]>({
    queryKey: PLAYLIST_KEYS.all,
    queryFn: playlistApi.getAll,
  });
}

export function useActivePlaylist() {
  return useQuery<Playlist | null>({
    queryKey: PLAYLIST_KEYS.active,
    queryFn: playlistApi.getActive,
  });
}

function invalidatePlaylists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: PLAYLIST_KEYS.all });
  qc.invalidateQueries({ queryKey: PLAYLIST_KEYS.active });
  // Channels also depend on the active playlist
  qc.invalidateQueries({ queryKey: ["channels"] });
  qc.invalidateQueries({ queryKey: ["categories"] });
}

export function useAddM3uPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddM3uPayload) => playlistApi.addM3u(payload),
    onSuccess: () => invalidatePlaylists(qc),
  });
}

export function useAddXtreamPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddXtreamPayload) => playlistApi.addXtream(payload),
    onSuccess: () => invalidatePlaylists(qc),
  });
}

export function useSyncPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => playlistApi.sync(id),
    onSuccess: () => invalidatePlaylists(qc),
  });
}

export function useSetActivePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => playlistApi.setActive(id),
    onSuccess: () => invalidatePlaylists(qc),
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => playlistApi.delete(id),
    onSuccess: () => invalidatePlaylists(qc),
  });
}
