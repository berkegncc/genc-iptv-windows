/**
 * Category card for the Films / Series picker grids. Editorial book-feel:
 * serif italic category title, mono caption underneath, thin accent rule
 * on the left edge that fills on hover. The variant `accent` paints the
 * full card with the brand colour — used for the "Tümü" first slot so it
 * reads as the catch-all entry.
 *
 * Click resolution: the entire card is the target. We use a div with
 * role="button" so future siblings (a small "favorite category" star,
 * say) can render inside without HTML's nested-button warning.
 */
interface CategoryCardProps {
  title: string;
  count: number;
  /** Highlight treatment for the catch-all "Tümü" slot. */
  accent?: boolean;
  onClick: () => void;
}

export function CategoryCard({
  title,
  count,
  accent = false,
  onClick,
}: CategoryCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: "relative",
        cursor: "pointer",
        padding: "22px 22px 22px 26px",
        borderRadius: 12,
        background: accent
          ? "color-mix(in oklab, var(--accent) 14%, var(--bg-elev))"
          : "var(--bg-elev)",
        border: `1px solid ${
          accent
            ? "color-mix(in oklab, var(--accent) 40%, transparent)"
            : "var(--border)"
        }`,
        overflow: "hidden",
        transition:
          "transform 240ms cubic-bezier(0.32, 0.72, 0.24, 1), background 200ms ease, border-color 200ms ease, box-shadow 240ms ease, border-radius 200ms ease",
        outline: "none",
        transformOrigin: "center top",
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        // Same multi-layer halo as PosterCard, tuned softer because
        // this is a flat tile (no image) and a hard ring would compete
        // with the existing stripe + bg-color shift. Lift + bloom +
        // depth, no inner ring.
        el.style.transform = "translateY(-4px) scale(1.025)";
        el.style.borderRadius = "16px";
        el.style.boxShadow = [
          "0 0 0 6px color-mix(in oklab, var(--accent) 14%, transparent)",
          "0 0 32px 4px color-mix(in oklab, var(--accent) 18%, transparent)",
          "0 18px 44px rgba(0,0,0,0.55)",
        ].join(", ");
        const stripe = el.querySelector("[data-stripe]") as HTMLElement | null;
        if (stripe) stripe.style.opacity = "1";
        if (!accent) {
          el.style.background =
            "color-mix(in oklab, var(--accent) 6%, var(--bg-elev2))";
          el.style.borderColor =
            "color-mix(in oklab, var(--accent) 45%, var(--border))";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.borderRadius = "12px";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
        const stripe = el.querySelector("[data-stripe]") as HTMLElement | null;
        if (stripe) stripe.style.opacity = accent ? "1" : "0.55";
        if (!accent) {
          el.style.background = "var(--bg-elev)";
          el.style.borderColor = "var(--border)";
        }
      }}
    >
      {/* Left accent stripe — full opacity on the accent variant + hover */}
      <span
        data-stripe
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          bottom: 16,
          width: 3,
          borderRadius: 0,
          background: "var(--accent)",
          opacity: accent ? 1 : 0.55,
          transition: "opacity 200ms ease",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 64,
        }}
      >
        <h3
          style={{
            margin: 0,
            // Use the body sans (Schibsted Grotesk in the default archive
            // theme). Italic Spectral was causing Turkish-specific glyphs
            // like İ / ş / ğ to render awkwardly; sans + semi-bold reads
            // cleaner and matches the category labels in Channels.tsx.
            fontFamily: "var(--sans)",
            fontSize: 17,
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: "-0.005em",
            color: accent ? "var(--accent-strong)" : "var(--text)",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {title}
        </h3>
        <span
          className="meta-caps"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: accent ? "var(--accent)" : "var(--text-3)",
          }}
        >
          {formatCount(count)}
        </span>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  return `${n.toLocaleString("tr-TR")} BAŞLIK`;
}
