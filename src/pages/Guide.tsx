import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActivePlaylist } from "../features/playlist/usePlaylists";
import { useEpgGrid } from "../features/epg/useEpg";
import { ChannelLogo } from "../components/ui/ChannelLogo";
import { EditorialHeader } from "../components/ui/EditorialHeader";
import { t, tFmt } from "../lib/i18n";
import type { EpgGridRow, Program } from "../lib/tauri";

/**
 * Program Rehberi — TV-style EPG grid.
 *
 * Layout:
 *   - Sticky day picker + a horizontal time ruler at top.
 *   - Sticky channel column on the left (logo + name).
 *   - Each channel row paints its programmes positioned by start/stop.
 *   - A vertical "şu an" line tracks current time, only when "today" is in
 *     the visible window.
 *
 * Pixels-per-minute (PPM) is configurable; 4 is a comfortable default
 * (a 2-hour show ≈ 480 px wide). Total grid spans 24 h from midnight.
 */
const PX_PER_MIN = 4;
const SLOT_MIN = 30; // ruler tick interval
const ROW_HEIGHT = 64;
const CHANNEL_COL_W = 220;
const TIMELINE_H = 44;
const DAY_WINDOW_HOURS = 24;
const DAY_OPTIONS = 4; // today + 3 days back / forward selectable

export default function Guide() {
  const { data: active } = useActivePlaylist();
  const playlistId = active?.id;

  // Day offset: 0 = today, +1 = tomorrow, -1 = yesterday
  const [dayOffset, setDayOffset] = useState(0);

  const { startMillis, endMillis, dayLabel } = useMemo(
    () => computeWindow(dayOffset),
    [dayOffset],
  );

  const { data: grid = [], isLoading, isFetching } = useEpgGrid(
    playlistId,
    startMillis,
    endMillis,
  );

  // Auto-scroll the timeline to "now" on first load (only on today). Done
  // once per (playlistId, dayOffset) pair so manual scroll isn't undone.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollerRef.current) return;
    if (dayOffset !== 0) return;
    if (grid.length === 0) return;
    const key = `${playlistId}-${dayOffset}`;
    if (autoScrolledRef.current === key) return;
    autoScrolledRef.current = key;
    const now = Date.now();
    const minsFromStart = Math.max(0, (now - startMillis) / 60_000);
    // Centre "now" with ~90 minutes of context to its left.
    const target = Math.max(0, minsFromStart * PX_PER_MIN - 90 * PX_PER_MIN);
    scrollerRef.current.scrollLeft = target;
  }, [grid.length, dayOffset, playlistId, startMillis]);

  if (!active) {
    return (
      <div style={{ padding: 48, color: "var(--text-3)" }}>
        {t("common.no_active_playlist")}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "32px 48px 14px" }}>
        <EditorialHeader
          eyebrow={t("guide.eyebrow")}
          title={t("guide.title")}
          meta={
            isLoading
              ? t("common.loading")
              : tFmt("guide.meta", {
                  channels: grid.length,
                  hours: DAY_WINDOW_HOURS,
                })
          }
          right={
            <DayPicker
              value={dayOffset}
              onChange={setDayOffset}
              isFetching={isFetching && !isLoading}
            />
          }
        />
      </div>
      <div className="hairline" style={{ height: 1, background: "var(--hairline)" }} />

      {isLoading ? (
        <GuideSkeleton />
      ) : grid.length === 0 ? (
        <EmptyState />
      ) : (
        <GridScroller
          ref={scrollerRef}
          rows={grid}
          startMillis={startMillis}
          dayLabel={dayLabel}
          dayOffset={dayOffset}
        />
      )}
    </div>
  );
}

// ─── Day picker (sticky in the header above) ────────────────────────────────

function DayPicker({
  value,
  onChange,
  isFetching,
}: {
  value: number;
  onChange: (v: number) => void;
  isFetching: boolean;
}) {
  const offsets = Array.from(
    { length: DAY_OPTIONS * 2 + 1 },
    (_, i) => i - DAY_OPTIONS,
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {isFetching && (
        <span
          className="meta-caps"
          style={{ fontSize: 9.5, color: "var(--text-3)", marginRight: 6 }}
        >
          {t("common.fetching")}
        </span>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        {offsets.map((off) => {
          const active = off === value;
          return (
            <button
              key={off}
              onClick={() => onChange(off)}
              style={{
                height: 30,
                padding: "0 10px",
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
                fontFamily: "var(--mono)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title={dayLabelFor(off)}
            >
              {dayShort(off)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grid scroller (the actual EPG canvas) ───────────────────────────────────

interface GridScrollerProps {
  rows: EpgGridRow[];
  startMillis: number;
  dayLabel: string;
  dayOffset: number;
}

const GridScroller = forwardRef<HTMLDivElement, GridScrollerProps>(
  function GridScroller(
    { rows, startMillis, dayLabel, dayOffset }: GridScrollerProps,
    ref,
  ) {
    const totalMin = DAY_WINDOW_HOURS * 60;
    const totalW = totalMin * PX_PER_MIN;
    const ticks = Array.from({ length: totalMin / SLOT_MIN }, (_, i) => i * SLOT_MIN);

    // "Şu an" line position; only show when dayOffset === 0
    const [nowMin, setNowMin] = useState<number | null>(() =>
      dayOffset === 0
        ? Math.max(0, Math.min(totalMin, (Date.now() - startMillis) / 60_000))
        : null,
    );
    useEffect(() => {
      if (dayOffset !== 0) {
        setNowMin(null);
        return;
      }
      const tick = () => {
        const m = (Date.now() - startMillis) / 60_000;
        if (m < 0 || m > totalMin) setNowMin(null);
        else setNowMin(m);
      };
      tick();
      const handle = window.setInterval(tick, 30_000);
      return () => window.clearInterval(handle);
    }, [dayOffset, startMillis, totalMin]);

    return (
      <div
        ref={ref}
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${CHANNEL_COL_W}px ${totalW}px`,
            minWidth: CHANNEL_COL_W + totalW,
          }}
        >
          {/* Top-left corner: day label, sticky on both axes */}
          <div
            style={{
              position: "sticky",
              top: 0,
              left: 0,
              zIndex: 30,
              height: TIMELINE_H,
              background: "var(--bg-paper)",
              borderRight: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
            }}
          >
            <span
              className="meta-caps"
              style={{ fontSize: 10, color: "var(--text-2)" }}
            >
              {dayLabel}
            </span>
          </div>

          {/* Top timeline (sticky to top, scrolls horizontally). Sticky
              elements double as a positioning context for the absolute
              children below. */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              height: TIMELINE_H,
              background: "var(--bg-paper)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
            }}
          >
            {ticks.map((t) => {
              const left = t * PX_PER_MIN;
              const major = t % 60 === 0;
              return (
                <div
                  key={t}
                  style={{
                    position: "absolute",
                    left,
                    top: 0,
                    bottom: 0,
                    width: SLOT_MIN * PX_PER_MIN,
                    borderLeft: `1px solid ${major ? "var(--border)" : "var(--hairline)"}`,
                    paddingLeft: 8,
                    paddingTop: major ? 14 : 18,
                    color: major ? "var(--text-2)" : "var(--text-4)",
                    fontFamily: "var(--mono)",
                    fontSize: major ? 11 : 9.5,
                    letterSpacing: "0.06em",
                  }}
                >
                  {formatTick(t)}
                </div>
              );
            })}
            {nowMin != null && (
              <div
                style={{
                  position: "absolute",
                  left: nowMin * PX_PER_MIN,
                  top: 0,
                  bottom: 0,
                  width: 0,
                  borderLeft: "2px solid var(--accent)",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Body rows: channel column + program lane */}
          {rows.map((row) => (
            <ChannelRow
              key={row.channel.id}
              row={row}
              startMillis={startMillis}
              totalMin={totalMin}
              nowMin={nowMin}
            />
          ))}
        </div>
      </div>
    );
  },
);

function ChannelRow({
  row,
  startMillis,
  totalMin,
  nowMin,
}: {
  row: EpgGridRow;
  startMillis: number;
  totalMin: number;
  nowMin: number | null;
}) {
  const navigate = useNavigate();
  const totalW = totalMin * PX_PER_MIN;

  return (
    <>
      {/* Sticky channel column */}
      <button
        onClick={() => navigate(`/player/${encodeURIComponent(row.channel.id)}`)}
        style={{
          position: "sticky",
          left: 0,
          zIndex: 10,
          height: ROW_HEIGHT,
          padding: "0 16px",
          background: "var(--bg-paper)",
          borderRight: "1px solid var(--line)",
          borderBottom: "1px solid var(--hairline)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "var(--sans)",
          color: "var(--text)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elev2)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-paper)")
        }
      >
        <ChannelLogo name={row.channel.name} url={row.channel.logoUrl} size={36} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.channel.name}
          </span>
          {row.channel.groupTitle && (
            <span
              className="meta-caps"
              style={{ fontSize: 8.5, color: "var(--text-3)" }}
            >
              {row.channel.groupTitle}
            </span>
          )}
        </div>
      </button>

      {/* Programme lane */}
      <div
        style={{
          height: ROW_HEIGHT,
          position: "relative",
          borderBottom: "1px solid var(--hairline)",
          width: totalW,
        }}
      >
        {/* Half-hour ticks behind everything */}
        {Array.from({ length: totalMin / SLOT_MIN }).map((_, i) => {
          const left = i * SLOT_MIN * PX_PER_MIN;
          const major = (i * SLOT_MIN) % 60 === 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left,
                width: 0,
                borderLeft: `1px solid ${major ? "var(--border)" : "var(--hairline)"}`,
                pointerEvents: "none",
              }}
            />
          );
        })}
        {row.programs.map((p) => (
          <ProgramBlock
            key={p.id}
            program={p}
            startMillis={startMillis}
            totalMin={totalMin}
            nowMs={nowMin != null ? startMillis + nowMin * 60_000 : null}
          />
        ))}
        {nowMin != null && (
          <div
            style={{
              position: "absolute",
              left: nowMin * PX_PER_MIN,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: "2px solid var(--accent)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </>
  );
}

function ProgramBlock({
  program,
  startMillis,
  totalMin,
  nowMs,
}: {
  program: Program;
  startMillis: number;
  totalMin: number;
  nowMs: number | null;
}) {
  // Clip to the visible day window
  const winEnd = startMillis + totalMin * 60_000;
  const start = Math.max(program.startMillis, startMillis);
  const stop = Math.min(program.stopMillis, winEnd);
  if (stop <= start) return null;

  const left = ((start - startMillis) / 60_000) * PX_PER_MIN;
  const width = ((stop - start) / 60_000) * PX_PER_MIN;
  const isNow =
    nowMs != null && program.startMillis <= nowMs && program.stopMillis > nowMs;

  // Tiny block? Keep just title visible without ellipsis fighting padding.
  const tight = width < 110;

  return (
    <div
      title={`${program.title}\n${formatHHMM(program.startMillis)} – ${formatHHMM(program.stopMillis)}`}
      style={{
        position: "absolute",
        top: 4,
        bottom: 4,
        left,
        width: Math.max(2, width - 2),
        padding: tight ? "5px 8px" : "8px 12px",
        background: isNow
          ? "color-mix(in oklab, var(--accent) 14%, var(--bg-elev))"
          : "var(--bg-elev)",
        border: `1px solid ${
          isNow
            ? "color-mix(in oklab, var(--accent) 50%, transparent)"
            : "var(--border)"
        }`,
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        cursor: "default",
        boxShadow: isNow ? "0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent)" : undefined,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.2,
          color: isNow ? "var(--text)" : "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {program.title}
      </span>
      {!tight && (
        <span
          className="mono"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            color: isNow ? "var(--accent)" : "var(--text-3)",
            letterSpacing: "0.06em",
          }}
        >
          {formatHHMM(program.startMillis)} – {formatHHMM(program.stopMillis)}
        </span>
      )}
    </div>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

function GuideSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        padding: "32px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: `${CHANNEL_COL_W}px 1fr`,
            gap: 12,
          }}
        >
          <div
            style={{
              height: ROW_HEIGHT - 8,
              borderRadius: 6,
              background: "var(--bg-elev2)",
              animation: "gi-pulse 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: ROW_HEIGHT - 8,
              borderRadius: 6,
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

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "var(--text-3)",
      }}
    >
      <div className="h-italic" style={{ fontSize: 36, color: "var(--text-2)" }}>
        {t("guide.empty_title")}
      </div>
      <p style={{ fontSize: 13, maxWidth: 460, textAlign: "center", margin: 0 }}>
        {t("guide.empty_body")}
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute the [00:00, 24:00) window in epoch ms for a given day offset. */
function computeWindow(dayOffset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  const startMillis = d.getTime();
  const endMillis = startMillis + DAY_WINDOW_HOURS * 60 * 60 * 1000;
  return {
    startMillis,
    endMillis,
    dayLabel: dayLabelFor(dayOffset),
  };
}

function dayLabelFor(off: number): string {
  if (off === 0) return t("guide.day_today");
  if (off === 1) return t("guide.day_tomorrow");
  if (off === -1) return t("guide.day_yesterday");
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d
    .toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" })
    .toUpperCase();
}

function dayShort(off: number): string {
  if (off === 0) return t("guide.day_today");
  if (off === 1) return t("guide.day_tomorrow");
  if (off === -1) return t("guide.day_yesterday");
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toLocaleDateString("tr-TR", { weekday: "short" }).toUpperCase();
}

function formatTick(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatHHMM(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
