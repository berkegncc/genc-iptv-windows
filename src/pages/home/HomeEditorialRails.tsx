/**
 * Variant E — Editorial Rails. The original Home layout: simple welcome
 * header + a stacked sequence of horizontal scroll rails (Continue
 * Watching → Recent Channels → Recent Movies → Recent Series). No hero
 * banner; the cleanest reading experience for users who want to skim.
 */
import {
  ContinueWatchingRail,
  PosterRail,
  RecentChannelsLogoRail,
  WelcomeHeader,
  metaForVod,
  useHomeData,
  useHomeNavigation,
} from "./shared";
import { t } from "../../lib/i18n";

export function HomeEditorialRails() {
  const data = useHomeData();
  const nav = useHomeNavigation();
  return (
    <div style={{ padding: "32px 48px", height: "100%", overflow: "auto" }}>
      <WelcomeHeader displayName={data.displayName} />
      <ContinueWatchingRail items={data.cwList} />
      <RecentChannelsLogoRail
        channels={data.recentChannels}
        nowMap={data.nowMap}
      />
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
        size="sm"
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
        size="sm"
      />
    </div>
  );
}
