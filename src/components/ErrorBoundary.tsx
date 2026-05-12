import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../lib/i18n";

interface Props {
  /** Optional label that surfaces in the fallback UI (e.g. "/films").
   *  Helps differentiate which boundary caught the error when the same
   *  fallback is reused at multiple levels. */
  label?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
  // Bumped via "Tekrar dene" → forces React to remount the children
  // subtree. Cheaper than a full app reload for transient render bugs.
  resetKey: number;
}

/**
 * Top-of-app React error boundary. Catches anything thrown during render
 * (including async-throws surfaced via React Query's `throwOnError`) and
 * renders a recoverable fallback instead of the white screen of death.
 *
 * Errors are logged to the JS console. The console feed is captured by
 * webview2's stderr, which the Rust tracing subscriber's stderr layer
 * eventually shows; production triage looks at the rotating file log
 * (init_logging in lib.rs).
 *
 * The boundary is intentionally a class component — that's the only API
 * React exposes for catching sub-tree errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.label ?? "(root)", error, info);
  }

  reset = (): void => {
    this.setState((s) => ({ error: null, info: null, resetKey: s.resetKey + 1 }));
  };

  reload = (): void => {
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <Fallback
          label={this.props.label}
          error={error}
          info={info}
          onReset={this.reset}
          onReload={this.reload}
        />
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

function Fallback({
  label,
  error,
  info,
  onReset,
  onReload,
}: {
  label?: string;
  error: Error;
  info: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
}) {
  return (
    <div
      style={{
        height: "100vh",
        background: "var(--bg, #0E1213)",
        color: "var(--text, #E8EDEC)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        gap: 24,
        fontFamily: "var(--sans, system-ui, sans-serif)",
        textAlign: "center",
      }}
    >
      <span
        className="meta-caps"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--text-3, #6A7472)",
        }}
      >
        {t("error.eyebrow")}{label ? ` · ${label}` : ""}
      </span>
      <h1
        className="h-display"
        style={{
          fontSize: 56,
          margin: 0,
          letterSpacing: "-0.025em",
          fontFamily: "var(--serif, 'Instrument Serif', serif)",
        }}
      >
        {t("error.title")}
      </h1>
      <p
        style={{
          fontSize: 14,
          maxWidth: 520,
          color: "var(--text-2, #9DA8A6)",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {t("error.body")}
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onReset} style={primaryBtn}>
          {t("common.retry")}
        </button>
        <button onClick={onReload} style={ghostBtn}>
          {t("error.btn_reload")}
        </button>
      </div>

      <details
        style={{
          maxWidth: 760,
          width: "100%",
          marginTop: 12,
          fontFamily: "var(--mono, monospace)",
          fontSize: 11.5,
          color: "var(--text-3, #6A7472)",
          textAlign: "left",
        }}
      >
        <summary style={{ cursor: "pointer", letterSpacing: "0.04em" }}>
          {t("common.show_details")}
        </summary>
        <pre
          style={{
            marginTop: 12,
            padding: 14,
            background: "var(--bg-paper, #0A0D0E)",
            border: "1px solid var(--border, #1F2A2C)",
            borderRadius: 10,
            maxHeight: 240,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error.name}: {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
          {info?.componentStack ? `\n\n${info.componentStack}` : ""}
        </pre>
      </details>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  height: 38,
  padding: "0 18px",
  borderRadius: 8,
  background: "var(--accent, #3FD0BD)",
  color: "var(--accent-ink, #062320)",
  border: "none",
  fontFamily: "var(--sans, system-ui, sans-serif)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text, #E8EDEC)",
  border: "1px solid var(--border, #1F2A2C)",
  fontFamily: "var(--sans, system-ui, sans-serif)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
