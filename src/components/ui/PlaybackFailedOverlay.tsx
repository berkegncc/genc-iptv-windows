/**
 * Mid-playback failure overlay. Surfaced when `usePlaybackHealth` has
 * tried + retried and the stream still isn't producing any time-pos
 * progress.
 *
 * Used by both the live channel player (`Player.tsx`) and the VOD player
 * (`Watch.tsx` → PlayerShell). The shape is intentionally generic — the
 * caller hands a display `title` (channel name OR film/episode title)
 * and we ship `onRetry` + `onBack` actions.
 */
import { t } from "../../lib/i18n";

interface PlaybackFailedOverlayProps {
  /** What the user was trying to watch. Channel name for live, film/
   *  episode title for VOD. */
  title: string;
  onRetry: () => void;
  onBack: () => void;
}

export function PlaybackFailedOverlay({
  title,
  onRetry,
  onBack,
}: PlaybackFailedOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: "rgba(8, 11, 12, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        pointerEvents: "auto",
        textAlign: "center",
        padding: 32,
      }}
    >
      <span
        className="meta-caps"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {t("watch.failure_eyebrow")}
      </span>
      <h2
        className="h-display"
        style={{
          fontSize: 38,
          margin: 0,
          color: "#fff",
          fontFamily: "var(--serif)",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: "rgba(255,255,255,0.65)",
          maxWidth: 420,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {t("watch.failure_body")}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onRetry}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            fontFamily: "var(--sans)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↻ {t("watch.failure_retry")}
        </button>
        <button
          onClick={onBack}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 8,
            background: "transparent",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.20)",
            fontFamily: "var(--sans)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← {t("watch.failure_back")}
        </button>
      </div>
    </div>
  );
}
