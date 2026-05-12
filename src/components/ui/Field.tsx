import { forwardRef } from "react";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  mono?: boolean;
  error?: string | null;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, mono = false, error, style, ...rest },
  ref,
) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && (
        <span className="meta-caps" style={{ fontSize: 9.5 }}>
          {label}
        </span>
      )}
      <input
        ref={ref}
        {...rest}
        style={{
          height: 42,
          padding: "0 14px",
          borderRadius: 10,
          background: "var(--bg-elev)",
          border: `1px solid ${error ? "#E07A6F" : "var(--border)"}`,
          color: "var(--text)",
          fontFamily: mono ? "var(--mono)" : "var(--sans)",
          fontSize: mono ? 12.5 : 13.5,
          outline: "none",
          transition: "border-color 160ms",
          ...style,
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)";
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = error
            ? "#E07A6F"
            : "var(--border)";
          rest.onBlur?.(e);
        }}
      />
      {hint && !error && (
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 11.5, color: "#E07A6F" }}>{error}</span>
      )}
    </div>
  );
});
