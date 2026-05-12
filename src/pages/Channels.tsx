import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActivePlaylist } from "../features/playlist/usePlaylists";
import { useCategories, useChannels } from "../features/channels/useChannels";
import { useNowProgramsBulk } from "../features/epg/useEpg";
import { GlyphChip, abbrFor } from "../components/ui/GlyphChip";
import { ChannelLogo } from "../components/ui/ChannelLogo";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { FavoriteStar } from "../components/ui/FavoriteStar";
import { t, tFmt } from "../lib/i18n";
import type { Channel, Program } from "../lib/tauri";

const ALL_CATEGORY = "__ALL__";

export default function Channels() {
  const { data: active } = useActivePlaylist();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const playlistId = active?.id;
  const { data: categories = [] } = useCategories(playlistId);

  if (!active) {
    return (
      <div style={{ padding: 48, color: "var(--text-3)" }}>
        {t("common.no_active_playlist")}
      </div>
    );
  }

  if (selectedCategory != null) {
    return (
      <ChannelListView
        playlistId={active.id}
        category={selectedCategory === ALL_CATEGORY ? null : selectedCategory}
        categoryLabel={
          selectedCategory === ALL_CATEGORY
            ? t("channels.all")
            : selectedCategory
        }
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  const totalChannels = active.channelCount;

  return (
    <div style={{ padding: "32px 48px", maxWidth: 920 }}>
      <EditorialHeader
        eyebrow={active.name.toUpperCase()}
        title={t("channels.title_categories")}
        meta={tFmt("channels.collections_count", {
          count: categories.length,
          channels: formatThousands(totalChannels),
        })}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 12,
        }}
      >
        <CategoryRow
          name={t("channels.all")}
          count={totalChannels}
          accent
          onClick={() => setSelectedCategory(ALL_CATEGORY)}
        />
        {categories.map((cat) => (
          <CategoryRow
            key={cat.name}
            name={cat.name}
            count={cat.count}
            onClick={() => setSelectedCategory(cat.name)}
          />
        ))}
      </div>
    </div>
  );
}

function EditorialHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow?: string;
  title: string;
  meta?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0 18px" }}>
      {eyebrow && (
        <span className="meta-caps" style={{ fontSize: 10 }}>
          {eyebrow}
        </span>
      )}
      <h1 className="h-display" style={{ fontSize: 52, margin: 0 }}>
        {title}
      </h1>
      {meta && (
        <span
          className="meta-caps"
          style={{ fontSize: 10.5, color: "var(--text-3)" }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

function CategoryRow({
  name,
  count,
  accent = false,
  onClick,
}: {
  name: string;
  count: number;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "center",
        gap: 18,
        padding: "14px 0",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--hairline)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sans)",
        color: "var(--text)",
        transition: "background 160ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elev2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <GlyphChip abbr={accent ? "ALL" : abbrFor(name)} accent={accent} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.005em" }}>
          {name}
        </span>
        <span className="meta-caps" style={{ fontSize: 9.5 }}>
          {formatThousands(count)} kanal
        </span>
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
        {formatThousands(count)}
      </span>
      <span style={{ color: "var(--text-3)", fontSize: 14 }}>›</span>
    </button>
  );
}

function ChannelListView({
  playlistId,
  category,
  categoryLabel,
  onBack,
}: {
  playlistId: number;
  category: string | null;
  categoryLabel: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 250);
  const { data: channels = [], isLoading } = useChannels(playlistId, {
    query: debounced.trim().length >= 2 ? debounced : undefined,
    category,
  });
  // One bulk EPG query feeds the now-playing pill for every visible channel.
  // It's a single query per playlist; the frontend looks up by epg_channel_id.
  const { data: nowMap } = useNowProgramsBulk(playlistId);
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 32px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Button variant="ghost" onClick={onBack}>
          {t("channels.back_to_categories")}
        </Button>
        <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
            {categoryLabel}
          </h2>
          <span className="meta-caps" style={{ fontSize: 10 }}>
            {tFmt("home.count_channels", {
              count: formatThousands(channels.length),
            })}
          </span>
        </div>
        <div style={{ width: 280 }}>
          <Field
            placeholder={t("channels.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {isLoading && (
          <div style={{ padding: 48, color: "var(--text-3)" }}>
            {t("common.loading")}
          </div>
        )}
        {!isLoading && channels.length === 0 && (
          <div style={{ padding: 48, color: "var(--text-3)" }}>
            {debounced.length >= 2
              ? tFmt("channels.empty_search", { query: debounced })
              : t("channels.empty_category")}
          </div>
        )}
        {channels.map((c) => (
          <ChannelRow
            key={c.id}
            channel={c}
            now={c.epgChannelId ? nowMap?.get(c.epgChannelId) ?? null : null}
            onClick={() => navigate(`/player/${encodeURIComponent(c.id)}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ChannelRow({
  channel,
  now,
  onClick,
}: {
  channel: Channel;
  now: Program | null;
  onClick: () => void;
}) {
  // Subtitle line: prefer now-playing programme over the static category.
  // Falls back to category when EPG hasn't filled in for this channel.
  const subtitle = now ? now.title : channel.groupTitle ?? null;
  return (
    <button
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto auto",
        alignItems: "center",
        gap: 16,
        height: 74,
        padding: "0 32px",
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--hairline)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sans)",
        color: "var(--text)",
        transition: "background 120ms",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elev2)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
      }
    >
      <ChannelLogo name={channel.name} url={channel.logoUrl} size={48} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
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
        {subtitle && (
          <span
            style={{
              fontSize: 12,
              color: now ? "var(--text-2)" : "var(--text-3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {now && <NowDot />}
            {subtitle}
            {now && <NowTimeRange program={now} />}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pill variant="live">
          <Dot /> {t("channels.live_pill")}
        </Pill>
        {channel.isHd && <Pill>HD</Pill>}
      </div>
      <FavoriteStar targetId={channel.id} targetType="CHANNEL" />
    </button>
  );
}

function NowDot() {
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "var(--accent)",
        flex: "0 0 auto",
      }}
    />
  );
}

function NowTimeRange({ program }: { program: Program }) {
  return (
    <span
      className="mono"
      style={{
        fontFamily: "var(--mono)",
        fontSize: 10.5,
        color: "var(--text-3)",
        marginLeft: 4,
        flex: "0 0 auto",
      }}
    >
      {hhmm(program.startMillis)}–{hhmm(program.stopMillis)}
    </span>
  );
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function Pill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "live";
}) {
  const live = variant === "live";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 999,
        fontFamily: "var(--mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: live ? "var(--teal)" : "var(--text-2)",
        background: live
          ? "color-mix(in oklab, var(--teal) 8%, transparent)"
          : "var(--bg-elev2)",
        border: `1px solid ${
          live ? "color-mix(in oklab, var(--teal) 25%, transparent)" : "var(--border)"
        }`,
      }}
    >
      {children}
    </span>
  );
}

function Dot() {
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

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function formatThousands(n: number): string {
  return n.toLocaleString("tr-TR");
}
