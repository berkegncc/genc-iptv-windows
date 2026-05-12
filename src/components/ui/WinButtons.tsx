import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function WinButtons() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const w = getCurrentWindow();
    w.isMaximized().then(setIsMaximized);
    const unlisten = w.onResized(() => {
      w.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaxRestore = () => {
    const w = getCurrentWindow();
    isMaximized ? w.unmaximize() : w.maximize();
  };
  const handleClose = () => getCurrentWindow().close();

  return (
    <div style={{ display: "flex", height: "var(--titlebar-h)" }}>
      <WinBtn onClick={handleMinimize} title="Küçült">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </WinBtn>
      <WinBtn onClick={handleMaxRestore} title={isMaximized ? "Geri yükle" : "Büyüt"}>
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M2.5 2.5h5v5h-5z M0.5 0.5h5v5"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        )}
      </WinBtn>
      <WinBtn onClick={handleClose} title="Kapat" danger>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0 0l10 10 M10 0L0 10" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </WinBtn>
    </div>
  );
}

function WinBtn({
  onClick,
  title,
  children,
  danger = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 46,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: "var(--text-3)",
        cursor: "pointer",
        transition: "background 120ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "#e81123"
          : "var(--bg-elev2)";
        (e.currentTarget as HTMLButtonElement).style.color = danger
          ? "#fff"
          : "var(--text)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
      }}
    >
      {children}
    </button>
  );
}
