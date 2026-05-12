/**
 * Global keyboard shortcuts cheat sheet. Triggered by the `?` key
 * (registered in `useGlobalShortcuts`). Lists every binding the app
 * actually responds to so users don't have to guess what's available.
 *
 * Closes on:
 *   - Esc (handled inline)
 *   - Click outside the panel
 *   - Click the ✕ button
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "../stores/uiStore";
import { t } from "../lib/i18n";

type Binding = { keys: string[]; label: string };

const NAVIGATION: Binding[] = [
  { keys: ["Ctrl", "1"], label: "Anasayfa" },
  { keys: ["Ctrl", "2"], label: "Kanallar" },
  { keys: ["Ctrl", "3"], label: "Filmler" },
  { keys: ["Ctrl", "4"], label: "Diziler" },
  { keys: ["Ctrl", "5"], label: "Program Rehberi" },
  { keys: ["Ctrl", "6"], label: "Favoriler" },
  { keys: ["Ctrl", ","], label: "Ayarlar" },
  { keys: ["Ctrl", "F"], label: "Arama" },
];

const PLAYBACK: Binding[] = [
  { keys: ["Space"], label: "Oynat / Duraklat" },
  { keys: ["K"], label: "Oynat / Duraklat" },
  { keys: ["F"], label: "Tam ekran (oynatıcıda)" },
  { keys: ["F11"], label: "Pencere tam ekran" },
  { keys: ["M"], label: "Sustur / Sesi aç" },
  { keys: ["←", "→"], label: "−10 / +10 saniye" },
  { keys: ["↑", "↓"], label: "Ses +/-" },
  { keys: ["N"], label: "Sonraki bölüm" },
  { keys: ["P"], label: "Önceki bölüm" },
  { keys: ["Esc"], label: "Geri" },
];

const HELP: Binding[] = [
  { keys: ["?"], label: "Bu pencere" },
];

export function ShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);

  // Escape to close. Registered globally because the modal doesn't
  // own focus — typing in a search field elsewhere shouldn't dismiss.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
              maxHeight: "82vh",
              overflow: "auto",
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "24px 28px 28px",
              boxShadow: "0 32px 88px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                marginBottom: 22,
              }}
            >
              <h2
                className="h-display"
                style={{ fontSize: 30, margin: 0, letterSpacing: "-0.02em" }}
              >
                {t("shortcuts.title")}
              </h2>
              <span
                className="meta-caps"
                style={{ fontSize: 10, color: "var(--text-3)" }}
              >
                {t("shortcuts.subtitle")}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-2)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
              }}
            >
              <ShortcutGroup
                title={t("shortcuts.section_nav")}
                bindings={NAVIGATION}
              />
              <ShortcutGroup
                title={t("shortcuts.section_playback")}
                bindings={PLAYBACK}
              />
            </div>
            <div style={{ marginTop: 24 }}>
              <ShortcutGroup
                title={t("shortcuts.section_help")}
                bindings={HELP}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShortcutGroup({
  title,
  bindings,
}: {
  title: string;
  bindings: Binding[];
}) {
  return (
    <section>
      <h3
        className="meta-caps"
        style={{
          fontSize: 10,
          color: "var(--accent)",
          margin: "0 0 12px",
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </h3>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {bindings.map((b, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              {b.keys.map((k, j) => (
                <kbd
                  key={j}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    padding: "3px 8px",
                    background: "var(--bg-elev2)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    color: "var(--text)",
                    minWidth: 22,
                    textAlign: "center",
                    display: "inline-block",
                  }}
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-2)" }}>
              {b.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
