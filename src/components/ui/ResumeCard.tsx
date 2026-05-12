import { useState } from "react";

interface ResumeCardProps {
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  /** 0..100 progress percent. */
  pct: number;
  tone?: "copper" | "warm" | "cool" | "plum" | "teal";
  num?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

const TONE_GRADIENT: Record<NonNullable<ResumeCardProps["tone"]>, string> = {
  copper: "linear-gradient(160deg, #2A211A 0%, #150F0C 100%)",
  warm: "linear-gradient(160deg, #2A1817 0%, #150B0A 100%)",
  cool: "linear-gradient(160deg, #15222A 0%, #0A1218 100%)",
  plum: "linear-gradient(160deg, #221726 0%, #100A14 100%)",
  teal: "linear-gradient(160deg, #102B27 0%, #06140F 100%)",
};

/**
 * 16:9 horizontally-oriented "Devam Et" card. Differs from the regular
 * PosterCard: shows a wider thumbnail, the resume progress bar, and an
 * optional remove button.
 */
export function ResumeCard({
  title,
  subtitle,
  thumbnailUrl,
  pct,
  tone = "cool",
  num,
  onClick,
  onRemove,
}: ResumeCardProps) {
  const [errored, setErrored] = useState(false);
  const showImg = thumbnailUrl && !errored;

  return (
    <div
      style={{
        position: "relative",
        width: 280,
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button
        onClick={onClick}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 10,
          overflow: "hidden",
          background: TONE_GRADIENT[tone],
          border: "1px solid var(--border)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          cursor: onClick ? "pointer" : "default",
          padding: 0,
          color: "var(--text)",
          fontFamily: "var(--sans)",
          transition:
            "transform 240ms cubic-bezier(0.32, 0.72, 0.24, 1), box-shadow 240ms ease, border-radius 200ms ease, border-color 160ms ease",
          transformOrigin: "center top",
        }}
        onMouseEnter={(e) => {
          // Same multi-layer halo as PosterCard. 16:9 cards bias slightly
          // wider so the bloom radius can grow a touch without crowding
          // neighbouring rows.
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "translateY(-6px) scale(1.05)";
          el.style.borderRadius = "14px";
          el.style.borderColor = "transparent";
          el.style.boxShadow = [
            "0 0 0 2px color-mix(in oklab, var(--accent) 70%, transparent)",
            "0 0 0 8px color-mix(in oklab, var(--accent) 16%, transparent)",
            "0 0 40px 6px color-mix(in oklab, var(--accent) 22%, transparent)",
            "0 26px 60px rgba(0,0,0,0.65)",
          ].join(", ");
          el.style.zIndex = "2";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "";
          el.style.borderRadius = "10px";
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)";
          el.style.zIndex = "";
        }}
      >
        {showImg ? (
          <img
            src={thumbnailUrl!}
            alt={title}
            onError={() => setErrored(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px)",
            }}
          />
        )}
        {/* Subtle bottom darkening to keep the progress bar legible */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 50%)",
          }}
        />
        {/* Play badge */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 16,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          ▶
        </div>
        {num && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 12,
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.16em",
            }}
          >
            {num}
          </span>
        )}
        {/* Progress */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              height: "100%",
              background: "var(--accent)",
            }}
          />
        </div>
      </button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="meta-caps"
            style={{ fontSize: 9.5, color: "var(--text-3)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Listeden kaldır"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
