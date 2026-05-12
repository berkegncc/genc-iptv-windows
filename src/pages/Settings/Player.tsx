import { useSettingsStore } from "../../stores/settingsStore";
import {
  type DecoderPref,
  type DefaultQuality,
  type PlayerPrefs,
} from "../../lib/settings";
import { Field } from "../../components/ui/Field";
import { t } from "../../lib/i18n";

export default function PlayerSettings() {
  const player = useSettingsStore((s) => s.settings.player);
  const update = useSettingsStore((s) => s.updatePlayer);
  const reset = useSettingsStore((s) => s.resetPlayer);

  return (
    <div style={{ maxWidth: 720 }}>
      <span className="meta-caps">{t("settings.player.eyebrow")}</span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 24px" }}>
        {t("settings.player.title")}
      </h1>

      <Section
        title={t("settings.player.section_video")}
        hint={t("settings.player.section_video_hint")}
      >
        <Row label={t("settings.player.row_quality")}>
          <SegmentedQuality value={player.defaultQuality} onChange={(q) => update({ defaultQuality: q })} />
        </Row>
        <Row label={t("settings.player.row_decoder")}>
          <SegmentedDecoder value={player.decoderPref} onChange={(d) => update({ decoderPref: d })} />
        </Row>
      </Section>

      <Section
        title={t("settings.player.section_audio")}
        hint={t("settings.player.section_audio_hint")}
      >
        <Row label={t("settings.player.row_audio_lang")}>
          <Field
            value={player.preferredAudioLang}
            onChange={(e) => update({ preferredAudioLang: e.target.value })}
            placeholder="tr / en / ar"
            mono
          />
        </Row>
        <Row label={t("settings.player.row_loudness")}>
          <Toggle
            value={player.loudnessNormalization}
            onChange={(v) => update({ loudnessNormalization: v })}
            hint={t("settings.player.row_loudness_hint")}
          />
        </Row>
      </Section>

      <Section
        title={t("settings.player.section_window")}
        hint={t("settings.player.section_window_hint")}
      >
        <Row label={t("settings.player.row_pip")}>
          <Toggle
            value={player.pipEnabled}
            onChange={(v) => update({ pipEnabled: v })}
            hint={t("settings.player.row_pip_hint")}
          />
        </Row>
      </Section>

      <Section
        title={t("settings.player.section_network")}
        hint={t("settings.player.section_network_hint")}
      >
        <Row label={t("settings.player.row_cache")}>
          <NumberSlider
            min={5}
            max={120}
            step={5}
            value={player.cacheSecs}
            unit={t("settings.player.unit_seconds")}
            hint={t("settings.player.row_cache_hint")}
            onChange={(v) => update({ cacheSecs: v })}
          />
        </Row>
        <Row label={t("settings.player.row_timeout")}>
          <NumberSlider
            min={10}
            max={120}
            step={5}
            value={player.networkTimeoutSecs}
            unit={t("settings.player.unit_seconds")}
            hint={t("settings.player.row_timeout_hint")}
            onChange={(v) => update({ networkTimeoutSecs: v })}
          />
        </Row>
        <Row label={t("settings.player.row_ua")}>
          <Field
            value={player.userAgentOverride}
            onChange={(e) => update({ userAgentOverride: e.target.value })}
            placeholder={t("settings.player.row_ua_placeholder")}
            mono
            hint={t("settings.player.row_ua_hint")}
          />
        </Row>
        <Row label={t("settings.player.row_trust")}>
          <Toggle
            value={player.trustAllCerts}
            onChange={(v) => update({ trustAllCerts: v })}
            hint={t("settings.player.row_trust_hint")}
            danger={player.trustAllCerts}
          />
        </Row>
      </Section>

      <div style={{ marginTop: 24 }}>
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
          }}
        >
          {t("common.reset_default")}
        </button>
      </div>

      <CurrentSettingsCard player={player} />
    </div>
  );
}

// ─── Section / Row ──────────────────────────────────────────────────────────

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
    <div style={{ marginBottom: 36 }}>
      <h3 className="h-serif" style={{ fontSize: 18, margin: "0 0 4px" }}>
        {title}
      </h3>
      {hint && (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 14px", maxWidth: 540 }}>
          {hint}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        gridTemplateColumns: "200px 1fr",
        gap: 24,
        alignItems: "start",
        padding: "12px 0",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <span className="meta-caps" style={{ fontSize: 9.5, paddingTop: 12 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────────────

function SegmentedQuality({
  value,
  onChange,
}: {
  value: DefaultQuality;
  onChange: (v: DefaultQuality) => void;
}) {
  const opts: Array<{ key: DefaultQuality; label: string }> = [
    { key: "auto", label: t("settings.player.quality_auto") },
    { key: "1080p", label: "1080p" },
    { key: "720p", label: "720p" },
    { key: "480p", label: "480p" },
  ];
  return <Segmented options={opts} value={value} onChange={onChange} />;
}

function SegmentedDecoder({
  value,
  onChange,
}: {
  value: DecoderPref;
  onChange: (v: DecoderPref) => void;
}) {
  const opts: Array<{ key: DecoderPref; label: string }> = [
    { key: "auto", label: t("settings.player.decoder_auto") },
    { key: "hardware", label: t("settings.player.decoder_hardware") },
    { key: "software", label: t("settings.player.decoder_software") },
  ];
  return <Segmented options={opts} value={value} onChange={onChange} />;
}

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
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "all 140ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  hint,
  danger,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 46,
          height: 26,
          padding: 0,
          borderRadius: 999,
          background: value
            ? danger
              ? "#E07A6F"
              : "var(--accent)"
            : "var(--bg-elev2)",
          border: `1px solid ${
            value
              ? danger
                ? "#E07A6F"
                : "var(--accent)"
              : "var(--border)"
          }`,
          position: "relative",
          cursor: "pointer",
          transition: "background 160ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transition: "left 160ms",
          }}
        />
      </button>
      {hint && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{hint}</span>}
    </div>
  );
}

function NumberSlider({
  min,
  max,
  step,
  value,
  unit,
  hint,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            flex: 1,
            maxWidth: 280,
            accentColor: "var(--accent)",
            cursor: "pointer",
          }}
        />
        <span
          className="mono"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--text)",
            minWidth: 56,
          }}
        >
          {value} {unit}
        </span>
      </div>
      {hint && (
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{hint}</span>
      )}
    </div>
  );
}

// ─── Diagnostic preview ─────────────────────────────────────────────────────

function CurrentSettingsCard({ player }: { player: PlayerPrefs }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: 14,
        background: "var(--bg-paper)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "var(--mono)",
        fontSize: 11,
        color: "var(--text-3)",
        lineHeight: 1.6,
        letterSpacing: "0.01em",
        whiteSpace: "pre",
      }}
    >
      <span className="meta-caps" style={{ fontSize: 9.5, color: "var(--text-2)" }}>
        {t("settings.player.diag_active")}
      </span>
      {"\n\n"}
      {JSON.stringify(player, null, 2)}
    </div>
  );
}
