import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  continueWatchingApi,
  type ContinueWatching,
  type FavoriteTargetType,
  type SavePositionPayload,
} from "../../lib/tauri";

export const CW_KEYS = {
  list: (limit?: number) => ["continue-watching", "list", limit ?? 20] as const,
  one: (targetId: string, targetType: FavoriteTargetType) =>
    ["continue-watching", "one", targetId, targetType] as const,
};

export function useContinueWatching(limit?: number) {
  return useQuery<ContinueWatching[]>({
    queryKey: CW_KEYS.list(limit),
    queryFn: () => continueWatchingApi.list(limit),
  });
}

export function usePosition(
  targetId: string | undefined,
  targetType: FavoriteTargetType,
) {
  return useQuery<ContinueWatching | null>({
    queryKey: CW_KEYS.one(targetId ?? "", targetType),
    queryFn: () => continueWatchingApi.get(targetId!, targetType),
    enabled: !!targetId,
  });
}

export function useSavePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePositionPayload) =>
      continueWatchingApi.save(payload),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["continue-watching", "list"] });
      qc.setQueryData(
        CW_KEYS.one(payload.targetId, payload.targetType),
        null, // Don't trust the cache; let the next fetch hit the DB.
      );
      qc.invalidateQueries({
        queryKey: CW_KEYS.one(payload.targetId, payload.targetType),
      });
    },
  });
}

export function useDeleteContinueWatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetId,
      targetType,
    }: {
      targetId: string;
      targetType: FavoriteTargetType;
    }) => continueWatchingApi.delete(targetId, targetType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["continue-watching"] });
    },
  });
}
