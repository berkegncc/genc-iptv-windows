import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "./ui/TitleBar";
import { Sidebar } from "./ui/Sidebar";
import { useEffect } from "react";
import { useUIStore } from "../stores/uiStore";
import { MiniBar } from "./MiniBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { t, type StringKey } from "../lib/i18n";

const ROUTE_BREADCRUMB_KEYS: Record<string, StringKey> = {
  "/": "nav.home",
  "/channels": "nav.channels",
  "/films": "nav.films",
  "/series": "nav.series",
  "/guide": "nav.guide",
  "/favorites": "nav.favorites",
  "/search": "nav.search",
  "/settings": "nav.settings",
  "/onboarding": "nav.onboarding",
};

export function Layout() {
  const location = useLocation();
  const setSidebarMini = useUIStore((s) => s.setSidebarMini);
  const miniMode = useUIStore((s) => s.miniMode);

  // Auto-collapse sidebar on narrow viewports. Skipped while miniMode is on
  // because the sidebar isn't rendered at all in that case.
  useEffect(() => {
    if (miniMode) return;
    const handler = () => {
      const narrow = window.innerWidth < 1280;
      setSidebarMini(narrow);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [setSidebarMini, miniMode]);

  // Find best breadcrumb match. Exact path wins; otherwise the longest
  // prefix in the keys table (so /films/:id falls back to "Filmler").
  const breadcrumbKey: StringKey | null =
    ROUTE_BREADCRUMB_KEYS[location.pathname] ??
    (Object.entries(ROUTE_BREADCRUMB_KEYS) as Array<[string, StringKey]>)
      .filter(([k]) => k !== "/" && location.pathname.startsWith(k))
      .map(([, v]) => v)[0] ??
    null;
  const breadcrumb = breadcrumbKey ? t(breadcrumbKey) : "";

  // Page-transition key. We collapse `/settings/<sub>` to a single
  // `/settings` so that switching between Settings sub-tabs (Theme,
  // Listeler, etc.) doesn't trigger the heavy section-level fade —
  // those tabs already have their own internal navigation feel.
  // Everything else animates per pathname (so list ↔ detail like
  // `/films` ↔ `/films/:id` does fade properly).
  const transitionKey = location.pathname.startsWith("/settings")
    ? "/settings"
    : location.pathname;

  // Per-route ErrorBoundary keyed on pathname so the boundary auto-resets
  // when the user navigates somewhere else. A render bug on /films won't
  // poison /channels. Wrapped in an AnimatePresence layer that does a
  // pure opacity cross-fade between sections.
  //
  // No transform (no scale, no slide) — detail pages have
  // `position: sticky` backdrops and a transformed ancestor would
  // create a new containing block that glitches sticky during the
  // animation.
  //
  // `mode="sync"` (default) keeps the outgoing page mounted at the
  // same time as the incoming one, both absolutely-positioned on top
  // of each other. Their opacities sum to ~1 throughout the transition
  // so there's no dark gap in the middle (which `mode="wait"` had,
  // because opacity briefly hit 0 between unmount/mount).
  const routedContent = (
    <AnimatePresence initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.26, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ErrorBoundary key={location.pathname} label={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );

  // Mini-player layout: drop the titlebar + sidebar entirely so the 420×240
  // window has room for the actual content. A small floating MiniBar gives
  // the user a way back to full size + drag.
  if (miniMode) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          color: "var(--text)",
          position: "relative",
        }}
      >
        <main
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--bg)",
            position: "relative",
          }}
        >
          {routedContent}
        </main>
        <MiniBar />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <TitleBar breadcrumb={breadcrumb || null} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--bg)",
            position: "relative",
          }}
        >
          {routedContent}
        </main>
      </div>
    </div>
  );
}
