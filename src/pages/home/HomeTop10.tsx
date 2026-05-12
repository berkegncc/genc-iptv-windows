/**
 * Variant B — Cinematic side-anchored hero with rotating recommendations.
 *
 * The hero rotates through a per-session 20-movie random pool every
 * `HERO_ROTATION_MS`, with a key-driven swap. The same pool feeds the
 * "Önerilen Filmler" rail underneath so the hero always matches what
 * the user sees in the row below.
 *
 * Hero size is bounded so it always fits the visible viewport — the
 * page only scrolls when the user wants to reach the rails below.
 */
import {
  ContinueWatchingRail,
  HeroBackdrop,
  HeroCrossFade,
  HeroDots,
  PosterRail,
  backdropToneFor,
  metaForVod,
  useHomeData,
  useHomeNavigation,
  useRotatingHero,
} from "./shared";
import { t } from "../../lib/i18n";
import type { VodItem } from "../../lib/tauri";

export function HomeTop10() {
  const data = useHomeData();
  const nav = useHomeNavigation();
  const { hero, pool, poolSize, index, jumpTo } = useRotatingHero(
    data.active?.id,
    data.recentMovies,
  );

  return (
    <div
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <RotatingHero
        hero={hero}
        poolSize={poolSize}
        index={index}
        onPlay={() => hero && nav.playMovie(hero.id)}
        onMoreInfo={() => hero && nav.openMovie(hero.id)}
        onJumpTo={jumpTo}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "24px 48px 60px",
        }}
      >
        <PosterRail
          title={t("home.recommended_films")}
          meta={t("home.random_meta")}
          items={pool.map((m) => ({
            id: m.id,
            title: m.title,
            posterUrl: m.posterUrl,
            meta: metaForVod(m.year, m.rating),
          }))}
          onItemClick={(id) => nav.openMovie(id)}
          onSeeAll={() => nav.openMovies()}
        />
        <ContinueWatchingRail items={data.cwList} />
        <PosterRail
          title={t("home.recent_series")}
          onSeeAll={() => nav.openSeriesAll()}
          items={data.recentSeries.map((s) => ({
            id: s.id,
            title: s.title,
            posterUrl: s.posterUrl,
            meta: metaForVod(s.year, s.rating),
          }))}
          onItemClick={(id) => nav.openSeries(id)}
        />
      </div>
    </div>
  );
}

// ─── Rotating cinematic hero ────────────────────────────────────────────────

function RotatingHero({
  hero,
  poolSize,
  index,
  onPlay,
  onMoreInfo,
  onJumpTo,
}: {
  hero: VodItem | null;
  poolSize: number;
  index: number;
  onPlay: () => void;
  onMoreInfo: () => void;
  onJumpTo: (i: number) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "clamp(360px, 52vh, 480px)",
        flex: "0 0 auto",
        overflow: "hidden",
      }}
    >
      {/* Cross-fade between hero items on each rotation tick. The fade
          duration is tuned to be quick enough that the user notices the
          change but not so quick that the eye snaps. */}
      {hero && (
        <HeroCrossFade keyId={hero.id}>
          <HeroBackdrop
            imageUrl={hero.backdropUrl}
            posterFallbackUrl={hero.posterUrl}
            tone={backdropToneFor(hero.title)}
            fade="left"
            height="100%"
          >
            <HeroPanel hero={hero} onPlay={onPlay} onMoreInfo={onMoreInfo} />
          </HeroBackdrop>
        </HeroCrossFade>
      )}

      <HeroDots
        poolSize={poolSize}
        index={index}
        onJump={onJumpTo}
        right={56}
        bottom={24}
      />
    </div>
  );
}

function HeroPanel({
  hero,
  onPlay,
  onMoreInfo,
}: {
  hero: VodItem;
  onPlay: () => void;
  onMoreInfo: () => void;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(420px, 560px) 1fr",
        alignItems: "center",
        padding: "0 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: "100%",
        }}
      >
        <span
          className="meta-caps"
          style={{ fontSize: 10, color: "var(--accent)" }}
        >
          ● {t("home.featured_eyebrow")}
        </span>
        <h1
          className="h-display"
          style={{
            fontSize: "clamp(44px, 6vw, 76px)",
            margin: "12px 0 8px",
            color: "#fff",
            letterSpacing: "-0.035em",
            lineHeight: 1.0,
            // Long upstream titles ("X - The Y in the Z's W (2018)") used
            // to overflow the hero; clamp keeps it readable in 2 lines.
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {hero.title}
        </h1>
        <div
          className="meta-caps"
          style={{
            fontSize: 10,
            color: "rgba(232,237,236,0.7)",
            marginBottom: 14,
          }}
        >
          {[
            hero.year != null ? String(hero.year) : null,
            hero.rating != null ? `★ ${hero.rating.toFixed(1)}` : null,
            hero.genres[0] ?? null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {hero.plot && (
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "rgba(232,237,236,0.78)",
              maxWidth: 480,
              margin: 0,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
            }}
          >
            {hero.plot}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 18,
            alignItems: "center",
          }}
        >
          <button
            onClick={onPlay}
            style={{
              height: 42,
              padding: "0 22px",
              fontSize: 13.5,
              background: "#fff",
              color: "#0E1213",
              border: "none",
              borderRadius: 6,
              fontFamily: "var(--sans)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ▶ {t("home.play")}
          </button>
          <button
            onClick={onMoreInfo}
            style={{
              height: 42,
              padding: "0 18px",
              fontSize: 13,
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 6,
              fontFamily: "var(--sans)",
              cursor: "pointer",
            }}
          >
            ⓘ {t("home.more_info")}
          </button>
        </div>
      </div>
    </div>
  );
}
