import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEnrichMovie, useMovie } from "../features/vod/useVod";
import {
  useIsFavorite,
  useToggleFavorite,
} from "../features/favorites/useFavorites";
import { usePosition } from "../features/continue-watching/useContinueWatching";
import { toneFor } from "../components/ui/PosterCard";
import { ArrowScroller, HeroCrossFade } from "./home/shared";
import { t, tFmt } from "../lib/i18n";
import type { CastMember, VodItem } from "../lib/tauri";

const TONE_GRADIENT: Record<string, string> = {
  copper: "linear-gradient(160deg, #2A211A 0%, #150F0C 100%)",
  warm: "linear-gradient(160deg, #2A1817 0%, #150B0A 100%)",
  cool: "linear-gradient(160deg, #15222A 0%, #0A1218 100%)",
  plum: "linear-gradient(160deg, #221726 0%, #100A14 100%)",
  teal: "linear-gradient(160deg, #102B27 0%, #06140F 100%)",
};

export default function FilmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: movie, isLoading } = useMovie(id);
  const enrich = useEnrichMovie();
  const { data: position } = usePosition(id, "MOVIE");
  const { data: isFav } = useIsFavorite(id, "MOVIE");
  const toggleFav = useToggleFavorite();

  // Lazy-fetch full info (cast, plot, runtime) once when the page opens.
  // The list call only carries baseline metadata to keep the grid light.
  useEffect(() => {
    if (!id) return;
    enrich.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: 48, color: "var(--text-3)" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (!movie) {
    return (
      <FullscreenMessage>
        <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
          {t("detail.not_found_film")}
        </h2>
        <button
          onClick={() => navigate(-1)}
          style={ghostBtn}
          onMouseEnter={(e) => ghostBtnHover(e, true)}
          onMouseLeave={(e) => ghostBtnHover(e, false)}
        >
          {t("watch.btn_back")}
        </button>
      </FullscreenMessage>
    );
  }

  return (
    <Detail
      movie={movie}
      progressPct={progressPercent(position?.positionMs, position?.durationMs)}
      isFav={isFav ?? false}
      onToggleFav={() =>
        toggleFav.mutate({ targetId: movie.id, targetType: "MOVIE" })
      }
      onPlay={() => navigate(`/watch/movie/${encodeURIComponent(movie.id)}`)}
      onBack={() => navigate(-1)}
    />
  );
}

function Detail({
  movie,
  progressPct,
  isFav,
  onToggleFav,
  onPlay,
  onBack,
}: {
  movie: VodItem;
  progressPct: number | null;
  isFav: boolean;
  onToggleFav: () => void;
  onPlay: () => void;
  onBack: () => void;
}) {
  const tone = toneFor(movie.id);
  // Prefer the proper widescreen backdrop; fall back to the poster
  // (heavily blurred + brightened-down so the cropping looks deliberate).
  // That way EVERY film gets a dynamic backdrop tied to its art, even
  // when Xtream didn't ship a backdrop_path.
  const heroBackdrop = movie.backdropUrl ?? movie.posterUrl ?? null;
  const isPosterFallback =
    movie.backdropUrl == null && movie.posterUrl != null;

  return (
    <div style={{ overflow: "auto", height: "100%", position: "relative" }}>
      {/* ── Ambient sticky backdrop ─────────────────────────────────
          Sits behind every section (poster, cast, info) at lowered
          opacity. `position: sticky` pins it to the top of the scroll
          container so when the user scrolls down through the cast/info
          they still feel the film's atmosphere underneath. The negative
          marginBottom reclaims the layout space so the hero panel
          underneath sits flush instead of being pushed down a viewport. */}
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
        {/* Base layer: tone-tinted gradient. Always rendered behind
            the image so the moment between img loads (DB-cached →
            enriched URL) doesn't show a black flash. */}
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

        {/* Image layer, cross-faded on URL change. The user's enrich_movie
            mutation can swap `backdropUrl` mid-render once the Xtream
            vod_info detail call returns — without this wrapper the swap
            looked like a second backdrop suddenly appearing milliseconds
            after open. HeroCrossFade keeps the old layer mounted until
            the new one has faded in on top, so the swap reads as a
            graceful reveal instead of a flash. */}
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
                // Real backdrop: subtle dim. Poster fallback: blur the
                // 2:3 crop so it reads ambient, not stretched.
                filter: isPosterFallback
                  ? "blur(10px) brightness(0.55) saturate(1.1)"
                  : "brightness(0.55) saturate(1.05)",
                transform: isPosterFallback ? "scale(1.12)" : undefined,
              }}
            />
          )}
        </HeroCrossFade>

        {/* Foreground fade so content remains readable over the art. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(14,18,19,0.15) 0%, rgba(14,18,19,0.55) 45%, rgba(14,18,19,0.85) 75%, var(--bg) 100%)",
          }}
        />
      </div>

      {/* ── Top spacer so the hero panel sits in the upper half of the
          backdrop (matches the previous 460px banner area). The actual
          backdrop is the sticky layer above. ────────────────────────── */}
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
            {t("detail.btn_back_films")}
          </button>
          {movie.genres.length > 0 && (
            <span
              className="meta-caps"
              style={{ fontSize: 10, color: "var(--text-2)" }}
            >
              {movie.genres.slice(0, 2).join(" · ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Hero panel ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 36,
          padding: "0 48px",
          marginTop: 200,
          position: "relative",
          zIndex: 2,
        }}
      >
        <PosterArt movie={movie} tone={tone} />
        <div style={{ minWidth: 0 }}>
          <span
            className="meta-caps"
            style={{ fontSize: 10, color: "var(--accent)" }}
          >
            {detailEyebrow(movie)}
          </span>
          <h1
            className="h-display"
            style={{
              fontSize: 76,
              margin: "10px 0 6px",
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
            }}
          >
            {movie.title}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
              marginTop: 14,
              marginBottom: 22,
            }}
          >
            {movie.rating != null && <RatingStars rating={movie.rating} />}
            {movie.durationSecs && (
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                {formatDuration(movie.durationSecs)}
              </span>
            )}
            {movie.year != null && (
              <span className="pill" style={pillStyle}>
                {movie.year}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            <button
              onClick={onPlay}
              style={primaryBtn}
              onMouseEnter={(e) => primaryBtnHover(e, true)}
              onMouseLeave={(e) => primaryBtnHover(e, false)}
            >
              <span style={{ fontSize: 11 }}>▶</span>
              {progressPct != null
                ? tFmt("detail.btn_resume", { pct: progressPct })
                : t("detail.btn_play")}
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
              onMouseEnter={(e) => ghostBtnHover(e, true)}
              onMouseLeave={(e) => ghostBtnHover(e, false)}
            >
              {isFav ? t("detail.btn_fav_active") : t("detail.btn_fav")}
            </button>
          </div>
          {movie.plot && (
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.65,
                color: "var(--text-2)",
                maxWidth: 720,
                margin: 0,
              }}
            >
              {movie.plot}
            </p>
          )}
          {progressPct != null && (
            <div style={{ marginTop: 22, maxWidth: 460 }}>
              <div
                className="meta-caps"
                style={{ fontSize: 9.5, marginBottom: 8 }}
              >
                {tFmt("detail.progress_label", { pct: progressPct })}
              </div>
              <ProgressBar pct={progressPct} />
            </div>
          )}
        </div>
      </div>

      {/* ── Cast + Info ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "56px 48px 80px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 48,
          alignItems: "start",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* `minWidth: 0` is the actual fix here — without it, the
            horizontal cast strip's min-content (12 chips ≈ 1400px) blows
            the grid track wider than `1fr`, which drags the 320px info
            card off the right edge of the viewport. The
            `minmax(0, 1fr)` on the grid template above does the same
            thing belt-and-braces. */}
        <div style={{ minWidth: 0 }}>
          {movie.cast.length > 0 && (
            <>
              <RailHeader
                title={t("detail.section_cast")}
                count={tFmt("detail.cast_count", { count: movie.cast.length })}
              />
              {/* Same arrow-button + smooth-scroll behaviour the home
                  rails use. Hidden scrollbar, transparent left/right
                  hover arrows, custom easeOutCubic scroll on click. */}
              <ArrowScroller>
                {(setEl) => (
                  <div
                    ref={setEl}
                    className="no-scrollbar"
                    style={{
                      display: "flex",
                      gap: 16,
                      overflowX: "auto",
                      paddingBottom: 4,
                    }}
                  >
                    {movie.cast.slice(0, 12).map((member, i) => (
                      <CastChip key={i} member={member} />
                    ))}
                  </div>
                )}
              </ArrowScroller>
            </>
          )}
        </div>
        <div>
          <RailHeader title={t("detail.section_info")} />
          <InfoTable movie={movie} />
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function PosterArt({ movie, tone }: { movie: VodItem; tone: keyof typeof TONE_GRADIENT }) {
  return (
    <div
      style={{
        width: 240,
        aspectRatio: "2 / 3",
        borderRadius: 12,
        overflow: "hidden",
        background: TONE_GRADIENT[tone],
        border: "1px solid var(--border)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
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
            padding: 16,
          }}
        >
          <span
            className="h-italic"
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 56,
              color: "var(--text-2)",
              textAlign: "center",
            }}
          >
            {movie.title.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

function RailHeader({ title, count }: { title: string; count?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        marginBottom: 14,
      }}
    >
      <h2
        className="h-serif"
        style={{
          fontSize: 22,
          margin: 0,
          fontFamily: "var(--serif)",
          fontWeight: 400,
        }}
      >
        {title}
      </h2>
      {count && (
        <span
          className="meta-caps"
          style={{ fontSize: 9.5, color: "var(--text-3)" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function CastChip({ member }: { member: CastMember }) {
  const initials = member.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: 100,
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background:
            "radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: 32,
          color: "var(--text-3)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            // If the cast row has a URL but it 404s, the initials
            // underneath are still visible — the image just
            // disappears, not the whole chip.
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
          <span>{initials || "•"}</span>
        )}
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          lineHeight: 1.2,
          color: "var(--text)",
        }}
      >
        {member.name}
      </div>
    </div>
  );
}

function InfoTable({ movie }: { movie: VodItem }) {
  const rows: Array<[string, string]> = [];
  if (movie.director) rows.push([t("detail.info_director"), movie.director]);
  if (movie.genres.length) rows.push([t("detail.info_genre"), movie.genres.join(", ")]);
  if (movie.year != null) rows.push([t("detail.info_year"), String(movie.year)]);
  if (movie.durationSecs)
    rows.push([t("detail.info_duration"), formatDuration(movie.durationSecs)]);
  if (movie.rating != null)
    rows.push([t("detail.info_score"), `${movie.rating.toFixed(1)} / 10`]);

  if (rows.length === 0) {
    return (
      <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
        {t("detail.info_empty")}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 16,
            padding: "12px 0",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <span className="meta-caps" style={{ fontSize: 9.5 }}>
            {k}
          </span>
          <span style={{ fontSize: 13 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  // 0..10 → 0..5 stars
  const five = Math.round(rating / 2);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--copper)" }}>{"★".repeat(five)}</span>
      <span style={{ color: "var(--text-4)" }}>{"★".repeat(5 - five)}</span>
      <span
        className="mono"
        style={{ fontSize: 11.5, color: "var(--text-2)", fontFamily: "var(--mono)" }}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        height: 4,
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

function detailEyebrow(movie: VodItem): string {
  const parts: string[] = [];
  if (movie.year != null) parts.push(String(movie.year));
  if (movie.durationSecs) parts.push(formatDuration(movie.durationSecs).toUpperCase());
  if (movie.genres.length) parts.push(movie.genres[0].toUpperCase());
  return parts.join(" · ");
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h} sa ${m.toString().padStart(2, "0")} dk`;
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

function ghostBtnHover(
  e: React.MouseEvent<HTMLButtonElement>,
  hovered: boolean,
) {
  e.currentTarget.style.background = hovered ? "var(--bg-elev2)" : "transparent";
}

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
