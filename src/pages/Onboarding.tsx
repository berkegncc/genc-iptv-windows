import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Logo } from "../components/ui/Logo";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { TitleBar } from "../components/ui/TitleBar";
import {
  useAddM3uPlaylist,
  useAddXtreamPlaylist,
} from "../features/playlist/usePlaylists";
import {
  useThemeStore,
  type AccentKey,
  type ThemeMode,
} from "../stores/themeStore";
import { useSettingsStore } from "../stores/settingsStore";
import { t, tFmt } from "../lib/i18n";

type Step = 1 | 2 | 3;
type AddTab = "M3U" | "XTREAM";

interface M3uForm {
  name: string;
  url: string;
  epgUrl?: string;
}

interface XtreamForm {
  name: string;
  serverUrl: string;
  username: string;
  password: string;
}

const ACCENT_OPTS: Array<{ key: AccentKey; color: string; label: string }> = [
  { key: "purple", color: "#9D7BD8", label: "Mor" },
  { key: "red", color: "#E07A6F", label: "Kırmızı" },
  { key: "blue", color: "#6FA8E0", label: "Mavi" },
  { key: "green", color: "#86C97A", label: "Yeşil" },
  { key: "copper", color: "#C68A5C", label: "Bakır" },
  { key: "teal", color: "#3FD0BD", label: "Turkuaz" },
  { key: "yellow", color: "#D4B86A", label: "Sarı" },
  { key: "gray", color: "#B0BAB8", label: "Gri" },
];

export default function Onboarding() {
  const [search] = useSearchParams();
  const droppedFile = search.get("file");
  // Skip the welcome step when arriving here via drag-drop / file
  // association — the user already signalled what they want.
  const [step, setStep] = useState<Step>(droppedFile ? 2 : 1);
  const [createdPlaylistId, setCreatedPlaylistId] = useState<number | null>(null);
  const navigate = useNavigate();
  const updateProfile = useSettingsStore((s) => s.updateProfile);

  // Flip the latch on completion so a future "all playlists deleted" state
  // routes to Settings → Playlist Yönetimi instead of dragging the user
  // back through the welcome flow.
  const handleComplete = () => {
    updateProfile({ onboardingCompleted: true });
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <TitleBar breadcrumb={t("nav.onboarding")} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* Left: brand panel */}
        <BrandPanel />
        {/* Right: step content */}
        <StepPanel
          step={step}
          totalSteps={3}
          onContinue={(targetStep) => setStep(targetStep)}
          onPlaylistCreated={(id) => setCreatedPlaylistId(id)}
          onComplete={handleComplete}
          createdPlaylistId={createdPlaylistId}
          droppedFile={droppedFile}
        />
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        padding: 60,
        background: "radial-gradient(120% 120% at 35% 25%, #1F2A2C, #0A0D0E 70%)",
        borderRight: "1px solid var(--line)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 38%, rgba(63,208,189,0.10), transparent 60%)",
        }}
      />
      <div
        style={{
          width: 160,
          height: 160,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -30,
            borderRadius: "50%",
            border: "1px solid rgba(63,208,189,0.30)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -60,
            borderRadius: "50%",
            border: "1px solid rgba(63,208,189,0.15)",
          }}
        />
        <Logo size={120} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div className="h-italic" style={{ fontSize: 56, lineHeight: 1 }}>
          Genç
        </div>
        <div
          className="meta-caps"
          style={{ fontSize: 11, letterSpacing: "0.32em", color: "var(--text-3)" }}
        >
          IPTV PLAYER
        </div>
      </div>
      <div style={{ height: 16 }} />
      <div className="meta-caps" style={{ fontSize: 9.5, color: "var(--teal)" }}>
        {t("onboarding.brand_version")}
      </div>
    </div>
  );
}

function StepPanel({
  step,
  totalSteps,
  onContinue,
  onPlaylistCreated,
  onComplete,
  createdPlaylistId,
  droppedFile,
}: {
  step: Step;
  totalSteps: number;
  onContinue: (target: Step) => void;
  onPlaylistCreated: (id: number) => void;
  onComplete: () => void;
  createdPlaylistId: number | null;
  droppedFile: string | null;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", padding: "48px 64px 36px" }}
    >
      <StepIndicator step={step} total={totalSteps} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 480,
          width: "100%",
        }}
      >
        {step === 1 && <Step1 />}
        {step === 2 && (
          <Step2
            onCreated={(id) => {
              onPlaylistCreated(id);
              onContinue(3);
            }}
            droppedFile={droppedFile}
          />
        )}
        {step === 3 && <Step3 />}
      </div>
      <div className="hairline" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
        }}
      >
        <span className="meta-caps" style={{ fontSize: 10 }}>
          {tFmt("onboarding.step_indicator", { step, total: totalSteps })}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={() => onContinue((step - 1) as Step)}
              disabled={step === 2 && createdPlaylistId != null}
            >
              {t("onboarding.go_back")}
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => onContinue(2)}>
              {t("onboarding.continue")}
            </Button>
          )}
          {step === 3 && (
            <Button onClick={onComplete}>{t("onboarding.finish")}</Button>
          )}
          {/* Step 2 has its own submit button inside the form */}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 3,
            background: i < step ? "var(--accent)" : "var(--bg-elev2)",
          }}
        />
      ))}
    </div>
  );
}

function Step1() {
  // Tuples: [titleKey, subKey] from i18n. Local consts (not at module
  // scope) so a future locale switch via re-render picks up new strings.
  const features: Array<[string, string]> = [
    [t("onboarding.feature_formats_title"), t("onboarding.feature_formats_sub")],
    [t("onboarding.feature_epg_title"), t("onboarding.feature_epg_sub")],
    [
      t("onboarding.feature_consistency_title"),
      t("onboarding.feature_consistency_sub"),
    ],
  ];
  return (
    <>
      <span className="meta-caps" style={{ fontSize: 10.5, color: "var(--accent)" }}>
        {t("onboarding.step1_eyebrow")}
      </span>
      <h1 className="h-display" style={{ fontSize: 56, margin: "14px 0 18px" }}>
        {t("onboarding.step1_title_a")}
        <br />
        <span className="h-italic">{t("onboarding.step1_title_b")}</span>
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--text-2)",
          margin: "0 0 28px",
          maxWidth: 420,
        }}
      >
        {t("onboarding.step1_intro")}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 18,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--bg-elev)",
        }}
      >
        {features.map(([title, sub]) => (
          <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                marginTop: 8,
                flex: "0 0 auto",
              }}
            />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Step2({
  onCreated,
  droppedFile,
}: {
  onCreated: (id: number) => void;
  droppedFile?: string | null;
}) {
  // Default to M3U tab when arriving via drag-drop, since the dropped path
  // is necessarily a local M3U file.
  const [tab, setTab] = useState<AddTab>(droppedFile ? "M3U" : "XTREAM");
  const m3uMutation = useAddM3uPlaylist();
  const xtreamMutation = useAddXtreamPlaylist();
  const isLoading = m3uMutation.isPending || xtreamMutation.isPending;
  const error = m3uMutation.error?.message ?? xtreamMutation.error?.message;

  const m3uForm = useForm<M3uForm>({
    defaultValues: {
      name: droppedFile ? deriveNameFromPath(droppedFile) : "",
      url: droppedFile ?? "",
      epgUrl: "",
    },
  });
  const xtreamForm = useForm<XtreamForm>({
    defaultValues: { name: "", serverUrl: "", username: "", password: "" },
  });

  // If a new file gets dropped while the user is already on Step 2, push
  // the new path into the form instead of silently ignoring it.
  useEffect(() => {
    if (!droppedFile) return;
    setTab("M3U");
    m3uForm.reset({
      name: deriveNameFromPath(droppedFile),
      url: droppedFile,
      epgUrl: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedFile]);

  const submitM3u = m3uForm.handleSubmit(async (data) => {
    const id = await m3uMutation.mutateAsync({
      name: data.name.trim(),
      url: data.url.trim(),
      epgUrl: data.epgUrl?.trim() || null,
    });
    onCreated(id);
  });

  const submitXtream = xtreamForm.handleSubmit(async (data) => {
    const id = await xtreamMutation.mutateAsync({
      name: data.name.trim(),
      serverUrl: data.serverUrl.trim().replace(/\/+$/, ""),
      username: data.username.trim(),
      password: data.password,
    });
    onCreated(id);
  });

  return (
    <>
      <span className="meta-caps" style={{ fontSize: 10.5, color: "var(--accent)" }}>
        {t("onboarding.step2_eyebrow")}
      </span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "14px 0 12px" }}>
        {t("onboarding.step2_title_a")}{" "}
        <span className="h-italic">{t("onboarding.step2_title_b")}</span>
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 24px" }}>
        {t("onboarding.step2_intro")}
      </p>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(["M3U", "XTREAM"] as AddTab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 500,
              color: tab === tabKey ? "var(--text)" : "var(--text-3)",
              borderBottom: `2px solid ${tab === tabKey ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              background: "transparent",
              border: "none",
              borderBottomStyle: "solid",
              borderBottomWidth: 2,
              borderBottomColor: tab === tabKey ? "var(--accent)" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--sans)",
            }}
          >
            {tabKey === "M3U"
              ? t("onboarding.tab_m3u")
              : t("onboarding.tab_xtream")}
          </button>
        ))}
      </div>

      {/* Form */}
      {tab === "M3U" ? (
        <form
          onSubmit={submitM3u}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Field
            label={t("onboarding.field_name")}
            placeholder={t("onboarding.field_name_placeholder")}
            {...m3uForm.register("name", { required: true })}
          />
          <Field
            label={t("onboarding.field_m3u_url")}
            placeholder={t("onboarding.field_m3u_url_placeholder")}
            mono
            {...m3uForm.register("url", { required: true })}
          />
          <Field
            label={t("onboarding.field_epg_url")}
            placeholder={t("onboarding.field_epg_url_placeholder")}
            mono
            {...m3uForm.register("epgUrl")}
          />
          <FormFooter loading={isLoading} error={error} />
        </form>
      ) : (
        <form
          onSubmit={submitXtream}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Field
            label={t("onboarding.field_name")}
            placeholder={t("onboarding.field_name_placeholder")}
            {...xtreamForm.register("name", { required: true })}
          />
          <Field
            label={t("onboarding.field_server")}
            placeholder={t("onboarding.field_server_placeholder")}
            mono
            {...xtreamForm.register("serverUrl", { required: true })}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field
              label={t("onboarding.field_username")}
              mono
              autoComplete="off"
              {...xtreamForm.register("username", { required: true })}
            />
            <Field
              label={t("onboarding.field_password")}
              type="password"
              mono
              autoComplete="off"
              {...xtreamForm.register("password", { required: true })}
            />
          </div>
          <FormFooter loading={isLoading} error={error} />
        </form>
      )}
    </>
  );
}

function FormFooter({ loading, error }: { loading: boolean; error?: string }) {
  return (
    <>
      <Button type="submit" disabled={loading} style={{ alignSelf: "flex-start" }}>
        {loading ? t("onboarding.submit_loading") : t("onboarding.submit")}
      </Button>
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "color-mix(in oklab, #E07A6F 12%, transparent)",
            border: "1px solid color-mix(in oklab, #E07A6F 30%, transparent)",
            color: "#E07A6F",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}

function Step3() {
  const accent = useThemeStore((s) => s.accent);
  const themeMode = useThemeStore((s) => s.themeMode);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  // Display name persists straight to settings.json so the next launch (and
  // any other surface that reads `settings.profile.displayName`) sees it.
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const [name, setName] = useState(displayName);
  // Keep the persisted value in lockstep on every keystroke. Cheap because
  // tauri-plugin-store coalesces writes; settings.json updates on next tick.
  useEffect(() => {
    if (name !== displayName) {
      updateProfile({ displayName: name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <>
      <span className="meta-caps" style={{ fontSize: 10.5, color: "var(--accent)" }}>
        {t("onboarding.step3_eyebrow")}
      </span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "14px 0 12px" }}>
        {t("onboarding.step3_title_a")}{" "}
        <span className="h-italic">{t("onboarding.step3_title_b")}</span>
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 24px" }}>
        {t("onboarding.step3_intro")}
      </p>
      <Field
        label={t("settings.field_display_name")}
        placeholder="Berke"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div style={{ height: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="meta-caps" style={{ fontSize: 10 }}>
          {t("onboarding.accent_label")}
        </span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ACCENT_OPTS.map((opt) => {
            const active = accent === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
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
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: opt.color,
                    boxShadow: active
                      ? "0 0 0 1.5px var(--bg), 0 0 0 3px var(--accent)"
                      : "inset 0 0 0 1px rgba(0,0,0,0.3)",
                  }}
                />
                <span className="meta-caps" style={{ fontSize: 8.5 }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="meta-caps" style={{ fontSize: 10 }}>
          {t("onboarding.theme_label")}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => {
            const active = themeMode === mode;
            const label =
              mode === "light"
                ? t("onboarding.theme_light")
                : mode === "dark"
                  ? t("onboarding.theme_dark")
                  : t("onboarding.theme_system");
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setThemeMode(mode)}
                style={{
                  flex: 1,
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
                  fontFamily: "var(--sans)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? "var(--text)" : "var(--text-2)",
                  }}
                >
                  {label}
                </div>
                <div
                  className="meta-caps"
                  style={{ fontSize: 9, color: active ? "var(--accent)" : "var(--text-3)" }}
                >
                  {active
                    ? t("settings.theme.option_selected")
                    : t("settings.theme.option_preview")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * Best-effort default name derived from a dropped/opened M3U path. Strips the
 * extension and any path separators, leaves the filename as the user can
 * always rename it before saving.
 */
function deriveNameFromPath(raw: string): string {
  // Handle both file:// URIs and bare paths.
  let cleaned = raw;
  if (cleaned.startsWith("file://")) {
    cleaned = cleaned.replace(/^file:\/+/, "");
  }
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    /* leave as-is */
  }
  const lastSep = Math.max(cleaned.lastIndexOf("/"), cleaned.lastIndexOf("\\"));
  const base = lastSep >= 0 ? cleaned.slice(lastSep + 1) : cleaned;
  return base.replace(/\.(m3u8?|M3U8?)$/, "") || "Yerel playlist";
}
