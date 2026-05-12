import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Animated boot splash. Direct port of `design/uploads/Splash.html` to
 * React + framer-motion.
 *
 * Sequence (≈ 2.0 s total):
 *   200 ms — silver/copper/teal G mark settles in (scale 0.86 → 1)
 *   720 ms — halo ring sweeps outward (loops while visible)
 *   760 ms — wordmark "Genç" rises from below
 *   920 ms — small caps tagline rises
 *  1100 ms — "Yükleniyor…" + sweep bar fade in
 *
 * Caller mounts <AnimatedSplash onDone={…} /> while bootstrapping. The
 * splash decides when the *animation* is done; the gating component (App)
 * combines that with a `dataReady` flag (active playlist query settled,
 * settings hydrated) and dismisses when both conditions are met.
 */
const ANIMATION_MIN_MS = 1800;

interface Props {
  /** Fires once the choreographed animation has played long enough to
   *  be dismissed. The host can still hold the splash longer if the
   *  app isn't ready yet. */
  onDone?: () => void;
  /** Variant tints — "dark" matches the app's default dark theme. The
   *  others are kept available for future light-mode + onboarding hero
   *  reuse. */
  variant?: "dark" | "light" | "teal" | "copper";
}

export function AnimatedSplash({ onDone, variant = "dark" }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      onDone?.();
      setTick((v) => v + 1);
    }, ANIMATION_MIN_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const palette = palettes[variant];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: palette.bg,
        color: palette.text,
        overflow: "hidden",
      }}
    >
      {/* Vignette / glow overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: palette.glow,
          pointerEvents: "none",
        }}
      />

      {/* Halo rings */}
      <Halo color={palette.haloColor} delay={1100} />
      <Halo color={palette.haloColor} delay={2300} />

      {/* G mark */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.86 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: 0.2,
          duration: 0.72,
          ease: [0.2, 0, 0, 1],
        }}
        style={{
          position: "relative",
          width: "min(36vmin, 200px)",
          height: "min(36vmin, 200px)",
          filter:
            variant === "light"
              ? "drop-shadow(0 4px 16px rgba(20,18,14,0.12))"
              : "drop-shadow(0 12px 40px rgba(0,0,0,0.4))",
        }}
      >
        <motion.div
          animate={{ scale: [1, 0.94, 1] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: [0.4, 0, 0.4, 1],
            delay: 0.9,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <GlyphMark variant={variant} />
        </motion.div>
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.76,
          duration: 0.6,
          ease: [0.2, 0, 0, 1],
        }}
        style={{
          marginTop: 32,
          fontFamily: "var(--serif, 'Instrument Serif', serif)",
          fontStyle: "italic",
          fontSize: "clamp(34px, 9vmin, 52px)",
          letterSpacing: "-0.025em",
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        Genç
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.92,
          duration: 0.54,
          ease: [0.2, 0, 0, 1],
        }}
        style={{
          marginTop: 10,
          fontFamily: "var(--mono, 'Geist Mono', monospace)",
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: palette.textFaint,
        }}
      >
        IPTV Player
      </motion.div>

      {/* "Yükleniyor…" with blink */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{
          opacity: [0, 1, 0.55, 1, 0.55],
          y: 0,
        }}
        transition={{
          delay: 1.1,
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          bottom: "9%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--mono, 'Geist Mono', monospace)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: palette.loadingColor,
        }}
      >
        Yükleniyor…
      </motion.div>

      {/* Sweep progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.28, duration: 0.48 }}
        style={{
          position: "absolute",
          bottom: "5.5%",
          left: "50%",
          marginLeft: -60,
          width: 120,
          height: 2,
          borderRadius: 2,
          background: palette.barTrack,
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ x: ["-100%", "350%"] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
            delay: 1.28,
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            background: palette.barSweep,
          }}
        />
      </motion.div>
    </div>
  );
}

/**
 * Wrapper that mounts <AnimatedSplash> until BOTH the choreographed
 * animation has run for at least `ANIMATION_MIN_MS` AND the host says the
 * app data is ready (`dataReady`). Once both are true the splash fades out
 * and reveals the children underneath.
 */
export function SplashGate({
  dataReady,
  children,
}: {
  dataReady: boolean;
  children: React.ReactNode;
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const showSplash = !animationDone || !dataReady;

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
            }}
          >
            <AnimatedSplash onDone={() => setAnimationDone(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Halo({ color, delay }: { color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: [0, 0.7, 0],
        scale: [0.85, 1, 2.4],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: [0.2, 0, 0, 1],
        delay: delay / 1000,
      }}
      style={{
        position: "absolute",
        width: "min(36vmin, 200px)",
        height: "min(36vmin, 200px)",
        borderRadius: "50%",
        border: `1px solid ${color}`,
        pointerEvents: "none",
      }}
    />
  );
}

function GlyphMark({
  variant,
}: {
  variant: "dark" | "light" | "teal" | "copper";
}) {
  const isLight = variant === "light";
  const isAccent = variant === "teal" || variant === "copper";
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%">
      <defs>
        <linearGradient id="splash-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E2E6E7" />
          <stop offset="0.55" stopColor="#9FA5A7" />
          <stop offset="1" stopColor="#4F5557" />
        </linearGradient>
        <linearGradient id="splash-silver-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5A5F61" />
          <stop offset="0.5" stopColor="#3F4446" />
          <stop offset="1" stopColor="#22272A" />
        </linearGradient>
        <linearGradient id="splash-copper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0A878" />
          <stop offset="1" stopColor="#7A4A2A" />
        </linearGradient>
        <linearGradient id="splash-copper-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C68A5C" />
          <stop offset="1" stopColor="#7A4A2A" />
        </linearGradient>
        <linearGradient id="splash-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5DEAD8" />
          <stop offset="1" stopColor="#0E8A7C" />
        </linearGradient>
        <linearGradient id="splash-teal-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3FD0BD" />
          <stop offset="1" stopColor="#0F8A7E" />
        </linearGradient>
      </defs>
      {/* Outer arc */}
      <path
        d="M16 4a12 12 0 1 0 12 12h-3a9 9 0 1 1-9-9z"
        fill={
          isAccent
            ? "#fff"
            : isLight
              ? "url(#splash-silver-light)"
              : "url(#splash-silver)"
        }
      />
      {/* Inner copper arc */}
      <path
        d="M28 16a12 12 0 0 1-12 12v-3a9 9 0 0 0 9-9z"
        fill={
          isAccent
            ? "rgba(255,255,255,0.85)"
            : isLight
              ? "url(#splash-copper-light)"
              : "url(#splash-copper)"
        }
      />
      {/* Inner teal triangle */}
      <path
        d="m13 11 8 5-8 5z"
        fill={
          isAccent
            ? "#0E1213"
            : isLight
              ? "url(#splash-teal-light)"
              : "url(#splash-teal)"
        }
      />
    </svg>
  );
}

// ─── Variant palettes ───────────────────────────────────────────────────────

const palettes: Record<
  NonNullable<Props["variant"]>,
  {
    bg: string;
    glow: string;
    text: string;
    textFaint: string;
    haloColor: string;
    loadingColor: string;
    barTrack: string;
    barSweep: string;
  }
> = {
  dark: {
    bg: "radial-gradient(120% 120% at 50% 35%, #1F2A2C, #0A0D0E 70%)",
    glow:
      "radial-gradient(circle at 50% 38%, rgba(63,208,189,0.14), transparent 58%)",
    text: "#E8EDEC",
    textFaint: "#6A7472",
    haloColor: "rgba(63,208,189,0.55)",
    loadingColor: "#3FD0BD",
    barTrack: "rgba(255,255,255,0.08)",
    barSweep: "linear-gradient(90deg, transparent, #3FD0BD, transparent)",
  },
  light: {
    bg: "radial-gradient(120% 120% at 50% 30%, #FFFFFF, #F6F2EC 70%)",
    glow:
      "radial-gradient(circle at 50% 38%, rgba(15,138,126,0.10), transparent 60%)",
    text: "#14120E",
    textFaint: "#8A857A",
    haloColor: "rgba(15,138,126,0.45)",
    loadingColor: "#0F8A7E",
    barTrack: "rgba(20,18,14,0.08)",
    barSweep: "linear-gradient(90deg, transparent, #0F8A7E, transparent)",
  },
  teal: {
    bg: "linear-gradient(135deg, #0F8A7E, #3FD0BD)",
    glow:
      "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.18), transparent 60%)",
    text: "#fff",
    textFaint: "rgba(255,255,255,0.78)",
    haloColor: "rgba(255,255,255,0.5)",
    loadingColor: "#fff",
    barTrack: "rgba(255,255,255,0.22)",
    barSweep: "linear-gradient(90deg, transparent, #fff, transparent)",
  },
  copper: {
    bg: "linear-gradient(135deg, #7A4A2A, #C68A5C)",
    glow:
      "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.18), transparent 60%)",
    text: "#fff",
    textFaint: "rgba(255,255,255,0.78)",
    haloColor: "rgba(255,255,255,0.5)",
    loadingColor: "#fff",
    barTrack: "rgba(255,255,255,0.22)",
    barSweep: "linear-gradient(90deg, transparent, #fff, transparent)",
  },
};
