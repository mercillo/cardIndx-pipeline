import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { outroStyles } from "../styles/outro";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "X"];

export const Outro = () => {
  const frame = useCurrentFrame();

  const opacity    = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" });
  const handleScale = interpolate(frame % 60, [0, 30, 60], [1, 1.04, 1], { extrapolateRight: "clamp" });

  const slide = (extra?: object) => ({ transform: `translateY(${translateY}px)`, ...extra });

  return (
    <AbsoluteFill style={{ ...outroStyles.container, opacity }}>

      <Img
        src={staticFile("pkmnindx.png")}
        style={{ ...outroStyles.logo, ...slide() }}
      />

      <div style={{ ...outroStyles.accentBar, ...slide() }} />

      <div style={{ ...outroStyles.ctaText, ...slide() }}>
        Follow for daily<br />card market data
      </div>

      <div style={{ ...outroStyles.handle, transform: `translateY(${translateY}px) scale(${handleScale})` }}>
        @pkmnIndx
      </div>

      <div style={{ ...outroStyles.platformRow, ...slide() }}>
        {PLATFORMS.map((platform) => (
          <div key={platform} style={outroStyles.platformChip}>{platform}</div>
        ))}
      </div>

    </AbsoluteFill>
  );
};
