import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../styles/theme";

interface TitleCardProps {
  setName: string;
  date: string;
}

export const TitleCard = ({ setName, date }: TitleCardProps) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
  });

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
      {/* Red accent line */}
      <div
        style={{
          width: 80,
          height: 6,
          backgroundColor: theme.colors.accent,
          borderRadius: 3,
          marginBottom: 48,
          transform: `translateY(${translateY}px)`,
        }}
      />

      {/* Handle */}
      <div
        style={{
          color: theme.colors.accent,
          fontSize: 36,
          fontFamily: theme.fonts.main,
          fontWeight: 700,
          letterSpacing: 6,
          textTransform: "uppercase",
          transform: `translateY(${translateY}px)`,
          marginBottom: 32,
        }}
      >
        @pkmnIndx
      </div>

      {/* Main headline */}
      <div
        style={{
          color: theme.colors.text,
          fontSize: 96,
          fontFamily: theme.fonts.main,
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: "center",
          transform: `translateY(${translateY}px)`,
        }}
      >
        Top 8
        <br />
        This Week
      </div>

      {/* Set name */}
      <div
        style={{
          color: theme.colors.muted,
          fontSize: 44,
          fontFamily: theme.fonts.main,
          fontWeight: 400,
          marginTop: 32,
          letterSpacing: 2,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {setName}
      </div>

      {/* Date */}
      <div
        style={{
          color: theme.colors.muted,
          fontSize: 30,
          fontFamily: theme.fonts.mono,
          marginTop: 20,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {date}
      </div>
    </AbsoluteFill>
  );
};
