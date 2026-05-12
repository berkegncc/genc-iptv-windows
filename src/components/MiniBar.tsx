import { useUIStore } from "../stores/uiStore";

/**
 * Floating top-edge bar shown only while the app is in mini-player mode.
 * Carries the OS drag region (so users can move the always-on-top window)
 * and an "exit" pill that flips `miniMode` back off → useMiniWindow then
 * restores the previous window size + drops always-on-top.
 *
 * The titlebar + sidebar are gone in mini mode; this is the user's only
 * affordance back to full size, so it stays visible at all times.
 */
export function MiniBar() {
  const setMiniMode = useUIStore((s) => s.setMiniMode);
  return (
    <div
      data-tauri-drag-region
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))",
        zIndex: 20,
        userSelect: "none",
        pointerEvents: "auto",
      }}
    >
      <span
        className="meta-caps"
        style={{
          fontSize: 9,
          letterSpacing: "0.16em",
          color: "var(--text-3)",
          paddingLeft: 4,
        }}
      >
        MİNİ
      </span>
      <button
        onClick={() => setMiniMode(false)}
        title="Tam pencereye dön"
        style={{
          height: 22,
          padding: "0 10px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--text)",
          fontFamily: "var(--mono)",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.16)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(0,0,0,0.45)";
        }}
      >
        ↗ Büyüt
      </button>
    </div>
  );
}
