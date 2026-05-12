import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../features/favorites/useFavorites";
import {
  useMovie,
  useSeriesOne,
} from "../features/vod/useVod";
import { useChannel } from "../features/channels/useChannels";
import { EditorialHeader } from "../components/ui/EditorialHeader";
import { PosterCard, toneFor } from "../components/ui/PosterCard";
import { ChannelLogo } from "../components/ui/ChannelLogo";
import { t, tFmt, type StringKey } from "../lib/i18n";
import type { FavoriteTargetType } from "../lib/tauri";

type Tab = FavoriteTargetType; // CHANNEL | MOVIE | SERIES

const TAB_LABEL_KEYS: Record<Tab, StringKey> = {
  CHANNEL: "favorites.tab_channel",
  MOVIE: "favorites.tab_movie",
  SERIES: "favorites.tab_series",
};

export default function Favorites() {
  const [tab, setTab] = useState<Tab>("CHANNEL");
  const { data: favsAll = [] } = useFavorites();

  const counts: Record<Tab, number> = {
    CHANNEL: favsAll.filter((f) => f.targetType === "CHANNEL").length,
    MOVIE: favsAll.filter((f) => f.targetType === "MOVIE").length,
    SERIES: favsAll.filter((f) => f.targetType === "SERIES").length,
  };
  const tabFavs = favsAll.filter((f) => f.targetType === tab);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "32px 48px 16px" }}>
        <EditorialHeader
          eyebrow={t("favorites.eyebrow")}
          title={t("favorites.title")}
          meta={tFmt("favorites.meta", { count: favsAll.length })}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {(Object.keys(TAB_LABEL_KEYS) as Tab[]).map((tabKey) => (
            <TabButton
              key={tabKey}
              active={tab === tabKey}
              count={counts[tabKey]}
              onClick={() => setTab(tabKey)}
            >
              {t(TAB_LABEL_KEYS[tabKey])}
            </TabButton>
          ))}
        </div>
      </div>
      <div className="hairline" style={{ height: 1, background: "var(--hairline)" }} />
      <div style={{ flex: 1, overflow: "auto", padding: "24px 48px 60px" }}>
        {tabFavs.length === 0 ? (
          <EmptyState tab={tab} />
        ) : tab === "CHANNEL" ? (
          <ChannelFavoritesList favorites={tabFavs} />
        ) : (
          <PosterFavoritesGrid
            favorites={tabFavs}
            kind={tab}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        background: active
          ? "color-mix(in oklab, var(--accent) 18%, transparent)"
          : "transparent",
        border: `1px solid ${
          active
            ? "color-mix(in oklab, var(--accent) 45%, transparent)"
            : "var(--hairline)"
        }`,
        color: active ? "var(--accent)" : "var(--text-2)",
        fontFamily: "var(--sans)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 140ms",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--bg-elev)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
      <span style={{ fontSize: 11, opacity: 0.65 }}>{count}</span>
    </button>
  );
}

function PosterFavoritesGrid({
  favorites,
  kind,
}: {
  favorites: { targetId: string }[];
  kind: "MOVIE" | "SERIES";
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
        gap: 22,
      }}
    >
      {favorites.map((f, i) =>
        kind === "MOVIE" ? (
          <FavMovieCard key={f.targetId} id={f.targetId} idx={i} />
        ) : (
          <FavSeriesCard key={f.targetId} id={f.targetId} idx={i} />
        ),
      )}
    </div>
  );
}

function FavMovieCard({ id, idx }: { id: string; idx: number }) {
  const navigate = useNavigate();
  const { data: movie } = useMovie(id);
  if (!movie) return <PosterSkeleton />;
  return (
    <PosterCard
      title={movie.title}
      meta={metaFor(movie.year, movie.rating)}
      posterUrl={movie.posterUrl}
      tone={toneFor(movie.id)}
      num={String(idx + 1).padStart(3, "0")}
      onClick={() => navigate(`/films/${encodeURIComponent(movie.id)}`)}
    />
  );
}

function FavSeriesCard({ id, idx }: { id: string; idx: number }) {
  const navigate = useNavigate();
  const { data: series } = useSeriesOne(id);
  if (!series) return <PosterSkeleton />;
  return (
    <PosterCard
      title={series.title}
      meta={metaFor(series.year, series.rating)}
      posterUrl={series.posterUrl}
      tone={toneFor(series.id)}
      num={String(idx + 1).padStart(3, "0")}
      onClick={() => navigate(`/series/${encodeURIComponent(series.id)}`)}
    />
  );
}

function ChannelFavoritesList({
  favorites,
}: {
  favorites: { targetId: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {favorites.map((f) => (
        <FavChannelRow key={f.targetId} id={f.targetId} />
      ))}
    </div>
  );
}

function FavChannelRow({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: channel } = useChannel(id);
  if (!channel) return null;
  return (
    <button
      onClick={() => navigate(`/player/${encodeURIComponent(channel.id)}`)}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        gap: 16,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--hairline)",
        background: "transparent",
        border: "none",
        borderTop: "1px solid var(--hairline)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sans)",
        color: "var(--text)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elev2)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
      }
    >
      <ChannelLogo name={channel.name} url={channel.logoUrl} size={48} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {channel.name}
        </span>
        {channel.groupTitle && (
          <span
            className="meta-caps"
            style={{ fontSize: 9.5, color: "var(--text-3)" }}
          >
            {channel.groupTitle}
          </span>
        )}
      </div>
      <span style={{ color: "var(--text-3)", fontSize: 14 }}>›</span>
    </button>
  );
}

function PosterSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          aspectRatio: "2 / 3",
          borderRadius: 10,
          background: "var(--bg-elev2)",
          animation: "gi-pulse 1.4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 12,
          width: "70%",
          borderRadius: 4,
          background: "var(--bg-elev2)",
          animation: "gi-pulse 1.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes gi-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const labelKey: StringKey =
    tab === "CHANNEL"
      ? "favorites.empty_channel"
      : tab === "MOVIE"
        ? "favorites.empty_movie"
        : "favorites.empty_series";
  return (
    <div
      style={{
        textAlign: "center",
        padding: "120px 24px",
        color: "var(--text-3)",
      }}
    >
      <div className="h-italic" style={{ fontSize: 36, color: "var(--text-2)" }}>
        {t("common.empty")}
      </div>
      <p style={{ marginTop: 14, fontSize: 13 }}>
        {t(labelKey)} {t("favorites.empty_hint")}
      </p>
    </div>
  );
}

function metaFor(year: number | null, rating: number | null): string {
  const parts: string[] = [];
  if (year != null) parts.push(String(year));
  if (rating != null) parts.push(rating.toFixed(1));
  return parts.join(" · ");
}
