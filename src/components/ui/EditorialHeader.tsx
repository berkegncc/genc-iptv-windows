/**
 * Magazine-style header used on every collection page (Channels, Films,
 * Series, Favorites). Eyebrow + serif display title + small caps meta.
 *
 * `right` is an escape hatch for inline tools (search field, sort menu).
 */
interface EditorialHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  meta?: string | null;
  right?: React.ReactNode;
}

export function EditorialHeader({ eyebrow, title, meta, right }: EditorialHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        padding: "4px 0 18px",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        {eyebrow && (
          <span className="meta-caps" style={{ fontSize: 10 }}>
            {eyebrow}
          </span>
        )}
        <h1
          className="h-display"
          style={{
            fontSize: 52,
            margin: 0,
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h1>
        {meta && (
          <span className="meta-caps" style={{ fontSize: 10.5, color: "var(--text-3)" }}>
            {meta}
          </span>
        )}
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          {right}
        </div>
      )}
    </div>
  );
}
