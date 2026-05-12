/**
 * Variant C — Editorial × Netflix hibrit. Hero is a contained 16:9 panel
 * with rounded corners (not full-bleed), and each rail uses a 320-wide
 * sidebar holding eyebrow + serif title + meta + see-all link, mirroring
 * a magazine's section spread layout.
 */
import {
  HeroBackdrop,
  HeroCrossFade,
  HeroDots,
  ScrollLane,
  WelcomeHeader,
  backdropToneFor,
  metaForVod,
  remainingSubtitle,
  useHomeData,
  useHomeNavigation,
  useRotatingHero,
} from "./shared";
import { PosterCard, toneFor } from "../../components/ui/PosterCard";
import { t, tFmt } from "../../lib/i18n";
import type { ContinueWatching } from "../../lib/tauri";

export function HomeEditorialHybrid() {
  const data = useHomeData();
  const nav = useHomeNavigation();
  const { hero, poolSize, index, jumpTo } = useRotatingHero(
    data.active?.id,
    data.recentMovies,
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      {/* Editorial dateline + welcome */}
      <div style={{ padding: "28px 48px 0" }}>
        <WelcomeHeader displayName={data.displayName} />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span
            className="meta-caps"
            style={{ fontSize: 10.5, color: "var(--text-2)" }}
          >
            {dateLine()}
          </span>
          <span
            className="meta-caps"
            style={{ fontSize: 10, color: "var(--text-3)" }}
          >
            <span style={{ color: "var(--accent)" }}>● </span>
            {t("home.featured_meta")}
          </span>
        </div>
      </div>

      {hero && (
        <div style={{ padding: "0 48px" }}>
          <div
            style={{
              position: "relative",
              borderRadius: 14,
              overflow: "hidden",
              height: 420,
              border: "1px solid var(--border)",
            }}
          >
            <HeroCrossFade keyId={hero.id}>
              <HeroBackdrop
                imageUrl={hero.backdropUrl}
                posterFallbackUrl={hero.posterUrl}
                tone={backdropToneFor(hero.title)}
                fade="sides"
                height="100%"
              >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "0 44px 36px",
                }}
              >
                <span
                  className="meta-caps"
                  style={{
                    fontSize: 10,
                    color: "rgba(232,237,236,0.78)",
                    marginBottom: 14,
                  }}
                >
                  {metaForVod(hero.year, hero.rating) ??
                    t("home.featured_eyebrow")}
                </span>
                <h1
                  className="h-display"
                  style={{
                    fontSize: 76,
                    margin: 0,
                    color: "#fff",
                    maxWidth: 800,
                    lineHeight: 1.0,
                    letterSpacing: "-0.025em",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                >
                  {hero.title}
                </h1>
                {hero.plot && (
                  <p
                    style={{
                      marginTop: 14,
                      maxWidth: 540,
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      color: "rgba(232,237,236,0.74)",
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
                    marginTop: 22,
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => nav.playMovie(hero.id)}
                    style={{
                      height: 42,
                      padding: "0 22px",
                      fontSize: 13.5,
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
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
                    onClick={() => nav.openMovie(hero.id)}
                    style={{
                      height: 42,
                      padding: "0 18px",
                      fontSize: 13,
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 8,
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
              right={32}
              bottom={22}
            />
          </div>
        </div>
      )}

      <div style={{ padding: "8px 48px 60px" }}>
        {data.cwList.length > 0 && (
          <EditorialRail
            eyebrow={t("home.continue_resume")}
            title={t("home.continue_recent")}
            meta={tFmt("home.count_titles", { count: data.cwList.length })}
            seeAll={null}
          >
            <ScrollLane gap={14}>
              {data.cwList.map((it) => (
                <ContinueBanner
                  key={`${it.targetId}-${it.targetType}`}
                  item={it}
                  onClick={() => nav.openContinue(it)}
                />
              ))}
            </ScrollLane>
          </EditorialRail>
        )}

        {data.recentMovies.length > 0 && (
          <EditorialRail
            eyebrow={t("home.this_week_trend")}
            title={t("home.recent_movies")}
            meta={tFmt("home.count_titles", { count: data.recentMovies.length })}
            seeAll={() => nav.openMovies()}
          >
            <ScrollLane gap={14}>
              {data.recentMovies.map((m, i) => (
                <div
                  key={m.id}
                  style={{ width: 162, flex: "0 0 auto" }}
                >
                  <div style={{ position: "relative" }}>
                    <PosterCard
                      title={m.title}
                      posterUrl={m.posterUrl}
                      tone={toneFor(m.id)}
                      meta={metaForVod(m.year, m.rating)}
                      onClick={() => nav.openMovie(m.id)}
                    />
                    <span
                      className="meta-caps"
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 10,
                        fontSize: 8.5,
                        color: "var(--accent)",
                        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                        zIndex: 3,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              ))}
            </ScrollLane>
          </EditorialRail>
        )}

        {data.recentSeries.length > 0 && (
          <EditorialRail
            eyebrow={t("home.because_watched")}
            title={t("home.recent_series")}
            meta={tFmt("home.count_titles", { count: data.recentSeries.length })}
            seeAll={() => nav.openSeriesAll()}
          >
            <ScrollLane gap={14}>
              {data.recentSeries.map((s) => (
                <div key={s.id} style={{ width: 162, flex: "0 0 auto" }}>
                  <PosterCard
                    title={s.title}
                    posterUrl={s.posterUrl}
                    tone={toneFor(s.id)}
                    meta={metaForVod(s.year, s.rating)}
                    onClick={() => nav.openSeries(s.id)}
                  />
                </div>
              ))}
            </ScrollLane>
          </EditorialRail>
        )}
      </div>
    </div>
  );
}

// ─── Editorial rail wrapper (320px sidebar + scrolling content) ─────────────

function EditorialRail({
  eyebrow,
  title,
  meta,
  seeAll,
  children,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  seeAll: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 36 }}>
      <div
        className="hairline"
        style={{ height: 1, background: "var(--hairline)", marginBottom: 22 }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingTop: 4,
          }}
        >
          <span className="meta-caps" style={{ fontSize: 10, color: "var(--accent)" }}>
            {eyebrow}
          </span>
          <h3
            className="h-serif"
            style={{ fontSize: 28, margin: 0, lineHeight: 1.1 }}
          >
            {title}
          </h3>
          <span
            className="meta-caps"
            style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}
          >
            {meta}
          </span>
          {seeAll && (
            <button
              onClick={seeAll}
              className="meta-caps"
              style={{
                fontSize: 9.5,
                color: "var(--text-2)",
                marginTop: 14,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              {t("common.see_all")}
            </button>
          )}
        </div>
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </section>
  );
}

// 16:9 banner card used in the Continue Watching strip on this variant.
function ContinueBanner({
  item,
  onClick,
}: {
  item: ContinueWatching;
  onClick: () => void;
}) {
  const pct =
    item.durationMs > 0
      ? Math.max(0, Math.min(100, (item.positionMs / item.durationMs) * 100))
      : 0;
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
        width: 320,
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        outline: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
          background:
            "linear-gradient(160deg, #1F2A2C 0%, #0F1517 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 12px)",
          border: "1px solid var(--border)",
        }}
      >
        {item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
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
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </span>
        <span className="meta-caps" style={{ fontSize: 9.5 }}>
          {item.subtitle ?? remainingSubtitle(item)}
        </span>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateLine(): string {
  const d = new Date();
  const day = d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`.toUpperCase();
}

