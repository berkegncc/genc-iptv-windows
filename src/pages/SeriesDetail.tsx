import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useEpisodes,
  useSeriesOne,
  useSyncEpisodes,
} from "../features/vod/useVod";
import {
  useIsFavorite,
  useToggleFavorite,
} from "../features/favorites/useFavorites";
import { usePosition } from "../features/continue-watching/useContinueWatching";
import { toneFor } from "../components/ui/PosterCard";
import { HeroCrossFade } from "./home/shared";
import { t, tFmt } from "../lib/i18n";
import type { Episode, SeriesItem } from "../lib/tauri";

const TONE_GRADIENT: Record<string, string> = {
  copper: "linear-gradient(160deg, #2A211A 0%, #150F0C 100%)",
  warm: "linear-gradient(160deg, #2A1817 0%, #150B0A 100%)",
  cool: "linear-gradient(160deg, #15222A 0%, #0A1218 100%)",
  plum: "linear-gradient(160deg, #221726 0%, #100A14 100%)",
  teal: "linear-gradient(160deg, #102B27 0%, #06140F 100%)",
};

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: series, isLoading: loadingSeries } = useSeriesOne(id);
  const { data: episodes = [], isLoading: loadingEpisodes } = useEpisodes(id);
  const syncEpisodes = useSyncEpisodes();
  const { data: position } = usePosition(id, "SERIES");
  const { data: isFav } = useIsFavorite(id, "SERIES");
  const toggleFav = useToggleFavorite();

  // Trigger one upstream sync when the page opens AND the local cache is
  // empty. Subsequent visits show the cached list instantly while the
  // mutation refreshes silently in the background.
  useEffect(() => {
    if (!id) return;
    if (loadingEpisodes) return;
    if (episodes.length === 0 && !syncEpisodes.isPending) {
      syncEpisodes.mutate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, episodes.length, loadingEpisodes]);

  const seasons = useMemo(() => {
    const set = new Set<number>();
    for (const e of episodes) set.add(e.season);
    return Array.from(set).sort((a, b) => a - b);
  }, [episodes]);

  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  // Pick a default season once we know what's available
  useEffect(() => {
    if (activeSeason == null && seasons.length > 0) {
      setActiveSeason(seasons[0]);
    }
  }, [seasons, activeSeason]);

  if (loadingSeries) {
    return (
      <div style={{ padding: 48, color: "var(--text-3)" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (!series) {
    return (
      <FullscreenMessage>
        <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
          {t("detail.not_found_series")}
        </h2>
        <button onClick={() => navigate(-1)} style={ghostBtn}>
          {t("watch.btn_back")}
        </button>
      </FullscreenMessage>
    );
  }

  const seasonEpisodes =
    activeSeason != null
      ? episodes.filter((e) => e.season === activeSeason)
      : episodes;

  const resumeEpId = position?.resumeEpisodeId ?? null;
  const currentEpisode = resumeEpId
    ? episodes.find((e) => e.id === resumeEpId)
    : null;
  const firstEpisode = episodes[0] ?? null;

  const playButton = (() => {
    if (currentEpisode) {
      return {
        label: tFmt("detail.btn_play_episode", {
          season: currentEpisode.season,
          episode: currentEpisode.episode,
        }),
        target: currentEpisode.id,
      };
    }
    if (firstEpisode) {
      return {
        label: `▶ ${t("detail.btn_play")}`,
        target: firstEpisode.id,
      };
    }
    return null;
  })();

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Hero
        series={series}
        episodeCount={episodes.length}
        seasonCount={seasons.length}
        progressPct={progressPercent(position?.positionMs, position?.durationMs)}
        isFav={isFav ?? false}
        onToggleFav={() =>
          toggleFav.mutate({ targetId: series.id, targetType: "SERIES" })
        }
        onPlay={
          playButton
            ? () =>
                navigate(
                  `/watch/episode/${encodeURIComponent(
                    playButton.target,
                  )}?series=${encodeURIComponent(series.id)}`,
                )
            : null
        }
        playLabel={playButton?.label ?? t("detail.btn_episodes_loading")}
        onBack={() => navigate(-1)}
      />

      <div
        style={{
          padding: "44px 48px 80px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <h2
            className="h-serif"
            style={{ fontSize: 28, margin: 0, fontFamily: "var(--serif)", fontWeight: 400 }}
          >
            {t("detail.episodes_title")}
          </h2>
          <span
            className="meta-caps"
            style={{ fontSize: 9.5, color: "var(--text-3)" }}
          >
            {syncEpisodes.isPending && episodes.length === 0
              ? t("detail.episodes_loading")
              : tFmt("detail.episodes_meta", {
                  episodes: episodes.length,
                  seasons: seasons.length,
                })}
          </span>
          <div style={{ flex: 1 }} />
          <SeasonPicker
            seasons={seasons}
            active={activeSeason}
            onSelect={setActiveSeason}
          />
        </div>

        {syncEpisodes.isError && (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 10,
              background:
                "color-mix(in oklab, #E07A6F 12%, transparent)",
              border:
                "1px solid color-mix(in oklab, #E07A6F 35%, transparent)",
              color: "#E07A6F",
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            {tFmt("detail.episodes_error", {
              message: String(syncEpisodes.error),
            })}
          </div>
        )}

        {episodes.length === 0 && !syncEpisodes.isPending ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "var(--text-3)",
            }}
          >
            <div className="h-italic" style={{ fontSize: 28, color: "var(--text-2)" }}>
              {t("detail.episodes_empty")}
            </div>
            <button
              onClick={() => syncEpisodes.mutate(series.id)}
              style={{ ...ghostBtn, marginTop: 18 }}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <EpisodeList
            episodes={seasonEpisodes}
            currentEpisodeId={resumeEpId}
            currentPositionPct={progressPercent(
              position?.positionMs,
              position?.durationMs,
            )}
            onPlay={(ep) =>
              navigate(
                `/watch/episode/${encodeURIComponent(
                  ep.id,
                )}?series=${encodeURIComponent(series.id)}`,
              )
            }
          />
        )}
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({
  series,
  episodeCount,
  seasonCount,
  progressPct,
  isFav,
  onToggleFav,
  onPlay,
  playLabel,
  onBack,
}: {
  series: SeriesItem;
  episodeCount: number;
  seasonCount: number;
  progressPct: number | null;
  isFav: boolean;
  onToggleFav: () => void;
  onPlay: (() => void) | null;
  playLabel: string;
  onBack: () => void;
}) {
  const tone = toneFor(series.id);
  // Backdrop preference: real backdrop → blurred poster → tone gradient.
  // Mirrors FilmDetail so every dizi gets ambient atmosphere even if
  // TMDB doesn't have it.
  const heroBackdrop = series.backdropUrl ?? series.posterUrl ?? null;
  const isPosterFallback =
    series.backdropUrl == null && series.posterUrl != null;
  return (
    <>
      {/* ── Ambient sticky backdrop (Netflix-style) ─────────────────
          Same pattern as FilmDetail: pinned to the top of the scroll
          container at lowered opacity so the dizinin atmosferi continues
          beneath the episode list. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          marginBottom: "-100vh",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* Base layer: gradient always behind, so the moment between
            DB-cached and freshly-enriched backdrop URLs doesn't show a
            black flash. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: TONE_GRADIENT[tone],
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px)",
            }}
          />
        </div>

        {/* Image cross-fade — see FilmDetail for the rationale. */}
        <HeroCrossFade keyId={heroBackdrop ?? "none"} durationMs={500}>
          {heroBackdrop && (
            <img
              src={heroBackdrop}
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
                objectPosition: "top center",
                filter: isPosterFallback
                  ? "blur(10px) brightness(0.55) saturate(1.1)"
                  : "brightness(0.55) saturate(1.05)",
                transform: isPosterFallback ? "scale(1.12)" : undefined,
              }}
            />
          )}
        </HeroCrossFade>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(14,18,19,0.15) 0%, rgba(14,18,19,0.55) 45%, rgba(14,18,19,0.85) 75%, var(--bg) 100%)",
          }}
        />
      </div>

      {/* Top spacer + back button — sits over the sticky backdrop. */}
      <div style={{ position: "relative", height: 80, zIndex: 1 }}>
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={onBack}
            style={{
              ...ghostBtn,
              height: 30,
              padding: "0 12px",
              fontSize: 11,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {t("detail.btn_back_series")}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 36,
          padding: "0 48px",
          marginTop: 200,
          position: "relative",
          zIndex: 2,
        }}
      >
        <SeriesPosterArt series={series} tone={tone} />
        <div style={{ minWidth: 0 }}>
          <span
            className="meta-caps"
            style={{ fontSize: 10, color: "var(--accent)" }}
          >
            {seriesEyebrow(series, episodeCount, seasonCount)}
          </span>
          <h1
            className="h-display"
            style={{
              fontSize: 64,
              margin: "10px 0 6px",
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
            }}
          >
            {series.title}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
              marginBottom: 18,
            }}
          >
            {series.rating != null && (
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                <span style={{ color: "var(--copper)" }}>★</span>{" "}
                {series.rating.toFixed(1)}
              </span>
            )}
            {series.year != null && (
              <span className="pill" style={pillStyle}>
                {series.year}
              </span>
            )}
            {series.genres.slice(0, 2).map((g) => (
              <span key={g} className="pill" style={pillStyle}>
                {g}
              </span>
            ))}
          </div>
          <div
            style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}
          >
            <button
              onClick={onPlay ?? undefined}
              disabled={!onPlay}
              style={{ ...primaryBtn, opacity: onPlay ? 1 : 0.5 }}
              onMouseEnter={(e) => onPlay && primaryBtnHover(e, true)}
              onMouseLeave={(e) => onPlay && primaryBtnHover(e, false)}
            >
              {playLabel}
            </button>
            <button
              onClick={onToggleFav}
              style={{
                ...ghostBtn,
                height: 44,
                padding: "0 18px",
                color: isFav ? "var(--accent)" : "var(--text)",
                borderColor: isFav
                  ? "color-mix(in oklab, var(--accent) 50%, transparent)"
                  : "var(--border)",
              }}
            >
              {isFav ? t("detail.btn_fav_active") : t("detail.btn_fav")}
            </button>
          </div>
          {series.plot && (
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.65,
                color: "var(--text-2)",
                maxWidth: 720,
                margin: 0,
              }}
            >
              {series.plot}
            </p>
          )}
          {progressPct != null && (
            <div style={{ marginTop: 18, maxWidth: 460 }}>
              <div
                className="meta-caps"
                style={{ fontSize: 9.5, marginBottom: 8 }}
              >
                {tFmt("detail.series_progress_label", { pct: progressPct })}
              </div>
              <ProgressBar pct={progressPct} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SeriesPosterArt({
  series,
  tone,
}: {
  series: SeriesItem;
  tone: keyof typeof TONE_GRADIENT;
}) {
  return (
    <div
      style={{
        width: 220,
        aspectRatio: "2 / 3",
        borderRadius: 12,
        overflow: "hidden",
        background: TONE_GRADIENT[tone],
        border: "1px solid var(--border)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      {series.posterUrl ? (
        <img
          src={series.posterUrl}
          alt={series.title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 56,
              color: "var(--text-2)",
              textAlign: "center",
            }}
          >
            {series.title
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Episodes ────────────────────────────────────────────────────────────────

function SeasonPicker({
  seasons,
  active,
  onSelect,
}: {
  seasons: number[];
  active: number | null;
  onSelect: (s: number) => void;
}) {
  if (seasons.length <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {seasons.map((s) => {
        const isActive = active === s;
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 999,
              background: isActive
                ? "color-mix(in oklab, var(--accent) 18%, transparent)"
                : "transparent",
              border: `1px solid ${
                isActive
                  ? "color-mix(in oklab, var(--accent) 45%, transparent)"
                  : "var(--hairline)"
              }`,
              color: isActive ? "var(--accent)" : "var(--text-2)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 140ms",
            }}
          >
            S{s}
          </button>
        );
      })}
    </div>
  );
}

function EpisodeList({
  episodes,
  currentEpisodeId,
  currentPositionPct,
  onPlay,
}: {
  episodes: Episode[];
  currentEpisodeId: string | null;
  currentPositionPct: number | null;
  onPlay: (ep: Episode) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {episodes.map((ep) => {
        const isCurrent = ep.id === currentEpisodeId;
        return (
          <button
            key={ep.id}
            onClick={() => onPlay(ep)}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 160px 1fr auto",
              gap: 20,
              alignItems: "center",
              padding: "16px 16px",
              marginLeft: -16,
              marginRight: -16,
              borderBottom: "1px solid var(--hairline)",
              borderRadius: 8,
              background: isCurrent
                ? "color-mix(in oklab, var(--accent) 5%, transparent)"
                : "transparent",
              border: "none",
              borderColor: "var(--hairline)",
              color: "var(--text)",
              fontFamily: "var(--sans)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--bg-elev2)";
            }}
            onMouseLeave={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span
              className="mono"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: isCurrent ? "var(--accent)" : "var(--text-3)",
                width: 36,
              }}
            >
              B{String(ep.episode).padStart(2, "0")}
            </span>
            <EpisodeThumb episode={ep} isCurrent={isCurrent} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {ep.title}
                </span>
                {ep.durationSecs != null && (
                  <span
                    className="meta-caps"
                    style={{ fontSize: 9, color: "var(--text-3)" }}
                  >
                    {formatEpDuration(ep.durationSecs)}
                  </span>
                )}
                {isCurrent && currentPositionPct != null && (
                  <span
                    className="pill"
                    style={{
                      ...pillStyle,
                      background:
                        "color-mix(in oklab, var(--accent) 18%, transparent)",
                      borderColor:
                        "color-mix(in oklab, var(--accent) 45%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    {tFmt("detail.episode_progress", {
                      pct: currentPositionPct,
                    })}
                  </span>
                )}
              </div>
              {ep.plot && (
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ep.plot}
                </span>
              )}
              {isCurrent && currentPositionPct != null && (
                <ProgressBar pct={currentPositionPct} />
              )}
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: isCurrent ? "var(--accent)" : "transparent",
                color: isCurrent ? "var(--accent-ink)" : "var(--text-2)",
                border: isCurrent ? "none" : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ▶
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EpisodeThumb({ episode, isCurrent }: { episode: Episode; isCurrent: boolean }) {
  return (
    <div
      style={{
        width: 160,
        aspectRatio: "16 / 9",
        borderRadius: 6,
        overflow: "hidden",
        background:
          "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 8px), linear-gradient(160deg, #1F2A2C, #0F1517)",
        border: isCurrent
          ? "1px solid color-mix(in oklab, var(--accent) 45%, transparent)"
          : "1px solid var(--border)",
        flex: "0 0 auto",
        position: "relative",
      }}
    >
      {episode.thumbnailUrl && (
        <img
          src={episode.thumbnailUrl}
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
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        height: 3,
        background: "var(--bg-elev2)",
        borderRadius: 2,
        overflow: "hidden",
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
  );
}

function FullscreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

// ─── Helpers / styles ───────────────────────────────────────────────────────

function seriesEyebrow(s: SeriesItem, episodeCount: number, seasonCount: number) {
  const parts: string[] = [];
  if (s.year != null) parts.push(String(s.year));
  if (seasonCount > 0) parts.push(`${seasonCount} SEZON`);
  if (episodeCount > 0) parts.push(`${episodeCount} BÖLÜM`);
  return parts.join(" · ");
}

function formatEpDuration(secs: number): string {
  const m = Math.round(secs / 60);
  return `${m} dk`;
}

function progressPercent(pos?: number, dur?: number): number | null {
  if (!pos || !dur || dur <= 0) return null;
  const pct = Math.round((pos / dur) * 100);
  if (pct < 1 || pct > 99) return null;
  return pct;
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 44,
  padding: "0 22px",
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-ink)",
  border: "none",
  fontFamily: "var(--sans)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 160ms",
};

function primaryBtnHover(
  e: React.MouseEvent<HTMLButtonElement>,
  hovered: boolean,
) {
  e.currentTarget.style.background = hovered
    ? "var(--accent-strong)"
    : "var(--accent)";
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 14px",
  borderRadius: 8,
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 160ms",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 9px",
  borderRadius: 999,
  background: "var(--bg-elev2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--mono)",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
