import {
  useIsFavorite,
  useToggleFavorite,
} from "../../features/favorites/useFavorites";
import type { FavoriteTargetType } from "../../lib/tauri";

interface FavoriteStarProps {
  targetId: string;
  targetType: FavoriteTargetType;
  /** Visual flavour. `inline` is a thin row-end star (Channels list).
   *  `overlay` is a circular pill overlaid on a poster corner (grids). */
  variant?: "inline" | "overlay";
  /** Optional onClick override. Default behaviour toggles + stops
   *  propagation so the surrounding row/card isn't activated. */
  onToggle?: () => void;
  size?: number;
}

/**
 * Reusable star toggle. Reads + writes favorites via the existing
 * `is_favorite` / `toggle_favorite` Tauri commands.
 *
 * Always uses `stopPropagation` on click so dropping it inside a clickable
 * row (channel list) or poster card doesn't double-fire the parent's
 * navigation. Hooks short-circuit when `targetId` is empty so callers can
 * mount it conditionally without lifecycle awkwardness.
 */
export function FavoriteStar({
  targetId,
  targetType,
  variant = "inline",
  onToggle,
  size = 18,
}: FavoriteStarProps) {
  const { data: isFav } = useIsFavorite(targetId, targetType);
  const toggle = useToggleFavorite();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggle) {
      onToggle();
    } else {
      toggle.mutate({ targetId, targetType });
    }
  };

  const filled = !!isFav;
  const label = filled ? "Favorilerden çıkar" : "Favorilere ekle";

  if (variant === "overlay") {
    return (
      <button
        onClick={handleClick}
        title={label}
        aria-label={label}
        style={{
          width: 30,
          height: 30,
          padding: 0,
          borderRadius: "50%",
          background: filled
            ? "color-mix(in oklab, var(--accent) 20%, rgba(0,0,0,0.55))"
            : "rgba(0,0,0,0.55)",
          border: `1px solid ${
            filled
              ? "color-mix(in oklab, var(--accent) 50%, transparent)"
              : "rgba(255,255,255,0.18)"
          }`,
          color: filled ? "var(--accent)" : "rgba(255,255,255,0.85)",
          fontSize: size * 0.85,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          transition: "all 140ms",
        }}
      >
        {filled ? "★" : "☆"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title={label}
      aria-label={label}
      style={{
        width: size + 14,
        height: size + 14,
        padding: 0,
        borderRadius: "50%",
        background: "transparent",
        border: "none",
        color: filled ? "var(--accent)" : "var(--text-4)",
        fontSize: size,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 140ms, background 140ms",
      }}
      onMouseEnter={(e) => {
        if (!filled)
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
      }}
      onMouseLeave={(e) => {
        if (!filled)
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-4)";
      }}
    >
      {filled ? "★" : "☆"}
    </button>
  );
}
