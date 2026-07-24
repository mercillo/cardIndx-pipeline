import { AbsoluteFill, Sequence, Audio, staticFile, useVideoConfig } from "remotion";
import { Mosaic } from "../scenes/Mosaic";
import { DetailSlide } from "../scenes/DetailSlide";
import { Outro } from "../scenes/Outro";

interface CardData {
  id: string;
  name: string;
  cardNumber: string;
  setName: string;
  artUrl: string;
  prices: {
    psa10Current: number | null;
    psa10Change30d: number | null;
    psa10Change7d?: number | null;
    rawCurrent: number | null;
  };
}

interface MainCompositionProps {
  data: CardData[];
  date?: string;
  title?: string;
  music?: string;
}

// Segment durations in frames (30fps)
const MOSAIC_DURATION = 150; // 5s
const SLIDE_DURATION = 90;   // 3s per card
const OUTRO_DURATION = 120;  // 4s

export const MainComposition = ({ data, date, title, music = "pokemon_music.mp3" }: MainCompositionProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const slidesStart = MOSAIC_DURATION;
  const outroStart = slidesStart + data.length * SLIDE_DURATION;
  const fadeFrames = 2 * fps; // 2s fade out

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0F0F" }}>
      <Audio
        src={staticFile(music)}
        trimBefore={music === "pokemon_music.mp3" ? 17 * fps : 0}
        volume={(f) => {
          const fadeStart = durationInFrames - fadeFrames;
          if (f < fadeStart) return 0.3;
          return 0.3 * (1 - (f - fadeStart) / fadeFrames);
        }}
      />

      {/* 1. Mosaic grid — opens the video */}
      <Sequence from={0} durationInFrames={MOSAIC_DURATION}>
        <Mosaic cards={data} date={date} title={title} />
      </Sequence>

      {/* 2. Individual card slides */}
      {data.map((card, i) => (
        <Sequence
          key={card.id}
          from={slidesStart + i * SLIDE_DURATION}
          durationInFrames={SLIDE_DURATION}
        >
          <DetailSlide card={card} rank={i + 1} date={date} />
        </Sequence>
      ))}

      {/* 3. Outro */}
      <Sequence from={outroStart} durationInFrames={OUTRO_DURATION}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
