/**
 * Variant A — Klasik Billboard. Netflix-style full-bleed cinematic hero
 * spanning the full width, then 4-5 horizontal poster rails underneath.
 *
 * The hero rotates through the same per-session 20-movie random pool that
 * powers the "Önerilen Filmler" rail underneath, so the spotlight always
 * matches what the user sees in the recommended row. "İzle" goes straight
 * to playback; "Daha fazla bilgi" opens the film detail page.
 */
import {
  ContinueWatchingRail,
  HeroBackdrop,
  HeroCrossFade,
  HeroDots,
  PosterRail,
  RecentChannelsLogoRail,
  WatchedRail,
  backdropToneFor,
  metaForVod,
  useHomeData,
  useHomeNavigation,
  useRotatingHero,
} from "./shared";
import { t } from "../../lib/i18n";

export function HomeBillboard() {
  const data = useHomeData();
  const nav = useHomeNavigation();
  const { hero, pool, poolSize, index, jumpTo } = useRotatingHero(
    data.active?.id,
    data.recentMovies,
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      {hero && (
        <div
          style={{ position: "relative", height: 540, marginBottom: -90 }}
        >
          <HeroCrossFade keyId={hero.id}>
            <HeroBackdrop
              imageUrl={hero.backdropUrl}
              posterFallbackUrl={hero.posterUrl}
              tone={backdropToneFor(hero.title)}
              fade="bottom"
              height="100%"
            >
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "0 56px 100px",
              }}
            >
              <span
                className="meta-caps"
                style={{
                  fontSize: 10,
                  color: "rgba(232,237,236,0.7)",
                  marginBottom: 14,
                }}
              >
                <span style={{ color: "var(--accent)" }}>● </span>
                {t("home.featured_eyebrow")}
              </span>
              <h1
                className="h-display"
                style={{
                  fontSize: 84,
                  margin: 0,
                  color: "#fff",
                  textShadow: "0 4px 24px rgba(0,0,0,0.6)",
                  maxWidth: 760,
                  lineHeight: 1.0,
                  letterSpacing: "-0.025em",
                  // Long upstream titles can run beyond two lines and push
                  // the buttons off the bottom — clamp to two lines.
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
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  marginTop: 18,
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 13.5,
                }}
              >
                {hero.year != null && (
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {hero.year}
                  </span>
                )}
                {hero.rating != null && (
                  <span>★ {hero.rating.toFixed(1)}</span>
                )}
                {hero.genres[0] && <span>{hero.genres[0]}</span>}
              </div>
              {hero.plot && (
                <p
                  style={{
                    marginTop: 18,
                    maxWidth: 580,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.78)",
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
                  gap: 12,
                  marginTop: 28,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => nav.playMovie(hero.id)}
                  style={{
                    height: 48,
                    padding: "0 28px",
                    fontSize: 15,
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
                  onClick={() => nav.openMovie(hero.id)}
                  style={{
                    height: 48,
                    padding: "0 22px",
                    fontSize: 14,
                    background: "rgba(40,46,48,0.7)",
                    color: "#fff",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6,
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                  }}
                >
                  ⓘ {t("home.more_info")}
                </button>
              </div>
            </div>
            </HeroBackdrop>
          </HeroCrossFade>

          <HeroDots
            poolSize={poolSize}
            index={index}
            onJump={jumpTo}
            right={56}
            bottom={110}
          />
        </div>
      )}

      <div style={{ position: "relative", padding: "0 48px 60px" }}>
        <PosterRail
          title={t("home.recommended_films")}
          meta={t("home.random_meta")}
          onSeeAll={() => nav.openMovies()}
          items={pool.map((m) => ({
            id: m.id,
            title: m.title,
            posterUrl: m.posterUrl,
            meta: metaForVod(m.year, m.rating),
          }))}
          onItemClick={(id) => nav.openMovie(id)}
        />
        {/* Continue Watching sits below the Önerilen Filmler rail —
            recommendations lead the page, the user's in-progress titles
            come after as a personal layer. */}
        <ContinueWatchingRail items={data.cwList} />
        <WatchedRail items={data.cwWatched} />
        <PosterRail
          title={t("home.recent_movies")}
          onSeeAll={() => nav.openMovies()}
          items={data.recentMovies.map((m) => ({
            id: m.id,
            title: m.title,
            posterUrl: m.posterUrl,
            meta: metaForVod(m.year, m.rating),
          }))}
          onItemClick={(id) => nav.openMovie(id)}
        />
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
        <RecentChannelsLogoRail
          channels={data.recentChannels}
          nowMap={data.nowMap}
        />
      </div>
    </div>
  );
}
