interface LogoProps {
  size?: number;
  mono?: boolean;
}

export function Logo({ size = 28, mono = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <defs>
        <linearGradient id={`gi-silver-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E2E6E7" />
          <stop offset="0.55" stopColor="#9FA5A7" />
          <stop offset="1" stopColor="#4F5557" />
        </linearGradient>
        <linearGradient id={`gi-copper-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0A878" />
          <stop offset="1" stopColor="#7A4A2A" />
        </linearGradient>
        <linearGradient id={`gi-teal-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5DEAD8" />
          <stop offset="1" stopColor="#0E8A7C" />
        </linearGradient>
      </defs>
      <path
        d="M16 4a12 12 0 1 0 12 12h-3a9 9 0 1 1-9-9z"
        fill={mono ? "#fff" : `url(#gi-silver-${size})`}
      />
      <path
        d="M28 16a12 12 0 0 1-12 12v-3a9 9 0 0 0 9-9z"
        fill={mono ? "rgba(255,255,255,0.85)" : `url(#gi-copper-${size})`}
      />
      <path
        d="m13 11 8 5-8 5z"
        fill={mono ? "#0E1213" : `url(#gi-teal-${size})`}
      />
    </svg>
  );
}
