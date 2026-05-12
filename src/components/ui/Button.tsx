import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "link" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  style,
  children,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    fontFamily: "var(--sans)",
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1,
    border: "1px solid transparent",
    cursor: rest.disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: rest.disabled ? 0.4 : 1,
    transition: "all 160ms",
  };

  const styles: Record<Variant, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "var(--accent-ink)" },
    ghost: {
      background: "transparent",
      color: "var(--text)",
      borderColor: "var(--border)",
    },
    link: {
      background: "transparent",
      color: "var(--accent)",
      padding: 0,
      height: "auto",
    },
    danger: {
      background: "transparent",
      color: "#E07A6F",
      borderColor: "color-mix(in oklab, #E07A6F 30%, transparent)",
    },
  };

  return (
    <button {...rest} style={{ ...base, ...styles[variant], ...style }}>
      {children}
    </button>
  );
}
