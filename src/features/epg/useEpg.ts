import { useQuery } from "@tanstack/react-query";
import {
  epgApi,
  type EpgGridRow,
  type Program,
} from "../../lib/tauri";

export const EPG_KEYS = {
  now: (playlistId: number, channelEpgId: string) =>
    ["epg", "now", playlistId, channelEpgId] as const,
  nowBulk: (playlistId: number) =>
    ["epg", "now-bulk", playlistId] as const,
  channelPrograms: (
    playlistId: number,
    channelEpgId: string,
    start: number,
    end: number,
  ) =>
    ["epg", "ch-progs", playlistId, channelEpgId, start, end] as const,
  grid: (playlistId: number, start: number, end: number) =>
    ["epg", "grid", playlistId, start, end] as const,
};

export function useNowProgram(
  playlistId: number | undefined,
  channelEpgId: string | null | undefined,
) {
  return useQuery<Program | null>({
    queryKey: EPG_KEYS.now(playlistId ?? -1, channelEpgId ?? ""),
    queryFn: () => epgApi.now(playlistId!, channelEpgId!),
    enabled: !!playlistId && !!channelEpgId,
    // EPG slot rotates every ~30 min. A minute-grain refetch is plenty
    // and keeps "şu an" pills accurate without thrashing the DB.
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/** Bulk now-playing as a `Map<channelEpgId, Program>` — convenient lookup. */
export function useNowProgramsBulk(playlistId: number | undefined) {
  return useQuery<Map<string, Program>>({
    queryKey: EPG_KEYS.nowBulk(playlistId ?? -1),
    queryFn: async () => {
      const arr = await epgApi.nowBulk(playlistId!);
      return new Map(arr);
    },
    enabled: !!playlistId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useEpgGrid(
  playlistId: number | undefined,
  startMillis: number,
  endMillis: number,
) {
  return useQuery<EpgGridRow[]>({
    queryKey: EPG_KEYS.grid(playlistId ?? -1, startMillis, endMillis),
    queryFn: () => epgApi.grid(playlistId!, startMillis, endMillis),
    enabled: !!playlistId && endMillis > startMillis,
    // The grid is a wider window — slower-rotating cache is fine.
    staleTime: 5 * 60_000,
  });
}

export function useChannelPrograms(
  playlistId: number | undefined,
  channelEpgId: string | null | undefined,
  startMillis: number,
  endMillis: number,
) {
  return useQuery<Program[]>({
    queryKey: EPG_KEYS.channelPrograms(
      playlistId ?? -1,
      channelEpgId ?? "",
      startMillis,
      endMillis,
    ),
    queryFn: () =>
      epgApi.channelPrograms(playlistId!, channelEpgId!, startMillis, endMillis),
    enabled: !!playlistId && !!channelEpgId && endMillis > startMillis,
    staleTime: 5 * 60_000,
  });
}
