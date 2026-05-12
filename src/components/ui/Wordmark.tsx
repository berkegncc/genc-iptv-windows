interface WordmarkProps {
  size?: number;
}

export function Wordmark({ size = 18 }: WordmarkProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 2 }}>
      <span className="h-italic" style={{ fontSize: size }}>Genç</span>
      <span
        className="meta-caps"
        style={{ fontSize: 8.5, letterSpacing: "0.22em", color: "var(--text-4)" }}
      >
        IPTV PLAYER
      </span>
    </div>
  );
}
