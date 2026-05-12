import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActivePlaylist } from "../features/playlist/usePlaylists";
import { useSeriesList, useVodCategories } from "../features/vod/useVod";
import { EditorialHeader } from "../components/ui/EditorialHeader";
import { CategoryCard } from "../components/ui/CategoryCard";
import { PosterCard, toneFor } from "../components/ui/PosterCard";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { FavoriteStar } from "../components/ui/FavoriteStar";
import { t, tFmt, type StringKey } from "../lib/i18n";
import type { SeriesItem } from "../lib/tauri";

type SortMode = "title" | "year_desc" | "year_asc" | "rating_desc";

const SORT_LABEL_KEYS: Record<SortMode, StringKey> = {
  title: "vod.sort_az",
  year_desc: "vod.sort_year_desc",
  year_asc: "vod.sort_year_asc",
  rating_desc: "vod.sort_rating_desc",
};

const ALL_CATEGORY = "__ALL__";

/**
 * Series page — same drill-in shape as Films.tsx. See that file for the
 * rationale (default-render only categories so we never paint the full
 * 5k+ poster grid up front; user picks a category to drill in).
 */
export default function Series() {
  const { data: active } = useActivePlaylist();
  const playlistId = active?.id;
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const { data: categories = [] } = useVodCategories(playlistId, "SERIES");

  if (!active) {
    return (
      <div style={{ padding: 48, color: "var(--text-3)" }}>
        {t("common.no_active_playlist")}
      </div>
    );
  }

  if (selectedCategory != null) {
    return (
      <SeriesGridView
        playlistId={active.id}
        categoryId={
          selectedCategory.id === ALL_CATEGORY ? null : selectedCategory.id
        }
        categoryLabel={selectedCategory.label}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  return (
    <CategoryPicker
      categories={categories}
      onPick={(id, label) => setSelectedCategory({ id, label })}
    />
  );
}

// ─── Category picker (default view) ─────────────────────────────────────────

function CategoryPicker({
  categories,
  onPick,
}: {
  categories: { id: string; name: string; count: number }[];
  onPick: (id: string, label: string) => void;
}) {
  const totalAll = categories.reduce((acc, c) => acc + c.count, 0);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
      }}
    >
      <div style={{ padding: "32px 48px 18px" }}>
        <EditorialHeader
          eyebrow={t("vod.eyebrow_collection")}
          title={t("vod.series_title")}
          meta={tFmt("vod.category_picker_meta_series", {
            count: categories.length,
            series: formatThousands(totalAll),
          })}
        />
      </div>
      <div className="hairline" style={{ height: 1, background: "var(--hairline)" }} />
      <div
        style={{
          padding: "24px 48px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <CategoryCard
          title={t("vod.all")}
          count={totalAll}
          accent
          onClick={() => onPick(ALL_CATEGORY, t("vod.all"))}
        />
        {categories.map((c) => (
          <CategoryCard
            key={c.id}
            title={c.name}
            count={c.count}
            onClick={() => onPick(c.id, c.name)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Series grid (drill-in view) ────────────────────────────────────────────

function SeriesGridView({
  playlistId,
  categoryId,
  categoryLabel,
  onBack,
}: {
  playlistId: number;
  categoryId: string | null;
  categoryLabel: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 220);
  const [sort, setSort] = useState<SortMode>("title");
  const [sortOpen, setSortOpen] = useState(false);

  const { data: list = [], isLoading } = useSeriesList(playlistId, {
    query: debounced.trim().length >= 2 ? debounced : undefined,
    categoryId,
  });
  const sorted = useMemo(() => sortSeries(list, sort), [list, sort]);

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
          padding: "20px 48px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Button variant="ghost" onClick={onBack}>
          {t("vod.back_to_categories")}
        </Button>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            minWidth: 0,
          }}
        >
          <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>
            {categoryLabel}
          </h2>
          <span className="meta-caps" style={{ fontSize: 10 }}>
            {isLoading
              ? t("common.loading")
              : tFmt("home.count_titles", { count: sorted.length })}
          </span>
        </div>
        <div style={{ width: 260 }}>
          <Field
            placeholder={t("vod.series_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SortDropdown
          value={sort}
          onChange={setSort}
          open={sortOpen}
          setOpen={setSortOpen}
        />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px 48px 60px" }}>
        {isLoading && <SkeletonGrid />}
        {!isLoading && sorted.length === 0 && <EmptyState query={debounced} />}
        {!isLoading && sorted.length > 0 && <SeriesGrid items={sorted} />}
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
  open,
  setOpen,
}: {
  value: SortMode;
  onChange: (m: SortMode) => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      if (!tgt.closest("[data-sort-menu]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  return (
    <div data-sort-menu style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          height: 36,
          padding: "0 14px",
          borderRadius: 8,
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontFamily: "var(--sans)",
          fontSize: 12.5,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {t("vod.sort_label")} · {t(SORT_LABEL_KEYS[value])}
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-pop, 0 24px 60px rgba(0,0,0,0.6))",
            padding: 4,
            zIndex: 20,
          }}
        >
          {(Object.keys(SORT_LABEL_KEYS) as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              style={{
                width: "100%",
                height: 32,
                padding: "0 10px",
                background: value === m ? "var(--bg-elev2)" : "transparent",
                border: "none",
                color: value === m ? "var(--accent)" : "var(--text)",
                fontFamily: "var(--sans)",
                fontSize: 12.5,
                textAlign: "left",
                cursor: "pointer",
                borderRadius: 6,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elev2)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  value === m ? "var(--bg-elev2)" : "transparent")
              }
            >
              {t(SORT_LABEL_KEYS[m])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SeriesGrid({ items }: { items: SeriesItem[] }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
        gap: 22,
      }}
    >
      {items.map((s, i) => (
        <PosterCard
          key={s.id}
          title={s.title}
          posterUrl={s.posterUrl}
          tone={toneFor(s.id)}
          num={String(i + 1).padStart(3, "0")}
          meta={metaFor(s)}
          onClick={() => navigate(`/series/${encodeURIComponent(s.id)}`)}
          cornerSlot={
            <FavoriteStar
              targetId={s.id}
              targetType="SERIES"
              variant="overlay"
            />
          }
        />
      ))}
    </div>
  );
}

function metaFor(s: SeriesItem): string {
  const parts: string[] = [];
  if (s.year != null) parts.push(String(s.year));
  if (s.rating != null) parts.push(s.rating.toFixed(1));
  return parts.join(" · ");
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
        gap: 22,
      }}
    >
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        </div>
      ))}
      <style>{`
        @keyframes gi-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
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
        {query.length >= 2
          ? tFmt("vod.empty_series_search", { query })
          : t("vod.empty_series")}
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sortSeries(items: SeriesItem[], mode: SortMode): SeriesItem[] {
  const arr = [...items];
  switch (mode) {
    case "title":
      arr.sort((a, b) => a.title.localeCompare(b.title, "tr"));
      break;
    case "year_desc":
      arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      break;
    case "year_asc":
      arr.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
      break;
    case "rating_desc":
      arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
  }
  return arr;
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
