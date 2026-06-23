import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { theme } from "../styles/theme";

export const Outro = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 20], [40, 0], {
    extrapolateRight: "clamp",
  });

  // Subtle pulse on the handle
  const handleScale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.04, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Logo */}
      <Img
        src={staticFile("pkmnindx.png")}
        style={{
          width: 440,
          height: 440,
          objectFit: "contain",
          marginBottom: 40,
          transform: `translateY(${translateY}px)`,
        }}
      />

      {/* Red accent bar */}
      <div
        style={{
          width: 80,
          height: 6,
          backgroundColor: theme.colors.accent,
          borderRadius: 3,
          marginBottom: 56,
          transform: `translateY(${translateY}px)`,
        }}
      />

      {/* CTA text */}
      <div
        style={{
          color: theme.colors.text,
          fontSize: 62,
          fontFamily: theme.fonts.main,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          transform: `translateY(${translateY}px)`,
          marginBottom: 16,
        }}
      >
        Follow for daily
        <br />
        card market data
      </div>

      {/* Handle with pulse */}
      <div
        style={{
          color: theme.colors.accent,
          fontSize: 52,
          fontFamily: theme.fonts.main,
          fontWeight: 700,
          letterSpacing: 4,
          transform: `translateY(${translateY}px) scale(${handleScale})`,
          marginTop: 48,
          marginBottom: 48,
        }}
      >
        @pkmnIndx
      </div>

      {/* Platform row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 32,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {["TikTok", "Instagram", "YouTube", "X"].map((platform) => (
          <div
            key={platform}
            style={{
              color: theme.colors.muted,
              fontSize: 28,
              fontFamily: theme.fonts.main,
              fontWeight: 500,
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 20,
              paddingRight: 20,
              border: `1px solid ${theme.colors.surface}`,
              borderRadius: 8,
            }}
          >
            {platform}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
