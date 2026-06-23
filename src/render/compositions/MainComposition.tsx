import { AbsoluteFill, Sequence } from "remotion";
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
}

// Segment durations in frames (30fps)
const MOSAIC_DURATION = 90;  // 3s
const SLIDE_DURATION = 75;   // 2.5s per card
const OUTRO_DURATION = 120;  // 4s

export const MainComposition = ({ data, date }: MainCompositionProps) => {
  const slidesStart = MOSAIC_DURATION;
  const outroStart = slidesStart + data.length * SLIDE_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0F0F" }}>
      {/* 1. Mosaic grid — opens the video */}
      <Sequence from={0} durationInFrames={MOSAIC_DURATION}>
        <Mosaic cards={data} date={date} />
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
