import { useState } from "react";

interface ChannelLogoProps {
  name: string;
  url?: string | null;
  size?: number;
}

/**
 * Channel logo with fallback to abbreviated initials when the image fails
 * or is missing. Mirrors Android's `ChannelLogoMark`.
 */
export function ChannelLogo({ name, url, size = 48 }: ChannelLogoProps) {
  const [errored, setErrored] = useState(false);
  const showImage = url && !errored;

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: 9,
        background:
          "radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <img
          src={url!}
          alt={name}
          onError={() => setErrored(true)}
          style={{
            maxWidth: "85%",
            maxHeight: "85%",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: size * 0.28,
            fontWeight: 500,
            color: "var(--text-2)",
          }}
        >
          {abbrChannel(name)}
        </span>
      )}
    </div>
  );
}

function abbrChannel(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "•••";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}
