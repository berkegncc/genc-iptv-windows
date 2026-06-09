import { type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Shared transport controls for both the VOD player (Watch) and the live
 * channel player (Player). Keeping a single source here means the play /
 * pause button looks and feels identical across both screens — previously
 * the live player rolled its own glyph button (⏸/▶) which didn't sit
 * centred inside its circle.
 */

/**
 * Frosted-glass orb used for the center cluster (skip-back / play / skip-
 * forward). `variant="play"` is the primary CTA — slightly larger and
 * brighter; `variant="skip"` flanks it. All three share the same spring
 * tap/hover so the cluster feels like a single physical control unit.
 */
export function CenterButton({
  variant,
  onClick,
  title,
  children,
}: {
  variant: "play" | "skip";
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  const dim = variant === "play" ? 86 : 60;
  const isPlay = variant === "play";
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 480, damping: 22 }}
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        background: isPlay
          ? "rgba(255,255,255,0.55)"
          : "rgba(20,24,28,0.55)",
        backdropFilter: isPlay ? "blur(6px)" : "blur(16px)",
        WebkitBackdropFilter: isPlay ? "blur(6px)" : "blur(16px)",
        border: isPlay
          ? "1px solid rgba(255,255,255,0.22)"
          : "1px solid rgba(255,255,255,0.10)",
        color: isPlay ? "#0E1213" : "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isPlay
          ? "0 8px 24px rgba(0,0,0,0.38)"
          : "0 8px 28px rgba(0,0,0,0.45)",
        outline: "none",
        padding: 0,
      }}
    >
      {children}
    </motion.button>
  );
}

export function PlayIcon() {
  // Slight horizontal offset so the visual centre of the triangle
  // matches the geometric centre of the button.
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      style={{ marginLeft: 4 }}
    >
      <path d="M9 5 L27 17 L9 29 Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="9" y="6" width="5" height="20" rx="1.6" fill="currentColor" />
      <rect x="18" y="6" width="5" height="20" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function SkipBackIcon() {
  // Curved arrow ~270° going clockwise with an arrow-head on the upper
  // left, plus "10" stacked underneath. Designed to read instantly even
  // at 24px because we keep stroke-widths consistent and weighty.
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
      <path
        d="M11 5 L7 9 L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 9 H14 A8 8 0 1 1 6 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="14"
        y="22.5"
        textAnchor="middle"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}

export function SkipForwardIcon() {
  // Mirror of SkipBackIcon — same arrow but counter-clockwise, head on
  // the upper right.
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
      <path
        d="M17 5 L21 9 L17 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 9 H14 A8 8 0 1 0 22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="14"
        y="22.5"
        textAnchor="middle"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}
