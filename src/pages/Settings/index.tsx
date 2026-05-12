import { NavLink, Outlet, useLocation } from "react-router-dom";
import { t, type StringKey } from "../../lib/i18n";
import { useSettingsStore } from "../../stores/settingsStore";
import { Field } from "../../components/ui/Field";

const SETTINGS_NAV: Array<{ to: string; labelKey: StringKey; end?: boolean }> = [
  { to: "/settings", labelKey: "nav.profile_account", end: true },
  { to: "/settings/playlists", labelKey: "nav.settings_playlists" },
  { to: "/settings/player", labelKey: "nav.settings_player" },
  { to: "/settings/subtitles", labelKey: "nav.settings_subtitles" },
  { to: "/settings/theme", labelKey: "nav.settings_theme" },
];

export default function Settings() {
  const location = useLocation();
  const showOutlet = location.pathname !== "/settings";

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        style={{
          width: 240,
          flex: "0 0 240px",
          borderRight: "1px solid var(--line)",
          padding: "32px 18px",
          background: "var(--bg-paper)",
        }}
      >
        <span className="meta-caps">{t("nav.settings")}</span>
        <h2 className="h-serif" style={{ fontSize: 22, margin: "6px 0 18px" }}>
          {t("settings.title_pref")}
        </h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SETTINGS_NAV.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              style={({ isActive }) => ({
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--text)" : "var(--text-2)",
                background: isActive ? "var(--bg-elev2)" : "transparent",
                textDecoration: "none",
                fontFamily: "var(--sans)",
              })}
            >
              {t(it.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div style={{ flex: 1, overflow: "auto", padding: "32px 48px" }}>
        {showOutlet ? <Outlet /> : <ProfileStub />}
      </div>
    </div>
  );
}

function ProfileStub() {
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  return (
    <div style={{ maxWidth: 480 }}>
      <span className="meta-caps">{t("settings.account_eyebrow")}</span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 16px" }}>
        {t("settings.account_title")}
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 14, margin: "0 0 24px" }}>
        {t("settings.account_intro")}
      </p>
      <Field
        label={t("settings.field_display_name")}
        placeholder="Berke"
        value={displayName}
        onChange={(e) => updateProfile({ displayName: e.target.value })}
      />
    </div>
  );
}
