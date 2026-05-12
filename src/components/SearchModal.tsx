import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "../stores/uiStore";
import { useActivePlaylist } from "../features/playlist/usePlaylists";
import { searchApi, type SearchHit, type SearchResults } from "../lib/tauri";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

/**
 * Global Ctrl+F search palette. Modal sits at the app root, listens to
 * `useUIStore.searchOpen`, and fires one cross-content backend query per
 * debounced keystroke.
 *
 * Behaviour intentionally mirrors Android's `SearchScreen` (engineering
 * brief 11.8): local TextField state, debounced 220ms push to the backend,
 * MIN_QUERY 2 — but no cursor-jumping bug because the input is uncontrolled
 * w.r.t. the query result.
 *
 * Keyboard:
 *  - ↑/↓ moves focus through the flat list of results
 *  - Enter activates the focused item (or the first one)
 *  - Esc closes the modal
 */
export function SearchModal() {
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);
  const { data: active } = useActivePlaylist();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Reset state every time the modal opens — stale results are confusing.
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      // Focus on next tick so the modal is rendered first.
      setTimeout(() => inputRef.current?.focus(), 16);
    }
  }, [open]);

  // Debounce the query before firing a backend search.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const trimmed = debounced.trim();
  const enabled = !!active && trimmed.length >= MIN_QUERY;

  const { data: results, isFetching } = useQuery<SearchResults>({
    queryKey: ["search", active?.id ?? -1, trimmed],
    queryFn: () => searchApi.all(active!.id, trimmed),
    enabled,
    staleTime: 30_000,
  });

  const flatItems = useResultsFlat(results);
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => setActiveIdx(0), [debounced]);

  // Keyboard navigation while the modal is open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatItems.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = flatItems[activeIdx];
        if (target) {
          activate(target);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatItems, activeIdx, setOpen]);

  const activate = (item: FlatItem) => {
    setOpen(false);
    if (item.kind === "CHANNEL") {
      navigate(`/player/${encodeURIComponent(item.hit.id)}`);
    } else if (item.kind === "MOVIE") {
      navigate(`/films/${encodeURIComponent(item.hit.id)}`);
    } else {
      navigate(`/series/${encodeURIComponent(item.hit.id)}`);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Click outside the panel = close.
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 11, 12, 0.72)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "min(720px, calc(100vw - 64px))",
          maxHeight: "70vh",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <SearchHeader
          inputRef={inputRef}
          query={query}
          setQuery={setQuery}
          isFetching={isFetching}
          onClose={() => setOpen(false)}
        />
        <div style={{ flex: 1, overflow: "auto" }}>
          {trimmed.length < MIN_QUERY ? (
            <Empty hint="Aramak için en az 2 karakter yaz." />
          ) : !results ? (
            <Empty hint="Aranıyor…" />
          ) : flatItems.length === 0 ? (
            <Empty hint={`"${trimmed}" için sonuç yok.`} />
          ) : (
            <ResultsList
              items={flatItems}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              onActivate={activate}
              results={results}
              query={trimmed}
              onJumpAll={(kind) => {
                setOpen(false);
                const target =
                  kind === "CHANNEL"
                    ? "/channels"
                    : kind === "MOVIE"
                      ? "/films"
                      : "/series";
                navigate(target);
              }}
            />
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function SearchHeader({
  inputRef,
  query,
  setQuery,
  isFetching,
  onClose,
}: {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (v: string) => void;
  isFetching: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 18px",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <span style={{ color: "var(--text-3)", fontSize: 16 }}>🔍</span>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kanal, film veya dizi ara…"
        style={{
          flex: 1,
          height: 32,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text)",
          fontFamily: "var(--sans)",
          fontSize: 16,
        }}
      />
      {isFetching && (
        <span className="meta-caps" style={{ fontSize: 9.5, color: "var(--text-3)" }}>
          aranıyor…
        </span>
      )}
      <button
        onClick={onClose}
        style={{
          height: 26,
          padding: "0 10px",
          borderRadius: 6,
          background: "var(--bg-elev2)",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          cursor: "pointer",
        }}
        title="Kapat (Esc)"
      >
        ESC
      </button>
    </div>
  );
}

// ─── Results ────────────────────────────────────────────────────────────────

type FlatItem = {
  kind: "CHANNEL" | "MOVIE" | "SERIES";
  hit: SearchHit;
};

function useResultsFlat(results: SearchResults | undefined): FlatItem[] {
  if (!results) return [];
  const out: FlatItem[] = [];
  for (const h of results.channels) out.push({ kind: "CHANNEL", hit: h });
  for (const h of results.movies) out.push({ kind: "MOVIE", hit: h });
  for (const h of results.series) out.push({ kind: "SERIES", hit: h });
  return out;
}

function ResultsList({
  activeIdx,
  setActiveIdx,
  onActivate,
  results,
  onJumpAll,
}: {
  items: FlatItem[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onActivate: (item: FlatItem) => void;
  results: SearchResults;
  query: string;
  onJumpAll: (kind: "CHANNEL" | "MOVIE" | "SERIES") => void;
}) {
  const groups: Array<{
    kind: "CHANNEL" | "MOVIE" | "SERIES";
    label: string;
    items: SearchHit[];
    truncated: boolean;
  }> = [
    {
      kind: "CHANNEL",
      label: "Kanallar",
      items: results.channels,
      truncated: results.channelsTruncated,
    },
    {
      kind: "MOVIE",
      label: "Filmler",
      items: results.movies,
      truncated: results.moviesTruncated,
    },
    {
      kind: "SERIES",
      label: "Diziler",
      items: results.series,
      truncated: results.seriesTruncated,
    },
  ];

  // Compute the running index for keyboard active match.
  let runningIdx = -1;

  return (
    <div style={{ padding: "8px 0" }}>
      {groups.map((g) => {
        if (g.items.length === 0) return null;
        return (
          <section key={g.kind} style={{ padding: "10px 8px 6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 14px 8px",
                gap: 12,
              }}
            >
              <span
                className="meta-caps"
                style={{ fontSize: 9.5, color: "var(--text-3)" }}
              >
                {g.label}
              </span>
              <div style={{ flex: 1 }} />
              {g.truncated && (
                <button
                  onClick={() => onJumpAll(g.kind)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--accent)",
                    fontFamily: "var(--sans)",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  Tümünü gör →
                </button>
              )}
            </div>
            <div>
              {g.items.map((hit) => {
                runningIdx += 1;
                const isActive = runningIdx === activeIdx;
                const flat: FlatItem = { kind: g.kind, hit };
                const idxSnapshot = runningIdx;
                return (
                  <ResultRow
                    key={`${g.kind}-${hit.id}`}
                    kind={g.kind}
                    hit={hit}
                    active={isActive}
                    onMouseEnter={() => setActiveIdx(idxSnapshot)}
                    onClick={() => onActivate(flat)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ResultRow({
  kind,
  hit,
  active,
  onClick,
  onMouseEnter,
}: {
  kind: "CHANNEL" | "MOVIE" | "SERIES";
  hit: SearchHit;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // Keep the active row visible when arrow keys move us off screen.
  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [active]);
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "44px 1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: active
          ? "color-mix(in oklab, var(--accent) 12%, transparent)"
          : "transparent",
        border: "none",
        borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
        color: "var(--text)",
        fontFamily: "var(--sans)",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <ResultThumb kind={kind} hit={hit} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hit.title}
        </span>
        {hit.subtitle && (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hit.subtitle}
          </span>
        )}
      </div>
      <KindBadge kind={kind} />
    </button>
  );
}

function ResultThumb({
  kind,
  hit,
}: {
  kind: "CHANNEL" | "MOVIE" | "SERIES";
  hit: SearchHit;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = hit.posterUrl && !errored;
  return (
    <div
      style={{
        width: 44,
        height: kind === "CHANNEL" ? 44 : 44 * 1.5,
        flex: "0 0 auto",
        borderRadius: kind === "CHANNEL" ? 8 : 6,
        background: "var(--bg-elev2)",
        border: "1px solid var(--border)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImg ? (
        <img
          src={hit.posterUrl!}
          alt=""
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: kind === "CHANNEL" ? "contain" : "cover",
            padding: kind === "CHANNEL" ? 4 : 0,
          }}
        />
      ) : (
        <span
          className="h-italic"
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: 18,
            color: "var(--text-3)",
          }}
        >
          {(hit.title.match(/\b\w/g) ?? [])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: "CHANNEL" | "MOVIE" | "SERIES" }) {
  const labels: Record<typeof kind, string> = {
    CHANNEL: "KANAL",
    MOVIE: "FİLM",
    SERIES: "DİZİ",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        fontFamily: "var(--mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.12em",
        color: "var(--text-3)",
        background: "var(--bg-elev2)",
        border: "1px solid var(--border)",
      }}
    >
      {labels[kind]}
    </span>
  );
}

// ─── Footer + empty state ───────────────────────────────────────────────────

function Empty({ hint }: { hint: string }) {
  return (
    <div
      style={{
        padding: "60px 24px",
        textAlign: "center",
        color: "var(--text-3)",
      }}
    >
      <div className="h-italic" style={{ fontSize: 30, color: "var(--text-2)" }}>
        boş raf
      </div>
      <p style={{ fontSize: 12.5, marginTop: 12 }}>{hint}</p>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 16px",
        borderTop: "1px solid var(--hairline)",
        fontFamily: "var(--mono)",
        fontSize: 10,
        color: "var(--text-3)",
        letterSpacing: "0.08em",
      }}
    >
      <Hint k="↵" label="Aç" />
      <Hint k="↑↓" label="Gez" />
      <Hint k="Esc" label="Kapat" />
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <kbd
        style={{
          padding: "1px 6px",
          borderRadius: 4,
          background: "var(--bg-elev2)",
          border: "1px solid var(--border)",
          fontSize: 9.5,
          fontFamily: "var(--mono)",
          color: "var(--text-2)",
        }}
      >
        {k}
      </kbd>
      <span style={{ fontFamily: "var(--sans)", fontSize: 11 }}>{label}</span>
    </span>
  );
}
