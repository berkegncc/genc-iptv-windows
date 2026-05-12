import { useSettingsStore } from "../../stores/settingsStore";
import {
  type SubtitleEdgeType,
  type SubtitleFontFamily,
  type SubtitleFontStyle,
  type SubtitleVerticalPosition,
  type SubtitlePrefs,
} from "../../lib/settings";
import { t, tFmt } from "../../lib/i18n";

const FAMILY_FONT: Record<SubtitleFontFamily, string> = {
  SANS: "var(--sans)",
  SERIF: "var(--serif)",
  MONO: "var(--mono)",
};

// Looked up at render-time via `verticalLabel(pos)` so a future locale switch
// re-renders cleanly without re-loading the module.
function verticalLabel(pos: SubtitleVerticalPosition): string {
  switch (pos) {
    case "TOP":
      return t("settings.subs.position_top");
    case "MIDDLE":
      return t("settings.subs.position_middle");
    case "BOTTOM":
      return t("settings.subs.position_bottom");
  }
}

export default function SubtitlesSettings() {
  const subs = useSettingsStore((s) => s.settings.subtitles);
  const update = useSettingsStore((s) => s.updateSubtitles);
  const reset = useSettingsStore((s) => s.resetSubtitles);

  return (
    <div style={{ maxWidth: 880 }}>
      <span className="meta-caps">{t("settings.subs.eyebrow")}</span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 24px" }}>
        {t("settings.subs.title")}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 36,
          alignItems: "start",
        }}
      >
        <div>
          <Section title={t("settings.subs.section_font")}>
            <Row label={t("settings.subs.row_family")}>
              <Segmented
                options={[
                  { key: "SANS", label: t("settings.subs.family_sans") },
                  { key: "SERIF", label: t("settings.subs.family_serif") },
                  { key: "MONO", label: t("settings.subs.family_mono") },
                ]}
                value={subs.fontFamily}
                onChange={(v) => update({ fontFamily: v as SubtitleFontFamily })}
              />
            </Row>
            <Row label={t("settings.subs.row_style")}>
              <Segmented
                options={[
                  { key: "REGULAR", label: t("settings.subs.style_regular") },
                  { key: "BOLD", label: t("settings.subs.style_bold") },
                  { key: "ITALIC", label: t("settings.subs.style_italic") },
                ]}
                value={subs.fontStyle}
                onChange={(v) => update({ fontStyle: v as SubtitleFontStyle })}
              />
            </Row>
            <Row
              label={tFmt("settings.subs.row_size", { pct: subs.textSizePercent })}
            >
              <Slider
                min={50}
                max={200}
                step={5}
                value={subs.textSizePercent}
                onChange={(v) => update({ textSizePercent: v })}
              />
            </Row>
          </Section>

          <Section title={t("settings.subs.section_color")}>
            <ColorOpacityRow
              label={t("settings.subs.row_text")}
              color={subs.textColor}
              opacity={subs.textOpacityPercent}
              onColor={(c) => update({ textColor: c })}
              onOpacity={(o) => update({ textOpacityPercent: o })}
            />
            <ColorOpacityRow
              label={t("settings.subs.row_bg")}
              color={subs.backgroundColor}
              opacity={subs.backgroundOpacityPercent}
              onColor={(c) => update({ backgroundColor: c })}
              onOpacity={(o) => update({ backgroundOpacityPercent: o })}
            />
            <ColorOpacityRow
              label={t("settings.subs.row_window")}
              color={subs.windowColor}
              opacity={subs.windowOpacityPercent}
              onColor={(c) => update({ windowColor: c })}
              onOpacity={(o) => update({ windowOpacityPercent: o })}
            />
          </Section>

          <Section title={t("settings.subs.section_edge")}>
            <Row label={t("settings.subs.row_edge_type")}>
              <Segmented
                options={[
                  { key: "NONE", label: t("settings.subs.edge_none") },
                  { key: "OUTLINE", label: t("settings.subs.edge_outline") },
                  {
                    key: "DROP_SHADOW",
                    label: t("settings.subs.edge_drop_shadow"),
                  },
                  { key: "RAISED", label: t("settings.subs.edge_raised") },
                ]}
                value={subs.edgeType}
                onChange={(v) => update({ edgeType: v as SubtitleEdgeType })}
              />
            </Row>
            <Row label={t("settings.subs.row_edge_color")}>
              <ColorPicker
                value={subs.edgeColor}
                onChange={(c) => update({ edgeColor: c })}
              />
            </Row>
            <Row label={t("settings.subs.row_position")}>
              <Segmented
                options={(
                  ["TOP", "MIDDLE", "BOTTOM"] as SubtitleVerticalPosition[]
                ).map((k) => ({ key: k, label: verticalLabel(k) }))}
                value={subs.verticalPosition}
                onChange={(v) =>
                  update({ verticalPosition: v as SubtitleVerticalPosition })
                }
              />
            </Row>
          </Section>

          <button
            onClick={() => {
              if (confirm(t("common.confirm_reset"))) {
                reset();
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontFamily: "var(--sans)",
              fontSize: 12.5,
              marginTop: 8,
            }}
          >
            {t("common.reset_default")}
          </button>
        </div>

        <PreviewPanel subs={subs} />
      </div>
    </div>
  );
}

// ─── Section / Row ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        className="h-serif"
        style={{ fontSize: 18, margin: "0 0 14px", fontWeight: 400 }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 20,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <span className="meta-caps" style={{ fontSize: 9.5 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────────────

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--text-2)",
              border: "none",
              fontFamily: "var(--sans)",
              fontSize: 11.5,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: 240,
        accentColor: "var(--accent)",
        cursor: "pointer",
      }}
    />
  );
}

function ColorOpacityRow({
  label,
  color,
  opacity,
  onColor,
  onOpacity,
}: {
  label: string;
  color: string;
  opacity: number;
  onColor: (c: string) => void;
  onOpacity: (o: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 20,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <span className="meta-caps" style={{ fontSize: 9.5 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ColorPicker value={color} onChange={onColor} />
        <Slider min={0} max={100} step={5} value={opacity} onChange={onOpacity} />
        <span
          className="mono"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-3)",
            minWidth: 32,
          }}
        >
          %{opacity}
        </span>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 28,
          height: 22,
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      />
      <span
        className="mono"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--text-2)",
          letterSpacing: "0.04em",
        }}
      >
        {value.toUpperCase()}
      </span>
    </label>
  );
}

// ─── Live preview pane ──────────────────────────────────────────────────────

function PreviewPanel({ subs }: { subs: SubtitlePrefs }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span className="meta-caps" style={{ fontSize: 9.5 }}>
        {t("settings.subs.preview_eyebrow")}
      </span>
      <div
        style={{
          aspectRatio: "16 / 9",
          width: "100%",
          background:
            "linear-gradient(160deg, #1a1410 0%, #0d0907 60%, #050302 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 14px)",
          borderRadius: 10,
          border: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Window background — wraps the subtitle area */}
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            ...verticalAnchor(subs.verticalPosition),
            display: "flex",
            justifyContent: "center",
          }}
        >
          <SubtitleSample subs={subs} />
        </div>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-3)",
          lineHeight: 1.5,
        }}
      >
        {t("settings.subs.preview_note")}
      </div>
    </div>
  );
}

function SubtitleSample({ subs }: { subs: SubtitlePrefs }) {
  const textRgba = applyOpacity(subs.textColor, subs.textOpacityPercent);
  const bgRgba = applyOpacity(subs.backgroundColor, subs.backgroundOpacityPercent);
  const windowRgba = applyOpacity(subs.windowColor, subs.windowOpacityPercent);
  const edgeRgba = applyOpacity(subs.edgeColor, 100);

  const fontWeight = subs.fontStyle === "BOLD" ? 700 : 500;
  const fontStyle = subs.fontStyle === "ITALIC" ? "italic" : "normal";
  const baseSize = 18;
  const fontSize = baseSize * (subs.textSizePercent / 100);

  let textShadow: string | undefined;
  let webkitStroke: string | undefined;
  switch (subs.edgeType) {
    case "OUTLINE":
      textShadow = `-1px -1px 0 ${edgeRgba}, 1px -1px 0 ${edgeRgba}, -1px 1px 0 ${edgeRgba}, 1px 1px 0 ${edgeRgba}`;
      webkitStroke = `0.5px ${edgeRgba}`;
      break;
    case "DROP_SHADOW":
      textShadow = `2px 2px 4px ${edgeRgba}`;
      break;
    case "RAISED":
      textShadow = `1px 1px 0 ${edgeRgba}`;
      break;
    case "NONE":
    default:
      textShadow = undefined;
  }

  return (
    <div
      style={{
        background: windowRgba,
        padding: subs.windowOpacityPercent > 0 ? "10px 14px" : 0,
        borderRadius: 6,
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          display: "inline-block",
          background: bgRgba,
          padding: subs.backgroundOpacityPercent > 0 ? "4px 10px" : 0,
          borderRadius: 4,
          color: textRgba,
          fontFamily: FAMILY_FONT[subs.fontFamily],
          fontWeight,
          fontStyle,
          fontSize,
          lineHeight: 1.35,
          textShadow,
          WebkitTextStroke: webkitStroke,
          textAlign: "center",
        }}
      >
        {t("settings.subs.preview_caption")}
      </span>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function verticalAnchor(pos: SubtitleVerticalPosition): React.CSSProperties {
  switch (pos) {
    case "TOP":
      return { top: 24, bottom: undefined };
    case "MIDDLE":
      return { top: "50%", transform: "translateY(-50%)" };
    case "BOTTOM":
    default:
      return { bottom: 24, top: undefined };
  }
}

/**
 * #RRGGBB + 0..100 opacity → "rgba(r,g,b,a)" suitable for CSS background.
 * Returns "transparent" if opacity is zero so React doesn't paint a layer.
 */
function applyOpacity(hex: string, opacityPercent: number): string {
  if (opacityPercent <= 0) return "transparent";
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const intVal = parseInt(m[1], 16);
  const r = (intVal >> 16) & 0xff;
  const g = (intVal >> 8) & 0xff;
  const b = intVal & 0xff;
  const a = Math.max(0, Math.min(100, opacityPercent)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}
