interface AvatarProps {
  size?: number;
  initials?: string;
}

export function Avatar({ size = 28, initials = "B" }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--accent-deep), var(--accent))",
        color: "var(--accent-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--serif)",
        fontSize: size * 0.5,
        flex: "0 0 auto",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      {initials}
    </div>
  );
}
