interface GlyphChipProps {
  abbr: string;
  size?: number;
  accent?: boolean;
}

export function GlyphChip({ abbr, size = 46, accent = false }: GlyphChipProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: accent
          ? "linear-gradient(135deg, var(--accent-deep), var(--accent))"
          : "radial-gradient(120% 120% at 30% 25%, #243133, #0E1213 70%)",
        boxShadow: accent
          ? "inset 0 0 0 1.2px rgba(255,255,255,0.18), 0 0 18px color-mix(in oklab, var(--accent) 25%, transparent)"
          : "inset 0 0 0 1.2px rgba(232,237,236,0.12)",
        color: accent ? "var(--accent-ink)" : "var(--text-2)",
        fontFamily: "var(--mono)",
        fontSize: size * 0.24,
        letterSpacing: "0.06em",
        fontWeight: 500,
        flex: "0 0 auto",
        textTransform: "uppercase",
      }}
    >
      {abbr}
    </div>
  );
}

/**
 * Derive a 3-letter category abbreviation. Strips spaces and hyphens, takes
 * the first 3 letters (uppercase). Fallback "•••".
 */
export function abbrFor(name: string): string {
  const cleaned = name.replace(/[\s\-_·•]/g, "");
  if (cleaned.length === 0) return "•••";
  return cleaned.slice(0, 3).toUpperCase();
}
