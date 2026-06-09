import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Wordmark } from "./Wordmark";
import { SideIcon, type SideIconName } from "./SideIcon";
import { Avatar } from "./Avatar";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { t, type StringKey } from "../../lib/i18n";

const SIDEBAR_ITEMS: Array<{
  to: string;
  icon: SideIconName;
  labelKey: StringKey;
}> = [
  { to: "/", icon: "home", labelKey: "nav.home" },
  { to: "/channels", icon: "play", labelKey: "nav.channels" },
  { to: "/films", icon: "star", labelKey: "nav.films" },
  { to: "/series", icon: "square", labelKey: "nav.series" },
  { to: "/guide", icon: "cal", labelKey: "nav.guide" },
  { to: "/favorites", icon: "heart", labelKey: "nav.favorites" },
];

interface SidebarProps {
  /** Override the displayed profile name. Defaults to the persisted
   *  `settings.profile.displayName`, so most call sites pass nothing. */
  profile?: string;
}

export function Sidebar({ profile }: SidebarProps) {
  const mini = useUIStore((s) => s.sidebarMini);
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const profileName = profile ?? displayName ?? "";
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const w = mini ? "var(--sidebar-w-mini)" : "var(--sidebar-w)";

  return (
    <aside
      className="no-select"
      style={{
        width: w,
        flex: `0 0 ${w}`,
        borderRight: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        padding: mini ? "14px 8px" : "14px 14px 14px 18px",
        gap: 4,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Logo + wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: mini ? "6px 6px 14px" : "6px 4px 14px",
          justifyContent: mini ? "center" : "flex-start",
        }}
      >
        <Logo size={mini ? 22 : 24} />
        {!mini && <Wordmark size={17} />}
      </div>
      <div className="hairline" style={{ marginBottom: 10 }} />

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 34,
          padding: mini ? 0 : "0 10px",
          borderRadius: 8,
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          margin: mini ? "0 4px 12px" : "0 0 12px",
          justifyContent: mini ? "center" : "flex-start",
          color: "var(--text-3)",
          cursor: "pointer",
          fontFamily: "var(--sans)",
        }}
      >
        <SideIcon name="search" />
        {!mini && (
          <>
            <span style={{ color: "var(--text-3)", fontSize: 12, flex: 1, textAlign: "left" }}>
              {t("common.search")}
            </span>
            <span
              className="mono"
              style={{ color: "var(--text-4)", fontSize: 9.5, letterSpacing: "0.06em" }}
            >
              Ctrl+F
            </span>
          </>
        )}
      </button>

      <div className="hairline" style={{ marginBottom: 8 }} />

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SIDEBAR_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 34,
              padding: mini ? 0 : "0 10px",
              borderRadius: 8,
              background: isActive ? "var(--bg-elev2)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-2)",
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              position: "relative",
              justifyContent: mini ? "center" : "flex-start",
              textDecoration: "none",
              fontFamily: "var(--sans)",
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && !mini && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 7,
                      bottom: 7,
                      width: 2.5,
                      background: "var(--accent)",
                      borderRadius: 2,
                    }}
                  />
                )}
                <SideIcon name={it.icon} active={isActive} />
                {!mini && <span>{t(it.labelKey)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="hairline" style={{ marginBottom: 8 }} />

      {/* Settings */}
      <button
        type="button"
        onClick={() => navigate("/settings")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 34,
          padding: mini ? 0 : "0 10px",
          borderRadius: 8,
          color: location.pathname.startsWith("/settings") ? "var(--text)" : "var(--text-2)",
          background: location.pathname.startsWith("/settings") ? "var(--bg-elev2)" : "transparent",
          fontSize: 13,
          justifyContent: mini ? "center" : "flex-start",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--sans)",
        }}
      >
        <SideIcon name="gear" active={location.pathname.startsWith("/settings")} />
        {!mini && <span>{t("nav.settings")}</span>}
      </button>

      {/* Profile */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          padding: mini ? "6px 0" : "8px 10px",
          borderRadius: 8,
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          justifyContent: mini ? "center" : "flex-start",
        }}
      >
        <Avatar
          size={mini ? 26 : 28}
          initials={(profileName.trim().slice(0, 1) || "•").toUpperCase()}
        />
        {!mini && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>
              {profileName.trim() || "Profil"}
            </span>
          </div>
        )}
        {!mini && <span style={{ color: "var(--text-3)", fontSize: 11 }}>▾</span>}
      </div>
    </aside>
  );
}
