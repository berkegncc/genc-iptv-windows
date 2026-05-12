/**
 * Building blocks shared by every Home variant.
 *
 * The 5 variants (Billboard, Top10, EditorialHybrid, WideTile,
 * EditorialRails) each pull from `useHomeData` and compose the same
 * primitive parts in different layouts. Keep this file dumb — pure UI
 * + a thin data hook. Variant-specific layout decisions live in their
 * own files.
 */
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useActivePlaylist } from "../../features/playlist/usePlaylists";
import {
  useContinueWatching,
  useDeleteContinueWatching,
} from "../../features/continue-watching/useContinueWatching";
import { useRecentChannels } from "../../features/channels/useChannels";
import {
  useRandomMovies,
  useRecentMovies,
  useRecentSeries,
} from "../../features/vod/useVod";
import { useNowProgramsBulk } from "../../features/epg/useEpg";
import { useSettingsStore } from "../../stores/settingsStore";
import { useEffect, useRef, useState } from "react";
import { ChannelLogo } from "../../components/ui/ChannelLogo";
import { PosterCard, toneFor } from "../../components/ui/PosterCard";
import { ResumeCard } from "../../components/ui/ResumeCard";
import { t, tFmt } from "../../lib/i18n";
import { vodApi } from "../../lib/tauri";
import type {
  Channel,
  ContinueWatching,
  Program,
  SeriesItem,
  VodItem,
} from "../../lib/tauri";

// ─── Combined data hook ─────────────────────────────────────────────────────

export interface HomeData {
  displayName: string;
  active: ReturnType<typeof useActivePlaylist>["data"];
  /** Everything in the continue-watching table that's mid-play (5%-95%
   *  of duration). Drives the "Devam Et" rail. */
  cwList: ContinueWatching[];
  /** Finished titles (≥95% watched). Drives the "İzledikler" rail —
   *  films/series the user has already seen, surfaced for re-watch. */
  cwWatched: ContinueWatching[];
  recentChannels: Channel[];
  recentMovies: VodItem[];
  recentSeries: SeriesItem[];
  nowMap: Map<string, Program> | undefined;
}

/** Watched threshold — items past this fraction of duration count as
 *  finished and move from "Devam Et" → "İzledikler". 0.95 is the
 *  industry standard (Netflix uses similar). */
const WATCHED_THRESHOLD = 0.95;

/**
 * One-stop hook every Home variant calls. Fanning out the queries here
 * means React Query dedupes them and any variant remount only invalidates
 * what actually moved.
 */
export function useHomeData(): HomeData {
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const { data: active } = useActivePlaylist();
  // Pull a larger pool than either rail will show so we can split into
  // in-progress + watched without the watched-bucket starving when the
  // user has a lot of recent activity.
  const { data: cwAll = [] } = useContinueWatching(40);
  const { data: recentChannels = [] } = useRecentChannels(active?.id, 8);
  const { data: recentMovies = [] } = useRecentMovies(active?.id, 12);
  const { data: recentSeries = [] } = useRecentSeries(active?.id, 12);
  const { data: nowMap } = useNowProgramsBulk(active?.id);

  // Bucket continue-watching rows by completion. Tail-of-credits is
  // counted as "watched" so a user who saw the last 95%+ of a film
  // doesn't get nagged with a resume bar; the title rolls into the
  // İzledikler rail for easy re-watch instead. Items with zero
  // duration (live channels, edge cases) stay in the in-progress
  // bucket so they're never lost.
  const cwList: ContinueWatching[] = [];
  const cwWatched: ContinueWatching[] = [];
  for (const item of cwAll) {
    const pct = item.durationMs > 0 ? item.positionMs / item.durationMs : 0;
    if (pct >= WATCHED_THRESHOLD) {
      cwWatched.push(item);
    } else {
      cwList.push(item);
    }
  }
  return {
    displayName,
    active,
    cwList: cwList.slice(0, 8),
    cwWatched: cwWatched.slice(0, 16),
    recentChannels,
    recentMovies,
    recentSeries,
    nowMap,
  };
}

// ─── Rotating hero ──────────────────────────────────────────────────────────

/**
 * Default rotation interval shared across every Home variant. Six seconds
 * is long enough to read the hero plot and short enough that the user
 * notices a change while skimming the page.
 */
export const HERO_ROTATION_MS = 6000;

export interface RotatingHero {
  /** Currently displayed item, or null while the pool is empty. */
  hero: VodItem | null;
  /** Length of the active rotation pool (random pool, or fallback). */
  poolSize: number;
  /** Current index modulo poolSize — safe to use for dot indicators. */
  index: number;
  /** The full pool currently driving rotation. Useful when a variant
   *  wants to render thumbnails or sidekick tiles from the same set. */
  pool: VodItem[];
  /** Jump rotation to a specific index (e.g. dot indicator click). */
  jumpTo: (i: number) => void;
}

/**
 * Per-session rotating hero that all Home variants share. Pulls a 20-item
 * random shuffle via `useRandomMovies` (cached for the whole session via
 * `staleTime: Infinity`); falls back to `fallback` (typically the recent
 * movies list) while the random query is loading or yielded zero rows.
 *
 * The interval is mount-only — it reads the live pool length through a
 * ref so the timer never needs to be torn down + restarted on data
 * arrival. That's important: earlier per-variant implementations were
 * inadvertently restarting the interval on every render and looked
 * outwardly like the hero never changed.
 */
export function useRotatingHero(
  playlistId: number | undefined,
  fallback: VodItem[],
  intervalMs: number = HERO_ROTATION_MS,
): RotatingHero {
  const qc = useQueryClient();
  const { data: randomPool = [] } = useRandomMovies(playlistId, 20);
  // Random pool is the canonical source. Fallback only kicks in for the
  // tiny window before the query resolves so the hero never renders
  // blank for long.
  const heroPool = randomPool.length > 0 ? randomPool : fallback;

  const [heroIdx, setHeroIdx] = useState(0);
  const heroPoolRef = useRef(heroPool);
  useEffect(() => {
    heroPoolRef.current = heroPool;
  }, [heroPool]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const len = heroPoolRef.current.length;
      if (len <= 1) return;
      setHeroIdx((i) => i + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const safeLen = Math.max(heroPool.length, 1);
  const hero = heroPool[heroIdx % safeLen] ?? null;

  // Preload every backdrop + poster in the pool into the browser's
  // HTTP cache. By the time the rotator lands on a given item, its
  // image bytes are already local — no "blank screen → image pops
  // in" gap, which is what made the first rotation tick feel rough.
  // Fire-and-forget: we don't retain the Image() instances, the
  // browser caches the fetched bytes regardless.
  //
  // `preloadedRef` is a per-session set of URLs we've already kicked
  // off a fetch for. Without it, every time the random-pool reference
  // changes (e.g. backdrop prefetch invalidated one row's data) we'd
  // re-spawn `new Image()` for every URL in the pool — stacking
  // duplicate in-flight requests for URLs the browser is already
  // mid-fetch on.
  const preloadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (heroPool.length === 0) return;
    for (const item of heroPool) {
      if (item.backdropUrl && !preloadedRef.current.has(item.backdropUrl)) {
        preloadedRef.current.add(item.backdropUrl);
        const img = new Image();
        img.src = item.backdropUrl;
      }
      if (item.posterUrl && !preloadedRef.current.has(item.posterUrl)) {
        preloadedRef.current.add(item.posterUrl);
        const img = new Image();
        img.src = item.posterUrl;
      }
    }
  }, [heroPool]);

  // Just-in-time backdrop prefetch: when the rotator surfaces a film
  // with no `backdropUrl`, run the lean TMDB+Fanart cascade for that
  // single id and patch the result back into the random-pool cache
  // via `setQueriesData` (NOT `invalidate` — invalidation would force
  // SQLite's `ORDER BY RANDOM()` to reshuffle and the visible pool
  // would change mid-session).
  //
  // `attemptedRef` makes this idempotent per session — films TMDB
  // has no match for (Turkish-only content) are tried once and then
  // left alone instead of looping forever.
  const attemptedRef = useRef<Set<string>>(new Set());
  const heroId = hero?.id;
  const heroBackdrop = hero?.backdropUrl;
  useEffect(() => {
    if (!heroId) return;
    if (heroBackdrop) return;
    if (attemptedRef.current.has(heroId)) return;
    attemptedRef.current.add(heroId);
    vodApi
      .prefetchMovieBackdrop(heroId)
      .then((updated) => {
        if (!updated || !updated.backdropUrl) return;
        qc.setQueriesData<VodItem[] | undefined>(
          { queryKey: ["vod", "random-movies"] },
          (old) =>
            old?.map((m) => (m.id === updated.id ? updated : m)),
        );
      })
      .catch(() => {
        // Silent — frontend already renders a blurred-poster fallback.
      });
  }, [heroId, heroBackdrop, qc]);

  return {
    hero,
    poolSize: heroPool.length,
    index: heroIdx % safeLen,
    pool: heroPool,
    jumpTo: (i) => setHeroIdx(i),
  };
}

/**
 * Cross-fade wrapper for the rotating hero. Each tick the parent rerenders
 * with a new `keyId`; AnimatePresence keeps the outgoing layer mounted at
 * full opacity (`exit: { opacity: 1 }`) while the incoming layer fades in
 * (0 → 1) on top. Once the fade completes the old layer unmounts —
 * invisibly, since the new one is fully covering it. No flash to bg.
 *
 * The wrapper is `position: absolute; inset: 0` so the parent must give
 * it a sized, `position: relative` container. `initial={false}` means the
 * very first hero appears instantly (no boot-time fade-in).
 */
export function HeroCrossFade({
  keyId,
  durationMs = 600,
  children,
}: {
  keyId: string;
  durationMs?: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={keyId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 1 }}
        transition={{ duration: durationMs / 1000, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Position dots for the rotating hero — small horizontal indicators that
 * (a) signal "this hero rotates" to the user and (b) let them jump to a
 * specific slide. Three home variants render the exact same dot strip at
 * different absolute offsets; this component consolidates them.
 *
 * Renders nothing when `poolSize <= 1` since dots for a one-item pool
 * would be meaningless.
 */
export function HeroDots({
  poolSize,
  index,
  onJump,
  right = 24,
  bottom = 24,
}: {
  poolSize: number;
  index: number;
  onJump: (i: number) => void;
  /** Distance from the right edge of the positioned ancestor. */
  right?: number;
  /** Distance from the bottom edge of the positioned ancestor. */
  bottom?: number;
}) {
  if (poolSize <= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        right,
        bottom,
        display: "flex",
        gap: 6,
        zIndex: 3,
      }}
    >
      {Array.from({ length: poolSize }).map((_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            aria-label={`${i + 1} / ${poolSize}`}
            style={{
              width: active ? 22 : 6,
              height: 6,
              padding: 0,
              border: "none",
              borderRadius: 3,
              background: active
                ? "var(--accent)"
                : "rgba(255,255,255,0.32)",
              cursor: "pointer",
              transition: "width 240ms ease, background 240ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Welcome header (top of every variant) ──────────────────────────────────

export function WelcomeHeader({ displayName }: { displayName: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <span className="meta-caps">{t("home.welcome_eyebrow")}</span>
      <h1
        className="h-display"
        style={{ fontSize: 56, margin: "8px 0 0", lineHeight: 1.0 }}
      >
        {displayName.trim() ? (
          <>
            {t("home.welcome").split("{name}")[0]}
            <span className="h-italic">{displayName.trim()}.</span>
          </>
        ) : (
          <>
            Hoş <span className="h-italic">geldin.</span>
          </>
        )}
      </h1>
    </div>
  );
}

// ─── Navigation helper ──────────────────────────────────────────────────────

export function useHomeNavigation() {
  const navigate = useNavigate();
  return {
    openContinue(item: ContinueWatching) {
      if (item.targetType === "CHANNEL") {
        navigate(`/player/${encodeURIComponent(item.targetId)}`);
      } else if (item.targetType === "MOVIE") {
        navigate(`/watch/movie/${encodeURIComponent(item.targetId)}`);
      } else if (item.targetType === "SERIES" && item.resumeEpisodeId) {
        // Carry the seriesId in the URL so /watch/episode can resolve
        // the episode → series mapping on a cold open (e.g. clicking
        // Continue Watching right after launch, before the user has
        // visited the series detail page that populates the in-memory
        // episode→series index).
        navigate(
          `/watch/episode/${encodeURIComponent(
            item.resumeEpisodeId,
          )}?series=${encodeURIComponent(item.targetId)}`,
        );
      } else {
        navigate(`/series/${encodeURIComponent(item.targetId)}`);
      }
    },
    openMovie(id: string) {
      navigate(`/films/${encodeURIComponent(id)}`);
    },
    openSeries(id: string) {
      navigate(`/series/${encodeURIComponent(id)}`);
    },
    openChannel(id: string) {
      navigate(`/player/${encodeURIComponent(id)}`);
    },
    /** Skip the detail page and go straight to playback. Used by hero
     *  "İzle" buttons where the user has already decided to watch. */
    playMovie(id: string) {
      navigate(`/watch/movie/${encodeURIComponent(id)}`);
    },
    openMovies() {
      navigate("/films");
    },
    openSeriesAll() {
      navigate("/series");
    },
    openChannels() {
      navigate("/channels");
    },
  };
}

// ─── Cinematic backdrop ─────────────────────────────────────────────────────

export type BackdropTone =
  | "dune"
  | "cukur"
  | "sever"
  | "yargi"
  | "civil"
  | "inter"
  | "oppen"
  | "tenet";

const BACKDROP_PALETTES: Record<BackdropTone, [string, string, string]> = {
  dune: ["#3a2b1a", "#1a1108", "#0a0605"],
  cukur: ["#2a1218", "#15080c", "#080304"],
  sever: ["#1a2233", "#0c1119", "#04080d"],
  yargi: ["#241817", "#10080a", "#070303"],
  civil: ["#231a1c", "#100808", "#060303"],
  inter: ["#1c2228", "#0c1218", "#04080a"],
  oppen: ["#2a1f12", "#150d07", "#070403"],
  tenet: ["#0e1b22", "#070d11", "#020608"],
};

const TONE_ROTATION: BackdropTone[] = [
  "dune",
  "cukur",
  "sever",
  "yargi",
  "civil",
  "inter",
  "oppen",
  "tenet",
];

/** Deterministic tone pick from a hashed key — same id always renders same tone. */
export function backdropToneFor(key: string): BackdropTone {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return TONE_ROTATION[Math.abs(hash) % TONE_ROTATION.length];
}

interface HeroBackdropProps {
  /** Widescreen (16:9) backdrop. The preferred source. */
  imageUrl?: string | null;
  /** Vertical (2:3) poster used ONLY when `imageUrl` is null. We render
   *  it heavily blurred + scaled so the wrong-aspect-ratio cropping reads
   *  as deliberate "ambient" art rather than a stretched poster. */
  posterFallbackUrl?: string | null;
  tone?: BackdropTone;
  fade?: "bottom" | "left" | "sides";
  height?: number | string;
  children?: React.ReactNode;
}

/**
 * Cinematic hero canvas. Real backdrop image (when provided) layered with
 * a fade gradient that bleeds back into `--bg`; falls back to a tone-tinted
 * gradient when the upstream URL is missing or 404s.
 *
 * `fade` controls where the gradient eats into the image:
 *  - `bottom`: bleeds from bottom up (Billboard variant — full-bleed hero)
 *  - `left`: vertical band of bg on the left (Top10 — text-anchored hero)
 *  - `sides`: top + bottom feathering (EditorialHybrid — contained hero)
 */
export function HeroBackdrop({
  imageUrl,
  posterFallbackUrl,
  tone = "dune",
  fade = "bottom",
  height = "100%",
  children,
}: HeroBackdropProps) {
  const palette = BACKDROP_PALETTES[tone];
  const fallbackBg = `radial-gradient(120% 90% at 70% 30%, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        isolation: "isolate",
        background: fallbackBg,
      }}
    >
      {/* Layer 1 — poster "bridge". Always rendered when available,
          even when a proper widescreen backdrop exists on top. Acts as
          (a) the loading state while the backdrop's HTTP fetch is in
          flight (otherwise the user briefly sees the bald gradient),
          and (b) the permanent ambient fallback when there's no
          widescreen art at all. Heavy blur + scale so the 2:3 → 16:9
          crop reads as atmosphere rather than a stretched poster. */}
      {posterFallbackUrl && (
        <img
          src={posterFallbackUrl}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(10px) brightness(0.62) saturate(1.1)",
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* Layer 2 — the real widescreen backdrop, layered on top of the
          poster bridge. Cross-faded on URL change so that:
            • Rotation lands on a film whose backdrop loads from cache →
              fades in instantly over the poster.
            • The just-in-time TMDB prefetch in useRotatingHero swaps
              `imageUrl` mid-life for the same hero → backdrop fades
              in over the poster instead of flashing. */}
      <HeroCrossFade keyId={imageUrl ?? "none"} durationMs={500}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.78) saturate(1.03)",
            }}
          />
        )}
      </HeroCrossFade>

      {/* Diagonal stripe texture — only really visible on the fallback
          gradient. Cheap (no layout impact) so we always render. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.45,
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 9px)",
          pointerEvents: "none",
        }}
      />
      {/* Per-fade gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            fade === "left"
              ? "linear-gradient(90deg, var(--bg) 0%, rgba(14,18,19,0.85) 28%, transparent 60%), linear-gradient(180deg, transparent 70%, var(--bg) 100%)"
              : fade === "sides"
                ? "linear-gradient(180deg, rgba(14,18,19,0.5) 0%, transparent 35%, transparent 70%, var(--bg) 100%)"
                : "linear-gradient(180deg, transparent 30%, rgba(14,18,19,0.4) 60%, var(--bg) 96%)",
        }}
      />
      <div style={{ position: "relative", height: "100%", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Continue Watching rail (used by every variant) ─────────────────────────

export function ContinueWatchingRail({
  items,
}: {
  items: ContinueWatching[];
}) {
  const nav = useHomeNavigation();
  const remove = useDeleteContinueWatching();
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <RailHeader
        title={t("home.continue_watching")}
        meta={tFmt("home.count_titles", { count: items.length })}
      />
      <ScrollLane gap={18}>
        {items.map((item, i) => (
          <ResumeCard
            key={`${item.targetId}-${item.targetType}`}
            title={item.title}
            subtitle={item.subtitle ?? remainingSubtitle(item)}
            thumbnailUrl={item.thumbnailUrl}
            pct={progressPct(item.positionMs, item.durationMs)}
            tone={toneFor(item.targetId)}
            num={String(i + 1).padStart(2, "0")}
            onClick={() => nav.openContinue(item)}
            onRemove={() =>
              remove.mutate({
                targetId: item.targetId,
                targetType: item.targetType,
              })
            }
          />
        ))}
      </ScrollLane>
    </section>
  );
}

/**
 * "İzledikler" — films/series the user has finished (≥95% watched).
 * Surfaced as a horizontal poster rail so a click goes to the detail
 * page (vs the resume-watch CTA of `ContinueWatchingRail`). The
 * thumbnail URL stored on each `ContinueWatching` row is already the
 * source content's poster (Watch.tsx sets it on save), so we can
 * render a PosterCard directly without an extra lookup.
 */
export function WatchedRail({ items }: { items: ContinueWatching[] }) {
  const nav = useHomeNavigation();
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <RailHeader
        title={t("home.watched")}
        meta={tFmt("home.count_titles", { count: items.length })}
      />
      <ScrollLane gap={16}>
        {items.map((item) => (
          <div
            key={`${item.targetId}-${item.targetType}`}
            style={{ flex: "0 0 auto", width: 162 }}
          >
            <PosterCard
              title={item.title}
              posterUrl={item.thumbnailUrl}
              tone={toneFor(item.targetId)}
              meta={item.subtitle ?? null}
              onClick={() => {
                // Take the user to the detail page rather than auto-
                // restarting playback — they already watched it, give
                // them the choice to dip back in vs. read up first.
                if (item.targetType === "MOVIE") {
                  nav.openMovie(item.targetId);
                } else if (item.targetType === "SERIES") {
                  nav.openSeries(item.targetId);
                } else {
                  nav.openChannel(item.targetId);
                }
              }}
            />
          </div>
        ))}
      </ScrollLane>
    </section>
  );
}

// ─── Generic poster rail (2:3) ──────────────────────────────────────────────

interface PosterRailProps {
  title: string;
  meta?: string;
  onSeeAll?: () => void;
  items: Array<{
    id: string;
    title: string;
    posterUrl: string | null;
    meta?: string | null;
  }>;
  onItemClick: (id: string) => void;
  /** Shrink + tighter gaps for hybrid layouts. */
  size?: "sm" | "md" | "lg";
}

export function PosterRail({
  title,
  meta,
  onSeeAll,
  items,
  onItemClick,
  size = "md",
}: PosterRailProps) {
  const width = size === "lg" ? 184 : size === "sm" ? 138 : 162;
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <RailHeader title={title} meta={meta} onSeeAll={onSeeAll} />
      <ScrollLane gap={size === "sm" ? 12 : 16}>
        {items.map((it) => (
          <div key={it.id} style={{ flex: "0 0 auto", width }}>
            <PosterCard
              title={it.title}
              posterUrl={it.posterUrl}
              tone={toneFor(it.id)}
              meta={it.meta ?? null}
              onClick={() => onItemClick(it.id)}
            />
          </div>
        ))}
      </ScrollLane>
    </section>
  );
}

// (RankRail with giant outline numerals lived here; removed because the
// numerals dominate the rail visually and clash with Türkçe titles. Use
// PosterRail with sequential layout instead.)

// ─── Wide rail (16:9 cards — variant D) ─────────────────────────────────────

interface WideRailProps {
  title: string;
  badge?: string;
  isLive?: boolean;
  onSeeAll?: () => void;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    thumbnailUrl?: string | null;
    pct?: number | null;
  }>;
  onItemClick: (id: string) => void;
}

export function WideRail({
  title,
  badge,
  isLive,
  onSeeAll,
  items,
  onItemClick,
}: WideRailProps) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--sans)",
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h3>
        {badge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 18,
              padding: "0 8px",
              borderRadius: 999,
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: isLive
                ? "color-mix(in oklab, var(--teal) 12%, transparent)"
                : "var(--bg-elev2)",
              color: isLive ? "var(--teal)" : "var(--text-3)",
              border: `1px solid ${
                isLive
                  ? "color-mix(in oklab, var(--teal) 30%, transparent)"
                  : "var(--border)"
              }`,
            }}
          >
            {isLive && <LiveDot />}
            {badge}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {onSeeAll && (
          <SeeAllButton onClick={onSeeAll} />
        )}
      </div>
      <ArrowScroller>
        {(setEl) => (
          <div
            ref={setEl}
            className="no-scrollbar"
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridAutoColumns: "300px",
              gap: 16,
              overflowX: "auto",
              // Same vertical-padding trick as ScrollLane so hovered
              // WideCards have room to lift + paint their halo without
              // hitting the scroller's clip box.
              padding: "18px 12px",
              margin: "-18px -12px",
            }}
          >
            {items.map((it) => (
              <WideCard
                key={it.id}
                title={it.title}
                subtitle={it.subtitle ?? null}
                thumbnailUrl={it.thumbnailUrl ?? null}
                pct={it.pct ?? null}
                isLive={!!isLive}
                onClick={() => onItemClick(it.id)}
              />
            ))}
          </div>
        )}
      </ArrowScroller>
    </section>
  );
}

function WideCard({
  title,
  subtitle,
  thumbnailUrl,
  pct,
  isLive,
  onClick,
}: {
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  pct: number | null;
  isLive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        // Same halo treatment as PosterCard / ResumeCard for visual
        // consistency across the home rails.
        const el = e.currentTarget.querySelector(
          "[data-wide-thumb]",
        ) as HTMLElement | null;
        if (!el) return;
        el.style.transform = "translateY(-6px) scale(1.05)";
        el.style.borderRadius = "14px";
        el.style.borderColor = "transparent";
        el.style.boxShadow = [
          "0 0 0 2px color-mix(in oklab, var(--accent) 70%, transparent)",
          "0 0 0 8px color-mix(in oklab, var(--accent) 16%, transparent)",
          "0 0 40px 6px color-mix(in oklab, var(--accent) 22%, transparent)",
          "0 26px 60px rgba(0,0,0,0.65)",
        ].join(", ");
        el.style.zIndex = "2";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget.querySelector(
          "[data-wide-thumb]",
        ) as HTMLElement | null;
        if (!el) return;
        el.style.transform = "";
        el.style.borderRadius = "10px";
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)";
        el.style.zIndex = "";
      }}
    >
      <div
        data-wide-thumb
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          width: "100%",
          borderRadius: 10,
          overflow: "hidden",
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px), linear-gradient(160deg, #1F2A2C, #0F1517)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          transition:
            "transform 240ms cubic-bezier(0.32, 0.72, 0.24, 1), box-shadow 240ms ease, border-radius 200ms ease, border-color 160ms ease",
          transformOrigin: "center top",
        }}
      >
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}
        {pct != null && pct > 0 && pct < 100 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--accent)",
              }}
            />
          </div>
        )}
        {isLive && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 20,
              padding: "0 9px",
              borderRadius: 999,
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid color-mix(in oklab, var(--teal) 50%, transparent)",
              backdropFilter: "blur(4px)",
            }}
          >
            <LiveDot /> CANLI
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span className="meta-caps" style={{ fontSize: 9 }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Featured tile (variant D) ──────────────────────────────────────────────

interface FeaturedTileProps {
  size: "lg" | "sm";
  eyebrow?: string;
  title: string;
  meta?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  /** Vertical poster used only when `imageUrl` is null. HeroBackdrop
   *  blurs + scales it so the wrong-aspect crop reads as ambient. */
  posterFallbackUrl?: string | null;
  onClick: () => void;
}

export function FeaturedTile({
  size,
  eyebrow,
  title,
  meta,
  description,
  imageUrl,
  posterFallbackUrl,
  onClick,
}: FeaturedTileProps) {
  const height = size === "lg" ? 380 : 182;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        height,
        border: "1px solid var(--border)",
        cursor: "pointer",
        outline: "none",
      }}
    >
      <HeroBackdrop
        imageUrl={imageUrl}
        posterFallbackUrl={posterFallbackUrl}
        tone={backdropToneFor(title)}
        fade="bottom"
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: size === "lg" ? "0 32px 28px" : "0 22px 20px",
          }}
        >
          {eyebrow && (
            <span
              className="meta-caps"
              style={{
                fontSize: 9.5,
                color: "var(--accent)",
                marginBottom: size === "lg" ? 12 : 8,
              }}
            >
              {eyebrow}
            </span>
          )}
          <h2
            className="h-display"
            style={{
              fontSize: size === "lg" ? 56 : 32,
              margin: 0,
              color: "#fff",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            {title}
          </h2>
          {meta && (
            <span
              className="meta-caps"
              style={{
                fontSize: 9.5,
                color: "rgba(232,237,236,0.7)",
                marginTop: 8,
              }}
            >
              {meta}
            </span>
          )}
          {description && size === "lg" && (
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "rgba(232,237,236,0.78)",
                maxWidth: 480,
                margin: "12px 0 0",
              }}
            >
              {description}
            </p>
          )}
          {size === "lg" && (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                style={{
                  height: 38,
                  padding: "0 18px",
                  fontSize: 13,
                  background: "#fff",
                  color: "#0E1213",
                  border: "none",
                  borderRadius: 8,
                  fontFamily: "var(--sans)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ▶ {t("home.play")}
              </button>
              <button
                style={{
                  height: 38,
                  padding: "0 16px",
                  fontSize: 13,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 8,
                  fontFamily: "var(--sans)",
                  cursor: "pointer",
                }}
              >
                {t("home.add_list")}
              </button>
            </div>
          )}
        </div>
      </HeroBackdrop>
    </div>
  );
}

// ─── Live channel rail (recent channels, with EPG now-playing) ──────────────

export function LiveChannelRail({
  channels,
  nowMap,
}: {
  channels: Channel[];
  nowMap: Map<string, Program> | undefined;
}) {
  const nav = useHomeNavigation();
  if (channels.length === 0) return null;
  return (
    <WideRail
      title={t("home.live_now")}
      badge="LIVE"
      isLive
      items={channels.map((c) => {
        const now = c.epgChannelId ? nowMap?.get(c.epgChannelId) ?? null : null;
        return {
          id: c.id,
          title: c.name,
          subtitle: now ? now.title : c.groupTitle ?? null,
          thumbnailUrl: c.logoUrl,
          pct: null,
        };
      })}
      onItemClick={(id) => nav.openChannel(id)}
      onSeeAll={() => nav.openChannels()}
    />
  );
}

// ─── Thin recent-channels-with-logo rail (used by classic billboard) ────────

export function RecentChannelsLogoRail({
  channels,
  nowMap,
}: {
  channels: Channel[];
  nowMap: Map<string, Program> | undefined;
}) {
  const nav = useHomeNavigation();
  if (channels.length === 0) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <RailHeader
        title={t("home.recent_channels")}
        meta={tFmt("home.count_channels", { count: channels.length })}
      />
      <ScrollLane gap={14}>
        {channels.map((c) => {
          const now = c.epgChannelId
            ? nowMap?.get(c.epgChannelId) ?? null
            : null;
          return (
            <button
              key={c.id}
              onClick={() => nav.openChannel(c.id)}
              style={{
                width: 220,
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 14,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--sans)",
                color: "var(--text)",
              }}
              // Pure-CSS hover — was two onMouseEnter/Leave handlers
              // imperatively swapping `style.background` between
              // `--bg-elev` and `--bg-elev2`. The default state is the
              // inline `background: var(--bg-elev)` above; the class
              // overrides on `:hover`.
              className="hover-bg-elev2"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ChannelLogo name={c.name} url={c.logoUrl} size={40} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                  {c.groupTitle && (
                    <span
                      className="meta-caps"
                      style={{
                        fontSize: 9,
                        color: "var(--text-3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.groupTitle}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  minHeight: 32,
                  fontSize: 11.5,
                  color: now ? "var(--text-2)" : "var(--text-4)",
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                }}
              >
                {now ? (
                  <>
                    <span style={{ color: "var(--accent)", marginRight: 6 }}>
                      ●
                    </span>
                    {now.title}
                  </>
                ) : (
                  <span style={{ fontStyle: "italic" }}>
                    {t("home.no_epg")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </ScrollLane>
    </section>
  );
}

// ─── Tiny shared building blocks ────────────────────────────────────────────

export function RailHeader({
  title,
  meta,
  onSeeAll,
}: {
  title: string;
  meta?: string;
  onSeeAll?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        marginBottom: 14,
      }}
    >
      <h3 className="h-serif" style={{ fontSize: 22, margin: 0 }}>
        {title}
      </h3>
      {meta && (
        <span className="meta-caps" style={{ fontSize: 9.5, color: "var(--text-3)" }}>
          {meta}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {onSeeAll && <SeeAllButton onClick={onSeeAll} />}
    </div>
  );
}

export function SeeAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--accent)",
        fontFamily: "var(--sans)",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {t("common.see_all")}
    </button>
  );
}

export function ScrollLane({
  gap,
  children,
}: {
  gap: number;
  children: React.ReactNode;
}) {
  return (
    <ArrowScroller>
      {(setEl) => (
        <div
          ref={setEl}
          className="no-scrollbar"
          style={{
            display: "flex",
            gap,
            overflowX: "auto",
            // Vertical breathing room so hovered cards (which lift +
            // scale + paint a soft halo via box-shadow) aren't clipped
            // by the scroller's overflow box. Without this padding the
            // card visually butted against the rail's top/bottom edge,
            // creating the "cheap rectangular slot" feel the user
            // flagged. Horizontal padding gives end-of-row cards the
            // same room for their accent glow.
            padding: "18px 12px",
            // Negative margin matches the padding so the rail's visual
            // footprint stays the same — cards now have room to grow
            // inside the clip box without pushing siblings around.
            margin: "-18px -12px",
          }}
        >
          {children}
        </div>
      )}
    </ArrowScroller>
  );
}

/**
 * Wraps any horizontally-scrolling element with transparent left/right
 * arrow buttons that scroll a viewport-width chunk on click. The arrows
 * fade in only when the rail is hover-targeted AND there's content to
 * scroll in that direction; we hide the appropriate side when at the
 * scroll start / end.
 *
 * The child is a render prop receiving a callback ref — `setEl(node)`.
 * Each consumer attaches it to the actual scrolling container; we then
 * drive that node's scrollLeft from the buttons.
 */
export function ArrowScroller({
  children,
}: {
  children: (
    setEl: (el: HTMLDivElement | null) => void,
  ) => React.ReactNode;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  // Tracks whether we can scroll further in either direction.
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  // Active scroll-animation handle. Stored in a ref so a second arrow
  // click cancels the in-flight animation cleanly instead of fighting
  // the previous one.
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!el) return;
    const recompute = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    recompute();
    el.addEventListener("scroll", recompute, { passive: true });
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    // Children may load lazily (React Query). One-shot recheck after the
    // first paint catches the arrival of poster cards.
    const settle = window.setTimeout(recompute, 80);
    return () => {
      el.removeEventListener("scroll", recompute);
      ro.disconnect();
      window.clearTimeout(settle);
      if (animRef.current != null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [el]);

  /**
   * Custom rAF scroll animation — replaces the browser's native smooth
   * `scrollBy({ behavior: "smooth" })` which is slower + less snappy than
   * an `easeOutCubic` curve. The cubic ease starts fast and decelerates,
   * so the rail feels like it's been physically "kicked" into motion.
   */
  const scrollByPage = (dir: -1 | 1) => {
    if (!el) return;
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    const step = Math.max(240, Math.round(el.clientWidth * 0.8));
    const max = el.scrollWidth - el.clientWidth;
    const startLeft = el.scrollLeft;
    const targetLeft = Math.max(0, Math.min(max, startLeft + dir * step));
    const delta = targetLeft - startLeft;
    if (delta === 0) return;
    const durationMs = 480;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      if (!el) return;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      el.scrollLeft = startLeft + delta * easeOutCubic(t);
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children(setEl)}
      <ScrollArrow
        side="left"
        visible={hovered && canLeft}
        onClick={() => scrollByPage(-1)}
      />
      <ScrollArrow
        side="right"
        visible={hovered && canRight}
        onClick={() => scrollByPage(1)}
      />
    </div>
  );
}

function ScrollArrow({
  side,
  visible,
  onClick,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={side === "left" ? "Önceki" : "Sonraki"}
      tabIndex={visible ? 0 : -1}
      // Press feedback — small scale dip + a brisk pop back via the
      // spring. Hover is a barely-there 1.04 lift so the button feels
      // alive without being jumpy when the user just brushes past it.
      whileTap={{ scale: 0.86 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      // Pure-CSS hover brightens the chevron via the `.hover-text-bright`
      // global class — was previously two onMouseEnter/Leave handlers
      // setting `style.color` imperatively.
      className="hover-text-bright"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 56,
        padding: 0,
        border: "none",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 220ms ease",
        background:
          side === "left"
            ? "linear-gradient(to right, rgba(14,18,19,0.92) 0%, rgba(14,18,19,0.55) 55%, transparent 100%)"
            : "linear-gradient(to left, rgba(14,18,19,0.92) 0%, rgba(14,18,19,0.55) 55%, transparent 100%)",
        color: "rgba(255,255,255,0.85)",
        fontSize: 28,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: side === "left" ? "flex-start" : "flex-end",
        paddingLeft: side === "left" ? 10 : 0,
        paddingRight: side === "right" ? 10 : 0,
        zIndex: 4,
        outline: "none",
        // Origin so the scale dip pivots toward the visible edge —
        // pressing the right arrow squeezes from the right edge, not
        // the centre, which feels physically right.
        transformOrigin: side === "left" ? "left center" : "right center",
      }}
    >
      {side === "left" ? "‹" : "›"}
    </motion.button>
  );
}

function LiveDot() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--teal)",
        boxShadow: "0 0 0 4px color-mix(in oklab, var(--teal) 18%, transparent)",
      }}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function progressPct(pos: number, dur: number): number {
  if (dur <= 0) return 0;
  return Math.round((pos / dur) * 100);
}

export function metaForVod(
  year: number | null,
  rating: number | null,
): string | null {
  const parts: string[] = [];
  if (year != null) parts.push(String(year));
  if (rating != null) parts.push(rating.toFixed(1));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function remainingSubtitle(item: ContinueWatching): string {
  const remainingMs = Math.max(0, item.durationMs - item.positionMs);
  const minutes = Math.round(remainingMs / 60000);
  if (minutes <= 0) return t("home.cw_remaining_near");
  if (minutes < 60) return tFmt("home.cw_remaining_minutes", { minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return tFmt("home.cw_remaining_hours", {
    hours: h,
    minutes: m.toString().padStart(2, "0"),
  });
}
