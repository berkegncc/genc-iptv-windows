/**
 * Variant D — Wide Tile / Apple TV+ hibrit. Featured grid up top
 * (1 large + 2 stacked tiles, all 16:9), then 16:9-card "Wide Rails"
 * underneath. Continue Watching here is a wide rail with progress bar
 * on the thumbnail, mirroring Apple TV's "Up Next".
 */
import {
  FeaturedTile,
  HeroBackdrop,
  HeroCrossFade,
  LiveChannelRail,
  WelcomeHeader,
  WideRail,
  backdropToneFor,
  metaForVod,
  progressPct,
  useHomeData,
  useHomeNavigation,
  useRotatingHero,
} from "./shared";
import { t } from "../../lib/i18n";

export function HomeWideTile() {
  const data = useHomeData();
  const nav = useHomeNavigation();

  // Three "featured" tiles up top: the large rotating hero in the primary
  // slot, plus two pinned sidekicks (latest movie + latest series) so the
  // grid still feels populated even before the random pool resolves.
  const { hero: featuredHero } = useRotatingHero(
    data.active?.id,
    data.recentMovies,
  );
  // Pick the top recent movie that isn't currently featured (avoid showing
  // the same poster twice in the same grid).
  const featuredA =
    data.recentMovies.find((m) => m.id !== featuredHero?.id) ??
    data.recentMovies[0];
  const featuredB = data.recentSeries[0];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "28px 48px 60px" }}>
      <WelcomeHeader displayName={data.displayName} />

      {featuredHero ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {/* Large featured tile — rotates with the random pool. The
              relative + height wrapper gives `HeroCrossFade` (which is
              absolute) a grid cell to fill; FeaturedTile's `lg` size is
              also 380, so the wrapper matches its natural height. */}
          <div style={{ position: "relative", height: 380 }}>
            <HeroCrossFade keyId={featuredHero.id}>
              <FeaturedTile
                size="lg"
                eyebrow={t("home.featured_film")}
                title={featuredHero.title}
                meta={metaForVod(featuredHero.year, featuredHero.rating)}
                description={featuredHero.plot}
                imageUrl={featuredHero.backdropUrl}
                posterFallbackUrl={featuredHero.posterUrl}
                onClick={() => nav.playMovie(featuredHero.id)}
              />
            </HeroCrossFade>
          </div>
          {/* Two stacked small tiles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {featuredA && (
              <FeaturedTile
                size="sm"
                eyebrow={t("home.recent_movies")}
                title={featuredA.title}
                meta={metaForVod(featuredA.year, featuredA.rating)}
                imageUrl={featuredA.backdropUrl}
                posterFallbackUrl={featuredA.posterUrl}
                onClick={() => nav.openMovie(featuredA.id)}
              />
            )}
            {featuredB && (
              <FeaturedTile
                size="sm"
                eyebrow={t("home.new_season")}
                title={featuredB.title}
                meta={metaForVod(featuredB.year, featuredB.rating)}
                imageUrl={featuredB.backdropUrl}
                posterFallbackUrl={featuredB.posterUrl}
                onClick={() => nav.openSeries(featuredB.id)}
              />
            )}
          </div>
        </div>
      ) : (
        // Cold-state placeholder — first launch, no synced VOD yet.
        <ColdHero />
      )}

      {data.cwList.length > 0 && (
        <WideRail
          title={t("home.continue_watching")}
          badge={String(data.cwList.length)}
          items={data.cwList.map((it) => ({
            id: `${it.targetId}-${it.targetType}`,
            title: it.title,
            subtitle: it.subtitle,
            thumbnailUrl: it.thumbnailUrl,
            pct: progressPct(it.positionMs, it.durationMs),
          }))}
          onItemClick={(id) => {
            // id format "targetId-targetType" — match by composite back into list
            const found = data.cwList.find(
              (it) => `${it.targetId}-${it.targetType}` === id,
            );
            if (found) nav.openContinue(found);
          }}
        />
      )}

      {data.recentMovies.length > 0 && (
        <WideRail
          title={t("home.recent_movies")}
          badge={String(data.recentMovies.length)}
          onSeeAll={() => nav.openMovies()}
          items={data.recentMovies.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: metaForVod(m.year, m.rating),
            thumbnailUrl: m.backdropUrl ?? m.posterUrl,
            pct: null,
          }))}
          onItemClick={(id) => nav.openMovie(id)}
        />
      )}

      {data.recentSeries.length > 0 && (
        <WideRail
          title={t("home.recent_series")}
          badge={String(data.recentSeries.length)}
          onSeeAll={() => nav.openSeriesAll()}
          items={data.recentSeries.map((s) => ({
            id: s.id,
            title: s.title,
            subtitle: metaForVod(s.year, s.rating),
            thumbnailUrl: s.backdropUrl ?? s.posterUrl,
            pct: null,
          }))}
          onItemClick={(id) => nav.openSeries(id)}
        />
      )}

      <LiveChannelRail channels={data.recentChannels} nowMap={data.nowMap} />
    </div>
  );
}

function ColdHero() {
  return (
    <div
      style={{
        position: "relative",
        height: 280,
        marginBottom: 36,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px dashed var(--border)",
      }}
    >
      <HeroBackdrop tone={backdropToneFor("welcome")} fade="bottom" height="100%">
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 32px 28px",
          }}
        >
          <span
            className="meta-caps"
            style={{
              fontSize: 9.5,
              color: "var(--accent)",
              marginBottom: 10,
            }}
          >
            {t("home.featured_eyebrow")}
          </span>
          <h2
            className="h-display"
            style={{ fontSize: 36, margin: 0, color: "#fff" }}
          >
            {t("home.welcome_eyebrow")}
          </h2>
        </div>
      </HeroBackdrop>
    </div>
  );
}

