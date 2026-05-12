import {
  useThemeStore,
  type AccentKey,
  type ThemeMode,
  type TypographyKey,
  type HomeStyleKey,
} from "../../stores/themeStore";
import { t } from "../../lib/i18n";

const ACCENT_OPTIONS: Array<{ key: AccentKey; color: string; label: string }> = [
  { key: "purple", color: "#9D7BD8", label: "Mor" },
  { key: "red", color: "#E07A6F", label: "Kırmızı" },
  { key: "blue", color: "#6FA8E0", label: "Mavi" },
  { key: "green", color: "#86C97A", label: "Yeşil" },
  { key: "copper", color: "#C68A5C", label: "Bakır" },
  { key: "teal", color: "#3FD0BD", label: "Turkuaz" },
  { key: "yellow", color: "#D4B86A", label: "Sarı" },
  { key: "gray", color: "#B0BAB8", label: "Gri" },
];

const TYPOGRAPHY_OPTIONS: Array<{ key: TypographyKey; title: string; sub: string }> = [
  { key: "archive", title: "Archive", sub: "Spectral · Schibsted Grotesk · default" },
  { key: "magazine", title: "Magazine", sub: "Newsreader · Hanken Grotesk" },
  { key: "couture", title: "Couture", sub: "Bodoni Moda · Albert Sans" },
  { key: "boutique", title: "Boutique", sub: "Cormorant Garamond · Inter Tight" },
  { key: "default", title: "Eski", sub: "Instrument Serif · Geist" },
];

const HOMESTYLE_OPTIONS: Array<{ key: HomeStyleKey; title: string; sub: string }> = [
  { key: "classic-billboard", title: "Klasik Billboard", sub: "Saf Netflix tarzı · default" },
  { key: "top10", title: "Top 10 + Hero", sub: "Numaralı sıralama + cinematic hero" },
  { key: "editorial-hybrid", title: "Editorial × Netflix", sub: "Tipografik + cinematic hibrit" },
  { key: "wide-tile", title: "Wide Tile", sub: "Apple TV+ tarzı geniş kartlar" },
  { key: "editorial-rails", title: "Editorial Rails", sub: "Klasik dergi tarzı · marquee" },
];

export default function ThemeSettings() {
  const theme = useThemeStore((s) => s.theme);
  const themeMode = useThemeStore((s) => s.themeMode);
  const accent = useThemeStore((s) => s.accent);
  const typography = useThemeStore((s) => s.typography);
  const homeStyle = useThemeStore((s) => s.homeStyle);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setTypography = useThemeStore((s) => s.setTypography);
  const setHomeStyle = useThemeStore((s) => s.setHomeStyle);

  return (
    <div style={{ maxWidth: 760 }}>
      <span className="meta-caps">{t("settings.theme.eyebrow")}</span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 24px" }}>
        {t("settings.theme.title")}
      </h1>

      {/* Theme mode */}
      <Section title={t("settings.theme.section_mode")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
            <SelectCard
              key={m}
              active={themeMode === m}
              title={
                m === "light"
                  ? t("onboarding.theme_light")
                  : m === "dark"
                    ? t("onboarding.theme_dark")
                    : t("onboarding.theme_system")
              }
              sub={
                m === "system"
                  ? theme === "dark"
                    ? t("settings.theme.mode_now_dark")
                    : t("settings.theme.mode_now_light")
                  : m === themeMode
                    ? t("settings.theme.option_selected")
                    : t("settings.theme.option_preview")
              }
              onClick={() => setThemeMode(m)}
            />
          ))}
        </div>
      </Section>

      {/* Accent */}
      <Section title={t("settings.theme.section_accent")}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {ACCENT_OPTIONS.map((opt) => {
            const active = accent === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setAccent(opt.key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--sans)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: opt.color,
                    boxShadow: active
                      ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)"
                      : "inset 0 0 0 1px rgba(0,0,0,0.3)",
                    transition: "box-shadow 160ms",
                  }}
                />
                <span className="meta-caps" style={{ fontSize: 8.5 }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Typography */}
      <Section
        title={t("settings.theme.section_typography")}
        hint={t("settings.theme.section_typography_hint")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TYPOGRAPHY_OPTIONS.map((opt) => (
            <RowOption
              key={opt.key}
              active={typography === opt.key}
              title={opt.title}
              sub={opt.sub}
              previewClassName="h-display"
              previewText={opt.title}
              onClick={() => setTypography(opt.key)}
            />
          ))}
        </div>
      </Section>

      {/* Home style */}
      <Section
        title={t("settings.theme.section_home_style")}
        hint={t("settings.theme.section_home_style_hint")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {HOMESTYLE_OPTIONS.map((opt) => (
            <RowOption
              key={opt.key}
              active={homeStyle === opt.key}
              title={opt.title}
              sub={opt.sub}
              onClick={() => setHomeStyle(opt.key)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        className="h-serif"
        style={{ fontSize: 18, margin: "0 0 4px", color: "var(--text)" }}
      >
        {title}
      </h3>
      {hint && (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 14px" }}>{hint}</p>
      )}
      {children}
    </div>
  );
}

function SelectCard({
  active,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active
          ? "color-mix(in oklab, var(--accent) 8%, transparent)"
          : "var(--bg-elev)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sans)",
        transition: "all 160ms",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--text)" : "var(--text-2)" }}>
        {title}
      </span>
      <span
        className="meta-caps"
        style={{ fontSize: 9, color: active ? "var(--accent)" : "var(--text-3)" }}
      >
        {sub}
      </span>
    </button>
  );
}

function RowOption({
  active,
  title,
  sub,
  previewClassName,
  previewText,
  onClick,
}: {
  active: boolean;
  title: string;
  sub: string;
  previewClassName?: string;
  previewText?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: previewText ? "1fr auto auto" : "1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active
          ? "color-mix(in oklab, var(--accent) 6%, transparent)"
          : "var(--bg-elev)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sans)",
        transition: "all 160ms",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{sub}</span>
      </div>
      {previewText && (
        <span
          className={previewClassName}
          style={{ fontSize: 22, color: "var(--text-2)" }}
        >
          {previewText}
        </span>
      )}
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
          background: active ? "var(--accent)" : "transparent",
          flex: "0 0 auto",
        }}
      />
    </button>
  );
}
