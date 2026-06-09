import { Logo } from "./Logo";
import { WinButtons } from "./WinButtons";

interface TitleBarProps {
  title?: string;
  breadcrumb?: string | null;
  right?: React.ReactNode;
}

export function TitleBar({ title = "", breadcrumb = null, right = null }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region="deep"
      className="no-select"
      style={{
        height: "var(--titlebar-h)",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 0 0 12px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-3)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={16} />
        <span style={{ color: "var(--text-2)" }}>Genç IPTV</span>
        {breadcrumb && (
          <>
            <span style={{ color: "var(--text-4)" }}>/</span>
            <span>{breadcrumb}</span>
          </>
        )}
      </div>
      <div style={{ color: "var(--text-3)", fontSize: 10 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {right}
        <WinButtons />
      </div>
    </div>
  );
}
