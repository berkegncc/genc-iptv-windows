import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  favoriteApi,
  type Favorite,
  type FavoriteTargetType,
} from "../../lib/tauri";

export const FAVORITE_KEYS = {
  list: (targetType?: FavoriteTargetType) =>
    ["favorites", "list", targetType ?? "ALL"] as const,
  is: (targetId: string, targetType: FavoriteTargetType) =>
    ["favorites", "is", targetId, targetType] as const,
};

export function useFavorites(targetType?: FavoriteTargetType) {
  return useQuery<Favorite[]>({
    queryKey: FAVORITE_KEYS.list(targetType),
    queryFn: () => favoriteApi.list(targetType),
  });
}

export function useIsFavorite(
  targetId: string | undefined,
  targetType: FavoriteTargetType,
) {
  return useQuery<boolean>({
    queryKey: FAVORITE_KEYS.is(targetId ?? "", targetType),
    queryFn: () => favoriteApi.is(targetId!, targetType),
    enabled: !!targetId,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetId,
      targetType,
    }: {
      targetId: string;
      targetType: FavoriteTargetType;
    }) => favoriteApi.toggle(targetId, targetType),
    onSuccess: (newState, { targetId, targetType }) => {
      qc.setQueryData(FAVORITE_KEYS.is(targetId, targetType), newState);
      qc.invalidateQueries({ queryKey: ["favorites", "list"] });
    },
  });
}
