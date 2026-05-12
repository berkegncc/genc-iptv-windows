import { useState } from "react";

interface PosterCardProps {
  title: string;
  meta?: string | null;
  posterUrl?: string | null;
  /** Decorative hue for the placeholder when no poster is available. */
  tone?: "copper" | "warm" | "cool" | "plum" | "teal";
  /** Optional 2-3 char number stamp (e.g. "012") shown faint on the poster. */
  num?: string;
  onClick?: () => void;
  /** Top-right corner content — usually a `<FavoriteStar variant="overlay">`.
   *  We position + click-stop the slot here so individual call sites don't
   *  reinvent the placement. */
  cornerSlot?: React.ReactNode;
}

const TONE_GRADIENT: Record<NonNullable<PosterCardProps["tone"]>, string> = {
  copper: "linear-gradient(160deg, #2A211A 0%, #150F0C 100%)",
  warm: "linear-gradient(160deg, #2A1817 0%, #150B0A 100%)",
  cool: "linear-gradient(160deg, #15222A 0%, #0A1218 100%)",
  plum: "linear-gradient(160deg, #221726 0%, #100A14 100%)",
  teal: "linear-gradient(160deg, #102B27 0%, #06140F 100%)",
};

/**
 * 2:3 poster card. Loads the upstream image; if it errors or is missing we
 * fall back to a tone-tinted "stripe" placeholder with the title abbreviation
 * — same vibe as the design canvas mockups.
 */
export function PosterCard({
  title,
  meta,
  posterUrl,
  tone = "cool",
  num,
  onClick,
  cornerSlot,
}: PosterCardProps) {
  const [errored, setErrored] = useState(false);
  const showImage = posterUrl && !errored;

  // role="button" wrapper instead of <button> so the corner slot can host
  // its own button (FavoriteStar) without HTML's nested-button warning.
  // Enter/Space trigger via onKeyDown for keyboard parity.
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "var(--sans)",
        color: "var(--text)",
        outline: "none",
        // Skip layout + paint for offscreen cards. Chromium (WebView2)
        // honours `content-visibility: auto` by deferring everything for
        // elements outside the viewport — at 12k+ items this drops grid
        // mount from seconds to a single frame. The companion
        // `contain-intrinsic-size` is a placeholder hint so the scroll
        // height stays accurate before each card has actually been
        // measured (matches a 2:3 poster + 32px meta strip ≈ height for
        // a 168px-wide column).
        contentVisibility: "auto",
        containIntrinsicSize: "292px",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget.querySelector(
          "[data-poster]",
        ) as HTMLElement | null;
        if (!el) return;
        // Pronounced but soft hover: instead of a hard accent border
        // (which read as "cheap rectangular outline"), we stack THREE
        // box-shadow layers that all inherit the poster's rounded
        // corners automatically:
        //   1. Inner solid ring  — 2px @ 70% accent, the actual "frame"
        //   2. Soft outer halo   — 8px @ 18% accent, fades into the bg
        //   3. Bloom + drop      — 36px blur + dark depth shadow
        // Plus a small bump in border-radius (10 → 14) so the corners
        // feel slightly more "oval" on hover, matching the lift.
        el.style.transform = "translateY(-6px) scale(1.05)";
        el.style.borderRadius = "14px";
        el.style.borderColor = "transparent";
        el.style.boxShadow = [
          "0 0 0 2px color-mix(in oklab, var(--accent) 70%, transparent)",
          "0 0 0 8px color-mix(in oklab, var(--accent) 16%, transparent)",
          "0 0 36px 4px color-mix(in oklab, var(--accent) 22%, transparent)",
          "0 26px 60px rgba(0,0,0,0.65)",
        ].join(", ");
        el.style.zIndex = "2";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget.querySelector(
          "[data-poster]",
        ) as HTMLElement | null;
        if (!el) return;
        el.style.transform = "";
        el.style.borderRadius = "10px";
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)";
        el.style.zIndex = "";
      }}
    >
      <div
        data-poster
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          width: "100%",
          borderRadius: 10,
          overflow: "hidden",
          background: TONE_GRADIENT[tone],
          border: "1px solid var(--border)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          transition:
            "transform 240ms cubic-bezier(0.32, 0.72, 0.24, 1), box-shadow 240ms ease, border-radius 200ms ease, border-color 160ms ease",
          transformOrigin: "center top",
        }}
      >
        {showImage ? (
          <img
            src={posterUrl!}
            alt={title}
            onError={() => setErrored(true)}
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <PlaceholderInner title={title} num={num} />
        )}
        {cornerSlot && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              pointerEvents: "auto",
            }}
          >
            {cornerSlot}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {title}
        </span>
        {meta && (
          <span
            className="meta-caps"
            style={{ fontSize: 9.5, color: "var(--text-3)" }}
          >
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}

function PlaceholderInner({ title, num }: { title: string; num?: string }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <span
          className="h-italic"
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: 38,
            color: "var(--text-2)",
            textAlign: "center",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {abbreviateTitle(title)}
        </span>
      </div>
      {num && (
        <span
          className="mono"
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text-4)",
            letterSpacing: "0.12em",
          }}
        >
          {num}
        </span>
      )}
      <span
        className="mono"
        style={{
          position: "absolute",
          bottom: 10,
          right: 12,
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: "var(--text-4)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        poster
      </span>
    </>
  );
}

/**
 * Abbreviate a title so the placeholder reads cleanly: first letters of the
 * first two words, or the first three letters of a single word.
 */
function abbreviateTitle(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return "···";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}

/**
 * Pick a tone deterministically from a string id so the same item always
 * renders with the same colour across re-renders.
 */
export function toneFor(id: string): NonNullable<PosterCardProps["tone"]> {
  const tones: NonNullable<PosterCardProps["tone"]>[] = [
    "copper",
    "warm",
    "cool",
    "plum",
    "teal",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return tones[Math.abs(hash) % tones.length];
}
